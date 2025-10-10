/**
 * Shadow Quality Settings - Provides quality presets for shadow rendering
 */

import * as BABYLON from '@babylonjs/core';
import { ShadowQuality, QualityPreset } from './types';

/**
 * Predefined quality presets for shadow rendering
 *
 * Each preset balances visual quality with performance:
 * - LOW: Minimal quality, maximum performance
 * - MEDIUM: Balanced quality and performance
 * - HIGH: High quality with good performance
 * - ULTRA: Maximum quality for high-end hardware
 */
export const SHADOW_QUALITY_PRESETS: Record<ShadowQuality, QualityPreset> = {
  [ShadowQuality.LOW]: {
    shadowMapSize: 1024,
    numCascades: 2,
    enablePCF: false,
    cascadeBlendPercentage: 0.05,
    maxShadowCasters: 20
  },
  [ShadowQuality.MEDIUM]: {
    shadowMapSize: 2048,
    numCascades: 3,
    enablePCF: true,
    cascadeBlendPercentage: 0.1,
    maxShadowCasters: 50
  },
  [ShadowQuality.HIGH]: {
    shadowMapSize: 2048,
    numCascades: 4,
    enablePCF: true,
    cascadeBlendPercentage: 0.15,
    maxShadowCasters: 100
  },
  [ShadowQuality.ULTRA]: {
    shadowMapSize: 4096,
    numCascades: 4,
    enablePCF: true,
    cascadeBlendPercentage: 0.2,
    maxShadowCasters: 200
  }
};

/**
 * Get a quality preset by quality level
 *
 * @param quality - The shadow quality level
 * @returns The quality preset configuration
 *
 * @example
 * ```typescript
 * const preset = getQualityPreset(ShadowQuality.MEDIUM);
 * console.log(preset.shadowMapSize); // 2048
 * ```
 */
export function getQualityPreset(quality: ShadowQuality): QualityPreset {
  return SHADOW_QUALITY_PRESETS[quality];
}

/**
 * Auto-detect optimal shadow quality based on hardware capabilities
 *
 * This function analyzes the WebGL capabilities and current performance
 * to determine the best shadow quality preset.
 *
 * @param engine - The Babylon.js engine instance
 * @returns Recommended shadow quality level
 *
 * @example
 * ```typescript
 * const quality = autoDetectQuality(engine);
 * const preset = getQualityPreset(quality);
 * ```
 */
export function autoDetectQuality(engine: BABYLON.Engine): ShadowQuality {
  const caps = engine.getCaps();

  // Check max texture size
  if (caps.maxTextureSize < 2048) {
    return ShadowQuality.LOW;
  }

  // Check for WebGL2 features
  if (!caps.textureFloatRender) {
    return ShadowQuality.LOW;
  }

  // Estimate based on hardware tier (heuristic)
  const fps = engine.getFps();
  const pixelRatio = engine.getHardwareScalingLevel();

  // High-end hardware: 55+ FPS with high pixel ratio
  if (fps > 55 && pixelRatio >= 1) {
    return ShadowQuality.HIGH;
  }
  // Mid-range hardware: 45+ FPS
  else if (fps > 45) {
    return ShadowQuality.MEDIUM;
  }
  // Low-end hardware
  else {
    return ShadowQuality.LOW;
  }
}
