import React, { useEffect, useState, useRef } from 'react';

interface AvatarPose {
  timestamp: number;
  bones: Array<{
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
  facialExpression?: string;
  duration: number;
}

interface RealisticAvatarPanelProps {
  isConnected: boolean;
  currentGesture: string | null;
  gestureConfidence: number;
  voiceOutput: string | null;
}

export const RealisticAvatarPanel: React.FC<RealisticAvatarPanelProps> = ({
  isConnected,
  currentGesture,
  gestureConfidence,
  voiceOutput
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [avatarPose, setAvatarPose] = useState<AvatarPose | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [supportedGestures, setSupportedGestures] = useState<string[]>([]);
  const [avatarModel, setAvatarModel] = useState<any>(null);

  useEffect(() => {
    // Initialize 3D avatar canvas
    if (canvasRef.current && isConnected) {
      initializeAvatarCanvas();
    }
  }, [isConnected]);

  useEffect(() => {
    // Update avatar when new pose is received
    if (avatarPose && canvasRef.current) {
      renderAvatarPose(avatarPose);
    }
  }, [avatarPose]);

  const initializeAvatarCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 500;

    // Draw initial avatar
    drawDefaultAvatar(ctx);
  };

  const drawDefaultAvatar = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Avatar outline (simplified 2D representation)
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;

    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 120, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.roundRect(centerX - 30, centerY - 80, 60, 100, 10);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.stroke();

    // Arms (default position)
    drawArm(ctx, centerX - 30, centerY - 60, -45); // Left arm
    drawArm(ctx, centerX + 30, centerY - 60, 45);  // Right arm

    // Status text
    ctx.fillStyle = '#1f2937';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isConnected ? 'Avatar Ready' : 'Connecting...', centerX, centerY + 180);
  };

  const drawArm = (ctx: CanvasRenderingContext2D, startX: number, startY: number, angle: number) => {
    const angleRad = (angle * Math.PI) / 180;
    
    // Upper arm
    const upperArmLength = 50;
    const elbowX = startX + Math.cos(angleRad) * upperArmLength;
    const elbowY = startY + Math.sin(angleRad) * upperArmLength;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(elbowX, elbowY);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Forearm
    const forearmLength = 45;
    const forearmAngle = angleRad + Math.PI / 6; // Slight bend
    const handX = elbowX + Math.cos(forearmAngle) * forearmLength;
    const handY = elbowY + Math.sin(forearmAngle) * forearmLength;

    ctx.beginPath();
    ctx.moveTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Hand
    ctx.beginPath();
    ctx.arc(handX, handY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.stroke();
  };

  const renderAvatarPose = (pose: AvatarPose) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsAnimating(true);

    // Clear and redraw with new pose
    drawDefaultAvatar(ctx);

    // Animate based on gesture
    if (currentGesture) {
      animateGesture(ctx, currentGesture);
    }

    // Show facial expression
    if (pose.facialExpression && pose.facialExpression !== 'neutral') {
      drawFacialExpression(ctx, pose.facialExpression);
    }

    setTimeout(() => setIsAnimating(false), pose.duration);
  };

  const animateGesture = (ctx: CanvasRenderingContext2D, gesture: string) => {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';

    switch (gesture) {
      case 'hello':
        // Animate waving
        ctx.fillText('👋 Hello!', centerX, centerY + 160);
        drawWavingArm(ctx, centerX + 30, centerY - 60);
        break;
      
      case 'goodbye':
        ctx.fillText('👋 Goodbye!', centerX, centerY + 160);
        drawWavingArm(ctx, centerX + 30, centerY - 60);
        break;
      
      case 'thank_you':
        ctx.fillText('🙏 Thank You', centerX, centerY + 160);
        drawThankYouGesture(ctx, centerX);
        break;
      
      case 'help':
        ctx.fillText('🆘 Help', centerX, centerY + 160);
        drawHelpGesture(ctx, centerX, centerY);
        break;
      
      case 'stop':
        ctx.fillText('✋ Stop', centerX, centerY + 160);
        drawStopGesture(ctx, centerX + 30, centerY - 60);
        break;
      
      case 'yes':
        ctx.fillText('✅ Yes', centerX, centerY + 160);
        drawNodding(ctx, centerX, centerY - 120);
        break;
      
      case 'no':
        ctx.fillText('❌ No', centerX, centerY + 160);
        drawHeadShake(ctx, centerX, centerY - 120);
        break;
      
      case 'i_love_you':
        ctx.fillText('❤️ I Love You', centerX, centerY + 160);
        drawILYGesture(ctx, centerX + 30, centerY - 60);
        break;
      
      default:
        if (gesture.match(/^(one|two|three|four|five)$/)) {
          const number = ['zero', 'one', 'two', 'three', 'four', 'five'].indexOf(gesture);
          ctx.fillText(`${number} ✋`, centerX, centerY + 160);
          drawNumberGesture(ctx, centerX + 30, centerY - 60, number);
        } else {
          ctx.fillText(`Gesture: ${gesture}`, centerX, centerY + 160);
        }
    }
  };

  const drawWavingArm = (ctx: CanvasRenderingContext2D, startX: number, startY: number) => {
    // Draw animated waving motion
    const time = Date.now() / 200;
    const waveAngle = Math.sin(time) * 30; // Oscillating wave
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    
    const angleRad = ((45 + waveAngle) * Math.PI) / 180;
    const upperArmLength = 50;
    const elbowX = startX + Math.cos(angleRad) * upperArmLength;
    const elbowY = startY + Math.sin(angleRad) * upperArmLength;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(elbowX, elbowY);
    ctx.stroke();
  };

  const drawThankYouGesture = (ctx: CanvasRenderingContext2D, centerX: number) => {
    // Hand near chin/face area
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerX + 20, 150, 12, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawHelpGesture = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Both hands supporting gesture
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    
    // Left hand supporting right
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY - 10);
    ctx.lineTo(centerX + 20, centerY - 20);
    ctx.stroke();
  };

  const drawStopGesture = (ctx: CanvasRenderingContext2D, startX: number, startY: number) => {
    // Palm forward gesture
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(startX + 40, startY - 10, 20, 30);
    
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('STOP', startX + 50, startY + 50);
  };

  const drawNodding = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Slight head movement for "yes"
    const time = Date.now() / 300;
    const nodY = centerY + Math.sin(time) * 5;
    
    ctx.beginPath();
    ctx.arc(centerX, nodY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  };

  const drawHeadShake = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Side-to-side head movement for "no"
    const time = Date.now() / 300;
    const shakeX = centerX + Math.sin(time) * 8;
    
    ctx.beginPath();
    ctx.arc(shakeX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  };

  const drawILYGesture = (ctx: CanvasRenderingContext2D, handX: number, handY: number) => {
    // I Love You sign (thumb, index, pinky extended)
    ctx.fillStyle = '#e11d48';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('🤟', handX, handY);
  };

  const drawNumberGesture = (ctx: CanvasRenderingContext2D, handX: number, handY: number, number: number) => {
    // Show number with fingers
    const numberEmojis = ['✊', '☝️', '✌️', '🤟', '🖖', '✋'];
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(numberEmojis[number] || '✋', handX, handY);
  };

  const drawFacialExpression = (ctx: CanvasRenderingContext2D, expression: string) => {
    const centerX = ctx.canvas.width / 2;
    const faceY = ctx.canvas.height / 2 - 120;

    ctx.fillStyle = '#1f2937';
    ctx.font = '20px Inter';
    ctx.textAlign = 'center';

    const expressions: { [key: string]: string } = {
      'happy': '😊',
      'questioning': '🤔',
      'concerned': '😟',
      'excited': '🤩',
      'serious': '😐'
    };

    if (expressions[expression]) {
      ctx.fillText(expressions[expression], centerX, faceY);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">3D Avatar</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-sm ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* 3D Avatar Canvas */}
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          className="border rounded-lg bg-gradient-to-b from-blue-50 to-indigo-100"
          width={400}
          height={500}
        />
        
        {isAnimating && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            Animating...
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="space-y-3">
        {currentGesture && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900">Current Gesture:</span>
              <span className="text-blue-700 capitalize">{currentGesture.replace(/_/g, ' ')}</span>
            </div>
            <div className="mt-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600">Confidence:</span>
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(gestureConfidence * 100, 10)}%` }}
                  />
                </div>
                <span className="text-sm text-blue-600">{(gestureConfidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {voiceOutput && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-green-900">🔊 Voice Output:</span>
              <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded">AUTO-PLAYED</span>
            </div>
            <p className="text-green-800 italic">"{voiceOutput}"</p>
          </div>
        )}

        {!currentGesture && isConnected && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-gray-600">Make a sign language gesture to see the avatar animation</p>
            <p className="text-sm text-gray-500 mt-1">
              Supported: Hello, Thank You, Help, Stop, Numbers 1-5, and more...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealisticAvatarPanel;