import { Router, Request, Response } from 'express';
import { VoiceService } from '../services/VoiceService.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';

const router = Router();
const voiceService = new VoiceService();

// Configure multer for audio uploads
const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for audio
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Initialize the service
voiceService.initialize().catch(error => {
  logger.error('Failed to initialize VoiceService in routes:', error);
});

// POST /api/voice/speech-to-text
// Convert uploaded audio to text
router.post('/speech-to-text', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate audio format
    const isValidFormat = await voiceService.validateAudioFormat(req.file.buffer);
    if (!isValidFormat) {
      return res.status(400).json({ error: 'Unsupported audio format' });
    }

    const result = await voiceService.speechToText(req.file.buffer);
    
    if (!result) {
      return res.json({ 
        transcribed: false, 
        message: 'Could not transcribe audio' 
      });
    }

    // Process voice command if applicable
    const commandResult = await voiceService.processVoiceCommand(result.text);

    res.json({
      transcribed: true,
      text: result.text,
      confidence: result.confidence,
      command: commandResult ? {
        action: commandResult.action,
        confidence: commandResult.confidence
      } : null,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error in speech-to-text conversion:', error);
    res.status(500).json({ 
      error: 'Failed to convert speech to text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/voice/text-to-speech
// Convert text to speech audio
router.post('/text-to-speech', async (req: Request, res: Response) => {
  try {
    const { text, voice, language, speed } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text is too long (max 1000 characters)' });
    }

    const options = {
      voice: voice || 'en',
      language: language || 'en',
      speed: speed || 1.0
    };

    const audioBuffer = await voiceService.textToSpeech(text, options);
    
    if (!audioBuffer) {
      return res.status(500).json({ error: 'Failed to generate speech audio' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Content-Disposition': 'attachment; filename="speech.mp3"'
    });

    res.send(audioBuffer);

  } catch (error) {
    logger.error('Error in text-to-speech conversion:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/voice/voices
// Get available voice profiles
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await voiceService.getVoiceProfiles();
    
    const voiceDetails = voices.map(voice => ({
      id: voice,
      name: voice,
      language: voice.split('-')[0],
      region: voice.split('-')[1] || '',
      gender: 'neutral' // Would be determined by actual voice data
    }));

    res.json({
      voices: voiceDetails,
      total: voiceDetails.length
    });

  } catch (error) {
    logger.error('Error getting voice profiles:', error);
    res.status(500).json({ error: 'Failed to retrieve voice profiles' });
  }
});

// POST /api/voice/analyze
// Analyze voice for commands or patterns
router.post('/analyze', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // First convert to text
    const speechResult = await voiceService.speechToText(req.file.buffer);
    
    if (!speechResult) {
      return res.json({ 
        analyzed: false, 
        message: 'Could not analyze audio' 
      });
    }

    // Analyze for voice commands
    const commandResult = await voiceService.processVoiceCommand(speechResult.text);

    res.json({
      analyzed: true,
      transcription: {
        text: speechResult.text,
        confidence: speechResult.confidence
      },
      command: commandResult || null,
      sentiment: this.analyzeSentiment(speechResult.text),
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error analyzing voice:', error);
    res.status(500).json({ 
      error: 'Failed to analyze voice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/voice/config
// Get voice service configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    res.json({
      speechToText: {
        enabled: true,
        language: 'en-US',
        sampleRate: 16000,
        encoding: 'LINEAR16'
      },
      textToSpeech: {
        enabled: true,
        defaultVoice: 'en-US',
        speed: 1.0,
        pitch: 0.0
      },
      commandRecognition: {
        enabled: true,
        confidenceThreshold: 0.7
      }
    });
  } catch (error) {
    logger.error('Error getting voice config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// PUT /api/voice/config
// Update voice service configuration
router.put('/config', (req: Request, res: Response) => {
  try {
    const { language, defaultVoice, speed, pitch, confidenceThreshold } = req.body;

    // Validate configuration values
    if (speed && (speed < 0.25 || speed > 4.0)) {
      return res.status(400).json({ error: 'Speed must be between 0.25 and 4.0' });
    }

    if (pitch && (pitch < -20 || pitch > 20)) {
      return res.status(400).json({ error: 'Pitch must be between -20 and 20' });
    }

    if (confidenceThreshold && (confidenceThreshold < 0 || confidenceThreshold > 1)) {
      return res.status(400).json({ error: 'Confidence threshold must be between 0 and 1' });
    }

    logger.info('Voice service configuration updated:', { language, defaultVoice, speed, pitch, confidenceThreshold });

    res.json({
      updated: true,
      config: {
        language: language || 'en-US',
        defaultVoice: defaultVoice || 'en-US',
        speed: speed || 1.0,
        pitch: pitch || 0.0,
        confidenceThreshold: confidenceThreshold || 0.7
      }
    });

  } catch (error) {
    logger.error('Error updating voice config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Simple sentiment analysis helper
function analyzeSentiment(text: string): { sentiment: string; confidence: number } {
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing', 'fantastic'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'sad', 'angry', 'frustrated'];
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) {
    return { sentiment: 'positive', confidence: Math.min(0.8, positiveCount / words.length * 10) };
  } else if (negativeCount > positiveCount) {
    return { sentiment: 'negative', confidence: Math.min(0.8, negativeCount / words.length * 10) };
  } else {
    return { sentiment: 'neutral', confidence: 0.5 };
  }
}

export { router as voiceRouter };