/**
 * Advanced Lighting System
 *
 * Provides:
 * - Point Lights: 8 concurrent max @ MEDIUM
 * - Spot Lights: 4 concurrent max @ MEDIUM
 * - Distance Culling: Auto-disable lights outside frustum
 * - Shadow Support: Point/spot cast shadows (optional per light)
 * - Light Pooling: Reuse light objects for efficiency
 *
 * Target: <6ms @ MEDIUM preset
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';

/**
 * Light configuration
 */
export interface LightConfig {
  /** Light type */
  type: 'point' | 'spot';

  /** Light position */
  position: BABYLON.Vector3;

  /** Light direction (for spot lights) */
  direction?: BABYLON.Vector3;

  /** Light color */
  color?: BABYLON.Color3;

  /** Light intensity */
  intensity?: number;

  /** Light range */
  range?: number;

  /** Spot angle (for spot lights, in radians) */
  angle?: number;

  /** Enable shadows */
  castShadows?: boolean;

  /** Shadow map size */
  shadowMapSize?: number;
}

/**
 * Pooled light instance
 */
interface PooledLight {
  /** Light object */
  light: BABYLON.Light;

  /** Is currently in use */
  inUse: boolean;

  /** Shadow generator (if enabled) */
  shadowGenerator?: BABYLON.ShadowGenerator;

  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Lighting statistics
 */
export interface LightingStats {
  /** Total lights in pool */
  totalLights: number;

  /** Active lights */
  activeLights: number;

  /** Point lights active */
  pointLightsActive: number;

  /** Spot lights active */
  spotLightsActive: number;

  /** Lights with shadows */
  shadowCasters: number;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;
}

/**
 * Advanced lighting system with pooling and culling
 *
 * @example
 * ```typescript
 * const lighting = new AdvancedLightingSystem(scene, {
 *   quality: QualityPreset.MEDIUM,
 * });
 *
 * const lightId = lighting.createLight({
 *   type: 'point',
 *   position: new BABYLON.Vector3(0, 10, 0),
 *   intensity: 1.0,
 *   range: 50,
 * });
 * ```
 */
export class AdvancedLightingSystem {
  private scene: BABYLON.Scene;
  private quality: QualityPreset;
  private lightPool: Map<string, PooledLight> = new Map();
  private maxPointLights: number;
  private maxSpotLights: number;
  private enableDistanceCulling: boolean = true;
  private cullingDistance: number = 200;
  private nextLightId: number = 0;

  constructor(scene: BABYLON.Scene, config: { quality: QualityPreset }) {
    this.scene = scene;
    this.quality = config.quality;

    // Set limits based on quality
    const limits = this.getQualityLimits(config.quality);
    this.maxPointLights = limits.pointLights;
    this.maxSpotLights = limits.spotLights;
  }

  /**
   * Get quality-based limits
   */
  private getQualityLimits(quality: QualityPreset): {
    pointLights: number;
    spotLights: number;
  } {
    switch (quality) {
      case QualityPreset.LOW:
        return { pointLights: 4, spotLights: 2 };
      case QualityPreset.MEDIUM:
        return { pointLights: 8, spotLights: 4 };
      case QualityPreset.HIGH:
        return { pointLights: 12, spotLights: 6 };
      case QualityPreset.ULTRA:
        return { pointLights: 16, spotLights: 8 };
      default:
        return { pointLights: 8, spotLights: 4 };
    }
  }

  /**
   * Create a new light
   */
  public createLight(config: LightConfig): string {
    const lightId = `light_${this.nextLightId++}`;

    // Check if we've hit the limit
    const currentCount = this.getActiveLightCount(config.type);
    const maxCount = config.type === 'point' ? this.maxPointLights : this.maxSpotLights;

    if (currentCount >= maxCount) {
      return '';
    }

    // Try to reuse from pool
    let pooled = this.findAvailableLight(config.type);

    if (pooled == null) {
      // Create new light
      pooled = this.createNewLight(config);
    }

    // Configure light
    this.configureLight(pooled, config);
    pooled.inUse = true;
    pooled.lastUpdate = Date.now();

    this.lightPool.set(lightId, pooled);

    return lightId;
  }

  /**
   * Find available light from pool
   */
  private findAvailableLight(type: 'point' | 'spot'): PooledLight | null {
    for (const pooled of this.lightPool.values()) {
      if (!pooled.inUse) {
        const isCorrectType =
          (type === 'point' && pooled.light instanceof BABYLON.PointLight) ||
          (type === 'spot' && pooled.light instanceof BABYLON.SpotLight);

        if (isCorrectType) {
          return pooled;
        }
      }
    }
    return null;
  }

  /**
   * Create a new light object
   */
  private createNewLight(config: LightConfig): PooledLight {
    let light: BABYLON.Light;

    if (config.type === 'point') {
      light = new BABYLON.PointLight(`pointLight_${this.nextLightId}`, config.position, this.scene);
      (light as BABYLON.PointLight).range = config.range ?? 100;
    } else {
      const direction = config.direction ?? new BABYLON.Vector3(0, -1, 0);
      light = new BABYLON.SpotLight(
        `spotLight_${this.nextLightId}`,
        config.position,
        direction,
        config.angle ?? Math.PI / 4,
        2, // exponent
        this.scene
      );
      (light as BABYLON.SpotLight).range = config.range ?? 100;
    }

    return {
      light,
      inUse: false,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Configure light properties
   */
  private configureLight(pooled: PooledLight, config: LightConfig): void {
    const light = pooled.light;

    // Position (only for positional lights)
    if (light instanceof BABYLON.PointLight || light instanceof BABYLON.SpotLight) {
      light.position = config.position.clone();
    }

    // Direction (for spot lights)
    if (config.direction != null && light instanceof BABYLON.SpotLight) {
      light.direction = config.direction.clone();
    }

    // Color
    if (config.color != null) {
      light.diffuse = config.color.clone();
      light.specular = config.color.clone();
    } else {
      light.diffuse = new BABYLON.Color3(1, 1, 1);
      light.specular = new BABYLON.Color3(1, 1, 1);
    }

    // Intensity
    light.intensity = config.intensity ?? 1.0;

    // Range
    if (light instanceof BABYLON.PointLight || light instanceof BABYLON.SpotLight) {
      light.range = config.range ?? 100;
    }

    // Shadows (only for shadow-capable lights)
    if (
      config.castShadows === true &&
      pooled.shadowGenerator == null &&
      (light instanceof BABYLON.DirectionalLight ||
        light instanceof BABYLON.PointLight ||
        light instanceof BABYLON.SpotLight)
    ) {
      const shadowMapSize = config.shadowMapSize ?? 1024;
      pooled.shadowGenerator = new BABYLON.ShadowGenerator(shadowMapSize, light);
      pooled.shadowGenerator.useBlurExponentialShadowMap = true;
      pooled.shadowGenerator.blurKernel = 32;
    } else if (config.castShadows === false && pooled.shadowGenerator != null) {
      pooled.shadowGenerator.dispose();
      pooled.shadowGenerator = undefined;
    }

    // Enable light
    light.setEnabled(true);
  }

  /**
   * Update light properties
   */
  public updateLight(lightId: string, config: Partial<LightConfig>): void {
    const pooled = this.lightPool.get(lightId);
    if (pooled == null || !pooled.inUse) {
      return;
    }

    this.configureLight(pooled, config as LightConfig);
    pooled.lastUpdate = Date.now();
  }

  /**
   * Remove a light
   */
  public removeLight(lightId: string): void {
    const pooled = this.lightPool.get(lightId);
    if (pooled == null) {
      return;
    }

    pooled.inUse = false;
    pooled.light.setEnabled(false);
  }

  /**
   * Update distance-based culling
   */
  public updateCulling(cameraPosition: BABYLON.Vector3): void {
    if (!this.enableDistanceCulling) {
      return;
    }

    for (const [lightId, pooled] of this.lightPool.entries()) {
      if (!pooled.inUse) {
        continue;
      }

      const light = pooled.light;
      // Only cull positional lights
      if (light instanceof BABYLON.PointLight || light instanceof BABYLON.SpotLight) {
        const distance = BABYLON.Vector3.Distance(cameraPosition, light.position);
        const shouldEnable = distance < this.cullingDistance;

        if (light.isEnabled() !== shouldEnable) {
          light.setEnabled(shouldEnable);
        }
      }
    }
  }

  /**
   * Add mesh as shadow caster
   */
  public addShadowCaster(lightId: string, mesh: BABYLON.AbstractMesh): void {
    const pooled = this.lightPool.get(lightId);
    if (pooled?.shadowGenerator != null) {
      pooled.shadowGenerator.addShadowCaster(mesh);
    }
  }

  /**
   * Get active light count by type
   */
  private getActiveLightCount(type: 'point' | 'spot'): number {
    let count = 0;
    for (const pooled of this.lightPool.values()) {
      if (!pooled.inUse) {
        continue;
      }

      const isCorrectType =
        (type === 'point' && pooled.light instanceof BABYLON.PointLight) ||
        (type === 'spot' && pooled.light instanceof BABYLON.SpotLight);

      if (isCorrectType) {
        count++;
      }
    }
    return count;
  }

  /**
   * Update quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.quality) {
      return;
    }

    const oldLimits = this.getQualityLimits(this.quality);
    const newLimits = this.getQualityLimits(quality);

    this.quality = quality;
    this.maxPointLights = newLimits.pointLights;
    this.maxSpotLights = newLimits.spotLights;

    // Disable excess lights if downgrading
    if (newLimits.pointLights < oldLimits.pointLights) {
      this.disableExcessLights('point', newLimits.pointLights);
    }
    if (newLimits.spotLights < oldLimits.spotLights) {
      this.disableExcessLights('spot', newLimits.spotLights);
    }
  }

  /**
   * Disable excess lights when downgrading quality
   */
  private disableExcessLights(type: 'point' | 'spot', maxCount: number): void {
    let count = 0;
    for (const [lightId, pooled] of this.lightPool.entries()) {
      if (!pooled.inUse) {
        continue;
      }

      const isCorrectType =
        (type === 'point' && pooled.light instanceof BABYLON.PointLight) ||
        (type === 'spot' && pooled.light instanceof BABYLON.SpotLight);

      if (isCorrectType) {
        count++;
        if (count > maxCount) {
          this.removeLight(lightId);
        }
      }
    }
  }

  /**
   * Get lighting statistics
   */
  public getStats(): LightingStats {
    let activeLights = 0;
    let pointLightsActive = 0;
    let spotLightsActive = 0;
    let shadowCasters = 0;

    for (const pooled of this.lightPool.values()) {
      if (pooled.inUse && pooled.light.isEnabled()) {
        activeLights++;

        if (pooled.light instanceof BABYLON.PointLight) {
          pointLightsActive++;
        } else if (pooled.light instanceof BABYLON.SpotLight) {
          spotLightsActive++;
        }

        if (pooled.shadowGenerator != null) {
          shadowCasters++;
        }
      }
    }

    // Estimate frame time
    // Base cost: ~0.5ms per light
    // Shadow cost: ~2ms per shadow-casting light
    const estimatedFrameTimeMs = activeLights * 0.5 + shadowCasters * 2;

    return {
      totalLights: this.lightPool.size,
      activeLights,
      pointLightsActive,
      spotLightsActive,
      shadowCasters,
      estimatedFrameTimeMs,
    };
  }

  /**
   * Dispose of all lights
   */
  public dispose(): void {
    for (const pooled of this.lightPool.values()) {
      if (pooled.shadowGenerator != null) {
        pooled.shadowGenerator.dispose();
      }
      pooled.light.dispose();
    }
    this.lightPool.clear();
  }
}
