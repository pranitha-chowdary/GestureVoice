import React, { useEffect, useState } from 'react';
import { Bot, Hand } from 'lucide-react';

interface AvatarPanelProps {
  isAnimating: boolean;
  translatedContent: string;
}

const AvatarPanel: React.FC<AvatarPanelProps> = ({ isAnimating, translatedContent }) => {
  const [currentSign, setCurrentSign] = useState('');
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnimating) {
      interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 4);
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnimating]);

  const mockSigns = ['Hello', 'How', 'Are', 'You', 'Today'];

  useEffect(() => {
    if (isAnimating) {
      const signInterval = setInterval(() => {
        const randomSign = mockSigns[Math.floor(Math.random() * mockSigns.length)];
        setCurrentSign(randomSign);
      }, 1000);

      return () => clearInterval(signInterval);
    } else {
      setCurrentSign('');
    }
  }, [isAnimating]);

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">3D Avatar</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Bot className="w-4 h-4" />
          <span>Sign Language</span>
        </div>
      </div>

      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden mb-4">
        {/* 3D Avatar Placeholder */}
        <div className="flex items-center justify-center h-full">
          <div className={`transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
            <div className="relative">
              {/* Avatar Figure */}
              <div className="w-32 h-48 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full relative mx-auto">
                {/* Head */}
                <div className="w-16 h-16 bg-gradient-to-b from-amber-400 to-amber-500 rounded-full absolute -top-2 left-1/2 transform -translate-x-1/2 border-4 border-gray-800">
                  {/* Eyes */}
                  <div className="flex space-x-2 justify-center mt-4">
                    <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                  </div>
                  {/* Mouth */}
                  <div className="w-4 h-1 bg-gray-800 rounded-full mx-auto mt-2"></div>
                </div>
                
                {/* Arms/Hands */}
                <div className={`absolute top-8 -left-6 transition-all duration-300 ${
                  isAnimating ? 'animate-pulse' : ''
                }`}>
                  <Hand className={`w-8 h-8 text-amber-400 transform ${
                    animationFrame % 2 === 0 ? 'rotate-12' : '-rotate-12'
                  } transition-transform duration-300`} />
                </div>
                <div className={`absolute top-8 -right-6 transition-all duration-300 ${
                  isAnimating ? 'animate-pulse' : ''
                }`}>
                  <Hand className={`w-8 h-8 text-amber-400 transform ${
                    animationFrame % 2 === 1 ? 'rotate-12' : '-rotate-12'
                  } transition-transform duration-300`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAnimating && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-gray-900/90 to-transparent">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-600/90 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">
                  {currentSign || 'Signing...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Translation Text */}
      <div className="bg-gray-900 rounded-lg p-4 min-h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">Current Translation:</span>
          {isAnimating && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>
        <div className="text-white">
          {isAnimating ? (
            <p className="text-lg leading-relaxed">
              {translatedContent || "Converting speech to sign language..."}
            </p>
          ) : (
            <p className="text-gray-500 italic">Start recording to see translations</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarPanel;