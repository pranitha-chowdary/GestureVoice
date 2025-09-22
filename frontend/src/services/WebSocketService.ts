import { io, Socket } from 'socket.io-client';

export interface WebSocketEvents {
  'video-frame': (data: { frame: string; timestamp: number; sessionId: string }) => void;
  'audio-data': (data: { audioBuffer: ArrayBuffer; duration: number; sessionId: string }) => void;
  'sign-detected': (data: { landmarks: number[][]; confidence: number; sessionId: string; timestamp: number }) => void;
  'text-recognized': (data: { text: string; confidence: number; sessionId: string }) => void;
  'translation-result': (data: { originalType: 'sign' | 'voice'; translatedText: string; confidence: number; sessionId: string }) => void;
  'speech-audio': (data: { audioData: ArrayBuffer; text: string; sessionId: string }) => void;
  'sign-animation': (data: { animations: any[]; text: string; sessionId: string }) => void;
  'connected': (data: { sessionId: string; message: string }) => void;
  'error': (error: { message: string; code: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private sessionId: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(serverUrl: string = 'http://localhost:3001'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to GestureVoice backend');
        this.reconnectAttempts = 0;
      });

      this.socket.on('connected', (data: { sessionId: string; message: string }) => {
        this.sessionId = data.sessionId;
        console.log('Session established:', data.message);
        resolve(data.sessionId);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, attempt to reconnect
          this.attemptReconnect();
        }
      });

      // Set up event handlers
      this.setupEventHandlers();
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('sign-detected', (data) => {
      console.log('Sign detected:', data);
      this.emit('sign-detected', data);
    });

    this.socket.on('text-recognized', (data) => {
      console.log('Text recognized:', data);
      this.emit('text-recognized', data);
    });

    this.socket.on('translation-result', (data) => {
      console.log('Translation result:', data);
      this.emit('translation-result', data);
    });

    this.socket.on('speech-audio', (data) => {
      console.log('Speech audio received');
      this.emit('speech-audio', data);
    });

    this.socket.on('sign-animation', (data) => {
      console.log('Sign animation received:', data);
      this.emit('sign-animation', data);
    });

    this.socket.on('error', (error) => {
      console.error('Server error:', error);
      this.emit('error', error);
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, 2000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Send video frame for sign language detection
  sendVideoFrame(frameData: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('video-frame', {
        frame: frameData,
        timestamp: Date.now(),
        sessionId: this.sessionId
      });
    }
  }

  // Send audio data for speech recognition
  sendAudioData(audioBuffer: ArrayBuffer, duration: number): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('audio-data', {
        audioBuffer,
        duration,
        sampleRate: 16000,
        timestamp: Date.now(),
        sessionId: this.sessionId
      });
    }
  }

  // Request sign language animation for text
  generateSignLanguage(text: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('generate-sign', {
        text,
        sessionId: this.sessionId
      });
    }
  }

  // Request text-to-speech conversion
  textToSpeech(text: string, options?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('text-to-speech', {
        text,
        options,
        sessionId: this.sessionId
      });
    }
  }

  // Event handling
  private eventListeners: { [key: string]: Function[] } = {};

  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit<K extends keyof WebSocketEvents>(event: K, data: Parameters<WebSocketEvents[K]>[0]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = '';
      this.eventListeners = {};
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();