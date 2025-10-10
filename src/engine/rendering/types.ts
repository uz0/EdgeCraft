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

/**
 * Animation clip definition
 */
export interface AnimationClip {
  /** Animation name */
  name: string;

  /** Start frame */
  startFrame: number;

  /** End frame */
  endFrame: number;

  /** Loop animation */
  loop?: boolean;

  /** Animation speed multiplier */
  speed?: number;
}

/**
 * Baked animation data
 */
export interface BakedAnimationData {
  /** Animation texture */
  texture: BABYLON.RawTexture;

  /** Texture width */
  width: number;

  /** Texture height */
  height: number;

  /** Animation clips */
  clips: Map<string, AnimationClip>;
}

/**
 * Shadow quality levels
 */
export enum ShadowQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Shadow quality configuration
 */
export interface QualityPresetConfig {
  /** Shadow map size */
  shadowMapSize: number;

  /** Number of cascades */
  numCascades: number;

  /** Enable PCF filtering */
  enablePCF: boolean;

  /** Cascade blend percentage */
  cascadeBlendPercentage: number;

  /** Maximum shadow casters */
  maxShadowCasters: number;
}

/**
 * CSM (Cascaded Shadow Maps) configuration
 */
export interface CSMConfiguration {
  /** Shadow map resolution */
  shadowMapSize: number;

  /** Number of cascades */
  numCascades: number;

  /** Lambda split factor */
  lambda?: number;

  /** Stabilize cascades */
  stabilizeCascades?: boolean;

  /** Enable depth clamping */
  depthClamp?: boolean;

  /** Filter quality */
  filterQuality?: 'low' | 'medium' | 'high';

  /** Cascade blend percentage */
  cascadeBlendPercentage?: number;

  /** Split distances for cascades */
  splitDistances?: number[];

  /** Enable PCF filtering */
  enablePCF?: boolean;
}

/**
 * Shadow statistics
 */
export interface ShadowStats {
  /** Total shadow casters */
  totalCasters: number;

  /** Active shadow casters */
  activeCasters: number;

  /** Shadow map updates per frame */
  updatesPerFrame: number;

  /** Memory usage in bytes */
  memoryUsage: number;

  /** Number of cascades */
  cascades?: number;

  /** Shadow map size */
  shadowMapSize?: number;

  /** Shadow casters count (alias for totalCasters) */
  shadowCasters?: number;
}

/**
 * Shadow priority levels
 */
export enum ShadowPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Unit instance data
 */
export interface UnitInstance {
  /** Instance ID */
  id: string;

  /** Unit type */
  type: string;

  /** World matrix */
  matrix: BABYLON.Matrix;

  /** Position */
  position?: BABYLON.Vector3;

  /** Rotation in radians (Y-axis) */
  rotation?: number;

  /** Scale */
  scale?: BABYLON.Vector3 | number;

  /** Team color */
  teamColor?: BABYLON.Color3;

  /** Animation state */
  animationState?: string;

  /** Animation frame */
  animationFrame?: number;

  /** Animation time */
  animationTime?: number;

  /** Is visible */
  visible?: boolean;
}

/**
 * Rendering statistics
 */
export interface RenderingStats {
  /** Total instances */
  totalInstances: number;

  /** Visible instances */
  visibleInstances: number;

  /** Draw calls */
  drawCalls: number;

  /** Triangles rendered */
  triangles: number;

  /** Memory usage */
  memoryUsage: number;

  /** Unit types count */
  unitTypes?: number;

  /** Total units */
  totalUnits?: number;

  /** CPU time in milliseconds */
  cpuTime?: number;
}

/**
 * Renderer configuration
 */
export interface RendererConfig {
  /** Enable instancing */
  enableInstancing?: boolean;

  /** Maximum instances per buffer */
  maxInstancesPerBuffer?: number;

  /** Initial capacity */
  initialCapacity?: number;

  /** Enable picking */
  enablePicking?: boolean;

  /** Freeze active meshes */
  freezeActiveMeshes?: boolean;

  /** Enable frustum culling */
  enableFrustumCulling?: boolean;

  /** Enable occlusion culling */
  enableOcclusionCulling?: boolean;

  /** LOD distances */
  lodDistances?: number[];
}

/**
 * Unit type data
 */
export interface UnitTypeData {
  /** Unit type identifier */
  type: string;

  /** Model path */
  modelPath: string;

  /** Mesh instance */
  mesh?: BABYLON.Mesh;

  /** Animation clips */
  animations: AnimationClip[];

  /** Baked animation data */
  bakedAnimationData?: BakedAnimationData;

  /** Bounding radius */
  boundingRadius?: number;

  /** Shadow enabled */
  castShadow?: boolean;
}

/**
 * Shadow caster configuration
 */
export interface ShadowCasterConfig {
  /** Maximum shadow casters */
  maxCasters?: number;

  /** Shadow quality */
  quality?: ShadowQuality;

  /** Shadow type */
  type?: 'csm' | 'blob' | 'standard' | 'hero' | 'building' | 'unit' | 'doodad' | 'none';

  /** Shadow cast method */
  castMethod?: 'csm' | 'blob';

  /** Enable dynamic updates */
  dynamicUpdates?: boolean;

  /** Update frequency (ms) */
  updateFrequency?: number;
}

/**
 * Shadow caster statistics
 */
export interface ShadowCasterStats {
  /** Total registered casters */
  totalCasters: number;

  /** Currently rendering casters */
  renderingCasters: number;

  /** Casters culled this frame */
  culledCasters: number;

  /** Shadow map updates this frame */
  updates: number;

  /** CSM casters count */
  csmCasters?: number;

  /** Blob casters count */
  blobCasters?: number;

  /** Blob shadows count */
  blobShadows?: number;

  /** Total objects (all shadow casters) */
  totalObjects?: number;
}

/**
 * Animation controller state
 */
export interface AnimationControllerState {
  /** Current animation name */
  currentAnimation: string;

  /** Target animation for blending */
  targetAnimation?: string;

  /** Blend progress (0-1) */
  blendProgress?: number;

  /** Current time in animation */
  currentTime?: number;

  /** Animation progress (0-1) */
  progress: number;

  /** Is playing */
  isPlaying: boolean;

  /** Is looping */
  isLooping: boolean;

  /** Playback speed */
  speed: number;
}

/**
 * Object pool configuration
 */
export interface PoolConfig {
  /** Initial pool size */
  initialSize?: number;

  /** Maximum pool size */
  maxSize?: number;

  /** Enable automatic expansion */
  autoExpand?: boolean;

  /** Auto grow pool */
  autoGrow?: boolean;

  /** Shrink interval (ms) */
  shrinkInterval?: number;
}
