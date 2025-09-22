import React, { useState, useEffect } from 'react';
import { Play, Square, Mic, MicOff, Settings } from 'lucide-react';
import type { Mode } from '../App';
import { webSocketService } from '../services/WebSocketService';

interface ControlPanelProps {
  mode: Mode;
  isRecording: boolean;
  onStartStop: () => void;
  onTextUpdate: (text: string) => void;
  onTranslationUpdate: (translation: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  isRecording,
  onStartStop,
  onTextUpdate,
  onTranslationUpdate
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // Initialize WebSocket connection and speech recognition
  useEffect(() => {
    console.log('Initializing ControlPanel with WebSocket connection...');
    
    // Connect to backend
    webSocketService.connect()
      .then((sessionId) => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        console.log('✅ Connected to backend with session:', sessionId);
      })
      .catch((error) => {
        setIsConnected(false);
        setConnectionStatus('Connection Failed');
        console.error('❌ Failed to connect to backend:', error);
      });

    // Set up WebSocket event listeners
    webSocketService.on('text-recognized', (data) => {
      console.log('🗣️ Text recognized from backend:', data);
      onTextUpdate(data.text);
    });

    webSocketService.on('translation-result', (data) => {
      console.log('🔄 Translation result from backend:', data);
      onTranslationUpdate(data.translatedText);
      
      // If it's speech-to-text, also speak it out
      if (data.originalType === 'sign') {
        webSocketService.textToSpeech(data.translatedText);
      }
    });

    webSocketService.on('speech-audio', (data) => {
      console.log('🔊 Speech audio received from backend');
      // Play the audio
      const audioBlob = new Blob([data.audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);
    });

    webSocketService.on('sign-animation', (data) => {
      console.log('👋 Sign animation received:', data);
      onTranslationUpdate(data.text);
    });

    webSocketService.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('Error: ' + error.message);
    });

    return () => {
      webSocketService.disconnect();
    };
  }, [onTextUpdate, onTranslationUpdate]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          console.log('🎤 Speech recognition result:', finalTranscript);
          onTextUpdate(finalTranscript);
          
          // Send to backend for sign language generation
          if (mode === 'voice-to-sign') {
            console.log('📤 Sending text to backend for sign language generation:', finalTranscript);
            webSocketService.generateSignLanguage(finalTranscript);
            onTranslationUpdate(`Processing: "${finalTranscript}"`);
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, [mode, onTextUpdate, onTranslationUpdate]);

  // Handle recording state changes
  useEffect(() => {
    if (recognition) {
      if (isRecording && mode === 'voice-to-sign') {
        try {
          recognition.start();
          setIsListening(true);
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
        }
      } else {
        if (isListening) {
          recognition.stop();
          setIsListening(false);
        }
      }
    }

    // Simulate sign language recognition for sign-to-voice mode
    if (isRecording && mode === 'sign-to-voice') {
      const mockSigns = [
        "Hello, how are you?",
        "Thank you very much",
        "Nice to meet you",
        "Have a great day",
        "See you later"
      ];
      
      const interval = setInterval(() => {
        const randomText = mockSigns[Math.floor(Math.random() * mockSigns.length)];
        onTextUpdate(randomText);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isRecording, mode, recognition, isListening, onTextUpdate]);

  const handleStartStop = () => {
    onStartStop();
    if (isRecording && recognition && isListening) {
      recognition.stop();
    }
  };

  return (
    <div className="mt-8 bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Main Control Button */}
          <button
            onClick={handleStartStop}
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5" />
                <span>Stop {mode === 'voice-to-sign' ? 'Recording' : 'Recognition'}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start {mode === 'voice-to-sign' ? 'Recording' : 'Recognition'}</span>
              </>
            )}
          </button>

          {/* Audio Status */}
          {mode === 'voice-to-sign' && (
            <div className="flex items-center space-x-2">
              {isListening ? (
                <Mic className="w-5 h-5 text-emerald-400" />
              ) : (
                <MicOff className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-sm text-gray-400">
                {isListening ? 'Listening...' : 'Audio Off'}
              </span>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gray-900 rounded-lg">
        <p className="text-sm text-gray-400">
          {mode === 'voice-to-sign' ? (
            <>
              <span className="text-blue-400 font-medium">Voice to Sign:</span> Click start and speak clearly. 
              Your words will be converted to sign language and displayed by the 3D avatar.
            </>
          ) : (
            <>
              <span className="text-emerald-400 font-medium">Sign to Voice:</span> Click start and perform signs 
              in front of the camera. The AI will recognize your gestures and speak them aloud.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;