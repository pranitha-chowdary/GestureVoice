import React, { useState } from 'react';
import { Mic, MicOff, Camera, CameraOff, ToggleLeft, ToggleRight } from 'lucide-react';
import VideoPanel from './components/VideoPanel';
import AvatarPanel from './components/AvatarPanel';
import TranslationPanel from './components/TranslationPanel';
import StatusBar from './components/StatusBar';
import ControlPanel from './components/ControlPanel';

export type Mode = 'voice-to-sign' | 'sign-to-voice';

function App() {
  const [mode, setMode] = useState<Mode>('voice-to-sign');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');

  const toggleMode = () => {
    setMode(mode === 'voice-to-sign' ? 'sign-to-voice' : 'voice-to-sign');
    setIsRecording(false);
    setCurrentText('');
    setTranslatedContent('');
  };

  const handleStartStop = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setCameraEnabled(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">GV</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                GestureVoice
              </h1>
              <p className="text-sm text-gray-400">Real-time Voice & Sign Translation</p>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-gray-800 rounded-full px-4 py-2">
              <span className={`text-sm transition-colors ${mode === 'voice-to-sign' ? 'text-blue-400' : 'text-gray-500'}`}>
                Voice→Sign
              </span>
              <button
                onClick={toggleMode}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              >
                {mode === 'voice-to-sign' ? (
                  <ToggleLeft className="w-6 h-6 text-blue-400" />
                ) : (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                )}
              </button>
              <span className={`text-sm transition-colors ${mode === 'sign-to-voice' ? 'text-emerald-400' : 'text-gray-500'}`}>
                Sign→Voice
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <StatusBar 
        mode={mode} 
        isRecording={isRecording} 
        cameraEnabled={cameraEnabled}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel - Video Feed */}
          <VideoPanel 
            mode={mode}
            cameraEnabled={cameraEnabled}
            isRecording={isRecording}
            onCameraToggle={() => setCameraEnabled(!cameraEnabled)}
          />

          {/* Right Panel - Translation Display */}
          <div className="space-y-6">
            {mode === 'voice-to-sign' ? (
              <AvatarPanel 
                isAnimating={isRecording}
                translatedContent={translatedContent}
              />
            ) : (
              <TranslationPanel 
                mode={mode}
                currentText={currentText}
                isProcessing={isRecording}
              />
            )}
          </div>
        </div>

        {/* Control Panel */}
        <ControlPanel 
          mode={mode}
          isRecording={isRecording}
          onStartStop={handleStartStop}
          onTextUpdate={setCurrentText}
          onTranslationUpdate={setTranslatedContent}
        />
      </main>
    </div>
  );
}

export default App;