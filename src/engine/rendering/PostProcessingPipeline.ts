/**
 * Post-Processing Pipeline - Advanced visual effects
 *
 * Provides:
 * - FXAA Anti-Aliasing (1-1.5ms)
 * - Bloom Effect (2-2.5ms)
 * - Color Grading with LUT support (0.5ms)
 * - Tone Mapping (ACES/Reinhard) (0.3ms)
 * - Chromatic Aberration (0.5ms) @ HIGH+
 * - Vignette (0.3ms) @ HIGH+
 *
 * Target: <4ms @ MEDIUM preset
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  /** Quality preset */
  quality: QualityPreset;

  /** Enable FXAA */
  enableFXAA?: boolean;

  /** Enable bloom */
  enableBloom?: boolean;

  /** Bloom threshold */
  bloomThreshold?: number;

  /** Bloom intensity */
  bloomIntensity?: number;

  /** Enable color grading */
  enableColorGrading?: boolean;

  /** Color grading LUT texture URL */
  lutTextureUrl?: string;

  /** Tone mapping mode */
  toneMapping?: 'aces' | 'reinhard' | 'none';

  /** Enable chromatic aberration (HIGH+ only) */
  enableChromaticAberration?: boolean;

  /** Enable vignette (HIGH+ only) */
  enableVignette?: boolean;

  /** Vignette weight */
  vignetteWeight?: number;
}

/**
 * Post-processing statistics
 */
export interface PostProcessingStats {
  /** Total effects active */
  activeEffects: number;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;

  /** Memory usage (MB) */
  memoryUsageMB: number;
}

/**
 * Advanced post-processing pipeline using DefaultRenderingPipeline
 *
 * @example
 * ```typescript
 * const pipeline = new PostProcessingPipeline(scene, {
 *   quality: QualityPreset.MEDIUM,
 *   enableFXAA: true,
 *   enableBloom: true,
 * });
 * await pipeline.initialize();
 * ```
 */
export class PostProcessingPipeline {
  private scene: BABYLON.Scene;
  private config: Required<PostProcessingConfig>;
  private pipeline: BABYLON.DefaultRenderingPipeline | null = null;
  private lutTexture: BABYLON.Texture | null = null;

  constructor(scene: BABYLON.Scene, config: PostProcessingConfig) {
    this.scene = scene;

    // Set defaults based on quality preset
    this.config = {
      quality: config.quality,
      enableFXAA: config.enableFXAA ?? this.shouldEnableFXAA(config.quality),
      enableBloom: config.enableBloom ?? this.shouldEnableBloom(config.quality),
      bloomThreshold: config.bloomThreshold ?? 0.8,
      bloomIntensity: config.bloomIntensity ?? 0.5,
      enableColorGrading: config.enableColorGrading ?? true,
      lutTextureUrl: config.lutTextureUrl ?? '',
      toneMapping: config.toneMapping ?? 'aces',
      enableChromaticAberration:
        config.enableChromaticAberration ?? this.shouldEnableChromaticAberration(config.quality),
      enableVignette: config.enableVignette ?? this.shouldEnableVignette(config.quality),
      vignetteWeight: config.vignetteWeight ?? 1.5,
    };
  }

  /**
   * Initialize the post-processing pipeline
   */
  public async initialize(): Promise<void> {
    // Create default rendering pipeline
    this.pipeline = new BABYLON.DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR enabled
      this.scene,
      this.scene.cameras
    );

    // Configure based on quality preset
    this.applyQualitySettings();

    // Load LUT texture if color grading enabled
    if (this.config.enableColorGrading && this.config.lutTextureUrl) {
      await this.loadLUTTexture(this.config.lutTextureUrl);
    }
  }

  /**
   * Apply quality-specific settings
   */
  private applyQualitySettings(): void {
    if (this.pipeline == null) {
      return;
    }

    // FXAA Anti-Aliasing (1-1.5ms)
    if (this.config.enableFXAA) {
      this.pipeline.fxaaEnabled = true;
    }

    // Bloom Effect (2-2.5ms)
    if (this.config.enableBloom) {
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomThreshold = this.config.bloomThreshold;
      this.pipeline.bloomWeight = this.config.bloomIntensity;
      this.pipeline.bloomKernel = 64; // Good balance of quality/performance
      this.pipeline.bloomScale = 0.5;
    }

    // Tone Mapping (0.3ms)
    this.configureToneMapping();

    // Color Grading (0.5ms) - will be configured when LUT loads
    if (this.config.enableColorGrading) {
      this.pipeline.imageProcessingEnabled = true;
    }

    // Chromatic Aberration (0.5ms) @ HIGH+
    if (this.config.enableChromaticAberration) {
      this.pipeline.chromaticAberrationEnabled = true;
      this.pipeline.chromaticAberration.aberrationAmount = 30;
    }

    // Vignette (0.3ms) @ HIGH+
    if (this.config.enableVignette) {
      this.pipeline.imageProcessingEnabled = true;
      this.pipeline.imageProcessing.vignetteEnabled = true;
      this.pipeline.imageProcessing.vignetteWeight = this.config.vignetteWeight;
      this.pipeline.imageProcessing.vignetteCameraFov = 0.5;
    }
  }

  /**
   * Configure tone mapping
   */
  private configureToneMapping(): void {
    if (this.pipeline == null) {
      return;
    }

    this.pipeline.imageProcessingEnabled = true;

    switch (this.config.toneMapping) {
      case 'aces':
        this.pipeline.imageProcessing.toneMappingEnabled = true;
        this.pipeline.imageProcessing.toneMappingType =
          BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        break;

      case 'reinhard':
        this.pipeline.imageProcessing.toneMappingEnabled = true;
        this.pipeline.imageProcessing.toneMappingType =
          BABYLON.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
        break;

      case 'none':
        this.pipeline.imageProcessing.toneMappingEnabled = false;
        break;
    }
  }

  /**
   * Load LUT texture for color grading
   */
  private async loadLUTTexture(url: string): Promise<void> {
    return new Promise((resolve) => {
      this.lutTexture = new BABYLON.Texture(
        url,
        this.scene,
        false,
        false,
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        () => {
          if (this.pipeline != null && this.lutTexture != null) {
            this.pipeline.imageProcessing.colorGradingEnabled = true;
            this.pipeline.imageProcessing.colorGradingTexture = this.lutTexture;
          }
          resolve();
        },
        (_message) => {
          resolve(); // Don't fail, just continue without LUT
        }
      );
    });
  }

  /**
   * Update quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.config.quality) {
      return;
    }

    this.config.quality = quality;
    this.config.enableFXAA = this.shouldEnableFXAA(quality);
    this.config.enableBloom = this.shouldEnableBloom(quality);
    this.config.enableChromaticAberration = this.shouldEnableChromaticAberration(quality);
    this.config.enableVignette = this.shouldEnableVignette(quality);

    // Reapply settings
    if (this.pipeline != null) {
      this.applyQualitySettings();
    }
  }

  /**
   * Should FXAA be enabled for this quality?
   */
  private shouldEnableFXAA(quality: QualityPreset): boolean {
    return quality !== QualityPreset.LOW;
  }

  /**
   * Should Bloom be enabled for this quality?
   */
  private shouldEnableBloom(quality: QualityPreset): boolean {
    return quality !== QualityPreset.LOW;
  }

  /**
   * Should chromatic aberration be enabled for this quality?
   */
  private shouldEnableChromaticAberration(quality: QualityPreset): boolean {
    return quality === QualityPreset.HIGH || quality === QualityPreset.ULTRA;
  }

  /**
   * Should vignette be enabled for this quality?
   */
  private shouldEnableVignette(quality: QualityPreset): boolean {
    return quality === QualityPreset.HIGH || quality === QualityPreset.ULTRA;
  }

  /**
   * Get post-processing statistics
   */
  public getStats(): PostProcessingStats {
    let activeEffects = 0;
    let estimatedFrameTimeMs = 0;

    if (this.pipeline != null) {
      if (this.pipeline.fxaaEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 1.25; // 1-1.5ms
      }

      if (this.pipeline.bloomEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 2.25; // 2-2.5ms
      }

      if (this.pipeline.imageProcessing.toneMappingEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 0.3;
      }

      if (this.pipeline.imageProcessing.colorGradingEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 0.5;
      }

      if (this.pipeline.chromaticAberrationEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 0.5;
      }

      if (this.pipeline.imageProcessing.vignetteEnabled) {
        activeEffects++;
        estimatedFrameTimeMs += 0.3;
      }
    }

    return {
      activeEffects,
      estimatedFrameTimeMs,
      memoryUsageMB: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let memoryMB = 0;

    // HDR render target
    const engine = this.scene.getEngine();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    memoryMB += (width * height * 16) / (1024 * 1024); // 16 bytes per pixel (RGBA float)

    // Bloom downsampling
    if (this.pipeline?.bloomEnabled === true) {
      memoryMB += (width * height * 8) / (1024 * 1024); // Half-res bloom
    }

    // LUT texture
    if (this.lutTexture != null) {
      memoryMB += 1; // ~1MB for 512x512 RGB LUT
    }

    return Math.round(memoryMB * 10) / 10;
  }

  /**
   * Disable all effects (for testing)
   */
  public disable(): void {
    if (this.pipeline != null) {
      this.pipeline.dispose();
      this.pipeline = null;
    }

    if (this.lutTexture != null) {
      this.lutTexture.dispose();
      this.lutTexture = null;
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disable();
  }
}
