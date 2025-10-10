/**
 * Weather System
 *
 * Provides:
 * - Rain System: 2,000 particles
 * - Snow System: 2,000 particles
 * - Fog System: scene.fogMode (cheap: <0.5ms)
 * - Weather Transitions: 5-second smooth blend
 *
 * Target: <3ms total (shares particle budget)
 */

import * as BABYLON from '@babylonjs/core';
import { AdvancedParticleSystem } from './GPUParticleSystem';

/**
 * Weather type
 */
export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';

/**
 * Weather configuration
 */
export interface WeatherConfig {
  /** Weather type */
  type: WeatherType;

  /** Intensity (0-1) */
  intensity?: number;

  /** Fog density (for fog weather) */
  fogDensity?: number;

  /** Fog color */
  fogColor?: BABYLON.Color3;

  /** Particle count (for rain/snow) */
  particleCount?: number;

  /** Area size (particles emitted within this area) */
  areaSize?: BABYLON.Vector3;
}

/**
 * Weather statistics
 */
export interface WeatherStats {
  /** Current weather type */
  currentWeather: WeatherType;

  /** Weather intensity */
  intensity: number;

  /** Active particle effect ID */
  particleEffectId: string | null;

  /** Fog enabled */
  fogEnabled: boolean;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;
}

/**
 * Weather system with smooth transitions
 *
 * @example
 * ```typescript
 * const weather = new WeatherSystem(scene, particleSystem);
 *
 * // Set to rainy weather
 * await weather.setWeather({
 *   type: 'rain',
 *   intensity: 0.7,
 *   particleCount: 2000,
 * });
 *
 * // Transition to clear weather
 * await weather.transitionTo({ type: 'clear' }, 5000);
 * ```
 */
export class WeatherSystem {
  private scene: BABYLON.Scene;
  private particleSystem: AdvancedParticleSystem;
  private currentWeather: WeatherType = 'clear';
  private currentIntensity: number = 0;
  private currentParticleEffect: string | null = null;
  private isTransitioning: boolean = false;
  private cameraPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();

  constructor(scene: BABYLON.Scene, particleSystem: AdvancedParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;

    // Track camera position for particle emitter
    if (scene.activeCamera != null) {
      this.cameraPosition = scene.activeCamera.position.clone();
    }

    console.log('Weather system initialized');
  }

  /**
   * Set weather immediately
   */
  public async setWeather(config: WeatherConfig): Promise<void> {
    console.log(`Setting weather to: ${config.type} (intensity: ${config.intensity ?? 1.0})`);

    // Clear current weather
    this.clearCurrentWeather();

    // Apply new weather
    this.currentWeather = config.type;
    this.currentIntensity = config.intensity ?? 1.0;

    switch (config.type) {
      case 'clear':
        this.applyClearWeather();
        break;

      case 'rain':
        await this.applyRainWeather(config);
        break;

      case 'snow':
        await this.applySnowWeather(config);
        break;

      case 'fog':
        this.applyFogWeather(config);
        break;

      case 'storm':
        await this.applyStormWeather(config);
        break;
    }
  }

  /**
   * Transition to new weather over time
   */
  public async transitionTo(config: WeatherConfig, durationMs: number = 5000): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Weather transition already in progress');
      return;
    }

    console.log(
      `Transitioning from ${this.currentWeather} to ${config.type} over ${durationMs}ms`
    );

    this.isTransitioning = true;

    // Fade out current weather
    await this.fadeOutCurrentWeather(durationMs / 2);

    // Set new weather
    await this.setWeather(config);

    // Fade in new weather
    await this.fadeInWeather(durationMs / 2);

    this.isTransitioning = false;
    console.log('Weather transition complete');
  }

  /**
   * Clear current weather
   */
  private clearCurrentWeather(): void {
    // Remove particle effect
    if (this.currentParticleEffect != null) {
      this.particleSystem.removeEffect(this.currentParticleEffect);
      this.currentParticleEffect = null;
    }

    // Disable fog
    this.scene.fogEnabled = false;
  }

  /**
   * Apply clear weather
   */
  private applyClearWeather(): void {
    this.scene.fogEnabled = false;
    this.scene.clearColor = new BABYLON.Color4(0.5, 0.7, 0.9, 1.0); // Blue sky
  }

  /**
   * Apply rain weather
   */
  private async applyRainWeather(config: WeatherConfig): Promise<void> {
    const particleCount = config.particleCount ?? 2000;
    const areaSize = config.areaSize ?? new BABYLON.Vector3(100, 0, 100);
    const intensity = config.intensity ?? 1.0;

    // Create rain particle effect above camera
    const emitterPos = this.cameraPosition.clone();
    emitterPos.y += 50; // High above

    this.currentParticleEffect = await this.particleSystem.createEffect({
      type: 'rain',
      position: emitterPos,
      capacity: particleCount,
      emitRate: particleCount * intensity,
      minLifeTime: 2,
      maxLifeTime: 3,
      minSize: 0.05,
      maxSize: 0.1,
      minEmitPower: 0,
      maxEmitPower: 0,
      gravity: new BABYLON.Vector3(0, -20, 0),
    });

    // Add fog for atmosphere
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.005 * intensity;
    this.scene.fogColor = new BABYLON.Color3(0.6, 0.6, 0.7);
    this.scene.fogEnabled = true;

    // Darken sky
    this.scene.clearColor = new BABYLON.Color4(0.4, 0.4, 0.5, 1.0);
  }

  /**
   * Apply snow weather
   */
  private async applySnowWeather(config: WeatherConfig): Promise<void> {
    const particleCount = config.particleCount ?? 2000;
    const intensity = config.intensity ?? 1.0;

    // Create snow particle effect above camera
    const emitterPos = this.cameraPosition.clone();
    emitterPos.y += 50; // High above

    this.currentParticleEffect = await this.particleSystem.createEffect({
      type: 'snow',
      position: emitterPos,
      capacity: particleCount,
      emitRate: particleCount * intensity * 0.5, // Slower than rain
      minLifeTime: 3,
      maxLifeTime: 5,
      minSize: 0.1,
      maxSize: 0.3,
      minEmitPower: 0,
      maxEmitPower: 0,
      gravity: new BABYLON.Vector3(0, -2, 0), // Slow fall
    });

    // Add fog for atmosphere
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.01 * intensity;
    this.scene.fogColor = new BABYLON.Color3(0.85, 0.85, 0.9);
    this.scene.fogEnabled = true;

    // Brighten sky (white)
    this.scene.clearColor = new BABYLON.Color4(0.8, 0.8, 0.85, 1.0);
  }

  /**
   * Apply fog weather
   */
  private applyFogWeather(config: WeatherConfig): void {
    const intensity = config.intensity ?? 1.0;
    const fogDensity = config.fogDensity ?? 0.02;
    const fogColor = config.fogColor ?? new BABYLON.Color3(0.7, 0.7, 0.75);

    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = fogDensity * intensity;
    this.scene.fogColor = fogColor;
    this.scene.fogEnabled = true;

    // Dim sky
    this.scene.clearColor = new BABYLON.Color4(
      fogColor.r * 0.8,
      fogColor.g * 0.8,
      fogColor.b * 0.8,
      1.0
    );
  }

  /**
   * Apply storm weather (rain + fog)
   */
  private async applyStormWeather(config: WeatherConfig): Promise<void> {
    const intensity = config.intensity ?? 1.0;

    // Heavy rain
    await this.applyRainWeather({
      ...config,
      particleCount: 3000,
      intensity: intensity * 1.5,
    });

    // Dense fog
    this.scene.fogDensity = 0.015 * intensity;
    this.scene.fogColor = new BABYLON.Color3(0.3, 0.3, 0.35);

    // Very dark sky
    this.scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.25, 1.0);

    console.log('Storm weather applied (heavy rain + fog)');
  }

  /**
   * Fade out current weather
   */
  private async fadeOutCurrentWeather(durationMs: number): Promise<void> {
    const startIntensity = this.currentIntensity;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);

        // Linear fade
        this.currentIntensity = startIntensity * (1 - progress);

        // Update fog density if enabled
        if (this.scene.fogEnabled) {
          this.scene.fogDensity *= 1 - progress;
        }

        if (progress >= 1.0) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, 16); // ~60fps
    });
  }

  /**
   * Fade in weather
   */
  private async fadeInWeather(durationMs: number): Promise<void> {
    const targetIntensity = this.currentIntensity;
    const startTime = Date.now();

    this.currentIntensity = 0;

    return new Promise((resolve) => {
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);

        // Linear fade
        this.currentIntensity = targetIntensity * progress;

        // Update fog density if enabled
        if (this.scene.fogEnabled) {
          this.scene.fogDensity *= progress;
        }

        if (progress >= 1.0) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, 16); // ~60fps
    });
  }

  /**
   * Update weather system (call each frame)
   */
  public update(cameraPosition: BABYLON.Vector3): void {
    this.cameraPosition = cameraPosition;

    // Update particle emitter position if exists
    if (this.currentParticleEffect != null) {
      const emitterPos = cameraPosition.clone();
      emitterPos.y += 50; // Keep above camera
      this.particleSystem.updateEffectPosition(this.currentParticleEffect, emitterPos);
    }
  }

  /**
   * Get weather statistics
   */
  public getStats(): WeatherStats {
    // Estimate frame time
    let estimatedFrameTimeMs = 0;

    // Particle cost (if weather uses particles)
    if (this.currentParticleEffect != null) {
      const particleStats = this.particleSystem.getStats();
      estimatedFrameTimeMs += particleStats.estimatedFrameTimeMs;
    }

    // Fog cost (very cheap)
    if (this.scene.fogEnabled) {
      estimatedFrameTimeMs += 0.3;
    }

    return {
      currentWeather: this.currentWeather,
      intensity: this.currentIntensity,
      particleEffectId: this.currentParticleEffect,
      fogEnabled: this.scene.fogEnabled,
      estimatedFrameTimeMs,
    };
  }

  /**
   * Dispose of weather system
   */
  public dispose(): void {
    this.clearCurrentWeather();
    console.log('Weather system disposed');
  }
}
