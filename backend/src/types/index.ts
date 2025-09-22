export interface SignLanguageData {
  landmarks: number[][];
  confidence: number;
  timestamp: number;
  sessionId: string;
  recognizedGesture?: string;
  gestureDescription?: string;
}

export interface VoiceData {
  audioBuffer: ArrayBuffer;
  duration: number;
  sampleRate: number;
  timestamp: number;
  sessionId: string;
}

export interface TranslationResult {
  originalType: 'sign' | 'voice';
  translatedText: string;
  confidence: number;
  timestamp: number;
  sessionId: string;
}

export interface SocketEvents {
  'video-frame': (data: { frame: string; timestamp: number; sessionId: string }) => void;
  'audio-data': (data: VoiceData) => void;
  'sign-detected': (data: SignLanguageData) => void;
  'text-recognized': (data: { text: string; confidence: number; sessionId: string }) => void;
  'translation-result': (data: TranslationResult) => void;
  'error': (error: { message: string; code: string }) => void;
}

export interface SignDetectionModel {
  predict(frameData: string): Promise<SignLanguageData>;
  initialize(): Promise<void>;
  dispose(): void;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  language?: string;
}