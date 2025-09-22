import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { SignLanguageService } from '../services/SignLanguageService.js';
import { VoiceService } from '../services/VoiceService.js';
import { TranslationService } from '../services/TranslationService.js';
import type { SocketEvents, VoiceData } from '../types/index.js';

export class WebSocketHandler {
  private io: Server;
  private signLanguageService: SignLanguageService;
  private voiceService: VoiceService;
  private translationService: TranslationService;
  private activeConnections = new Map<string, Socket>();

  constructor(io: Server) {
    this.io = io;
    this.signLanguageService = new SignLanguageService();
    this.voiceService = new VoiceService();
    this.translationService = new TranslationService();
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize AI services
      await this.signLanguageService.initialize();
      await this.voiceService.initialize();
      
      logger.info('WebSocket handler initialized successfully');
      this.setupSocketHandlers();
    } catch (error) {
      logger.error('Failed to initialize WebSocket handler:', error);
      throw error;
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const sessionId = socket.id;
      this.activeConnections.set(sessionId, socket);
      
      logger.info(`Client connected: ${sessionId}`);

      // Handle video frame data for sign language detection
      socket.on('video-frame', async (data: { frame: string; timestamp: number; sessionId: string }) => {
        try {
          logger.debug('Received video frame', { sessionId: data.sessionId });
          
          // Process the video frame for sign language detection
          const signData = await this.signLanguageService.processFrame(data.frame);
          
          if (signData && signData.confidence > 0.7) {
            // Send detected sign data back to client
            socket.emit('sign-detected', {
              ...signData,
              sessionId: data.sessionId,
              timestamp: data.timestamp
            });

            // If we have a complete gesture, translate it to text
            const translationResult = await this.translationService.signToText(signData);
            if (translationResult) {
              socket.emit('translation-result', {
                originalType: 'sign',
                translatedText: translationResult.text,
                confidence: translationResult.confidence,
                timestamp: Date.now(),
                sessionId: data.sessionId
              });
            }
          }
        } catch (error) {
          logger.error('Error processing video frame:', error);
          socket.emit('error', { 
            message: 'Failed to process video frame', 
            code: 'VIDEO_PROCESSING_ERROR' 
          });
        }
      });

      // Handle audio data for voice recognition
      socket.on('audio-data', async (data: VoiceData) => {
        try {
          logger.debug('Received audio data', { sessionId: data.sessionId });
          
          // Process audio for speech recognition
          const textResult = await this.voiceService.speechToText(data.audioBuffer);
          
          if (textResult && textResult.confidence > 0.5) {
            socket.emit('text-recognized', {
              text: textResult.text,
              confidence: textResult.confidence,
              sessionId: data.sessionId
            });

            // Translate text to sign language representation
            const signTranslation = await this.translationService.textToSign(textResult.text);
            if (signTranslation) {
              socket.emit('translation-result', {
                originalType: 'voice',
                translatedText: signTranslation.signDescription,
                confidence: signTranslation.confidence,
                timestamp: Date.now(),
                sessionId: data.sessionId
              });
            }
          }
        } catch (error) {
          logger.error('Error processing audio data:', error);
          socket.emit('error', { 
            message: 'Failed to process audio data', 
            code: 'AUDIO_PROCESSING_ERROR' 
          });
        }
      });

      // Handle text input for sign language generation
      socket.on('generate-sign', async (data: { text: string; sessionId: string }) => {
        try {
          logger.debug('Generating sign language for text', { text: data.text, sessionId: data.sessionId });
          
          const signAnimation = await this.translationService.textToSign(data.text);
          if (signAnimation) {
            socket.emit('sign-animation', {
              animations: signAnimation.animations,
              text: data.text,
              sessionId: data.sessionId,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          logger.error('Error generating sign language:', error);
          socket.emit('error', { 
            message: 'Failed to generate sign language', 
            code: 'SIGN_GENERATION_ERROR' 
          });
        }
      });

      // Handle text-to-speech requests
      socket.on('text-to-speech', async (data: { text: string; sessionId: string; options?: any }) => {
        try {
          logger.debug('Converting text to speech', { text: data.text, sessionId: data.sessionId });
          
          const audioBuffer = await this.voiceService.textToSpeech(data.text, data.options);
          if (audioBuffer) {
            socket.emit('speech-audio', {
              audioData: audioBuffer,
              text: data.text,
              sessionId: data.sessionId,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          logger.error('Error converting text to speech:', error);
          socket.emit('error', { 
            message: 'Failed to convert text to speech', 
            code: 'TTS_ERROR' 
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${sessionId}`);
        this.activeConnections.delete(sessionId);
      });

      // Send initial connection success message
      socket.emit('connected', { 
        sessionId, 
        timestamp: Date.now(),
        message: 'Connected to GestureVoice server' 
      });
    });
  }

  public getActiveConnections(): number {
    return this.activeConnections.size;
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket handler...');
    
    // Clean up services
    await this.signLanguageService.dispose();
    await this.voiceService.dispose();
    
    // Close all connections
    this.activeConnections.forEach(socket => socket.disconnect());
    this.activeConnections.clear();
    
    logger.info('WebSocket handler shut down complete');
  }
}