import { logger } from '../utils/logger.js';
import type { SignLanguageData } from '../types/index.js';

interface SignTranslationResult {
  text: string;
  confidence: number;
  gesture?: string;
}

interface TextToSignResult {
  signDescription: string;
  animations: SignAnimation[];
  confidence: number;
}

interface SignAnimation {
  gesture: string;
  duration: number;
  keyframes: AnimationKeyframe[];
  description: string;
}

interface AnimationKeyframe {
  timestamp: number;
  handPosition: { x: number; y: number; z: number };
  fingerPositions: number[];
  description: string;
}

export class TranslationService {
  private gestureSequenceBuffer: Array<{ gesture: string; timestamp: number }> = [];
  private readonly sequenceTimeoutMs = 3000; // 3 seconds to complete a gesture sequence

  // Sign language vocabulary and descriptions
  private readonly signLanguageDictionary = new Map([
    // Greetings
    ['hello', {
      description: 'Wave hand with open palm, fingers extended',
      animations: TranslationService.createWaveAnimation(),
      category: 'greeting'
    }],
    ['goodbye', {
      description: 'Wave hand back and forth with palm facing forward',
      animations: TranslationService.createGoodbyeAnimation(),
      category: 'greeting'
    }],
    ['good_morning', {
      description: 'Touch fingertips to forehead, then extend hand forward',
      animations: TranslationService.createMorningAnimation(),
      category: 'greeting'
    }],
    
    // Common phrases
    ['thank_you', {
      description: 'Touch fingertips to chin, then move hand forward and down',
      animations: TranslationService.createThankYouAnimation(),
      category: 'courtesy'
    }],
    ['please', {
      description: 'Place palm on chest and move in circular motion',
      animations: TranslationService.createPleaseAnimation(),
      category: 'courtesy'
    }],
    ['sorry', {
      description: 'Make fist, place on chest, move in circular motion',
      animations: TranslationService.createSorryAnimation(),
      category: 'courtesy'
    }],
    
    // Basic responses
    ['yes', {
      description: 'Make fist and nod up and down',
      animations: TranslationService.createYesAnimation(),
      category: 'response'
    }],
    ['no', {
      description: 'Extend index and middle finger, shake side to side',
      animations: TranslationService.createNoAnimation(),
      category: 'response'
    }],
    
    // Actions
    ['help', {
      description: 'Place one hand palm up, place other hand on top, lift both',
      animations: TranslationService.createHelpAnimation(),
      category: 'action'
    }],
    ['stop', {
      description: 'Extend palm forward, fingers up, firm gesture',
      animations: TranslationService.createStopAnimation(),
      category: 'action'
    }]
  ]);

  // Common word-to-gesture mappings
  private readonly wordToGestureMap = new Map([
    ['hello', 'hello'],
    ['hi', 'hello'],
    ['hey', 'hello'],
    ['goodbye', 'goodbye'],
    ['bye', 'goodbye'],
    ['thanks', 'thank_you'],
    ['thank you', 'thank_you'],
    ['please', 'please'],
    ['sorry', 'sorry'],
    ['yes', 'yes'],
    ['no', 'no'],
    ['help', 'help'],
    ['stop', 'stop'],
    ['good morning', 'good_morning'],
    ['morning', 'good_morning']
  ]);

  public async signToText(signData: SignLanguageData): Promise<SignTranslationResult | null> {
    try {
      logger.debug('Translating sign language to text', { confidence: signData.confidence });

      // For demonstration, we'll use a simple gesture recognition
      // In production, this would involve sophisticated ML models
      
      const gesture = this.recognizeGestureFromLandmarks(signData.landmarks);
      if (!gesture) {
        return null;
      }

      // Add to gesture sequence buffer
      this.gestureSequenceBuffer.push({ gesture: gesture.gesture, timestamp: Date.now() });
      
      // Clean old gestures from buffer
      this.cleanGestureBuffer();

      // Try to form meaningful phrases from gesture sequence
      const translatedText = this.gestureSequenceToText();
      
      if (translatedText) {
        return {
          text: translatedText,
          confidence: Math.min(gesture.confidence, signData.confidence),
          gesture: gesture.gesture
        };
      }

      return null;

    } catch (error) {
      logger.error('Error translating sign to text:', error);
      return null;
    }
  }

  public async textToSign(text: string): Promise<TextToSignResult | null> {
    try {
      logger.debug('Converting text to sign language:', { text });

      const words = text.toLowerCase().split(/\s+/);
      const signAnimations: SignAnimation[] = [];
      let overallConfidence = 0;
      let matchCount = 0;

      for (const word of words) {
        // Check for exact matches first
        const gesture = this.wordToGestureMap.get(word);
        if (gesture && this.signLanguageDictionary.has(gesture)) {
          const signData = this.signLanguageDictionary.get(gesture)!;
          signAnimations.push(...signData.animations);
          overallConfidence += 0.9;
          matchCount++;
          continue;
        }

        // Check for partial matches
        const partialMatch = this.findPartialGestureMatch(word);
        if (partialMatch) {
          const signData = this.signLanguageDictionary.get(partialMatch)!;
          signAnimations.push(...signData.animations);
          overallConfidence += 0.6;
          matchCount++;
          continue;
        }

        // Fallback: create fingerspelling animation
        const fingerspellingAnimation = this.createFingerspellingAnimation(word);
        signAnimations.push(fingerspellingAnimation);
        overallConfidence += 0.4;
        matchCount++;
      }

      if (signAnimations.length === 0) {
        return null;
      }

      const finalConfidence = matchCount > 0 ? overallConfidence / matchCount : 0;

      return {
        signDescription: this.generateSignDescription(text, words),
        animations: signAnimations,
        confidence: Math.min(1, finalConfidence)
      };

    } catch (error) {
      logger.error('Error converting text to sign language:', error);
      return null;
    }
  }

  private recognizeGestureFromLandmarks(landmarks: number[][]): { gesture: string; confidence: number } | null {
    if (landmarks.length === 0 || landmarks[0].length < 21 * 3) {
      return null;
    }

    // Simple gesture recognition based on hand landmarks
    const handPoints = landmarks[0];
    
    // Extract key landmark positions
    const thumbTip = { x: handPoints[4 * 3], y: handPoints[4 * 3 + 1], z: handPoints[4 * 3 + 2] };
    const indexTip = { x: handPoints[8 * 3], y: handPoints[8 * 3 + 1], z: handPoints[8 * 3 + 2] };
    const middleTip = { x: handPoints[12 * 3], y: handPoints[12 * 3 + 1], z: handPoints[12 * 3 + 2] };
    const ringTip = { x: handPoints[16 * 3], y: handPoints[16 * 3 + 1], z: handPoints[16 * 3 + 2] };
    const pinkyTip = { x: handPoints[20 * 3], y: handPoints[20 * 3 + 1], z: handPoints[20 * 3 + 2] };
    const wrist = { x: handPoints[0], y: handPoints[1], z: handPoints[2] };

    // Simple pattern recognition
    const allFingersUp = [thumbTip, indexTip, middleTip, ringTip, pinkyTip].every(tip => tip.y < wrist.y);
    const thumbsUp = thumbTip.y < wrist.y && [indexTip, middleTip, ringTip, pinkyTip].every(tip => tip.y > wrist.y);
    const pointingUp = indexTip.y < wrist.y && [thumbTip, middleTip, ringTip, pinkyTip].every(tip => tip.y > wrist.y);
    const okSign = Math.abs(thumbTip.x - indexTip.x) < 0.05 && Math.abs(thumbTip.y - indexTip.y) < 0.05;

    if (allFingersUp) {
      return { gesture: 'hello', confidence: 0.8 };
    } else if (thumbsUp) {
      return { gesture: 'yes', confidence: 0.85 };
    } else if (pointingUp) {
      return { gesture: 'help', confidence: 0.7 };
    } else if (okSign) {
      return { gesture: 'thank_you', confidence: 0.75 };
    }

    return { gesture: 'unknown', confidence: 0.3 };
  }

  private gestureSequenceToText(): string | null {
    if (this.gestureSequenceBuffer.length === 0) {
      return null;
    }

    // Get the most recent gesture
    const latestGesture = this.gestureSequenceBuffer[this.gestureSequenceBuffer.length - 1];
    
    // Map gesture to text
    const gestureToText = new Map([
      ['hello', 'Hello'],
      ['goodbye', 'Goodbye'],
      ['thank_you', 'Thank you'],
      ['please', 'Please'],
      ['yes', 'Yes'],
      ['no', 'No'],
      ['help', 'Help'],
      ['stop', 'Stop'],
      ['good_morning', 'Good morning']
    ]);

    return gestureToText.get(latestGesture.gesture) || null;
  }

  private cleanGestureBuffer(): void {
    const now = Date.now();
    this.gestureSequenceBuffer = this.gestureSequenceBuffer.filter(
      gesture => now - gesture.timestamp < this.sequenceTimeoutMs
    );
  }

  private findPartialGestureMatch(word: string): string | null {
    for (const [key] of this.wordToGestureMap) {
      if (key.includes(word) || word.includes(key)) {
        return this.wordToGestureMap.get(key) || null;
      }
    }
    return null;
  }

  private generateSignDescription(originalText: string, words: string[]): string {
    const knownGestures = words.filter(word => 
      this.wordToGestureMap.has(word) || this.findPartialGestureMatch(word)
    );

    if (knownGestures.length === 0) {
      return `Fingerspell: "${originalText}"`;
    }

    const gestureDescriptions = knownGestures.map(word => {
      const gesture = this.wordToGestureMap.get(word) || this.findPartialGestureMatch(word);
      if (gesture && this.signLanguageDictionary.has(gesture)) {
        return this.signLanguageDictionary.get(gesture)!.description;
      }
      return `Fingerspell "${word}"`;
    });

    return gestureDescriptions.join(', then ');
  }

  // Animation creation methods (simplified)
  private static createWaveAnimation(): SignAnimation[] {
    return [{
      gesture: 'wave',
      duration: 2000,
      keyframes: [
        { timestamp: 0, handPosition: { x: 0, y: 0, z: 0 }, fingerPositions: [1,1,1,1,1], description: 'Raise hand' },
        { timestamp: 500, handPosition: { x: 0.2, y: 0, z: 0 }, fingerPositions: [1,1,1,1,1], description: 'Wave right' },
        { timestamp: 1000, handPosition: { x: -0.2, y: 0, z: 0 }, fingerPositions: [1,1,1,1,1], description: 'Wave left' },
        { timestamp: 1500, handPosition: { x: 0, y: 0, z: 0 }, fingerPositions: [1,1,1,1,1], description: 'Center' },
        { timestamp: 2000, handPosition: { x: 0, y: -0.3, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Lower hand' }
      ],
      description: 'Wave hand side to side'
    }];
  }

  private static createThankYouAnimation(): SignAnimation[] {
    return [{
      gesture: 'thank_you',
      duration: 1500,
      keyframes: [
        { timestamp: 0, handPosition: { x: 0, y: 0.2, z: -0.1 }, fingerPositions: [1,1,1,1,1], description: 'Touch chin' },
        { timestamp: 1000, handPosition: { x: 0, y: -0.1, z: 0.2 }, fingerPositions: [1,1,1,1,1], description: 'Move forward' },
        { timestamp: 1500, handPosition: { x: 0, y: -0.2, z: 0.3 }, fingerPositions: [1,1,1,1,1], description: 'Complete motion' }
      ],
      description: 'Touch chin and move forward'
    }];
  }

  private static createYesAnimation(): SignAnimation[] {
    return [{
      gesture: 'yes',
      duration: 1000,
      keyframes: [
        { timestamp: 0, handPosition: { x: 0, y: 0, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Fist position' },
        { timestamp: 250, handPosition: { x: 0, y: 0.1, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Nod up' },
        { timestamp: 500, handPosition: { x: 0, y: -0.1, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Nod down' },
        { timestamp: 750, handPosition: { x: 0, y: 0.05, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Nod up again' },
        { timestamp: 1000, handPosition: { x: 0, y: 0, z: 0 }, fingerPositions: [0,0,0,0,0], description: 'Return center' }
      ],
      description: 'Nod fist up and down'
    }];
  }

  // Additional animation methods would be implemented similarly...
  private static createGoodbyeAnimation(): SignAnimation[] { return []; }
  private static createMorningAnimation(): SignAnimation[] { return []; }
  private static createPleaseAnimation(): SignAnimation[] { return []; }
  private static createSorryAnimation(): SignAnimation[] { return []; }
  private static createNoAnimation(): SignAnimation[] { return []; }
  private static createHelpAnimation(): SignAnimation[] { return []; }
  private static createStopAnimation(): SignAnimation[] { return []; }

  private createFingerspellingAnimation(word: string): SignAnimation {
    return {
      gesture: 'fingerspell',
      duration: word.length * 800,
      keyframes: word.split('').map((letter, index) => ({
        timestamp: index * 800,
        handPosition: { x: 0, y: 0, z: 0 },
        fingerPositions: this.getLetterFingerPosition(letter),
        description: `Spell letter: ${letter.toUpperCase()}`
      })),
      description: `Fingerspell the word: ${word}`
    };
  }

  private getLetterFingerPosition(letter: string): number[] {
    // Simplified finger positions for ASL alphabet
    // In production, this would be more detailed
    const positions: { [key: string]: number[] } = {
      'a': [0, 1, 1, 1, 1],
      'b': [1, 1, 1, 1, 0],
      'c': [0.5, 0.5, 0.5, 0.5, 0.5],
      // ... more letters would be defined
    };
    return positions[letter.toLowerCase()] || [1, 1, 1, 1, 1];
  }
}