/**
 * BakedAnimationSystem - GPU-based animation using texture baking
 *
 * Converts skeletal animations into GPU textures for efficient playback:
 * - Zero CPU cost for animation playback
 * - Scales to 1000+ animated units
 * - Multiple animations per unit type
 * - Animation blending support
 */

import * as BABYLON from '@babylonjs/core';
import { AnimationClip, BakedAnimationData } from './types';

/**
 * Manages baked animation textures for efficient GPU animation
 */
export class BakedAnimationSystem {
  private bakedTexture: BABYLON.RawTexture | null = null;
  private animationClips: Map<string, AnimationClip> = new Map();
  private animationIndices: Map<string, number> = new Map();
  private textureWidth: number = 0;
  private textureHeight: number = 0;

  constructor(private scene: BABYLON.Scene) {}

  /**
   * Bakes skeletal animations into a GPU texture
   * @param mesh - Source mesh with skeletal animations
   * @param animations - Animation clips to bake
   * @returns Baked animation data
   */
  async bakeAnimations(
    mesh: BABYLON.Mesh,
    animations: AnimationClip[]
  ): Promise<BakedAnimationData> {
    if (!mesh.skeleton) {
      throw new Error('Mesh must have a skeleton for animation baking');
    }

    console.log(`Baking ${animations.length} animations for mesh...`);

    // Store animation metadata
    animations.forEach((anim, index) => {
      this.animationClips.set(anim.name, anim);
      this.animationIndices.set(anim.name, index);
    });

    // Use Babylon's built-in vertex animation baker
    const baker = new BABYLON.VertexAnimationBaker(this.scene, mesh);

    // Bake all animation clips into a single texture
    const ranges = animations.map(
      (anim) => new BABYLON.AnimationRange(anim.name, anim.startFrame, anim.endFrame)
    );

    const bakedData = await baker.bakeVertexData(ranges);

    // Extract texture dimensions from baked data
    // The baker returns a Float32Array with the vertex data
    // We need to estimate texture size based on animation frames
    const totalFrames = animations.reduce(
      (sum, anim) => sum + (anim.endFrame - anim.startFrame),
      0
    );

    // Calculate texture dimensions
    this.textureWidth = Math.min(2048, Math.ceil(Math.sqrt(totalFrames)));
    this.textureHeight = Math.ceil(totalFrames / this.textureWidth);

    this.bakedTexture = new BABYLON.RawTexture(
      bakedData,
      this.textureWidth,
      this.textureHeight,
      BABYLON.Constants.TEXTUREFORMAT_RGBA,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE
    );

    // Apply baked animation to mesh
    if (!mesh.bakedVertexAnimationManager) {
      mesh.bakedVertexAnimationManager = new BABYLON.BakedVertexAnimationManager(this.scene);
    }

    mesh.bakedVertexAnimationManager.texture = this.bakedTexture;

    console.log(`Animation baking complete: ${this.textureWidth}x${this.textureHeight} texture`);

    return {
      texture: this.bakedTexture,
      width: this.textureWidth,
      height: this.textureHeight,
      clips: this.animationClips,
    };
  }

  /**
   * Gets the index of an animation by name
   * @param animationName - Animation name
   * @returns Animation index (0 if not found)
   */
  getAnimationIndex(animationName: string): number {
    return this.animationIndices.get(animationName) ?? 0;
  }

  /**
   * Gets all animation indices as a map
   * @returns Map of animation name to index
   */
  getAnimationIndices(): Map<string, number> {
    return new Map(this.animationIndices);
  }

  /**
   * Gets the duration of an animation in seconds
   * @param animationName - Animation name
   * @returns Duration in seconds (0 if not found)
   */
  getAnimationDuration(animationName: string): number {
    const clip = this.animationClips.get(animationName);
    if (!clip) {
      return 0;
    }

    const frameCount = clip.endFrame - clip.startFrame;
    const fps = 30; // Standard animation FPS
    return frameCount / fps;
  }

  /**
   * Gets the frame count of an animation
   * @param animationName - Animation name
   * @returns Frame count (0 if not found)
   */
  getAnimationFrameCount(animationName: string): number {
    const clip = this.animationClips.get(animationName);
    if (!clip) {
      return 0;
    }
    return clip.endFrame - clip.startFrame;
  }

  /**
   * Checks if an animation exists
   * @param animationName - Animation name
   * @returns True if animation exists
   */
  hasAnimation(animationName: string): boolean {
    return this.animationClips.has(animationName);
  }

  /**
   * Gets all animation names
   * @returns Array of animation names
   */
  getAnimationNames(): string[] {
    return Array.from(this.animationClips.keys());
  }

  /**
   * Gets an animation clip by name
   * @param animationName - Animation name
   * @returns Animation clip or undefined
   */
  getAnimationClip(animationName: string): AnimationClip | undefined {
    return this.animationClips.get(animationName);
  }

  /**
   * Gets all animation clips
   * @returns Map of animation clips
   */
  getAllAnimationClips(): Map<string, AnimationClip> {
    return new Map(this.animationClips);
  }

  /**
   * Gets the baked animation texture
   * @returns Raw texture or null
   */
  getTexture(): BABYLON.RawTexture | null {
    return this.bakedTexture;
  }

  /**
   * Gets texture dimensions
   * @returns { width, height }
   */
  getTextureDimensions(): { width: number; height: number } {
    return {
      width: this.textureWidth,
      height: this.textureHeight,
    };
  }

  /**
   * Normalizes animation time to handle looping
   * @param animationName - Animation name
   * @param time - Current time in seconds
   * @returns Normalized time
   */
  normalizeAnimationTime(animationName: string, time: number): number {
    const duration = this.getAnimationDuration(animationName);
    if (duration === 0) {
      return 0;
    }

    const clip = this.animationClips.get(animationName);
    if (!clip) {
      return 0;
    }

    // Check if animation should loop
    if (clip.loop !== false) {
      // Default to looping
      return time % duration;
    } else {
      // Clamp to duration if not looping
      return Math.min(time, duration);
    }
  }

  /**
   * Applies animation speed multiplier
   * @param animationName - Animation name
   * @param time - Current time
   * @returns Time adjusted for speed
   */
  applyAnimationSpeed(animationName: string, time: number): number {
    const clip = this.animationClips.get(animationName);
    if (!clip || !clip.speed) {
      return time;
    }
    return time * clip.speed;
  }

  /**
   * Calculates animation progress (0-1)
   * @param animationName - Animation name
   * @param time - Current time in seconds
   * @returns Progress from 0 to 1
   */
  getAnimationProgress(animationName: string, time: number): number {
    const duration = this.getAnimationDuration(animationName);
    if (duration === 0) {
      return 0;
    }

    const normalizedTime = this.normalizeAnimationTime(animationName, time);
    return normalizedTime / duration;
  }

  /**
   * Gets the current frame number for an animation
   * @param animationName - Animation name
   * @param time - Current time in seconds
   * @returns Frame number
   */
  getCurrentFrame(animationName: string, time: number): number {
    const clip = this.animationClips.get(animationName);
    if (!clip) {
      return 0;
    }

    const normalizedTime = this.normalizeAnimationTime(animationName, time);
    const fps = 30;
    const frameOffset = normalizedTime * fps;

    return clip.startFrame + frameOffset;
  }

  /**
   * Checks if animation has finished (for non-looping animations)
   * @param animationName - Animation name
   * @param time - Current time in seconds
   * @returns True if animation has finished
   */
  isAnimationFinished(animationName: string, time: number): boolean {
    const clip = this.animationClips.get(animationName);
    if (!clip) {
      return true;
    }

    // Looping animations never finish
    if (clip.loop !== false) {
      return false;
    }

    const duration = this.getAnimationDuration(animationName);
    return time >= duration;
  }

  /**
   * Calculates blend weight between two animations
   * @param progress - Blend progress (0-1)
   * @returns Blend weight
   */
  calculateBlendWeight(progress: number): number {
    // Smooth step interpolation for better blending
    return progress * progress * (3 - 2 * progress);
  }

  /**
   * Disposes of the baked animation system
   */
  dispose(): void {
    if (this.bakedTexture) {
      this.bakedTexture.dispose();
      this.bakedTexture = null;
    }
    this.animationClips.clear();
    this.animationIndices.clear();
  }

  /**
   * Gets memory usage estimate in bytes
   * @returns Memory usage
   */
  getMemoryUsage(): number {
    if (!this.bakedTexture) {
      return 0;
    }
    // RGBA = 4 bytes per pixel
    return this.textureWidth * this.textureHeight * 4;
  }

  /**
   * Validates that all required animations are present
   * @param requiredAnimations - Array of required animation names
   * @returns True if all animations are present
   */
  validateAnimations(requiredAnimations: string[]): boolean {
    for (const animName of requiredAnimations) {
      if (!this.hasAnimation(animName)) {
        console.error(`Missing required animation: ${animName}`);
        return false;
      }
    }
    return true;
  }
}
