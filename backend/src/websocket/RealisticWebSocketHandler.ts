import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { SimpleRealisticSignLanguageService } from '../services/SimpleRealisticSignLanguageService.js';
import { RealisticVoiceService } from '../services/RealisticVoiceService.js';
import { Avatar3DService } from '../services/Avatar3DService.js';
import { TranslationService } from '../services/TranslationService.js';
import type { SignLanguageData, VoiceData, TranslationResult } from '../types/index.js';

export class RealisticWebSocketHandler {
  private io: Server;
  private signLanguageService: SimpleRealisticSignLanguageService;
  private voiceService: RealisticVoiceService;
  private avatarService: Avatar3DService;
  private translationService: TranslationService;
  private connectedClients: Map<string, { id: string; sessionId: string; lastActivity: number }> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.signLanguageService = new SimpleRealisticSignLanguageService();
    this.voiceService = new RealisticVoiceService();
    this.avatarService = new Avatar3DService();
    this.translationService = new TranslationService();
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Realistic WebSocket Handler...');
      
      // Initialize all services (note: TranslationService doesn't need initialization)
      await Promise.all([
        this.signLanguageService.initialize(),
        this.voiceService.initialize(),
        this.avatarService.initialize()
      ]);
      
      // Setup WebSocket connection handlers
      this.setupSocketHandlers();
      
      logger.info('Realistic WebSocket Handler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Realistic WebSocket Handler:', error);
      throw error;
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      const sessionId = this.generateSessionId();
      
      logger.info(`Client connected: ${clientId} (Session: ${sessionId})`);
      
      // Store client info
      this.connectedClients.set(clientId, {
        id: clientId,
        sessionId,
        lastActivity: Date.now()
      });

      // Send initial configuration to client
      socket.emit('system-ready', {
        avatarModel: this.avatarService.getAvatarModel(),
        supportedGestures: this.signLanguageService.getSupportedGestures(),
        availableVoices: this.voiceService.getAvailableVoices(),
        sessionId,
        timestamp: Date.now()
      });

      // Handle video frame processing for realistic sign language detection
      socket.on('video-frame', async (data: { frame: string; timestamp: number; sessionId: string }) => {
        try {
          if (this.processingQueue.get(`sign-${clientId}`)) {
            return; // Skip if already processing to prevent overload
          }

          this.processingQueue.set(`sign-${clientId}`, true);
          this.updateClientActivity(clientId);

          logger.debug(`Processing video frame for client ${clientId}`);
          
          // Process frame for realistic sign language detection
          const signData = await this.signLanguageService.processFrame(data.frame);
          
          if (signData) {
            signData.sessionId = sessionId;
            
            // Add gesture description if available
            if (signData.recognizedGesture && signData.recognizedGesture !== 'unknown') {
              signData.gestureDescription = this.signLanguageService.getGestureDescription(signData.recognizedGesture);
            }
            
            // Emit sign detection result
            socket.emit('sign-detected', signData);
            logger.info(`Sign detected for client ${clientId}: ${signData.recognizedGesture} (confidence: ${signData.confidence.toFixed(2)})`);
            
            // Generate and update 3D avatar pose
            const avatarPose = await this.avatarService.generateAvatarPose(signData);
            socket.emit('avatar-pose-update', avatarPose);
            
            // Auto-generate voice if high confidence gesture detected
            if (signData.recognizedGesture && 
                signData.recognizedGesture !== 'unknown' && 
                signData.confidence > 0.7) {
              
              await this.processSignToVoiceAuto(signData, socket);
            }
          }
          
        } catch (error) {
          logger.error(`Error processing video frame for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to process video frame', 
            code: 'REALISTIC_SIGN_PROCESSING_ERROR' 
          });
        } finally {
          this.processingQueue.set(`sign-${clientId}`, false);
        }
      });

      // Handle audio data for realistic speech processing
      socket.on('audio-data', async (data: VoiceData) => {
        try {
          if (this.processingQueue.get(`voice-${clientId}`)) {
            return; // Skip if already processing
          }

          this.processingQueue.set(`voice-${clientId}`, true);
          this.updateClientActivity(clientId);

          logger.debug(`Processing audio data for client ${clientId}`);
          
          // Validate audio data format
          if (!this.voiceService.validateAudioFormat(data)) {
            socket.emit('error', { 
              message: 'Invalid audio format', 
              code: 'AUDIO_FORMAT_ERROR' 
            });
            return;
          }

          // Convert speech to text with realistic processing
          const speechResult = await this.voiceService.speechToText(data);
          
          socket.emit('text-recognized', {
            text: speechResult.text,
            confidence: speechResult.confidence,
            sessionId,
            timestamp: Date.now()
          });

          logger.info(`Speech recognized for client ${clientId}: "${speechResult.text}" (confidence: ${speechResult.confidence.toFixed(2)})`);
          
          // Generate sign language representation with 3D avatar
          await this.processVoiceToSignAuto(speechResult.text, socket, sessionId);
          
        } catch (error) {
          logger.error(`Error processing audio data for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to process audio data', 
            code: 'REALISTIC_VOICE_PROCESSING_ERROR' 
          });
        } finally {
          this.processingQueue.set(`voice-${clientId}`, false);
        }
      });

      // Handle manual gesture playback requests
      socket.on('play-gesture', async (data: { gesture: string }) => {
        try {
          logger.info(`Manual gesture playback requested by client ${clientId}: ${data.gesture}`);
          
          // Play gesture animation on 3D avatar
          await this.avatarService.playGestureSequence(data.gesture);
          
          // Generate and auto-play voice for the gesture
          const voiceText = await this.voiceService.generateVoiceFromGesture(data.gesture);
          
          socket.emit('gesture-played', {
            gesture: data.gesture,
            voiceText,
            avatarAnimation: true,
            timestamp: Date.now()
          });
          
          logger.info(`Gesture animation and voice completed for: ${data.gesture}`);
          
        } catch (error) {
          logger.error(`Error playing gesture for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to play gesture', 
            code: 'GESTURE_ANIMATION_ERROR' 
          });
        }
      });

      // Handle text-to-speech requests with auto-play
      socket.on('speak-text', async (data: { text: string; voice?: string; speed?: number }) => {
        try {
          logger.info(`Text-to-speech requested by client ${clientId}: "${data.text}"`);
          
          // Generate and auto-play speech
          const audioPath = await this.voiceService.textToSpeech(data.text, {
            voice: data.voice,
            speed: data.speed
          });
          
          socket.emit('speech-generated', {
            text: data.text,
            audioPath,
            autoPlayed: true,
            timestamp: Date.now()
          });
          
        } catch (error) {
          logger.error(`Error generating speech for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to generate speech', 
            code: 'TTS_ERROR' 
          });
        }
      });

      // Handle translation requests
      socket.on('request-translation', async (data: { text: string; targetType: 'sign' | 'voice' }) => {
        try {
          logger.info(`Translation requested for client ${clientId}: "${data.text}" -> ${data.targetType}`);
          
          let translationResult: TranslationResult;
          
          if (data.targetType === 'voice') {
            // Convert sign/text to voice - create a simple translation
            translationResult = {
              originalType: 'sign',
              translatedText: data.text,
              confidence: 0.9,
              timestamp: Date.now(),
              sessionId
            };
            
            // Auto-play voice
            await this.voiceService.textToSpeech(data.text);
          } else {
            // Convert voice/text to sign
            const signResult = await this.translationService.textToSign(data.text);
            
            translationResult = {
              originalType: 'voice',
              translatedText: signResult ? signResult.signDescription : `Sign representation: ${data.text}`,
              confidence: signResult ? signResult.confidence : 0.7,
              timestamp: Date.now(),
              sessionId
            };
            
            // Auto-show avatar animation
            const gesture = this.extractGestureFromText(data.text);
            if (gesture) {
              await this.avatarService.playGestureSequence(gesture);
              socket.emit('avatar-gesture', { gesture, text: data.text });
            }
          }
          
          socket.emit('translation-result', translationResult);
          
        } catch (error) {
          logger.error(`Error processing translation for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to process translation', 
            code: 'TRANSLATION_ERROR' 
          });
        }
      });

      // Handle avatar customization requests
      socket.on('customize-avatar', async (data: { settings: any }) => {
        try {
          logger.info(`Avatar customization requested by client ${clientId}`);
          
          // Send updated avatar model
          socket.emit('avatar-customized', {
            avatarModel: this.avatarService.getAvatarModel(),
            settings: data.settings,
            timestamp: Date.now()
          });
          
        } catch (error) {
          logger.error(`Error customizing avatar for client ${clientId}:`, error);
          socket.emit('error', { 
            message: 'Failed to customize avatar', 
            code: 'AVATAR_CUSTOMIZATION_ERROR' 
          });
        }
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${clientId}`);
        
        // Cleanup client data
        this.connectedClients.delete(clientId);
        this.processingQueue.delete(`sign-${clientId}`);
        this.processingQueue.delete(`voice-${clientId}`);
      });

      // Handle client errors
      socket.on('error', (error) => {
        logger.error(`Socket error for client ${clientId}:`, error);
      });

      // Periodic health check and status update
      const healthCheckInterval = setInterval(() => {
        if (this.connectedClients.has(clientId)) {
          socket.emit('health-check', {
            timestamp: Date.now(),
            connectedClients: this.connectedClients.size,
            processingStatus: {
              signProcessing: this.processingQueue.get(`sign-${clientId}`) || false,
              voiceProcessing: this.processingQueue.get(`voice-${clientId}`) || false
            },
            systemStatus: 'operational'
          });
        } else {
          clearInterval(healthCheckInterval);
        }
      }, 10000); // Every 10 seconds
    });
  }

  private async processSignToVoiceAuto(signData: SignLanguageData, socket: Socket): Promise<void> {
    try {
      if (!signData.recognizedGesture || signData.recognizedGesture === 'unknown') {
        return;
      }

      logger.info(`Auto-converting sign to voice: ${signData.recognizedGesture}`);
      
      // Generate natural voice from gesture (automatically plays)
      const voiceText = await this.voiceService.generateVoiceFromGesture(signData.recognizedGesture);
      
      // Create translation result
      const translationResult: TranslationResult = {
        originalType: 'sign',
        translatedText: voiceText,
        confidence: signData.confidence,
        timestamp: Date.now(),
        sessionId: signData.sessionId
      };
      
      // Emit translation result to client
      socket.emit('translation-result', translationResult);
      socket.emit('auto-voice-played', {
        gesture: signData.recognizedGesture,
        voiceText,
        confidence: signData.confidence,
        timestamp: Date.now()
      });
      
      logger.info(`Auto sign-to-voice completed: "${voiceText}"`);
      
    } catch (error) {
      logger.error('Error in auto sign-to-voice conversion:', error);
      socket.emit('error', { 
        message: 'Failed to auto-convert sign to voice', 
        code: 'AUTO_SIGN_TO_VOICE_ERROR' 
      });
    }
  }

  private async processVoiceToSignAuto(text: string, socket: Socket, sessionId: string): Promise<void> {
    try {
      logger.info(`Auto-converting voice to sign: "${text}"`);
      
      // Extract potential gestures from recognized text
      const gesture = this.extractGestureFromText(text);
      
      if (gesture) {
        // Automatically play gesture animation on 3D avatar
        await this.avatarService.playGestureSequence(gesture);
        
        // Create translation result
        const translationResult: TranslationResult = {
          originalType: 'voice',
          translatedText: `Sign gesture: ${gesture}`,
          confidence: 0.85,
          timestamp: Date.now(),
          sessionId
        };
        
        socket.emit('translation-result', translationResult);
        socket.emit('auto-avatar-gesture', { 
          gesture, 
          originalText: text,
          gestureDescription: this.signLanguageService.getGestureDescription(gesture),
          timestamp: Date.now()
        });
        
        logger.info(`Auto voice-to-sign completed: gesture "${gesture}"`);
      } else {
        // No direct gesture match, provide text-based sign description
        const signDescription = this.generateSignDescription(text);
        
        const translationResult: TranslationResult = {
          originalType: 'voice',
          translatedText: signDescription,
          confidence: 0.6,
          timestamp: Date.now(),
          sessionId
        };
        
        socket.emit('translation-result', translationResult);
        socket.emit('sign-description', {
          originalText: text,
          signDescription,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      logger.error('Error in auto voice-to-sign conversion:', error);
      socket.emit('error', { 
        message: 'Failed to auto-convert voice to sign', 
        code: 'AUTO_VOICE_TO_SIGN_ERROR' 
      });
    }
  }

  private extractGestureFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Comprehensive gesture keyword mappings
    const gestureKeywords: { [key: string]: string } = {
      // Greetings
      'hello': 'hello', 'hi': 'hello', 'hey': 'hello',
      'goodbye': 'goodbye', 'bye': 'goodbye', 'see you': 'goodbye',
      'good morning': 'good_morning', 'good afternoon': 'good_afternoon', 
      'good evening': 'good_evening', 'good night': 'good_night',
      
      // Courtesy
      'thank you': 'thank_you', 'thanks': 'thank_you', 'thank': 'thank_you',
      'please': 'please', 'sorry': 'sorry', 'excuse me': 'excuse_me',
      
      // Basic responses
      'yes': 'yes', 'yeah': 'yes', 'okay': 'yes', 'ok': 'yes',
      'no': 'no', 'nope': 'no', 'not': 'no',
      
      // Actions
      'help': 'help', 'stop': 'stop', 'wait': 'stop',
      
      // Needs
      'water': 'water', 'drink': 'water', 'thirsty': 'water',
      'food': 'food', 'eat': 'food', 'hungry': 'food',
      'bathroom': 'bathroom', 'restroom': 'bathroom', 'toilet': 'bathroom',
      
      // Emotions
      'happy': 'happy', 'sad': 'sad', 'tired': 'tired',
      'pain': 'pain', 'hurt': 'pain',
      
      // Relationships
      'love you': 'i_love_you', 'love': 'i_love_you',
      'family': 'family', 'friend': 'friend',
      
      // Places
      'home': 'home', 'work': 'work', 'school': 'school',
      
      // Time
      'time': 'time', 'today': 'today', 'tomorrow': 'tomorrow', 'yesterday': 'yesterday',
      
      // Understanding
      'understand': 'understand', 'confused': 'confused', 'repeat': 'repeat',
      'dont understand': 'dont_understand', "don't understand": 'dont_understand',
      'slow down': 'slow_down', 'slower': 'slow_down'
    };
    
    // Check for gesture keywords in text
    for (const [keyword, gesture] of Object.entries(gestureKeywords)) {
      if (lowerText.includes(keyword)) {
        return gesture;
      }
    }
    
    // Check for numbers (0-10)
    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    for (let i = 0; i < numbers.length; i++) {
      if (lowerText.includes(numbers[i]) || lowerText.includes(i.toString())) {
        return numbers[i];
      }
    }
    
    // Check for common letters
    const letters = ['a', 'b', 'c', 'd', 'e'];
    for (const letter of letters) {
      if (lowerText.includes(`letter ${letter}`) || lowerText === letter) {
        return letter;
      }
    }
    
    return null;
  }

  private generateSignDescription(text: string): string {
    // Generate a helpful description for sign language representation
    const words = text.split(' ');
    const shortText = words.slice(0, 6).join(' '); // Limit to first 6 words for clarity
    
    if (words.length <= 3) {
      return `Spell out: "${shortText}" using fingerspelling`;
    } else {
      return `Sign language representation: "${shortText}" - Use combination of gestures and fingerspelling`;
    }
  }

  private updateClientActivity(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  private generateSessionId(): string {
    return `realistic_session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Public status methods
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public getProcessingStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    for (const [key, value] of this.processingQueue) {
      status[key] = value;
    }
    return status;
  }

  public getSystemHealth(): any {
    return {
      connectedClients: this.connectedClients.size,
      processingQueues: this.processingQueue.size,
      services: {
        signLanguage: 'operational',
        voice: 'operational', 
        avatar: 'operational',
        translation: 'operational'
      },
      timestamp: Date.now()
    };
  }

  public async dispose(): Promise<void> {
    logger.info('Disposing Realistic WebSocket Handler...');
    
    // Clear all processing queues and connections
    this.processingQueue.clear();
    this.connectedClients.clear();
    
    // Dispose all services (TranslationService doesn't need disposal)
    await Promise.all([
      this.signLanguageService.dispose(),
      this.voiceService.dispose(),
      this.avatarService.dispose()
    ]);
    
    logger.info('Realistic WebSocket Handler disposed successfully');
  }
}