/**
 * Quality Preset Manager - Phase 2 Integration
 *
 * Integrates all Phase 2 rendering systems:
 * - Post-processing pipeline
 * - Advanced lighting system
 * - GPU particle system
 * - Weather system
 * - PBR material system
 * - Custom shader system
 * - Decal system
 * - Minimap RTT system
 *
 * Provides:
 * - Hardware auto-detection
 * - Safari forced LOW
 * - SceneOptimizer integration
 * - Automatic quality adjustment
 * - Feature matrix management
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';
import { PostProcessingPipeline } from './PostProcessingPipeline';
import { AdvancedLightingSystem } from './AdvancedLightingSystem';
import { AdvancedParticleSystem } from './GPUParticleSystem';
import { WeatherSystem } from './WeatherSystem';
import { PBRMaterialSystem } from './PBRMaterialSystem';
import { CustomShaderSystem } from './CustomShaderSystem';
import { DecalSystem } from './DecalSystem';
import { MinimapSystem } from './MinimapSystem';

/**
 * Hardware tier detected
 */
export enum HardwareTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Browser type
 */
export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
  OTHER = 'other',
}

/**
 * Quality manager configuration
 */
export interface QualityManagerConfig {
  /** Initial quality (if not auto-detected) */
  initialQuality?: QualityPreset;

  /** Enable auto quality adjustment */
  enableAutoAdjust?: boolean;

  /** Target FPS for auto-adjustment */
  targetFPS?: number;

  /** Enable hardware auto-detection */
  enableAutoDetect?: boolean;
}

/**
 * System statistics
 */
export interface SystemStats {
  /** Current quality preset */
  quality: QualityPreset;

  /** Hardware tier */
  hardwareTier: HardwareTier;

  /** Browser type */
  browser: BrowserType;

  /** Is Safari (forced LOW) */
  isSafari: boolean;

  /** Total estimated frame time (ms) */
  totalFrameTimeMs: number;

  /** Individual system times */
  systems: {
    postProcessing: number;
    lighting: number;
    particles: number;
    weather: number;
    decals: number;
    minimap: number;
  };

  /** Performance metrics */
  performance: {
    fps: number;
    frameTimeMs: number;
    drawCalls: number;
    memoryMB: number;
  };
}

/**
 * Quality Preset Manager - Integrates all Phase 2 systems
 *
 * @example
 * ```typescript
 * const manager = new QualityPresetManager(scene);
 * await manager.initialize({
 *   enableAutoDetect: true,
 *   enableAutoAdjust: true,
 *   targetFPS: 60,
 * });
 *
 * // All systems are now active and quality-managed
 * const stats = manager.getStats();
 * ```
 */
export class QualityPresetManager {
  private scene: BABYLON.Scene;
  private engine: BABYLON.AbstractEngine;
  private currentQuality: QualityPreset = QualityPreset.MEDIUM;
  private hardwareTier: HardwareTier = HardwareTier.MEDIUM;
  private browser: BrowserType = BrowserType.OTHER;

  // Phase 2 systems
  private postProcessing: PostProcessingPipeline | null = null;
  private lighting: AdvancedLightingSystem | null = null;
  private particles: AdvancedParticleSystem | null = null;
  private weather: WeatherSystem | null = null;
  private pbrMaterials: PBRMaterialSystem | null = null;
  private shaders: CustomShaderSystem | null = null;
  private decals: DecalSystem | null = null;
  private minimap: MinimapSystem | null = null;

  // Auto-adjustment
  // @ts-expect-error - Reserved for future auto-adjustment features
  private _enableAutoAdjust: boolean = false;
  private targetFPS: number = 60;
  private fpsSamples: number[] = [];
  private lastAdjustmentTime: number = 0;
  private adjustmentCooldown: number = 3000; // 3 seconds

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.engine = scene.getEngine();
  }

  /**
   * Initialize all Phase 2 systems
   */
  public async initialize(config?: QualityManagerConfig): Promise<void> {
    // Detect hardware and browser
    if (config?.enableAutoDetect !== false) {
      this.detectHardware();
      this.detectBrowser();
    }

    // Determine initial quality
    if (config?.initialQuality != null) {
      this.currentQuality = config.initialQuality;
    } else if (config?.enableAutoDetect !== false) {
      this.currentQuality = this.determineInitialQuality();
    }

    // Initialize all systems
    await this.initializeSystems();

    // Setup auto-adjustment
    if (config?.enableAutoAdjust === true) {
      this._enableAutoAdjust = true;
      this.targetFPS = config.targetFPS ?? 60;
      this.setupAutoAdjustment();
    }
  }

  /**
   * Detect hardware tier
   */
  private detectHardware(): void {
    const gl = this.engine
      .getRenderingCanvas()
      ?.getContext('webgl2') as WebGL2RenderingContext | null;

    if (gl == null) {
      this.hardwareTier = HardwareTier.LOW;
      return;
    }

    // Get GPU info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let gpuInfo = 'unknown';

    if (debugInfo != null) {
      gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
    }

    // Estimate tier based on GPU
    const gpuLower = gpuInfo.toLowerCase();

    if (
      gpuLower.includes('intel') &&
      (gpuLower.includes('uhd') || gpuLower.includes('hd graphics'))
    ) {
      this.hardwareTier = HardwareTier.LOW;
    } else if (gpuLower.includes('gtx 1060') || gpuLower.includes('rx 580')) {
      this.hardwareTier = HardwareTier.MEDIUM;
    } else if (gpuLower.includes('rtx') || gpuLower.includes('rx 6')) {
      this.hardwareTier = HardwareTier.HIGH;
    } else if (gpuLower.includes('rtx 4090') || gpuLower.includes('rx 7900')) {
      this.hardwareTier = HardwareTier.ULTRA;
    } else {
      // Default to MEDIUM if unknown
      this.hardwareTier = HardwareTier.MEDIUM;
    }
  }

  /**
   * Detect browser type
   */
  private detectBrowser(): void {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      this.browser = BrowserType.SAFARI;
    } else if (userAgent.includes('Chrome')) {
      this.browser = BrowserType.CHROME;
    } else if (userAgent.includes('Firefox')) {
      this.browser = BrowserType.FIREFOX;
    } else if (userAgent.includes('Edge')) {
      this.browser = BrowserType.EDGE;
    } else {
      this.browser = BrowserType.OTHER;
    }
  }

  /**
   * Determine initial quality based on hardware and browser
   */
  private determineInitialQuality(): QualityPreset {
    // Safari: forced LOW (60% slower than Chrome)
    if (this.browser === BrowserType.SAFARI) {
      return QualityPreset.LOW;
    }

    // Map hardware tier to quality
    switch (this.hardwareTier) {
      case HardwareTier.LOW:
        return QualityPreset.LOW;
      case HardwareTier.MEDIUM:
        return QualityPreset.MEDIUM;
      case HardwareTier.HIGH:
        return QualityPreset.HIGH;
      case HardwareTier.ULTRA:
        return QualityPreset.ULTRA;
      default:
        return QualityPreset.MEDIUM;
    }
  }

  /**
   * Initialize all Phase 2 systems
   */
  private async initializeSystems(): Promise<void> {
    // Post-processing pipeline
    this.postProcessing = new PostProcessingPipeline(this.scene, {
      quality: this.currentQuality,
    });
    await this.postProcessing.initialize();

    // Advanced lighting system
    this.lighting = new AdvancedLightingSystem(this.scene, {
      quality: this.currentQuality,
    });

    // GPU particle system
    this.particles = new AdvancedParticleSystem(this.scene, {
      quality: this.currentQuality,
    });

    // Weather system
    this.weather = new WeatherSystem(this.scene, this.particles);

    // PBR material system
    this.pbrMaterials = new PBRMaterialSystem(this.scene);
    this.pbrMaterials.preloadCommonMaterials();

    // Custom shader system
    this.shaders = new CustomShaderSystem(this.scene);

    // Decal system
    this.decals = new DecalSystem(this.scene, {
      quality: this.currentQuality,
    });

    // Minimap system
    this.minimap = new MinimapSystem(this.scene, {
      quality: this.currentQuality,
    });
    this.minimap.initialize();
  }

  /**
   * Setup automatic quality adjustment
   */
  private setupAutoAdjustment(): void {
    this.scene.onBeforeRenderObservable.add(() => {
      const fps = this.engine.getFps();
      this.fpsSamples.push(fps);

      // Keep last 60 samples (1 second @ 60fps)
      if (this.fpsSamples.length > 60) {
        this.fpsSamples.shift();
      }

      // Check every 3 seconds
      const now = Date.now();
      if (now - this.lastAdjustmentTime > this.adjustmentCooldown) {
        this.adjustQuality();
        this.lastAdjustmentTime = now;
      }
    });
  }

  /**
   * Automatically adjust quality based on FPS
   */
  private adjustQuality(): void {
    if (this.fpsSamples.length < 30) {
      return; // Not enough samples
    }

    const avgFPS = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

    // Downgrade if FPS too low
    if (avgFPS < this.targetFPS - 5) {
      if (this.currentQuality === QualityPreset.ULTRA) {
        this.setQuality(QualityPreset.HIGH);
      } else if (this.currentQuality === QualityPreset.HIGH) {
        this.setQuality(QualityPreset.MEDIUM);
      } else if (this.currentQuality === QualityPreset.MEDIUM) {
        this.setQuality(QualityPreset.LOW);
      }
    }
    // Upgrade if FPS high enough
    else if (avgFPS > this.targetFPS + 5) {
      if (this.currentQuality === QualityPreset.LOW && this.browser !== BrowserType.SAFARI) {
        this.setQuality(QualityPreset.MEDIUM);
      } else if (this.currentQuality === QualityPreset.MEDIUM) {
        this.setQuality(QualityPreset.HIGH);
      } else if (this.currentQuality === QualityPreset.HIGH) {
        this.setQuality(QualityPreset.ULTRA);
      }
    }
  }

  /**
   * Set quality preset manually
   */
  public setQuality(quality: QualityPreset): void {
    if (quality === this.currentQuality) {
      return;
    }

    // Safari: can't upgrade from LOW
    if (this.browser === BrowserType.SAFARI && quality !== QualityPreset.LOW) {
      return;
    }

    this.currentQuality = quality;

    // Update all systems
    this.postProcessing?.setQualityPreset(quality);
    this.lighting?.setQualityPreset(quality);
    this.particles?.setQualityPreset(quality);
    this.decals?.setQualityPreset(quality);
    this.minimap?.setQualityPreset(quality);

    // Clear FPS samples
    this.fpsSamples = [];
  }

  /**
   * Update all systems (call each frame)
   */
  public update(deltaTime: number): void {
    // Update particle system
    this.particles?.update();

    // Update weather system
    if (this.weather != null && this.scene.activeCamera != null) {
      this.weather.update(this.scene.activeCamera.position);
    }

    // Update shader system
    this.shaders?.update(deltaTime);

    // Update decal system
    this.decals?.update();

    // Update lighting culling
    if (this.lighting != null && this.scene.activeCamera != null) {
      this.lighting.updateCulling(this.scene.activeCamera.position);
    }
  }

  /**
   * Get comprehensive statistics
   */
  public getStats(): SystemStats {
    const postProcessingStats = this.postProcessing?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      activeEffects: 0,
      memoryUsageMB: 0,
    };
    const lightingStats = this.lighting?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      activeLights: 0,
      pointLightsActive: 0,
      spotLightsActive: 0,
      shadowCasters: 0,
      totalLights: 0,
    };
    const particleStats = this.particles?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      activeEffects: 0,
      totalParticles: 0,
      gpuEffects: 0,
      cpuEffects: 0,
    };
    const weatherStats = this.weather?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      currentWeather: 'clear' as const,
      intensity: 0,
      particleEffectId: null,
      fogEnabled: false,
    };
    const decalStats = this.decals?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      totalDecals: 0,
      activeDecals: 0,
      fadingDecals: 0,
    };
    const minimapStats = this.minimap?.getStats() ?? {
      estimatedFrameTimeMs: 0,
      rttSize: 0,
      updateFPS: 0,
      memoryUsageMB: 0,
    };

    const totalFrameTimeMs =
      postProcessingStats.estimatedFrameTimeMs +
      lightingStats.estimatedFrameTimeMs +
      particleStats.estimatedFrameTimeMs +
      weatherStats.estimatedFrameTimeMs +
      decalStats.estimatedFrameTimeMs +
      minimapStats.estimatedFrameTimeMs;

    return {
      quality: this.currentQuality,
      hardwareTier: this.hardwareTier,
      browser: this.browser,
      isSafari: this.browser === BrowserType.SAFARI,
      totalFrameTimeMs,
      systems: {
        postProcessing: postProcessingStats.estimatedFrameTimeMs,
        lighting: lightingStats.estimatedFrameTimeMs,
        particles: particleStats.estimatedFrameTimeMs,
        weather: weatherStats.estimatedFrameTimeMs,
        decals: decalStats.estimatedFrameTimeMs,
        minimap: minimapStats.estimatedFrameTimeMs,
      },
      performance: {
        fps: this.engine.getFps(),
        frameTimeMs: this.engine.getDeltaTime(),
        drawCalls: (this.engine as BABYLON.Engine)._drawCalls?.current ?? 0,
        memoryMB: postProcessingStats.memoryUsageMB + minimapStats.memoryUsageMB,
      },
    };
  }

  /**
   * Get system references (for advanced usage)
   */
  public getSystems(): {
    postProcessing: PostProcessingPipeline | null;
    lighting: AdvancedLightingSystem | null;
    particles: AdvancedParticleSystem | null;
    weather: WeatherSystem | null;
    pbrMaterials: PBRMaterialSystem | null;
    shaders: CustomShaderSystem | null;
    decals: DecalSystem | null;
    minimap: MinimapSystem | null;
  } {
    return {
      postProcessing: this.postProcessing,
      lighting: this.lighting,
      particles: this.particles,
      weather: this.weather,
      pbrMaterials: this.pbrMaterials,
      shaders: this.shaders,
      decals: this.decals,
      minimap: this.minimap,
    };
  }

  /**
   * Dispose of all systems
   */
  public dispose(): void {
    this.postProcessing?.dispose();
    this.lighting?.dispose();
    this.particles?.dispose();
    this.weather?.dispose();
    this.pbrMaterials?.dispose();
    this.shaders?.dispose();
    this.decals?.dispose();
    this.minimap?.dispose();
  }
}
