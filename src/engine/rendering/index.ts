/**
 * Rendering Optimization Module
 *
 * Exports all rendering optimization components:
 * - RenderPipeline: Main optimization orchestrator
 * - MaterialCache: Material sharing system
 * - CullingStrategy: Frustum and occlusion culling
 * - DrawCallOptimizer: Mesh merging and batching
 */

export { OptimizedRenderPipeline } from './RenderPipeline';
export { MaterialCache } from './MaterialCache';
export { CullingStrategy } from './CullingStrategy';
export { DrawCallOptimizer } from './DrawCallOptimizer';

export { QualityPreset } from './types';

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
