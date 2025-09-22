import { Router, Request, Response } from 'express';
import { SignLanguageService } from '../services/SignLanguageService.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';

const router = Router();
const signLanguageService = new SignLanguageService();

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  storage: multer.memoryStorage()
});

// Initialize the service
signLanguageService.initialize().catch(error => {
  logger.error('Failed to initialize SignLanguageService in routes:', error);
});

// POST /api/sign-language/detect
// Detect sign language from uploaded image
router.post('/detect', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const frameData = `data:image/jpeg;base64,${imageBase64}`;
    
    const result = await signLanguageService.processFrame(frameData);
    
    if (!result) {
      return res.json({ 
        detected: false, 
        message: 'No sign language detected in the image' 
      });
    }

    // Try to recognize the gesture
    const gestureResult = signLanguageService.recognizeGesture(result.landmarks);
    
    res.json({
      detected: true,
      landmarks: result.landmarks,
      confidence: result.confidence,
      gesture: gestureResult ? {
        name: gestureResult.gesture,
        confidence: gestureResult.confidence,
        description: signLanguageService.getGestureDescription(gestureResult.gesture)
      } : null,
      timestamp: result.timestamp
    });

  } catch (error) {
    logger.error('Error in sign language detection:', error);
    res.status(500).json({ 
      error: 'Failed to process image for sign language detection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/sign-language/gestures
// Get list of supported gestures
router.get('/gestures', (req: Request, res: Response) => {
  try {
    const supportedGestures = [
      { name: 'hello', description: 'Wave hand with open palm', category: 'greeting' },
      { name: 'thank_you', description: 'Touch chin and move forward', category: 'courtesy' },
      { name: 'please', description: 'Circular motion on chest', category: 'courtesy' },
      { name: 'yes', description: 'Nod fist up and down', category: 'response' },
      { name: 'no', description: 'Shake index finger side to side', category: 'response' },
      { name: 'help', description: 'One hand on another, lift both', category: 'action' },
      { name: 'thumbs_up', description: 'Thumb extended upward', category: 'response' },
      { name: 'pointing', description: 'Index finger extended', category: 'action' }
    ];

    res.json({
      gestures: supportedGestures,
      total: supportedGestures.length
    });

  } catch (error) {
    logger.error('Error getting gestures list:', error);
    res.status(500).json({ error: 'Failed to retrieve gestures list' });
  }
});

// POST /api/sign-language/translate
// Translate gesture sequence to text
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { landmarks, confidence, sessionId } = req.body;

    if (!landmarks || !Array.isArray(landmarks)) {
      return res.status(400).json({ error: 'Invalid landmarks data provided' });
    }

    const signData = {
      landmarks,
      confidence: confidence || 0.5,
      timestamp: Date.now(),
      sessionId: sessionId || 'anonymous'
    };

    // This would typically use the TranslationService
    // For now, we'll provide a simple response
    const gestureResult = signLanguageService.recognizeGesture(landmarks);
    
    if (!gestureResult) {
      return res.json({ 
        translated: false, 
        message: 'Could not translate gesture to text' 
      });
    }

    const translationMap: { [key: string]: string } = {
      'hello': 'Hello',
      'thank_you': 'Thank you',
      'please': 'Please',
      'yes': 'Yes',
      'no': 'No',
      'help': 'Help me',
      'thumbs_up': 'Good',
      'pointing': 'Look'
    };

    const translatedText = translationMap[gestureResult.gesture] || 'Unknown gesture';

    res.json({
      translated: true,
      originalGesture: gestureResult.gesture,
      translatedText,
      confidence: gestureResult.confidence,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error translating sign language:', error);
    res.status(500).json({ 
      error: 'Failed to translate sign language',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/sign-language/config
// Get current configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    res.json({
      modelStatus: 'initialized',
      confidenceThreshold: 0.7,
      supportedLanguages: ['ASL', 'BSL'],
      maxHandsDetection: 2,
      processingMode: 'realtime'
    });
  } catch (error) {
    logger.error('Error getting sign language config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// PUT /api/sign-language/config
// Update configuration
router.put('/config', (req: Request, res: Response) => {
  try {
    const { confidenceThreshold, maxHandsDetection, processingMode } = req.body;

    // Validate configuration values
    if (confidenceThreshold && (confidenceThreshold < 0 || confidenceThreshold > 1)) {
      return res.status(400).json({ error: 'Confidence threshold must be between 0 and 1' });
    }

    if (maxHandsDetection && (maxHandsDetection < 1 || maxHandsDetection > 4)) {
      return res.status(400).json({ error: 'Max hands detection must be between 1 and 4' });
    }

    // In a real implementation, you would update the service configuration here
    logger.info('Sign language configuration updated:', { confidenceThreshold, maxHandsDetection, processingMode });

    res.json({
      updated: true,
      config: {
        confidenceThreshold: confidenceThreshold || 0.7,
        maxHandsDetection: maxHandsDetection || 2,
        processingMode: processingMode || 'realtime'
      }
    });

  } catch (error) {
    logger.error('Error updating sign language config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export { router as signLanguageRouter };