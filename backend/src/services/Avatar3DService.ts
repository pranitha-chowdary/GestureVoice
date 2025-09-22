import { logger } from '../utils/logger.js';
import type { SignLanguageData } from '../types/index.js';

interface AvatarBone {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

interface AvatarPose {
  timestamp: number;
  bones: AvatarBone[];
  facialExpression?: string;
  duration: number;
}

export class Avatar3DService {
  private currentPose: AvatarPose | null = null;
  private poseSequence: AvatarPose[] = [];
  private isAnimating = false;

  // Realistic 3D avatar bone structure for sign language
  private readonly avatarSkeleton = {
    // Head and facial features
    head: { name: 'Head', defaultPosition: { x: 0, y: 1.6, z: 0 } },
    neck: { name: 'Neck', defaultPosition: { x: 0, y: 1.4, z: 0 } },
    
    // Torso
    chest: { name: 'Chest', defaultPosition: { x: 0, y: 1.2, z: 0 } },
    spine: { name: 'Spine', defaultPosition: { x: 0, y: 1.0, z: 0 } },
    
    // Left arm
    leftShoulder: { name: 'LeftShoulder', defaultPosition: { x: -0.2, y: 1.3, z: 0 } },
    leftUpperArm: { name: 'LeftUpperArm', defaultPosition: { x: -0.3, y: 1.1, z: 0 } },
    leftForearm: { name: 'LeftForearm', defaultPosition: { x: -0.4, y: 0.9, z: 0 } },
    leftHand: { name: 'LeftHand', defaultPosition: { x: -0.5, y: 0.8, z: 0 } },
    
    // Right arm  
    rightShoulder: { name: 'RightShoulder', defaultPosition: { x: 0.2, y: 1.3, z: 0 } },
    rightUpperArm: { name: 'RightUpperArm', defaultPosition: { x: 0.3, y: 1.1, z: 0 } },
    rightForearm: { name: 'RightForearm', defaultPosition: { x: 0.4, y: 0.9, z: 0 } },
    rightHand: { name: 'RightHand', defaultPosition: { x: 0.5, y: 0.8, z: 0 } },
    
    // Hand bones (simplified - 5 fingers per hand)
    // Left hand fingers
    leftThumb: { name: 'LeftThumb', defaultPosition: { x: -0.48, y: 0.82, z: 0.02 } },
    leftIndex: { name: 'LeftIndex', defaultPosition: { x: -0.52, y: 0.85, z: 0 } },
    leftMiddle: { name: 'LeftMiddle', defaultPosition: { x: -0.53, y: 0.85, z: 0 } },
    leftRing: { name: 'LeftRing', defaultPosition: { x: -0.52, y: 0.84, z: 0 } },
    leftPinky: { name: 'LeftPinky', defaultPosition: { x: -0.51, y: 0.82, z: 0 } },
    
    // Right hand fingers
    rightThumb: { name: 'RightThumb', defaultPosition: { x: 0.48, y: 0.82, z: 0.02 } },
    rightIndex: { name: 'RightIndex', defaultPosition: { x: 0.52, y: 0.85, z: 0 } },
    rightMiddle: { name: 'RightMiddle', defaultPosition: { x: 0.53, y: 0.85, z: 0 } },
    rightRing: { name: 'RightRing', defaultPosition: { x: 0.52, y: 0.84, z: 0 } },
    rightPinky: { name: 'RightPinky', defaultPosition: { x: 0.51, y: 0.82, z: 0 } }
  };

  // Sign language gesture animations
  private readonly gestureAnimations = new Map<string, AvatarPose[]>([
    ['hello', this.createHelloAnimation()],
    ['goodbye', this.createGoodbyeAnimation()],
    ['thank_you', this.createThankYouAnimation()],
    ['please', this.createPleaseAnimation()],
    ['yes', this.createYesAnimation()],
    ['no', this.createNoAnimation()],
    ['help', this.createHelpAnimation()],
    ['stop', this.createStopAnimation()],
    ['water', this.createWaterAnimation()],
    ['food', this.createFoodAnimation()],
    ['bathroom', this.createBathroomAnimation()],
    ['sorry', this.createSorryAnimation()],
    ['i_love_you', this.createILoveYouAnimation()],
    
    // Numbers
    ['one', this.createNumberAnimation(1)],
    ['two', this.createNumberAnimation(2)],
    ['three', this.createNumberAnimation(3)],
    ['four', this.createNumberAnimation(4)],
    ['five', this.createNumberAnimation(5)],
    
    // Letters
    ['a', this.createLetterAnimation('A')],
    ['b', this.createLetterAnimation('B')],
    ['c', this.createLetterAnimation('C')]
  ]);

  // Facial expressions for emotional context
  private readonly facialExpressions = {
    neutral: { eyebrows: 0, eyes: 0, mouth: 0 },
    happy: { eyebrows: 0.2, eyes: 0.3, mouth: 0.5 },
    questioning: { eyebrows: 0.4, eyes: 0.2, mouth: 0.1 },
    concerned: { eyebrows: -0.3, eyes: 0.1, mouth: -0.2 },
    excited: { eyebrows: 0.3, eyes: 0.4, mouth: 0.6 },
    serious: { eyebrows: -0.1, eyes: -0.1, mouth: -0.1 }
  };

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing 3D Avatar Service...');
      
      // Initialize avatar in default pose
      this.currentPose = this.createDefaultPose();
      
      logger.info('3D Avatar Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize 3D Avatar Service:', error);
      throw error;
    }
  }

  public async generateAvatarPose(signData: SignLanguageData): Promise<AvatarPose> {
    try {
      if (!signData.recognizedGesture || signData.recognizedGesture === 'unknown') {
        return this.generateGenericPoseFromLandmarks(signData.landmarks);
      }

      // Get pre-defined animation for recognized gesture
      const gestureAnimations = this.gestureAnimations.get(signData.recognizedGesture);
      
      if (gestureAnimations && gestureAnimations.length > 0) {
        // Return the main pose from the animation sequence
        const mainPose = gestureAnimations[Math.floor(gestureAnimations.length / 2)];
        logger.info(`Generated 3D avatar pose for gesture: ${signData.recognizedGesture}`);
        return mainPose;
      }

      // Fallback to generic pose generation
      return this.generateGenericPoseFromLandmarks(signData.landmarks);
      
    } catch (error) {
      logger.error('Error generating avatar pose:', error);
      return this.createDefaultPose();
    }
  }

  private generateGenericPoseFromLandmarks(landmarks: number[][]): AvatarPose {
    if (!landmarks || landmarks.length === 0 || landmarks[0].length < 63) {
      return this.createDefaultPose();
    }

    const handLandmarks = landmarks[0]; // Use first hand detected
    const bones: AvatarBone[] = [];

    // Map hand landmarks to avatar bones
    // Landmarks are in format [x0, y0, z0, x1, y1, z1, ...] for 21 points
    
    // Wrist position (landmark 0)
    const wristX = handLandmarks[0];
    const wristY = handLandmarks[1];
    const wristZ = handLandmarks[2] || 0;

    // Right hand (assuming most detections are right hand)
    bones.push({
      name: 'RightHand',
      position: { x: wristX, y: wristY, z: wristZ },
      rotation: { x: 0, y: 0, z: 0 }
    });

    // Thumb (landmarks 1-4)
    bones.push({
      name: 'RightThumb',
      position: {
        x: handLandmarks[12], // Thumb tip
        y: handLandmarks[13],
        z: handLandmarks[14] || 0
      },
      rotation: this.calculateFingerRotation(handLandmarks, 1, 4)
    });

    // Index finger (landmarks 5-8)
    bones.push({
      name: 'RightIndex',
      position: {
        x: handLandmarks[24], // Index tip
        y: handLandmarks[25],
        z: handLandmarks[26] || 0
      },
      rotation: this.calculateFingerRotation(handLandmarks, 5, 8)
    });

    // Middle finger (landmarks 9-12)
    bones.push({
      name: 'RightMiddle',
      position: {
        x: handLandmarks[36], // Middle tip
        y: handLandmarks[37],
        z: handLandmarks[38] || 0
      },
      rotation: this.calculateFingerRotation(handLandmarks, 9, 12)
    });

    // Ring finger (landmarks 13-16)
    bones.push({
      name: 'RightRing',
      position: {
        x: handLandmarks[48], // Ring tip
        y: handLandmarks[49],
        z: handLandmarks[50] || 0
      },
      rotation: this.calculateFingerRotation(handLandmarks, 13, 16)
    });

    // Pinky finger (landmarks 17-20)
    bones.push({
      name: 'RightPinky',
      position: {
        x: handLandmarks[60], // Pinky tip
        y: handLandmarks[61],
        z: handLandmarks[62] || 0
      },
      rotation: this.calculateFingerRotation(handLandmarks, 17, 20)
    });

    return {
      timestamp: Date.now(),
      bones,
      facialExpression: 'neutral',
      duration: 1000
    };
  }

  private calculateFingerRotation(landmarks: number[], startIdx: number, endIdx: number): { x: number; y: number; z: number } {
    // Calculate finger bend/curl based on landmark positions
    const baseX = landmarks[startIdx * 3];
    const baseY = landmarks[startIdx * 3 + 1];
    const tipX = landmarks[endIdx * 3];
    const tipY = landmarks[endIdx * 3 + 1];

    const dx = tipX - baseX;
    const dy = tipY - baseY;
    
    const angle = Math.atan2(dy, dx);
    
    return {
      x: Math.sin(angle) * 0.5,
      y: 0,
      z: Math.cos(angle) * 0.5
    };
  }

  public async playGestureSequence(gesture: string): Promise<void> {
    try {
      const animations = this.gestureAnimations.get(gesture);
      
      if (!animations || animations.length === 0) {
        logger.warn(`No animation sequence found for gesture: ${gesture}`);
        return;
      }

      this.isAnimating = true;
      this.poseSequence = [...animations];

      logger.info(`Playing gesture animation sequence: ${gesture} (${animations.length} poses)`);

      // Play each pose in sequence
      for (let i = 0; i < animations.length; i++) {
        const pose = animations[i];
        this.currentPose = pose;
        
        // Emit pose update event (for frontend consumption)
        this.emitPoseUpdate(pose);
        
        // Wait for pose duration
        await new Promise(resolve => setTimeout(resolve, pose.duration));
      }

      // Return to neutral pose
      this.currentPose = this.createDefaultPose();
      this.emitPoseUpdate(this.currentPose);
      
      this.isAnimating = false;
      logger.info(`Completed gesture animation sequence: ${gesture}`);

    } catch (error) {
      this.isAnimating = false;
      logger.error(`Error playing gesture sequence for ${gesture}:`, error);
    }
  }

  private emitPoseUpdate(pose: AvatarPose): void {
    // This would typically emit to WebSocket clients
    // For now, we'll just log the pose data
    logger.debug(`Avatar pose updated: ${pose.bones.length} bones, expression: ${pose.facialExpression}`);
  }

  public getCurrentPose(): AvatarPose {
    return this.currentPose || this.createDefaultPose();
  }

  public getAvatarModel(): any {
    // Return 3D model data structure for frontend rendering
    return {
      skeleton: this.avatarSkeleton,
      currentPose: this.currentPose,
      availableGestures: Array.from(this.gestureAnimations.keys()),
      facialExpressions: Object.keys(this.facialExpressions)
    };
  }

  // Animation creation methods
  private createHelloAnimation(): AvatarPose[] {
    const poses: AvatarPose[] = [];
    
    // Pose 1: Raise hand
    poses.push({
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightUpperArm',
          position: { x: 0.3, y: 1.3, z: 0 },
          rotation: { x: 0, y: 0, z: -0.5 }
        },
        {
          name: 'RightForearm',
          position: { x: 0.2, y: 1.4, z: 0 },
          rotation: { x: 0, y: 0, z: -0.3 }
        },
        {
          name: 'RightHand',
          position: { x: 0.1, y: 1.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        }
      ],
      facialExpression: 'happy',
      duration: 500
    });

    // Pose 2: Wave motion
    poses.push({
      timestamp: Date.now() + 500,
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.15, y: 1.5, z: 0 },
          rotation: { x: 0, y: 0.2, z: 0 }
        }
      ],
      facialExpression: 'happy',
      duration: 300
    });

    // Pose 3: Wave back
    poses.push({
      timestamp: Date.now() + 800,
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.05, y: 1.5, z: 0 },
          rotation: { x: 0, y: -0.2, z: 0 }
        }
      ],
      facialExpression: 'happy',
      duration: 300
    });

    return poses;
  }

  private createGoodbyeAnimation(): AvatarPose[] {
    // Similar to hello but with downward motion at the end
    const poses = this.createHelloAnimation();
    
    // Add final pose with hand lowering
    poses.push({
      timestamp: Date.now() + 1100,
      bones: [
        {
          name: 'RightUpperArm',
          position: { x: 0.3, y: 1.1, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'RightForearm',
          position: { x: 0.4, y: 0.9, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'RightHand',
          position: { x: 0.5, y: 0.8, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        }
      ],
      facialExpression: 'neutral',
      duration: 800
    });

    return poses;
  }

  private createThankYouAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.1, y: 1.4, z: 0.1 }, // Near face
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0.1, y: 0, z: 0 } // Slight nod
        }
      ],
      facialExpression: 'happy',
      duration: 1000
    }];
  }

  private createPleaseAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.1, y: 1.2, z: 0.1 }, // On chest
          rotation: { x: 0, y: 0, z: 0.2 }
        }
      ],
      facialExpression: 'questioning',
      duration: 1200
    }];
  }

  private createYesAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0.3, y: 0, z: 0 } // Nod down
        }
      ],
      facialExpression: 'neutral',
      duration: 600
    }, {
      timestamp: Date.now() + 600,
      bones: [
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: -0.1, y: 0, z: 0 } // Nod up
        }
      ],
      facialExpression: 'neutral',
      duration: 400
    }];
  }

  private createNoAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0, y: 0.3, z: 0 } // Shake right
        }
      ],
      facialExpression: 'serious',
      duration: 400
    }, {
      timestamp: Date.now() + 400,
      bones: [
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0, y: -0.3, z: 0 } // Shake left
        }
      ],
      facialExpression: 'serious',
      duration: 400
    }];
  }

  private createHelpAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'LeftHand',
          position: { x: -0.3, y: 1.1, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'RightHand',
          position: { x: -0.2, y: 1.2, z: 0 }, // Supporting left hand
          rotation: { x: 0, y: 0, z: 0.3 }
        }
      ],
      facialExpression: 'concerned',
      duration: 1200
    }];
  }

  private createStopAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightUpperArm',
          position: { x: 0.2, y: 1.3, z: 0 },
          rotation: { x: 0, y: 0, z: -0.8 }
        },
        {
          name: 'RightForearm',
          position: { x: 0.1, y: 1.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'RightHand',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        }
      ],
      facialExpression: 'serious',
      duration: 1500
    }];
  }

  private createWaterAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.2, y: 1.3, z: 0 },
          rotation: { x: 0, y: 0, z: 0.5 } // Cup shape
        }
      ],
      facialExpression: 'neutral',
      duration: 1000
    }];
  }

  private createFoodAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.1, y: 1.4, z: 0.1 }, // Near mouth
          rotation: { x: 0, y: 0, z: 0.3 }
        }
      ],
      facialExpression: 'questioning',
      duration: 800
    }];
  }

  private createBathroomAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightIndex',
          position: { x: 0.3, y: 1.2, z: 0 },
          rotation: { x: 0, y: 0, z: 0.2 } // Pointing
        }
      ],
      facialExpression: 'questioning',
      duration: 1000
    }];
  }

  private createSorryAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.1, y: 1.2, z: 0.1 }, // On chest, circular motion
          rotation: { x: 0, y: 0, z: 0.4 }
        },
        {
          name: 'Head',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0.2, y: 0, z: 0 } // Slight bow
        }
      ],
      facialExpression: 'concerned',
      duration: 1200
    }];
  }

  private createILoveYouAnimation(): AvatarPose[] {
    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.3, y: 1.3, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        },
        {
          name: 'RightThumb',
          position: { x: 0.32, y: 1.32, z: 0.02 }, // Extended
          rotation: { x: 0, y: 0.5, z: 0 }
        },
        {
          name: 'RightIndex',
          position: { x: 0.35, y: 1.35, z: 0 }, // Extended
          rotation: { x: 0, y: 0, z: 0.3 }
        },
        {
          name: 'RightPinky',
          position: { x: 0.28, y: 1.32, z: 0 }, // Extended
          rotation: { x: 0, y: 0, z: -0.3 }
        }
      ],
      facialExpression: 'happy',
      duration: 2000
    }];
  }

  private createNumberAnimation(number: number): AvatarPose[] {
    const extendedFingers = this.getExtendedFingersForNumber(number);
    const bones: AvatarBone[] = [];

    // Set finger positions based on the number
    extendedFingers.forEach((extended, index) => {
      const fingerNames = ['RightThumb', 'RightIndex', 'RightMiddle', 'RightRing', 'RightPinky'];
      const basePosY = 1.3;
      
      bones.push({
        name: fingerNames[index],
        position: {
          x: 0.3 + (index - 2) * 0.02,
          y: extended ? basePosY + 0.08 : basePosY - 0.02,
          z: 0
        },
        rotation: extended ? { x: 0, y: 0, z: 0.2 } : { x: 0.8, y: 0, z: 0 }
      });
    });

    return [{
      timestamp: Date.now(),
      bones,
      facialExpression: 'neutral',
      duration: 1500
    }];
  }

  private createLetterAnimation(letter: string): AvatarPose[] {
    // Simplified letter shapes
    const letterPoses: { [key: string]: any } = {
      'A': { fist: true, thumbSide: true },
      'B': { flatHand: true, thumbAcross: true },
      'C': { curved: true }
    };

    return [{
      timestamp: Date.now(),
      bones: [
        {
          name: 'RightHand',
          position: { x: 0.3, y: 1.3, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        }
      ],
      facialExpression: 'neutral',
      duration: 1000
    }];
  }

  private getExtendedFingersForNumber(number: number): boolean[] {
    const fingerConfigs: { [key: number]: boolean[] } = {
      0: [false, false, false, false, false], // Closed fist
      1: [false, true, false, false, false],  // Index finger
      2: [false, true, true, false, false],   // Index + Middle
      3: [true, true, true, false, false],    // Thumb + Index + Middle
      4: [false, true, true, true, true],     // Four fingers (no thumb)
      5: [true, true, true, true, true]       // All fingers
    };

    return fingerConfigs[number] || [false, false, false, false, false];
  }

  private createDefaultPose(): AvatarPose {
    return {
      timestamp: Date.now(),
      bones: Object.values(this.avatarSkeleton).map(bone => ({
        name: bone.name,
        position: { ...bone.defaultPosition },
        rotation: { x: 0, y: 0, z: 0 }
      })),
      facialExpression: 'neutral',
      duration: 1000
    };
  }

  public async dispose(): Promise<void> {
    logger.info('Disposing 3D Avatar Service...');
    
    this.isAnimating = false;
    this.currentPose = null;
    this.poseSequence = [];
    
    logger.info('3D Avatar Service disposed');
  }
}