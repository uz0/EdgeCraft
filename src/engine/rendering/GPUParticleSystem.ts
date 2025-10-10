/**
 * GPU Particle System
 *
 * Provides:
 * - 5,000 GPU particles @ 60 FPS @ MEDIUM
 * - 3 Concurrent Effects @ MEDIUM
 * - Effect Types: Combat, Magic, Weather
 * - WebGL2 GPUParticleSystem with CPU fallback
 *
 * Target: <3ms @ MEDIUM preset
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';

/**
 * Particle effect type
 */
export type ParticleEffectType = 'fire' | 'smoke' | 'magic' | 'debris' | 'rain' | 'snow';

/**
 * Particle effect configuration
 */
export interface ParticleEffectConfig {
  /** Effect type */
  type: ParticleEffectType;

  /** Emitter position */
  position: BABYLON.Vector3;

  /** Particle count */
  capacity?: number;

  /** Emission rate */
  emitRate?: number;

  /** Effect duration (0 = infinite) */
  duration?: number;

  /** Particle lifetime */
  minLifeTime?: number;
  maxLifeTime?: number;

  /** Particle size */
  minSize?: number;
  maxSize?: number;

  /** Emission power */
  minEmitPower?: number;
  maxEmitPower?: number;

  /** Gravity */
  gravity?: BABYLON.Vector3;

  /** Color gradient */
  color1?: BABYLON.Color4;
  color2?: BABYLON.Color4;
  colorDead?: BABYLON.Color4;

  /** Texture URL */
  textureUrl?: string;

  /** Blend mode */
  blendMode?: number;
}

/**
 * Active particle effect
 */
interface ActiveEffect {
  /** Effect ID */
  id: string;

  /** Particle system */
  system: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem;

  /** Effect type */
  type: ParticleEffectType;

  /** Creation time */
  createdAt: number;

  /** Duration (0 = infinite) */
  duration: number;

  /** Is GPU-based */
  isGPU: boolean;
}

/**
 * Particle system statistics
 */
export interface ParticleSystemStats {
  /** Total active effects */
  activeEffects: number;

  /** Total particles */
  totalParticles: number;

  /** GPU effects */
  gpuEffects: number;

  /** CPU effects */
  cpuEffects: number;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;
}

/**
 * GPU-based particle system with fallback to CPU
 *
 * @example
 * ```typescript
 * const particles = new AdvancedParticleSystem(scene, {
 *   quality: QualityPreset.MEDIUM,
 * });
 *
 * const effectId = await particles.createEffect({
 *   type: 'fire',
 *   position: new BABYLON.Vector3(0, 2, 0),
 *   capacity: 1000,
 * });
 * ```
 */
export class AdvancedParticleSystem {
  private scene: BABYLON.Scene;
  private quality: QualityPreset;
  private effects: Map<string, ActiveEffect> = new Map();
  private maxParticles: number;
  private maxConcurrentEffects: number;
  private useGPU: boolean;
  private nextEffectId: number = 0;

  constructor(scene: BABYLON.Scene, config: { quality: QualityPreset }) {
    this.scene = scene;
    this.quality = config.quality;

    // Set limits based on quality
    const limits = this.getQualityLimits(config.quality);
    this.maxParticles = limits.maxParticles;
    this.maxConcurrentEffects = limits.maxEffects;

    // Check GPU support
    this.useGPU = BABYLON.GPUParticleSystem.IsSupported;

    console.log(
      `Particle system initialized (${this.useGPU ? 'GPU' : 'CPU'}, max ${this.maxParticles} particles, ${this.maxConcurrentEffects} effects)`
    );
  }

  /**
   * Get quality-based limits
   */
  private getQualityLimits(quality: QualityPreset): {
    maxParticles: number;
    maxEffects: number;
  } {
    switch (quality) {
      case QualityPreset.LOW:
        return { maxParticles: 1000, maxEffects: 2 };
      case QualityPreset.MEDIUM:
        return { maxParticles: 5000, maxEffects: 3 };
      case QualityPreset.HIGH:
        return { maxParticles: 10000, maxEffects: 5 };
      case QualityPreset.ULTRA:
        return { maxParticles: 15000, maxEffects: 7 };
      default:
        return { maxParticles: 5000, maxEffects: 3 };
    }
  }

  /**
   * Create a new particle effect
   */
  public createEffect(config: ParticleEffectConfig): string {
    // Check concurrent effect limit
    if (this.effects.size >= this.maxConcurrentEffects) {
      console.warn(
        `Cannot create effect: limit of ${this.maxConcurrentEffects} concurrent effects reached`
      );
      return '';
    }

    const effectId = `particle_${this.nextEffectId++}`;

    // Create particle system
    const system = this.useGPU ? this.createGPUSystem(config) : this.createCPUSystem(config);

    if (system == null) {
      return '';
    }

    // Store effect
    this.effects.set(effectId, {
      id: effectId,
      system,
      type: config.type,
      createdAt: Date.now(),
      duration: config.duration ?? 0,
      isGPU: this.useGPU,
    });

    // Start emitting
    system.start();

    console.log(`Created ${config.type} effect: ${effectId} (${this.useGPU ? 'GPU' : 'CPU'})`);
    return effectId;
  }

  /**
   * Create GPU particle system
   */
  private createGPUSystem(config: ParticleEffectConfig): BABYLON.GPUParticleSystem | null {
    const capacity = Math.min(config.capacity ?? 1000, this.maxParticles);

    const system = new BABYLON.GPUParticleSystem(`gpu_${config.type}`, { capacity }, this.scene);

    // Apply configuration
    this.configureSystem(system, config);

    return system;
  }

  /**
   * Create CPU particle system (fallback)
   */
  private createCPUSystem(config: ParticleEffectConfig): BABYLON.ParticleSystem | null {
    const capacity = Math.min(config.capacity ?? 1000, this.maxParticles);

    const system = new BABYLON.ParticleSystem(`cpu_${config.type}`, capacity, this.scene);

    // Apply configuration
    this.configureSystem(system, config);

    return system;
  }

  /**
   * Configure particle system based on effect type
   */
  private configureSystem(
    system: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem,
    config: ParticleEffectConfig
  ): void {
    // Emitter
    system.emitter = config.position;

    // Emission rate
    system.emitRate = config.emitRate ?? 100;

    // Particle lifetime
    system.minLifeTime = config.minLifeTime ?? 0.3;
    system.maxLifeTime = config.maxLifeTime ?? 1.5;

    // Particle size
    system.minSize = config.minSize ?? 0.1;
    system.maxSize = config.maxSize ?? 0.5;

    // Emission power
    system.minEmitPower = config.minEmitPower ?? 1;
    system.maxEmitPower = config.maxEmitPower ?? 3;

    // Gravity
    system.gravity = config.gravity ?? new BABYLON.Vector3(0, -9.81, 0);

    // Direction
    system.direction1 = new BABYLON.Vector3(-1, 1, -1);
    system.direction2 = new BABYLON.Vector3(1, 1, 1);

    // Apply effect-specific settings
    this.applyEffectPreset(system, config);

    // Texture
    if (config.textureUrl != null) {
      system.particleTexture = new BABYLON.Texture(config.textureUrl, this.scene);
    } else {
      // Use default flare texture
      system.particleTexture = new BABYLON.Texture(
        'https://assets.babylonjs.com/textures/flare.png',
        this.scene
      );
    }

    // Blend mode
    system.blendMode = config.blendMode ?? BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    // Update speed
    system.updateSpeed = 0.01;
  }

  /**
   * Apply effect-specific presets
   */
  private applyEffectPreset(
    system: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem,
    config: ParticleEffectConfig
  ): void {
    switch (config.type) {
      case 'fire':
        system.color1 = config.color1 ?? new BABYLON.Color4(1, 0.5, 0, 1);
        system.color2 = config.color2 ?? new BABYLON.Color4(1, 0, 0, 1);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(0, 0, 0, 0);
        system.minEmitPower = 1;
        system.maxEmitPower = 3;
        system.gravity = new BABYLON.Vector3(0, 5, 0); // Upward
        system.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
        system.direction2 = new BABYLON.Vector3(0.5, 1, 0.5);
        break;

      case 'smoke':
        system.color1 = config.color1 ?? new BABYLON.Color4(0.8, 0.8, 0.8, 1);
        system.color2 = config.color2 ?? new BABYLON.Color4(0.5, 0.5, 0.5, 0.5);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(0.3, 0.3, 0.3, 0);
        system.minEmitPower = 0.5;
        system.maxEmitPower = 1.5;
        system.gravity = new BABYLON.Vector3(0, 2, 0); // Slow upward
        system.minSize = 0.5;
        system.maxSize = 2.0;
        break;

      case 'magic':
        system.color1 = config.color1 ?? new BABYLON.Color4(0.5, 0.2, 1, 1);
        system.color2 = config.color2 ?? new BABYLON.Color4(0.2, 0.8, 1, 1);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(0, 0, 1, 0);
        system.minEmitPower = 2;
        system.maxEmitPower = 5;
        system.gravity = new BABYLON.Vector3(0, 0, 0); // No gravity
        system.minSize = 0.05;
        system.maxSize = 0.2;
        break;

      case 'debris':
        system.color1 = config.color1 ?? new BABYLON.Color4(0.6, 0.4, 0.2, 1);
        system.color2 = config.color2 ?? new BABYLON.Color4(0.4, 0.3, 0.1, 1);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(0.2, 0.1, 0, 0);
        system.minEmitPower = 5;
        system.maxEmitPower = 10;
        system.gravity = new BABYLON.Vector3(0, -9.81, 0);
        break;

      case 'rain':
        system.color1 = config.color1 ?? new BABYLON.Color4(0.3, 0.5, 0.8, 0.6);
        system.color2 = config.color2 ?? new BABYLON.Color4(0.3, 0.5, 0.8, 0.6);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(0.3, 0.5, 0.8, 0);
        system.minEmitPower = 0;
        system.maxEmitPower = 0;
        system.gravity = new BABYLON.Vector3(0, -20, 0); // Fast downward
        system.direction1 = new BABYLON.Vector3(0, -1, 0);
        system.direction2 = new BABYLON.Vector3(0, -1, 0);
        system.minSize = 0.05;
        system.maxSize = 0.1;
        break;

      case 'snow':
        system.color1 = config.color1 ?? new BABYLON.Color4(1, 1, 1, 1);
        system.color2 = config.color2 ?? new BABYLON.Color4(1, 1, 1, 1);
        system.colorDead = config.colorDead ?? new BABYLON.Color4(1, 1, 1, 0);
        system.minEmitPower = 0;
        system.maxEmitPower = 0;
        system.gravity = new BABYLON.Vector3(0, -2, 0); // Slow downward
        system.direction1 = new BABYLON.Vector3(-0.1, -1, -0.1);
        system.direction2 = new BABYLON.Vector3(0.1, -1, 0.1);
        system.minSize = 0.1;
        system.maxSize = 0.3;
        break;
    }
  }

  /**
   * Update effect position
   */
  public updateEffectPosition(effectId: string, position: BABYLON.Vector3): void {
    const effect = this.effects.get(effectId);
    if (effect != null) {
      effect.system.emitter = position;
    }
  }

  /**
   * Stop and remove effect
   */
  public removeEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect == null) {
      return;
    }

    effect.system.stop();
    effect.system.dispose();
    this.effects.delete(effectId);

    console.log(`Effect removed: ${effectId}`);
  }

  /**
   * Update all effects (check for expired effects)
   */
  public update(): void {
    const now = Date.now();

    for (const [effectId, effect] of this.effects.entries()) {
      // Remove expired effects
      if (effect.duration > 0 && now - effect.createdAt > effect.duration) {
        this.removeEffect(effectId);
      }
    }
  }

  /**
   * Update quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.quality) {
      return;
    }

    console.log(`Updating particle quality: ${this.quality} → ${quality}`);

    const newLimits = this.getQualityLimits(quality);
    this.quality = quality;
    this.maxParticles = newLimits.maxParticles;
    this.maxConcurrentEffects = newLimits.maxEffects;

    // Remove excess effects if downgrading
    if (this.effects.size > newLimits.maxEffects) {
      const effectsToRemove = Array.from(this.effects.keys()).slice(newLimits.maxEffects);
      for (const effectId of effectsToRemove) {
        this.removeEffect(effectId);
      }
    }
  }

  /**
   * Get particle system statistics
   */
  public getStats(): ParticleSystemStats {
    let totalParticles = 0;
    let gpuEffects = 0;
    let cpuEffects = 0;

    for (const effect of this.effects.values()) {
      if (effect.system instanceof BABYLON.GPUParticleSystem) {
        totalParticles += effect.system.activeParticleCount;
        gpuEffects++;
      } else if (effect.system instanceof BABYLON.ParticleSystem) {
        totalParticles += effect.system.getActiveCount();
        cpuEffects++;
      }
    }

    // Estimate frame time
    // GPU: ~0.5ms per 1000 particles
    // CPU: ~2ms per 1000 particles
    const gpuTime = (totalParticles * 0.5) / 1000;
    const cpuTime = (totalParticles * 2) / 1000;
    const estimatedFrameTimeMs = this.useGPU ? gpuTime : cpuTime;

    return {
      activeEffects: this.effects.size,
      totalParticles,
      gpuEffects,
      cpuEffects,
      estimatedFrameTimeMs,
    };
  }

  /**
   * Dispose of all effects
   */
  public dispose(): void {
    for (const effect of this.effects.values()) {
      effect.system.stop();
      effect.system.dispose();
    }
    this.effects.clear();
    console.log('Particle system disposed');
  }
}
