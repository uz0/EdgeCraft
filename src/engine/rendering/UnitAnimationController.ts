/**
 * UnitAnimationController - Controls animation state for individual units
 *
 * Provides animation state machine functionality:
 * - Play, pause, stop animations
 * - Animation transitions with blending
 * - Speed control
 * - Event callbacks for animation events
 */

import { BakedAnimationSystem } from './BakedAnimationSystem';
import { AnimationControllerState } from './types';

/**
 * Animation event callback type
 */
export type AnimationEventCallback = (animationName: string) => void;

/**
 * Controls animation playback for a single unit
 */
export class UnitAnimationController {
  private state: AnimationControllerState;
  private onAnimationComplete?: AnimationEventCallback;
  private onAnimationStart?: AnimationEventCallback;

  /**
   * Creates a new animation controller
   * @param animationSystem - Baked animation system
   * @param initialAnimation - Initial animation to play
   */
  constructor(
    private animationSystem: BakedAnimationSystem,
    initialAnimation: string = 'idle'
  ) {
    this.state = {
      currentAnimation: initialAnimation,
      currentTime: 0,
      isPlaying: true,
      isLooping: true,
      progress: 0,
      speed: 1.0,
    };
  }

  /**
   * Updates the animation state
   * @param deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime: number): void {
    if (!this.state.isPlaying) {
      return;
    }

    // Apply speed multiplier
    const adjustedDeltaTime = deltaTime * this.state.speed;

    // Handle animation blending
    if (
      this.state.targetAnimation !== undefined &&
      this.state.targetAnimation !== null &&
      this.state.targetAnimation !== ''
    ) {
      this.updateBlending(adjustedDeltaTime);
      return;
    }

    // Update current animation time
    this.state.currentTime = (this.state.currentTime ?? 0) + adjustedDeltaTime;

    // Apply animation-specific speed multiplier
    const clip = this.animationSystem.getAnimationClip(this.state.currentAnimation);
    if (clip !== undefined && clip.speed !== undefined && clip.speed !== null && clip.speed !== 0) {
      this.state.currentTime = this.animationSystem.applyAnimationSpeed(
        this.state.currentAnimation,
        this.state.currentTime
      );
    }

    // Check if animation has finished (for non-looping animations)
    const isFinished = this.animationSystem.isAnimationFinished(
      this.state.currentAnimation,
      this.state.currentTime
    );

    if (isFinished) {
      if (this.onAnimationComplete) {
        this.onAnimationComplete(this.state.currentAnimation);
      }
      // For non-looping animations, stop at the end
      this.state.isPlaying = false;
      return;
    }

    // Normalize time for looping animations
    this.state.currentTime = this.animationSystem.normalizeAnimationTime(
      this.state.currentAnimation,
      this.state.currentTime
    );
  }

  /**
   * Updates animation blending between two animations
   * @param deltaTime - Time elapsed since last update
   */
  private updateBlending(deltaTime: number): void {
    if (
      this.state.targetAnimation === undefined ||
      this.state.targetAnimation === null ||
      this.state.targetAnimation === '' ||
      this.state.blendProgress === undefined
    ) {
      return;
    }

    // Update blend progress
    const blendDuration = 0.2; // 200ms blend time
    this.state.blendProgress += deltaTime / blendDuration;

    if (this.state.blendProgress >= 1.0) {
      // Blend complete, switch to target animation
      this.state.currentAnimation = this.state.targetAnimation;
      this.state.currentTime = 0;
      this.state.targetAnimation = undefined;
      this.state.blendProgress = undefined;

      if (this.onAnimationStart) {
        this.onAnimationStart(this.state.currentAnimation);
      }
    }
  }

  /**
   * Plays an animation
   * @param animationName - Animation to play
   * @param blend - Whether to blend from current animation
   * @param restart - Whether to restart if already playing
   */
  play(animationName: string, blend: boolean = true, restart: boolean = false): void {
    if (!this.animationSystem.hasAnimation(animationName)) {
      console.warn(`Animation not found: ${animationName}`);
      return;
    }

    // If already playing this animation and not restarting, do nothing
    if (this.state.currentAnimation === animationName && !restart) {
      return;
    }

    if (blend && this.state.currentAnimation !== animationName) {
      // Start blending to new animation
      this.state.targetAnimation = animationName;
      this.state.blendProgress = 0;
    } else {
      // Immediate switch
      this.state.currentAnimation = animationName;
      this.state.currentTime = 0;
      this.state.targetAnimation = undefined;
      this.state.blendProgress = undefined;

      if (this.onAnimationStart) {
        this.onAnimationStart(animationName);
      }
    }

    this.state.isPlaying = true;
  }

  /**
   * Pauses the current animation
   */
  pause(): void {
    this.state.isPlaying = false;
  }

  /**
   * Resumes the current animation
   */
  resume(): void {
    this.state.isPlaying = true;
  }

  /**
   * Stops the current animation and resets to time 0
   */
  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.state.targetAnimation = undefined;
    this.state.blendProgress = undefined;
  }

  /**
   * Sets the animation playback speed
   * @param speed - Speed multiplier (1.0 = normal)
   */
  setSpeed(speed: number): void {
    this.state.speed = Math.max(0, speed);
  }

  /**
   * Gets the current animation playback speed
   * @returns Speed multiplier
   */
  getSpeed(): number {
    return this.state.speed;
  }

  /**
   * Gets the current animation name
   * @returns Animation name
   */
  getCurrentAnimation(): string {
    return this.state.currentAnimation;
  }

  /**
   * Gets the current animation time
   * @returns Time in seconds
   */
  getCurrentTime(): number {
    return this.state.currentTime ?? 0;
  }

  /**
   * Gets the current animation progress (0-1)
   * @returns Progress
   */
  getProgress(): number {
    return this.animationSystem.getAnimationProgress(
      this.state.currentAnimation,
      this.state.currentTime ?? 0
    );
  }

  /**
   * Checks if an animation is currently playing
   * @returns True if playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * Checks if currently blending between animations
   * @returns True if blending
   */
  isBlending(): boolean {
    return this.state.targetAnimation !== undefined;
  }

  /**
   * Gets the current blend progress (0-1)
   * @returns Blend progress or 0 if not blending
   */
  getBlendProgress(): number {
    return this.state.blendProgress ?? 0;
  }

  /**
   * Gets the complete animation state
   * @returns Animation controller state
   */
  getState(): AnimationControllerState {
    return { ...this.state };
  }

  /**
   * Sets a callback for when an animation completes
   * @param callback - Callback function
   */
  onComplete(callback: AnimationEventCallback): void {
    this.onAnimationComplete = callback;
  }

  /**
   * Sets a callback for when an animation starts
   * @param callback - Callback function
   */
  onStart(callback: AnimationEventCallback): void {
    this.onAnimationStart = callback;
  }

  /**
   * Clears all event callbacks
   */
  clearCallbacks(): void {
    this.onAnimationComplete = undefined;
    this.onAnimationStart = undefined;
  }

  /**
   * Seeks to a specific time in the current animation
   * @param time - Time in seconds
   */
  seek(time: number): void {
    const duration = this.animationSystem.getAnimationDuration(this.state.currentAnimation);
    this.state.currentTime = Math.max(0, Math.min(time, duration));
  }

  /**
   * Seeks to a specific progress in the current animation
   * @param progress - Progress (0-1)
   */
  seekToProgress(progress: number): void {
    const duration = this.animationSystem.getAnimationDuration(this.state.currentAnimation);
    this.state.currentTime = Math.max(0, Math.min(progress, 1)) * duration;
  }

  /**
   * Resets the controller to initial state
   * @param animation - Animation to reset to (default: current)
   */
  reset(animation?: string): void {
    if (
      animation !== undefined &&
      animation !== null &&
      animation !== '' &&
      this.animationSystem.hasAnimation(animation)
    ) {
      this.state.currentAnimation = animation;
    }
    this.state.currentTime = 0;
    this.state.isPlaying = true;
    this.state.speed = 1.0;
    this.state.targetAnimation = undefined;
    this.state.blendProgress = undefined;
  }
}
