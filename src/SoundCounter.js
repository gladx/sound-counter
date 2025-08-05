import React, { useState, useEffect, useRef, useCallback } from 'react';

const SoundCounter = () => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [hits, setHits] = useState(0);
  const [steps, setSteps] = useState(0);
  const [stepsPerHit, setStepsPerHit] = useState(4);
  const [threshold, setThreshold] = useState(0.1);
  const [autoResetTime, setAutoResetTime] = useState(10);
  const [status, setStatus] = useState('Click Start to begin listening');
  const [currentVolume, setCurrentVolume] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [records, setRecords] = useState({
    maxHits: 0,
    maxSteps: 0,
    currentStreak: 0,
    bestStreak: 0
  });
  
  // Refs for audio processing
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);
  const dataArrayRef = useRef(null);
  const lastHitTimeRef = useRef(Date.now());
  const resetTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const logCounterRef = useRef(0);
  
  // Load records from localStorage on mount
  useEffect(() => {
    const savedRecords = localStorage.getItem('soundCounterRecords');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);
  
  // Save records to localStorage when they change
  useEffect(() => {
    localStorage.setItem('soundCounterRecords', JSON.stringify(records));
  }, [records]);
  
  // Audio detection function
  const detectSound = useCallback(() => {
    // Check if we should continue - use ref instead of state to avoid stale closure
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      console.log('🔊 [DEBUG] Audio context not running, stopping detection');
      return;
    }
    
    // Log every 60 frames (about once per second at 60fps)
    logCounterRef.current++;
    const shouldLog = logCounterRef.current % 60 === 0 || logCounterRef.current <= 5;
    
    if (shouldLog) console.log('🔊 [DEBUG] DetectSound called (#' + logCounterRef.current + '), isListening:', isListening);
    
    if (!analyserRef.current || !dataArrayRef.current) {
      console.log('🔊 [DEBUG] Missing analyzer or data array:', {
        analyzer: !!analyserRef.current,
        dataArray: !!dataArrayRef.current
      });
      return;
    }
    
    if (shouldLog) console.log('🔊 [DEBUG] Getting audio data...');
    
    // Try both frequency and time domain data
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    
    // Sample first few values to see if we're getting data
    const sampleData = Array.from(dataArrayRef.current.slice(0, 10));
    if (shouldLog) console.log('🔊 [DEBUG] Sample time domain data:', sampleData);
    
    // Check if we're getting actual audio data (not just silence = 128)
    const hasVariation = sampleData.some(val => val !== 128);
    if (shouldLog) console.log('🔊 [DEBUG] Audio data has variation:', hasVariation);
    
    // Calculate volume using time domain data (better for detecting sudden sounds)
    let sum = 0;
    let maxAmplitude = 0;
    let minAmplitude = 1;
    
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      // Convert from 0-255 to -1 to 1 range
      const amplitude = (dataArrayRef.current[i] - 128) / 128.0;
      const absAmplitude = Math.abs(amplitude);
      sum += absAmplitude;
      maxAmplitude = Math.max(maxAmplitude, absAmplitude);
      minAmplitude = Math.min(minAmplitude, absAmplitude);
    }
    
    const averageVolume = sum / dataArrayRef.current.length;
    if (shouldLog) console.log('🔊 [DEBUG] Time domain - Average:', averageVolume.toFixed(4), 'Max:', maxAmplitude.toFixed(4), 'Min:', minAmplitude.toFixed(4));
    
    // Also get frequency data for additional analysis
    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(frequencyData);
    
    // Sample frequency data too
    const sampleFreqData = Array.from(frequencyData.slice(0, 10));
    if (shouldLog) console.log('🔊 [DEBUG] Sample frequency data:', sampleFreqData);
    
    let freqSum = 0;
    let maxFreq = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const freqVal = frequencyData[i] / 255.0;
      freqSum += freqVal;
      maxFreq = Math.max(maxFreq, freqVal);
    }
    const averageFreq = freqSum / frequencyData.length;
    if (shouldLog) console.log('🔊 [DEBUG] Frequency domain - Average:', averageFreq.toFixed(4), 'Max:', maxFreq.toFixed(4));
    
    // Use the higher of the two measurements
    const detectedVolume = Math.max(averageVolume, averageFreq, maxAmplitude);
    if (shouldLog) console.log('🔊 [DEBUG] Final detected volume:', detectedVolume.toFixed(4), 'Threshold:', threshold.toFixed(4));
    
    // Update current volume for display
    setCurrentVolume(detectedVolume);
    
    // Simple threshold detection
    if (detectedVolume > threshold || maxAmplitude > threshold) {
      console.log('🔊 [DEBUG] 🎯 HIT DETECTED! Volume:', detectedVolume.toFixed(4), 'Max:', maxAmplitude.toFixed(4));
      const now = Date.now();
      const timeSinceLastHit = now - lastHitTimeRef.current;
      
      // Prevent duplicate detections within 200ms
      if (timeSinceLastHit > 200) {
        console.log('🔊 [DEBUG] ✅ Hit accepted (time since last:', timeSinceLastHit, 'ms)');
        lastHitTimeRef.current = now;
        
        setHits(prevHits => {
          const newHits = prevHits + 1;
          const newSteps = Math.floor(newHits / stepsPerHit);
          
          // Update steps if needed
          setSteps(prevSteps => {
            if (newSteps > prevSteps) {
              // Play step sound
              playStepSound();
              setRecords(prev => ({
                ...prev,
                currentStreak: prev.currentStreak + 1,
                bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1)
              }));
            }
            return newSteps;
          });
          
          // Update records
          setRecords(prev => ({
            ...prev,
            maxHits: Math.max(prev.maxHits, newHits),
            maxSteps: Math.max(prev.maxSteps, newSteps)
          }));
          
          return newHits;
        });
        
        // Play hit sound
        playHitSound();
        
        // Reset auto-reset timer
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        
        // Set new auto-reset timer
        resetTimeoutRef.current = setTimeout(() => {
          if (autoResetTime > 0) {
            handleReset();
            playResetSound();
            setStatus('Auto-reset: Starting new round!');
            setTimeout(() => setStatus('Listening...'), 2000);
          }
        }, autoResetTime * 1000);
      } else {
        console.log('🔊 [DEBUG] ❌ Hit rejected (too soon, only', timeSinceLastHit, 'ms since last)');
      }
    }
    
    // Continue the loop if audio context is still running
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      animationFrameRef.current = requestAnimationFrame(detectSound);
    } else {
      console.log('🔊 [DEBUG] Audio context not running, stopping detection loop');
    }
  }, [threshold, stepsPerHit, autoResetTime]);
  
  // Play sounds for different events
  const playHitSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };
  
  const playStepSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Higher pitch for step completion
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };
  
  const playResetSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Lower pitch for reset notification
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.5);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };
  
  // Start listening to microphone
  const startListening = async () => {
    try {
      console.log('🎤 [DEBUG] Starting microphone setup...');
      setStatus('Requesting microphone access...');
      
      // Request microphone access with optimized settings for sound detection
      console.log('🎤 [DEBUG] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      console.log('🎤 [DEBUG] Microphone stream obtained:', stream);
      console.log('🎤 [DEBUG] Stream tracks:', stream.getTracks());
      
      setStatus('Setting up audio analysis...');
      
      // Create audio context and analyzer
      console.log('🎤 [DEBUG] Creating audio context...');
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎤 [DEBUG] Audio context created:', audioContextRef.current);
      console.log('🎤 [DEBUG] Audio context state:', audioContextRef.current.state);
      console.log('🎤 [DEBUG] Audio context sample rate:', audioContextRef.current.sampleRate);
      
      // Resume audio context if it's suspended (required on some browsers)
      if (audioContextRef.current.state === 'suspended') {
        console.log('🎤 [DEBUG] Audio context suspended, resuming...');
        await audioContextRef.current.resume();
        console.log('🎤 [DEBUG] Audio context resumed, new state:', audioContextRef.current.state);
      }
      
      console.log('🎤 [DEBUG] Creating analyzer and microphone source...');
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      gainNodeRef.current = audioContextRef.current.createGain();
      console.log('🎤 [DEBUG] Analyzer created:', analyserRef.current);
      console.log('🎤 [DEBUG] Microphone source created:', microphoneRef.current);
      console.log('🎤 [DEBUG] Gain node created:', gainNodeRef.current);
      
      // Configure analyzer for better hit detection
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing for responsiveness
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      console.log('🎤 [DEBUG] Analyzer configured - fftSize:', analyserRef.current.fftSize);
      
      // Configure gain node to amplify microphone signal
      gainNodeRef.current.gain.setValueAtTime(10.0, audioContextRef.current.currentTime); // 10x amplification
      console.log('🎤 [DEBUG] Gain set to 10x amplification');
      
      // Connect: microphone -> gain -> analyzer
      console.log('🎤 [DEBUG] Connecting audio chain: microphone -> gain -> analyzer...');
      microphoneRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      console.log('🎤 [DEBUG] Audio chain connected');
      
      // Store the stream reference for cleanup
      streamRef.current = stream;
      
      // Create data array for time domain analysis
      const bufferLength = analyserRef.current.fftSize;
      dataArrayRef.current = new Uint8Array(bufferLength);
      console.log('🎤 [DEBUG] Data array created, length:', dataArrayRef.current.length);
      
      setIsListening(true);
      setStatus('Listening... Make some noise to test!');
      console.log('🎤 [DEBUG] Setup complete, isListening will be set to true');
      
      // Wait a moment for state to update, then start detection loop
      setTimeout(() => {
        console.log('🎤 [DEBUG] Starting detection loop after state update...');
        detectSound();
      }, 100);
      
    } catch (error) {
      console.error('🎤 [ERROR] Error accessing microphone:', error);
      console.error('🎤 [ERROR] Error name:', error.name);
      console.error('🎤 [ERROR] Error message:', error.message);
      let errorMessage = 'Error: Could not access microphone.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Error: Microphone access denied. Please allow microphone access and refresh.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Error: No microphone found. Please check your device.';
      }
      setStatus(errorMessage);
    }
  };
  
  // Stop listening
  const stopListening = () => {
    console.log('🎤 [DEBUG] Stopping listening...');
    setIsListening(false);
    setStatus('Stopped listening');
    
    if (animationFrameRef.current) {
      console.log('🎤 [DEBUG] Canceling animation frame');
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (resetTimeoutRef.current) {
      console.log('🎤 [DEBUG] Clearing reset timeout');
      clearTimeout(resetTimeoutRef.current);
    }
    
    if (streamRef.current) {
      console.log('🎤 [DEBUG] Stopping microphone tracks');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      console.log('🎤 [DEBUG] Closing audio context');
      audioContextRef.current.close();
    }
    
    console.log('🎤 [DEBUG] Stop complete');
  };
  
  // Reset counters
  const handleReset = () => {
    setHits(0);
    setSteps(0);
    setRecords(prev => ({ ...prev, currentStreak: 0 }));
    lastHitTimeRef.current = Date.now();
    
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
  };
  
  // Clear all records
  const clearRecords = () => {
    setRecords({
      maxHits: 0,
      maxSteps: 0,
      currentStreak: 0,
      bestStreak: 0
    });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);
  
  return (
    <div className="app">
      <div className="header">
        <h1>🏓 Sound Counter</h1>
        <p>Ping Pong Ball Hit Detector</p>
      </div>
      
      {/* Main Action Buttons - Moved to Top */}
      <div className="main-controls">
        <button
          className={`button-compact ${isListening ? 'button-secondary' : 'button-primary'}`}
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? '⏹️ Stop' : '▶️ Start'}
        </button>
        
        <button
          className="button-compact button-success"
          onClick={handleReset}
        >
          🔄 Reset
        </button>
        
        <button
          className="button-compact button-success"
          onClick={() => {
            // Manual hit for testing
            setHits(prevHits => {
              const newHits = prevHits + 1;
              const newSteps = Math.floor(newHits / stepsPerHit);
              
              setSteps(prevSteps => {
                if (newSteps > prevSteps) {
                  playStepSound();
                  setRecords(prev => ({
                    ...prev,
                    currentStreak: prev.currentStreak + 1,
                    bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1)
                  }));
                }
                return newSteps;
              });
              
              setRecords(prev => ({
                ...prev,
                maxHits: Math.max(prev.maxHits, newHits),
                maxSteps: Math.max(prev.maxSteps, newSteps)
              }));
              
              return newHits;
            });
            playHitSound();
            setStatus('Manual hit added! 🏓');
            setTimeout(() => setStatus(isListening ? 'Listening...' : 'Stopped listening'), 1500);
          }}
        >
          🏓 Test
        </button>
      </div>
      
      <div className="status">
        <p className="status-text">
          {isListening && <span className="listening-indicator"></span>}
          {status}
        </p>
        {isListening && (
          <div style={{marginTop: '15px'}}>
            <div style={{marginBottom: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <span style={{color: 'white', fontSize: '14px', fontWeight: '600'}}>Volume Level</span>
                <span style={{color: 'white', fontSize: '12px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px'}}>{(currentVolume).toFixed(3)}</span>
              </div>
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(currentVolume * 300, 100)}%`,
                  background: currentVolume > threshold 
                    ? 'linear-gradient(90deg, #00b894, #00a085)' 
                    : 'linear-gradient(90deg, #74b9ff, #0984e3)',
                  transition: 'width 0.15s ease',
                  borderRadius: '6px',
                  boxShadow: currentVolume > threshold ? '0 0 8px rgba(0, 184, 148, 0.5)' : 'none'
                }}></div>
                <div style={{
                  position: 'absolute',
                  left: `${threshold * 300}%`,
                  top: '0',
                  width: '2px',
                  height: '100%',
                  background: '#ff6b6b',
                  opacity: 0.8
                }}></div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px'}}>
                <span style={{color: 'rgba(255,255,255,0.7)', fontSize: '10px'}}>Silent</span>
                <span style={{color: '#ff6b6b', fontSize: '10px'}}>Threshold</span>
                <span style={{color: 'rgba(255,255,255,0.7)', fontSize: '10px'}}>Loud</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">{hits}</div>
          <div className="stat-label">Total Hits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{steps}</div>
          <div className="stat-label">Steps</div>
        </div>
      </div>
      
      <div className="record-section">
        <h3>📊 Records</h3>
        <div className="record-item">
          <span>Max Hits:</span>
          <span>{records.maxHits}</span>
        </div>
        <div className="record-item">
          <span>Max Steps:</span>
          <span>{records.maxSteps}</span>
        </div>
        <div className="record-item">
          <span>Current Streak:</span>
          <span>{records.currentStreak}</span>
        </div>
        <div className="record-item">
          <span>Best Streak:</span>
          <span>{records.bestStreak}</span>
        </div>
        <button
          className="button button-secondary"
          onClick={clearRecords}
          style={{marginTop: '15px', width: '100%'}}
        >
          Clear Records
        </button>
      </div>

      {isListening && (
        <div style={{marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px'}}>
          <p style={{color: 'white', margin: '0 0 10px 0', fontSize: '14px'}}>
            📢 Testing Instructions:
          </p>
          <ul style={{color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0, paddingLeft: '20px'}}>
            <li>Clap your hands loudly</li>
            <li>Tap the table with your finger</li>
            <li>Say "Hello" loudly</li>
            <li>Watch the volume bar change</li>
          </ul>
        </div>
      )}
      
      {/* Audio Settings and Debug - Moved to Bottom */}
      <div className="controls">
        <div className="control-group">
          <h3>⚙️ Audio Settings</h3>
          <div className="input-group">
            <label>Sensitivity:</label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
            <span style={{color: 'white', minWidth: '40px'}}>{threshold.toFixed(2)}</span>
          </div>
          <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '5px'}}>
            Lower = more sensitive. Watch the volume bar above to adjust.
          </div>
          <div className="input-group">
            <label>Hits per Step:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={stepsPerHit}
              onChange={(e) => setStepsPerHit(parseInt(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Auto-reset (sec):</label>
            <input
              type="number"
              min="0"
              max="60"
              value={autoResetTime}
              onChange={(e) => setAutoResetTime(parseInt(e.target.value))}
            />
          </div>
          
          {isListening && (
            <div style={{marginTop: '15px'}}>
              <button
                className="button button-secondary"
                onClick={() => setDebugMode(!debugMode)}
                style={{fontSize: '12px', padding: '8px 16px', width: '100%'}}
              >
                {debugMode ? '🔼 Hide Debug' : '🔽 Show Debug'}
              </button>
              {debugMode && (
                <div style={{marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}>
                  <div>Current Volume: {currentVolume.toFixed(3)}</div>
                  <div>Threshold: {threshold.toFixed(3)}</div>
                  <div>Detection: {currentVolume > threshold ? '🟢 TRIGGERED' : '🔴 Waiting'}</div>
                  <div>Audio Context State: {audioContextRef.current?.state || 'Not created'}</div>
                  <div>Analyzer Connected: {analyserRef.current ? '✅' : '❌'}</div>
                  <div>Data Array Size: {dataArrayRef.current?.length || 0}</div>
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      if (audioContextRef.current?.state === 'suspended') {
                        audioContextRef.current.resume();
                        setStatus('Audio context resumed');
                      }
                    }}
                    style={{fontSize: '10px', padding: '4px 8px', marginTop: '5px', width: '100%'}}
                  >
                    Resume Audio Context
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoundCounter;