/**
 * Rendering Optimization Module
 *
 * Exports all rendering optimization components:
 *
 * Phase 1:
 * - RenderPipeline: Main optimization orchestrator
 * - MaterialCache: Material sharing system
 * - CullingStrategy: Frustum and occlusion culling
 * - DrawCallOptimizer: Mesh merging and batching
 *
 * Phase 2:
 * - QualityPresetManager: Comprehensive quality management
 * - PostProcessingPipeline: FXAA, Bloom, Color Grading, etc.
 * - AdvancedLightingSystem: Point/spot lights with pooling
 * - AdvancedParticleSystem: GPU particle system
 * - WeatherSystem: Rain, snow, fog effects
 * - PBRMaterialSystem: glTF 2.0 PBR materials
 * - CustomShaderSystem: Water, force field, hologram shaders
 * - DecalSystem: Texture-based decals
 * - MinimapSystem: Minimap RTT
 */

// Phase 1 Systems
export { OptimizedRenderPipeline } from './RenderPipeline';
export { MaterialCache } from './MaterialCache';
export { CullingStrategy } from './CullingStrategy';
export { DrawCallOptimizer } from './DrawCallOptimizer';

// Phase 2 Systems
export { QualityPresetManager } from './QualityPresetManager';
export { PostProcessingPipeline } from './PostProcessingPipeline';
export { AdvancedLightingSystem } from './AdvancedLightingSystem';
export { AdvancedParticleSystem } from './GPUParticleSystem';
export { WeatherSystem } from './WeatherSystem';
export { PBRMaterialSystem } from './PBRMaterialSystem';
export { CustomShaderSystem } from './CustomShaderSystem';
export { DecalSystem } from './DecalSystem';
export { MinimapSystem } from './MinimapSystem';

// Map Rendering
export { MapRendererCore } from './MapRendererCore';
export type { MapRendererConfig, MapRenderResult } from './MapRendererCore';
export { DoodadRenderer } from './DoodadRenderer';
export type {
  DoodadRendererConfig,
  DoodadType,
  DoodadInstance,
  DoodadRenderStats,
} from './DoodadRenderer';
export { MapPreviewGenerator } from './MapPreviewGenerator';
export type { PreviewConfig, PreviewResult } from './MapPreviewGenerator';
export { MapPreviewExtractor } from './MapPreviewExtractor';
export type { ExtractOptions, ExtractResult } from './MapPreviewExtractor';
export { TGADecoder } from './TGADecoder';
export type { TGAHeader, TGADecodeResult } from './TGADecoder';

// Enums
export { QualityPreset } from './types';

// Types
export type {
  RenderPipelineOptions,
  RenderPipelineState,
  MaterialCacheConfig,
  MaterialCacheEntry,
  DrawCallOptimizerConfig,
  MeshMergeResult,
  CullingConfig,
  CullingStats,
  PerformanceMetrics,
  OptimizationStats,
  DynamicLODState,
} from './types';
