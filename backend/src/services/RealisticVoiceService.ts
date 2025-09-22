import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import type { VoiceData, TTSOptions } from '../types/index.js';

const execAsync = promisify(exec);

export class RealisticVoiceService {
  private audioOutputDir: string;
  private tempFileCounter = 0;
  private isProcessing = false;

  // Voice synthesis settings for natural speech
  private readonly voiceSettings = {
    rate: 0.9,      // Slightly slower for clarity
    volume: 0.85,   // Comfortable volume level
    voice: 'Samantha', // macOS default high-quality voice
    pitch: 1.0      // Natural pitch
  };

  // Common sign language phrases and their natural voice translations
  private readonly signToVoiceTranslations = new Map([
    ['hello', 'Hello there! Nice to meet you.'],
    ['goodbye', 'Goodbye! Take care.'],
    ['thank_you', 'Thank you so much!'],
    ['please', 'Please'],
    ['yes', 'Yes, absolutely.'],
    ['no', 'No, not really.'],
    ['help', 'Can you help me, please?'],
    ['stop', 'Stop, please!'],
    ['sorry', 'I am sorry.'],
    ['excuse_me', 'Excuse me.'],
    ['how_are_you', 'How are you doing today?'],
    ['fine', 'I am doing fine, thank you.'],
    ['good_morning', 'Good morning!'],
    ['good_afternoon', 'Good afternoon!'],
    ['good_evening', 'Good evening!'],
    ['good_night', 'Good night, sleep well.'],
    ['water', 'I would like some water, please.'],
    ['food', 'I am hungry. Can I have some food?'],
    ['bathroom', 'Where is the bathroom?'],
    ['doctor', 'I need to see a doctor.'],
    ['emergency', 'This is an emergency! Please help!'],
    ['pain', 'I am in pain.'],
    ['tired', 'I am feeling tired.'],
    ['happy', 'I am very happy!'],
    ['sad', 'I am feeling sad.'],
    ['confused', 'I am confused. Can you explain?'],
    ['understand', 'I understand now.'],
    ['dont_understand', "I don't understand. Can you repeat?"],
    ['repeat', 'Can you please repeat that?'],
    ['slow_down', 'Please speak more slowly.'],
    ['family', 'This is my family.'],
    ['friend', 'This is my friend.'],
    ['work', 'I need to go to work.'],
    ['home', 'I want to go home.'],
    ['school', 'I go to school here.'],
    ['money', 'How much does this cost?'],
    ['time', 'What time is it?'],
    ['today', 'Today is a good day.'],
    ['tomorrow', 'See you tomorrow.'],
    ['yesterday', 'Yesterday was interesting.'],
    // Numbers to natural speech
    ['zero', 'Zero'],
    ['one', 'One'],
    ['two', 'Two'],
    ['three', 'Three'],
    ['four', 'Four'],
    ['five', 'Five'],
    ['six', 'Six'],
    ['seven', 'Seven'],
    ['eight', 'Eight'],
    ['nine', 'Nine'],
    ['ten', 'Ten'],
    // Common letters/spelling
    ['a', 'The letter A'],
    ['b', 'The letter B'],
    ['c', 'The letter C'],
    ['i_love_you', 'I love you too!']
  ]);

  constructor() {
    this.audioOutputDir = path.join(process.cwd(), 'temp', 'audio');
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Realistic Voice Service...');
      
      // Create audio output directory
      await fs.mkdir(this.audioOutputDir, { recursive: true });
      
      // Test macOS 'say' command availability
      try {
        await execAsync('which say');
        logger.info('macOS text-to-speech (say) command available');
      } catch (error) {
        logger.warn('macOS say command not available, falling back to alternative TTS');
      }

      // Test speech recognition availability (if needed for future features)
      try {
        await execAsync('which speech-recognition');
      } catch {
        logger.info('Speech recognition will use simulation mode');
      }
      
      logger.info('Realistic Voice Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Realistic Voice Service:', error);
      throw error;
    }
  }

  public async speechToText(audioData: VoiceData): Promise<{ text: string; confidence: number }> {
    try {
      if (this.isProcessing) {
        logger.warn('Voice processing already in progress, queuing request...');
        await this.waitForProcessing();
      }

      this.isProcessing = true;
      
      // For now, simulate speech recognition
      // In production, integrate with Google Speech-to-Text, Azure Cognitive Services, or Apple's Speech framework
      const simulatedTranscriptions = [
        "Hello, how are you today?",
        "Can you help me with something?",
        "Thank you for your assistance.",
        "I need directions to the nearest hospital.",
        "What time does the store close?",
        "It's a beautiful day outside.",
        "I would like to order some food.",
        "Where can I find the restroom?",
        "Could you please speak more slowly?",
        "I understand what you're saying."
      ];

      // Simulate processing delay for realism
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
      
      const randomText = simulatedTranscriptions[Math.floor(Math.random() * simulatedTranscriptions.length)];
      const confidence = 0.85 + Math.random() * 0.1; // 85-95% confidence
      
      this.isProcessing = false;
      
      logger.info(`Speech recognized: "${randomText}" (confidence: ${confidence.toFixed(2)})`);
      
      return {
        text: randomText,
        confidence
      };

    } catch (error) {
      this.isProcessing = false;
      logger.error('Error in speech-to-text processing:', error);
      throw error;
    }
  }

  public async textToSpeech(text: string, options: TTSOptions = {}): Promise<string> {
    try {
      if (this.isProcessing) {
        await this.waitForProcessing();
      }

      this.isProcessing = true;
      
      // Generate unique filename for audio output
      const timestamp = Date.now();
      this.tempFileCounter = (this.tempFileCounter + 1) % 1000;
      const filename = `voice_${timestamp}_${this.tempFileCounter}.aiff`;
      const outputPath = path.join(this.audioOutputDir, filename);
      
      // Configure voice settings
      const voice = options.voice || this.voiceSettings.voice;
      const rate = options.speed || this.voiceSettings.rate;
      
      // Use macOS 'say' command for high-quality natural speech
      const sayCommand = `say "${text.replace(/"/g, '\\"')}" -v "${voice}" -r ${rate * 200} -o "${outputPath}"`;
      
      logger.info(`Generating speech: "${text}"`);
      
      try {
        await execAsync(sayCommand);
        
        // Verify the file was created
        await fs.access(outputPath);
        
        // Play the audio automatically (auto-play feature)
        await this.playAudioFile(outputPath);
        
        this.isProcessing = false;
        
        logger.info(`Speech generated and played: ${filename}`);
        
        return outputPath;
        
      } catch (execError) {
        logger.warn('macOS say command failed, using fallback TTS');
        
        // Fallback: Create a simple text-to-speech notification
        await this.playTextAsSound(text);
        
        this.isProcessing = false;
        return 'fallback_tts_used';
      }

    } catch (error) {
      this.isProcessing = false;
      logger.error('Error in text-to-speech processing:', error);
      throw error;
    }
  }

  public async generateVoiceFromGesture(gesture: string): Promise<string> {
    try {
      // Get natural voice translation for the recognized gesture
      const voiceText = this.signToVoiceTranslations.get(gesture) || 
                       this.generateFallbackVoiceText(gesture);
      
      logger.info(`Converting gesture "${gesture}" to voice: "${voiceText}"`);
      
      // Generate and auto-play the speech
      const audioPath = await this.textToSpeech(voiceText);
      
      return voiceText;
      
    } catch (error) {
      logger.error(`Error generating voice from gesture "${gesture}":`, error);
      throw error;
    }
  }

  private generateFallbackVoiceText(gesture: string): string {
    // Handle unknown gestures gracefully
    if (gesture === 'unknown' || !gesture) {
      return "I detected a gesture, but I'm not sure what it means.";
    }
    
    // Convert gesture name to readable text
    const readable = gesture
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
    
    return `I see the gesture: ${readable}`;
  }

  private async playAudioFile(audioPath: string): Promise<void> {
    try {
      // Auto-play the generated audio using macOS 'afplay'
      const playCommand = `afplay "${audioPath}"`;
      
      logger.info('Auto-playing generated voice...');
      
      // Play in background (non-blocking)
      exec(playCommand, (error) => {
        if (error) {
          logger.warn('Failed to auto-play audio:', error.message);
        } else {
          logger.info('Voice played successfully');
        }
        
        // Clean up temporary file after a delay
        setTimeout(() => {
          this.cleanupTempFile(audioPath);
        }, 5000);
      });
      
    } catch (error) {
      logger.warn('Error playing audio file:', error);
    }
  }

  private async playTextAsSound(text: string): Promise<void> {
    try {
      // Fallback: Use system notification sound or basic beep
      const notification = `osascript -e 'display notification "${text}" with title "Sign Language Translation" sound name "Glass"'`;
      
      await execAsync(notification);
      logger.info('Played fallback notification for:', text);
      
    } catch (error) {
      logger.warn('Fallback sound notification failed:', error);
    }
  }

  private async waitForProcessing(): Promise<void> {
    const maxWait = 5000; // 5 seconds maximum wait
    const startTime = Date.now();
    
    while (this.isProcessing && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.debug(`Cleaned up temporary audio file: ${filePath}`);
    } catch (error) {
      logger.debug(`Could not clean up temporary file ${filePath}:`, error);
    }
  }

  public async cleanupAllTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.audioOutputDir);
      
      for (const file of files) {
        if (file.startsWith('voice_') && file.endsWith('.aiff')) {
          await this.cleanupTempFile(path.join(this.audioOutputDir, file));
        }
      }
      
      logger.info('Cleaned up all temporary audio files');
      
    } catch (error) {
      logger.warn('Error cleaning up temporary files:', error);
    }
  }

  public validateAudioFormat(audioData: VoiceData): boolean {
    if (!audioData || !audioData.audioBuffer) {
      return false;
    }
    
    // Basic validation for audio data
    const minDuration = 0.1; // 100ms minimum
    const maxDuration = 30;  // 30 seconds maximum
    const validSampleRates = [16000, 22050, 44100, 48000];
    
    return (
      audioData.duration >= minDuration &&
      audioData.duration <= maxDuration &&
      validSampleRates.includes(audioData.sampleRate) &&
      audioData.audioBuffer.byteLength > 0
    );
  }

  public getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU',
      'es-ES', 'es-MX',
      'fr-FR', 'fr-CA',
      'de-DE', 'it-IT',
      'pt-BR', 'pt-PT',
      'zh-CN', 'ja-JP'
    ];
  }

  public getAvailableVoices(): Array<{ name: string; language: string; description: string }> {
    return [
      { name: 'Samantha', language: 'en-US', description: 'Natural American English female voice' },
      { name: 'Alex', language: 'en-US', description: 'Natural American English male voice' },
      { name: 'Victoria', language: 'en-US', description: 'Clear American English female voice' },
      { name: 'Daniel', language: 'en-GB', description: 'British English male voice' },
      { name: 'Serena', language: 'en-GB', description: 'British English female voice' },
      { name: 'Jorge', language: 'es-ES', description: 'Spanish male voice' },
      { name: 'Monica', language: 'es-ES', description: 'Spanish female voice' }
    ];
  }

  public async dispose(): Promise<void> {
    logger.info('Disposing Realistic Voice Service...');
    
    // Wait for any ongoing processing to complete
    await this.waitForProcessing();
    
    // Clean up all temporary files
    await this.cleanupAllTempFiles();
    
    logger.info('Realistic Voice Service disposed');
  }
}