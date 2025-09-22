import React from 'react';
import { MessageSquare, Volume2 } from 'lucide-react';
import type { Mode } from '../App';

interface TranslationPanelProps {
  mode: Mode;
  currentText: string;
  isProcessing: boolean;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({ 
  mode, 
  currentText, 
  isProcessing 
}) => {
  const handleSpeak = () => {
    if (currentText && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Text Translation</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <MessageSquare className="w-4 h-4" />
          <span>Speech Output</span>
        </div>
      </div>

      {/* Recognition Status */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">Recognition Status:</span>
          <span className={`text-sm font-medium ${
            isProcessing ? 'text-emerald-400' : 'text-gray-500'
          }`}>
            {isProcessing ? 'Processing Signs...' : 'Waiting'}
          </span>
        </div>
        
        {isProcessing && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Analyzing hand movements and gestures</p>
          </div>
        )}
      </div>

      {/* Translated Text Display */}
      <div className="bg-gray-900 rounded-lg p-6 flex-1 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-400">Translated Text:</span>
          {currentText && (
            <button
              onClick={handleSpeak}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Speak text aloud"
            >
              <Volume2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
        
        <div className="min-h-[200px] bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-600">
          {isProcessing ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded animate-pulse w-2/3"></div>
            </div>
          ) : currentText ? (
            <p className="text-white text-lg leading-relaxed">{currentText}</p>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-center">
                Start recording to see sign language<br />
                converted to text here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Translations */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Translations:</h3>
        <div className="space-y-2 max-h-24 overflow-y-auto">
          {currentText ? (
            <div className="text-sm text-gray-300 bg-gray-800 rounded px-3 py-1">
              "{currentText}"
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No recent translations</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;