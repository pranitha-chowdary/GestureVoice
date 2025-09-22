# GestureVoice Backend

A real-time sign language to voice translation backend service built with Node.js, Express, Socket.IO, and AI/ML technologies.

## Features

🤟 **Sign Language Detection** - Real-time hand landmark detection using MediaPipe
🗣️ **Speech Recognition** - Convert speech to text for sign language generation
🔊 **Text-to-Speech** - Generate audio from recognized sign language
🔄 **Real-time Communication** - WebSocket-based bidirectional communication
🎯 **Translation Service** - Convert between sign language and text
🔌 **REST API** - Configuration and service endpoints

## Architecture

### Services
- **SignLanguageService**: Hand landmark detection and gesture recognition
- **VoiceService**: Speech-to-text and text-to-speech conversion
- **TranslationService**: Convert between sign language and text
- **WebSocketHandler**: Real-time communication with frontend

### API Endpoints
- `POST /api/sign-language/detect` - Detect sign language from image
- `GET /api/sign-language/gestures` - Get supported gestures
- `POST /api/voice/speech-to-text` - Convert audio to text
- `POST /api/voice/text-to-speech` - Convert text to audio
- `GET /health` - Health check

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:
   - `NODE_ENV=development`
   - `PORT=3001`
   - `CORS_ORIGIN=http://localhost:5173`
   - Add API keys for external services if needed

## Usage

### Development
```bash
npm run dev
```
Starts the server with hot reloading using tsx.

### Production
```bash
npm run build
npm start
```

### Health Check
```bash
curl http://localhost:3001/health
```

## WebSocket Events

### Client → Server
- `video-frame`: Send video frame for sign language detection
- `audio-data`: Send audio data for speech recognition
- `generate-sign`: Request sign language animation for text
- `text-to-speech`: Request audio generation from text

### Server → Client
- `sign-detected`: Sign language landmarks detected
- `text-recognized`: Speech converted to text
- `translation-result`: Translation completed
- `speech-audio`: Generated audio data
- `sign-animation`: Sign language animation data
- `error`: Error occurred

## API Examples

### Detect Sign Language
```bash
curl -X POST http://localhost:3001/api/sign-language/detect \
  -F "image=@hand_gesture.jpg"
```

### Text to Speech
```bash
curl -X POST http://localhost:3001/api/voice/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?"}'
```

### Get Supported Gestures
```bash
curl http://localhost:3001/api/sign-language/gestures
```

## Configuration

The server can be configured through environment variables:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `CORS_ORIGIN`: Allowed frontend origin
- `LOG_LEVEL`: Logging level (error/warn/info/debug)
- `CONFIDENCE_THRESHOLD`: AI model confidence threshold

## Dependencies

### Core
- **Express**: Web framework
- **Socket.IO**: Real-time communication
- **TypeScript**: Type safety and development experience

### AI/ML
- **@tensorflow/tfjs-node**: TensorFlow.js for Node.js
- **@mediapipe/hands**: Hand landmark detection
- **node-gtts**: Google Text-to-Speech

### Utilities
- **Sharp**: Image processing
- **Jimp**: Image manipulation
- **Multer**: File upload handling

## Development

### Adding New Gestures
1. Update `SignLanguageService.signVocabulary`
2. Add gesture recognition patterns in `recognizeGesture()`
3. Update API documentation

### Extending Voice Services
1. Integrate additional TTS/STT providers in `VoiceService`
2. Add new voice profiles and languages
3. Implement audio format validation

### Custom Translation Logic
1. Extend `TranslationService` with ML models
2. Add gesture sequence analysis
3. Implement context-aware translations

## Deployment

### Using PM2
```bash
npm run build
pm2 start dist/index.js --name gesturevoice-backend
```

### Using Docker
```bash
docker build -t gesturevoice-backend .
docker run -p 3001:3001 gesturevoice-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.