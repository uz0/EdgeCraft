/**
 * Type definitions for rendering optimization pipeline
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Quality presets for dynamic LOD adjustment
 */
export enum QualityPreset {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Rendering optimization configuration
 */
export interface RenderPipelineOptions {
  /** Enable automatic material sharing */
  enableMaterialSharing?: boolean;

  /** Enable mesh merging for static objects */
  enableMeshMerging?: boolean;

  /** Enable advanced culling strategies */
  enableCulling?: boolean;

  /** Enable dynamic LOD quality adjustment */
  enableDynamicLOD?: boolean;

  /** Target FPS for dynamic adjustments */
  targetFPS?: number;

  /** Initial quality preset */
  initialQuality?: QualityPreset;
}

/**
 * Material cache configuration
 */
export interface MaterialCacheConfig {
  /** Maximum number of cached materials */
  maxCacheSize?: number;

  /** Enable material cloning for variations */
  allowCloning?: boolean;

  /** Hash function for material comparison */
  hashFunction?: (material: BABYLON.Material | null) => string;
}

/**
 * Material cache entry
 */
export interface MaterialCacheEntry {
  /** Unique hash key */
  hash: string;

  /** Cached material instance */
  material: BABYLON.Material;

  /** Reference count */
  refCount: number;

  /** Creation timestamp */
  createdAt: number;
}

/**
 * Draw call optimization configuration
 */
export interface DrawCallOptimizerConfig {
  /** Enable mesh merging */
  enableMerging?: boolean;

  /** Minimum meshes to trigger merging */
  minMeshesForMerge?: number;

  /** Maximum vertices per merged mesh */
  maxVerticesPerMesh?: number;

  /** Enable material batching */
  enableBatching?: boolean;
}

/**
 * Mesh merge result
 */
export interface MeshMergeResult {
  /** Merged mesh */
  mesh: BABYLON.Mesh | null;

  /** Number of source meshes merged */
  sourceCount: number;

  /** Draw call reduction */
  drawCallsSaved: number;
}

/**
 * Culling strategy configuration
 */
export interface CullingConfig {
  /** Enable frustum culling */
  enableFrustumCulling?: boolean;

  /** Enable occlusion culling */
  enableOcclusionCulling?: boolean;

  /** Occlusion query distance threshold */
  occlusionDistance?: number;

  /** Update frequency in frames */
  updateFrequency?: number;
}

/**
 * Culling statistics
 */
export interface CullingStats {
  /** Total objects */
  totalObjects: number;

  /** Visible objects */
  visibleObjects: number;

  /** Culled by frustum */
  frustumCulled: number;

  /** Culled by occlusion */
  occlusionCulled: number;

  /** Culling overhead in ms */
  cullingTimeMs: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Current FPS */
  fps: number;

  /** Frame time in ms */
  frameTimeMs: number;

  /** Draw calls per frame */
  drawCalls: number;

  /** Total vertices */
  totalVertices: number;

  /** Active meshes */
  activeMeshes: number;

  /** Total meshes */
  totalMeshes: number;

  /** Total materials */
  totalMaterials: number;

  /** Memory usage in MB */
  memoryUsageMB: number;

  /** Texture memory in MB */
  textureMemoryMB: number;
}

/**
 * Optimization statistics
 */
export interface OptimizationStats {
  /** Material sharing stats */
  materialSharing: {
    /** Original material count */
    originalCount: number;

    /** Shared material count */
    sharedCount: number;

    /** Reduction percentage */
    reductionPercent: number;
  };

  /** Mesh merging stats */
  meshMerging: {
    /** Original mesh count */
    originalCount: number;

    /** Merged mesh count */
    mergedCount: number;

    /** Draw calls saved */
    drawCallsSaved: number;
  };

  /** Culling stats */
  culling: CullingStats;

  /** Performance metrics */
  performance: PerformanceMetrics;
}

/**
 * Dynamic LOD state
 */
export interface DynamicLODState {
  /** Current quality level */
  currentQuality: QualityPreset;

  /** Target FPS */
  targetFPS: number;

  /** Recent FPS samples */
  fpsSamples: number[];

  /** Last adjustment time */
  lastAdjustmentTime: number;

  /** Adjustment cooldown in ms */
  adjustmentCooldown: number;
}

/**
 * Render pipeline state
 */
export interface RenderPipelineState {
  /** Is pipeline initialized */
  isInitialized: boolean;

  /** Active meshes frozen */
  isFrozen: boolean;

  /** Dynamic LOD state */
  lodState: DynamicLODState;

  /** Optimization statistics */
  stats: OptimizationStats;
}
