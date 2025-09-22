import React from 'react';
import { Mic, Camera, Wifi, AlertCircle } from 'lucide-react';
import type { Mode } from '../App';

interface StatusBarProps {
  mode: Mode;
  isRecording: boolean;
  cameraEnabled: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ mode, isRecording, cameraEnabled }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-6 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Mode Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              mode === 'voice-to-sign' ? 'bg-blue-400' : 'bg-emerald-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-300">
              {mode === 'voice-to-sign' ? 'Voice to Sign Mode' : 'Sign to Voice Mode'}
            </span>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Camera className={`w-4 h-4 ${cameraEnabled ? 'text-emerald-400' : 'text-gray-500'}`} />
              <span className="text-xs text-gray-400">Camera</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Mic className={`w-4 h-4 ${mode === 'voice-to-sign' && isRecording ? 'text-emerald-400' : 'text-gray-500'}`} />
              <span className="text-xs text-gray-400">Audio</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-400">
          {isRecording && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Processing</span>
            </div>
          )}
          <span>Real-time Translation Active</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;