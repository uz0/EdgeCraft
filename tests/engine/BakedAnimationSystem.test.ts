/**
 * BakedAnimationSystem tests
 *
 * Tests for GPU-based baked animation system
 */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import * as BABYLON from '@babylonjs/core';
import { BakedAnimationSystem } from '@/engine/rendering/BakedAnimationSystem';
import { AnimationClip } from '@/engine/rendering/types';

describe('BakedAnimationSystem', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let animSystem: BakedAnimationSystem;

  beforeEach(() => {
    // Create Babylon.js engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Create animation system
    animSystem = new BakedAnimationSystem(scene);
  });

  afterEach(() => {
    if (animSystem) {
      animSystem.dispose();
    }
    if (scene) {
      scene.dispose();
    }
    if (engine) {
      engine.dispose();
    }
  });

  describe('Initialization', () => {
    it('should create animation system', () => {
      expect(animSystem).toBeDefined();
    });

    it('should start with no animations', () => {
      expect(animSystem.getAnimationNames()).toHaveLength(0);
    });

    it('should start with null texture', () => {
      expect(animSystem.getTexture()).toBeNull();
    });
  });

  describe('Animation Queries', () => {
    const testAnimations: AnimationClip[] = [
      { name: 'idle', startFrame: 0, endFrame: 30, loop: true },
      { name: 'walk', startFrame: 31, endFrame: 60, loop: true },
      { name: 'attack', startFrame: 61, endFrame: 90, loop: false },
    ];

    beforeEach(() => {
      // Manually set up animation clips for testing without baking
      // (since baking requires actual skeletal mesh which is complex to mock)
      testAnimations.forEach((anim, index) => {
        animSystem['animationClips'].set(anim.name, anim);
        animSystem['animationIndices'].set(anim.name, index);
      });
    });

    it('should get animation index', () => {
      expect(animSystem.getAnimationIndex('idle')).toBe(0);
      expect(animSystem.getAnimationIndex('walk')).toBe(1);
      expect(animSystem.getAnimationIndex('attack')).toBe(2);
    });

    it('should return 0 for unknown animation', () => {
      expect(animSystem.getAnimationIndex('unknown')).toBe(0);
    });

    it('should get animation duration', () => {
      const idleDuration = animSystem.getAnimationDuration('idle');
      expect(idleDuration).toBeCloseTo(1.0); // 30 frames at 30 FPS = 1 second

      const walkDuration = animSystem.getAnimationDuration('walk');
      expect(walkDuration).toBeCloseTo(0.967, 2); // 29 frames (31-60) at 30 FPS ≈ 0.967 seconds
    });

    it('should get animation frame count', () => {
      expect(animSystem.getAnimationFrameCount('idle')).toBe(30);
      expect(animSystem.getAnimationFrameCount('walk')).toBe(29); // 60 - 31 = 29
      expect(animSystem.getAnimationFrameCount('attack')).toBe(29); // 90 - 61 = 29
    });

    it('should check if animation exists', () => {
      expect(animSystem.hasAnimation('idle')).toBe(true);
      expect(animSystem.hasAnimation('walk')).toBe(true);
      expect(animSystem.hasAnimation('unknown')).toBe(false);
    });

    it('should get all animation names', () => {
      const names = animSystem.getAnimationNames();
      expect(names).toContain('idle');
      expect(names).toContain('walk');
      expect(names).toContain('attack');
      expect(names).toHaveLength(3);
    });

    it('should get animation clip', () => {
      const idleClip = animSystem.getAnimationClip('idle');
      expect(idleClip).toBeDefined();
      expect(idleClip?.name).toBe('idle');
      expect(idleClip?.startFrame).toBe(0);
      expect(idleClip?.endFrame).toBe(30);
    });

    it('should get all animation clips', () => {
      const clips = animSystem.getAllAnimationClips();
      expect(clips.size).toBe(3);
      expect(clips.has('idle')).toBe(true);
      expect(clips.has('walk')).toBe(true);
      expect(clips.has('attack')).toBe(true);
    });
  });

  describe('Animation Time Management', () => {
    const testAnimations: AnimationClip[] = [
      { name: 'idle', startFrame: 0, endFrame: 30, loop: true },
      { name: 'walk', startFrame: 31, endFrame: 60, loop: true },
      { name: 'death', startFrame: 61, endFrame: 90, loop: false },
    ];

    beforeEach(() => {
      testAnimations.forEach((anim, index) => {
        animSystem['animationClips'].set(anim.name, anim);
        animSystem['animationIndices'].set(anim.name, index);
      });
    });

    it('should normalize looping animation time', () => {
      const duration = animSystem.getAnimationDuration('idle');

      // Time beyond duration should wrap
      const normalizedTime = animSystem.normalizeAnimationTime('idle', duration + 0.5);
      expect(normalizedTime).toBeCloseTo(0.5);
    });

    it('should clamp non-looping animation time', () => {
      const duration = animSystem.getAnimationDuration('death');

      // Time beyond duration should clamp to duration
      const normalizedTime = animSystem.normalizeAnimationTime('death', duration + 1.0);
      expect(normalizedTime).toBeCloseTo(duration);
    });

    it('should apply animation speed multiplier', () => {
      // Modify animation clip to have speed
      const walkAnim = testAnimations[1];
      if (!walkAnim) {
        fail('Walk animation not found');
        return;
      }

      animSystem['animationClips'].set('walk', {
        name: walkAnim.name,
        startFrame: walkAnim.startFrame,
        endFrame: walkAnim.endFrame,
        loop: walkAnim.loop,
        speed: 2.0,
      });

      const adjustedTime = animSystem.applyAnimationSpeed('walk', 1.0);
      expect(adjustedTime).toBeCloseTo(2.0);
    });

    it('should calculate animation progress', () => {
      const duration = animSystem.getAnimationDuration('idle');
      const progress = animSystem.getAnimationProgress('idle', duration / 2);
      expect(progress).toBeCloseTo(0.5);
    });

    it('should get current frame', () => {
      const frame = animSystem.getCurrentFrame('idle', 0.5);
      // 0.5 seconds at 30 FPS = frame 15
      expect(frame).toBeCloseTo(15);
    });

    it('should detect finished non-looping animations', () => {
      const duration = animSystem.getAnimationDuration('death');

      expect(animSystem.isAnimationFinished('death', duration - 0.1)).toBe(false);
      expect(animSystem.isAnimationFinished('death', duration + 0.1)).toBe(true);
    });

    it('should never finish looping animations', () => {
      const duration = animSystem.getAnimationDuration('idle');

      expect(animSystem.isAnimationFinished('idle', duration + 10)).toBe(false);
    });
  });

  describe('Blend Weight Calculation', () => {
    it('should calculate smooth blend weight', () => {
      // Test smooth step interpolation
      expect(animSystem.calculateBlendWeight(0)).toBeCloseTo(0);
      expect(animSystem.calculateBlendWeight(0.5)).toBeCloseTo(0.5);
      expect(animSystem.calculateBlendWeight(1)).toBeCloseTo(1);
    });

    it('should use smooth step curve', () => {
      const weight25 = animSystem.calculateBlendWeight(0.25);
      const weight75 = animSystem.calculateBlendWeight(0.75);

      // Smooth step should be slower at extremes
      expect(weight25).toBeLessThan(0.25);
      expect(weight75).toBeGreaterThan(0.75);
    });
  });

  describe('Animation Validation', () => {
    beforeEach(() => {
      const testAnimations: AnimationClip[] = [
        { name: 'idle', startFrame: 0, endFrame: 30, loop: true },
        { name: 'walk', startFrame: 31, endFrame: 60, loop: true },
      ];

      testAnimations.forEach((anim, index) => {
        animSystem['animationClips'].set(anim.name, anim);
        animSystem['animationIndices'].set(anim.name, index);
      });
    });

    it('should validate all required animations present', () => {
      const result = animSystem.validateAnimations(['idle', 'walk']);
      expect(result).toBe(true);
    });

    it('should fail validation for missing animations', () => {
      const result = animSystem.validateAnimations(['idle', 'walk', 'attack']);
      expect(result).toBe(false);
    });
  });

  describe('Texture Management', () => {
    it('should get texture dimensions', () => {
      const dimensions = animSystem.getTextureDimensions();
      expect(dimensions).toHaveProperty('width');
      expect(dimensions).toHaveProperty('height');
      expect(dimensions.width).toBe(0); // No texture baked yet
      expect(dimensions.height).toBe(0);
    });

    it('should return null for texture before baking', () => {
      expect(animSystem.getTexture()).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should report zero memory usage before baking', () => {
      expect(animSystem.getMemoryUsage()).toBe(0);
    });

    it('should dispose properly', () => {
      expect(() => animSystem.dispose()).not.toThrow();
    });

    it('should clear data on dispose', () => {
      const testAnimations: AnimationClip[] = [
        { name: 'idle', startFrame: 0, endFrame: 30, loop: true },
      ];

      testAnimations.forEach((anim, index) => {
        animSystem['animationClips'].set(anim.name, anim);
        animSystem['animationIndices'].set(anim.name, index);
      });

      animSystem.dispose();

      expect(animSystem.getAnimationNames()).toHaveLength(0);
      expect(animSystem.getTexture()).toBeNull();
    });
  });

  describe('Animation Indices', () => {
    beforeEach(() => {
      const testAnimations: AnimationClip[] = [
        { name: 'idle', startFrame: 0, endFrame: 30, loop: true },
        { name: 'walk', startFrame: 31, endFrame: 60, loop: true },
        { name: 'attack', startFrame: 61, endFrame: 90, loop: false },
      ];

      testAnimations.forEach((anim, index) => {
        animSystem['animationClips'].set(anim.name, anim);
        animSystem['animationIndices'].set(anim.name, index);
      });
    });

    it('should get all animation indices', () => {
      const indices = animSystem.getAnimationIndices();
      expect(indices.size).toBe(3);
      expect(indices.get('idle')).toBe(0);
      expect(indices.get('walk')).toBe(1);
      expect(indices.get('attack')).toBe(2);
    });
  });
});
