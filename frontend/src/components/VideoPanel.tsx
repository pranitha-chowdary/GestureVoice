import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, User } from 'lucide-react';
import type { Mode } from '../App';
import { webSocketService } from '../services/WebSocketService';

interface VideoPanelProps {
  mode: Mode;
  cameraEnabled: boolean;
  isRecording: boolean;
  onCameraToggle: () => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ 
  mode, 
  cameraEnabled, 
  isRecording,
  onCameraToggle 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to capture and send video frames for sign language detection
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isRecording || mode !== 'sign-to-voice') {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image data
    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    // Send frame to backend for sign language detection
    console.log('📹 Sending video frame to backend for sign language detection');
    webSocketService.sendVideoFrame(frameData);
  }, [isRecording, mode]);

  // Set up frame capture interval when recording sign language
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRecording && mode === 'sign-to-voice' && webSocketService.isConnected()) {
      setIsProcessing(true);
      // Capture frames every 200ms (5 FPS) to avoid overwhelming the backend
      intervalId = setInterval(captureFrame, 200);
    } else {
      setIsProcessing(false);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording, mode, captureFrame]);

  // Handle camera setup
  useEffect(() => {
    if (cameraEnabled && !stream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError('');
        })
        .catch((err) => {
          console.error('Camera access denied:', err);
          setError('Camera access denied');
        });
    } else if (!cameraEnabled && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraEnabled, stream]);

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          {mode === 'voice-to-sign' ? 'Speaker Video' : 'Sign Language Input'}
        </h2>
        <button
          onClick={onCameraToggle}
          className={`p-2 rounded-lg transition-all duration-200 ${
            cameraEnabled 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {cameraEnabled && !error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isRecording && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-2 bg-red-600/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">LIVE</span>
                </div>
              </div>
            )}
            {mode === 'sign-to-voice' && isRecording && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-emerald-400 rounded-lg opacity-50 animate-pulse"></div>
                <div className="absolute bottom-4 left-4 bg-emerald-600/90 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="text-white text-sm font-medium">Detecting Signs...</span>
                </div>
              </div>
            )}
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <CameraOff className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Camera Access Denied</p>
            <p className="text-sm text-center mt-2">
              Please enable camera permissions to use this feature
            </p>
            <button
              onClick={onCameraToggle}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <User className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Camera Off</p>
            <p className="text-sm text-center mt-2">
              Click the camera button to enable video feed
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <span className={`font-medium ${
            isRecording ? 'text-emerald-400' : cameraEnabled ? 'text-blue-400' : 'text-gray-500'
          }`}>
            {isRecording ? 'Processing...' : cameraEnabled ? 'Ready' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;