# 🏓 Sound Counter - Ping Pong Ball Hit Detector

A React-based web application that uses your device's microphone to detect and count ping pong ball hits on a table. Perfect for training sessions and competitive play!

## Features

- **Real-time Audio Detection**: Uses Web Audio API to detect ball hits through microphone
- **Step Counting**: Group hits into steps (e.g., 4 hits = 1 step)
- **Records Tracking**: Keeps track of personal bests and streaks
- **Auto-Reset**: Automatically starts new rounds after periods of inactivity
- **Audio Feedback**: Different sounds for hits, steps, and round resets
- **Mobile Optimized**: Designed specifically for mobile browsers
- **Offline Storage**: Records are saved locally on your device

## How to Use

### Setup
1. Open the application in your mobile browser
2. Grant microphone permissions when prompted
3. Adjust sensitivity settings based on your environment

### Settings
- **Sensitivity**: Adjust how sensitive the app is to sounds (0.1 = very sensitive, 1.0 = less sensitive)
- **Hits per Step**: Set how many hits equal one step (default: 4)
- **Auto-reset**: Set seconds of inactivity before starting a new round (0 = disabled)

### Playing
1. Click "Start Listening" to begin detection
2. Play ping pong - the app will detect each ball hit
3. Watch your hits and steps count up in real-time
4. Audio cues will play for:
   - Each hit (short beep)
   - Each completed step (longer tone)
   - Auto-reset (ascending tone)

### Records
The app tracks:
- **Max Hits**: Your highest hit count in a single session
- **Max Steps**: Your highest step count in a single session
- **Current Streak**: Current consecutive steps
- **Best Streak**: Your longest consecutive step streak

## Technical Details

### Audio Processing
- Uses Web Audio API for real-time audio analysis
- RMS (Root Mean Square) calculation for accurate hit detection
- Configurable threshold to prevent false positives
- 100ms cooldown between detections to prevent duplicates

### Mobile Optimization
- Responsive design for mobile screens
- Touch-optimized buttons
- Prevents zoom on input focus
- Optimized for portrait orientation

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
npm install
```

### Running
```bash
npm start
```

### Building for Production
```bash
npm run build
```

## Browser Compatibility

- **Chrome/Safari Mobile**: Full support
- **Firefox Mobile**: Full support
- **iOS Safari**: Full support
- **Android Chrome**: Full support

**Note**: Requires HTTPS in production for microphone access.

## Tips for Best Results

1. **Environment**: Use in a quiet environment for best detection
2. **Distance**: Place device 1-2 feet from the table
3. **Sensitivity**: Start with default 0.3 and adjust based on results
4. **Surface**: Works best with hard table surfaces
5. **Ball**: Standard ping pong balls work best

## Troubleshooting

- **No microphone access**: Check browser permissions
- **Poor detection**: Adjust sensitivity settings
- **Too many false positives**: Increase threshold value
- **Missing hits**: Decrease threshold value

## Privacy

- All data is stored locally on your device
- No data is sent to external servers
- Microphone access is only used for real-time detection

---

Built with React and Web Audio API for the ultimate ping pong training experience!