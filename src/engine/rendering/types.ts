/**
 * Type definitions for the GPU instancing and animation system
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Represents a single unit instance with its transform and animation state
 */
export interface UnitInstance {
  /** Unique identifier for this unit instance */
  id: string;

  /** World position of the unit */
  position: BABYLON.Vector3;

  /** Rotation angle in radians (around Y axis) */
  rotation: number;

  /** Team color for this unit (applied as tint) */
  teamColor: BABYLON.Color3;

  /** Current animation state (e.g., "idle", "walk", "attack") */
  animationState: string;

  /** Current time in the animation cycle */
  animationTime: number;

  /** Scale factor for the unit (default: 1) */
  scale?: number;
}

/**
 * Animation clip definition
 */
export interface AnimationClip {
  /** Animation name (e.g., "walk", "attack", "death") */
  name: string;

  /** Starting frame of the animation */
  startFrame: number;

  /** Ending frame of the animation */
  endFrame: number;

  /** Whether the animation should loop */
  loop?: boolean;

  /** Speed multiplier for this animation */
  speed?: number;
}

/**
 * Baked animation data stored in texture
 */
export interface BakedAnimationData {
  /** The texture containing baked vertex positions */
  texture: BABYLON.RawTexture;

  /** Width of the animation texture */
  width: number;

  /** Height of the animation texture */
  height: number;

  /** Animation clips metadata */
  clips: Map<string, AnimationClip>;
}

/**
 * Unit type registration data
 */
export interface UnitTypeData {
  /** Unit type identifier (e.g., "footman", "archer") */
  type: string;

  /** Base mesh for this unit type */
  mesh: BABYLON.Mesh;

  /** Available animation clips */
  animations: AnimationClip[];

  /** Baked animation system for this unit type */
  bakedAnimationData?: BakedAnimationData;
}

/**
 * Performance statistics for the rendering system
 */
export interface RenderingStats {
  /** Number of registered unit types */
  unitTypes: number;

  /** Total number of unit instances */
  totalUnits: number;

  /** Number of draw calls (ideally = unitTypes) */
  drawCalls: number;

  /** CPU time spent on instance updates (ms) */
  cpuTime: number;

  /** Memory usage for instance buffers (bytes) */
  memoryUsage: number;
}

/**
 * Configuration for the instanced unit renderer
 */
export interface RendererConfig {
  /** Initial capacity for instance buffers */
  initialCapacity?: number;

  /** Whether to enable picking for units */
  enablePicking?: boolean;

  /** LOD distance thresholds */
  lodDistances?: number[];

  /** Whether to freeze active meshes (optimization) */
  freezeActiveMeshes?: boolean;
}

/**
 * Animation state machine transition
 */
export interface AnimationTransition {
  /** Source animation state */
  from: string;

  /** Target animation state */
  to: string;

  /** Blend duration in seconds */
  blendDuration: number;
}

/**
 * Unit animation controller state
 */
export interface AnimationControllerState {
  /** Current animation being played */
  currentAnimation: string;

  /** Current time in the animation */
  currentTime: number;

  /** Whether the animation is playing */
  isPlaying: boolean;

  /** Animation speed multiplier */
  speed: number;

  /** Target animation for blending */
  targetAnimation?: string;

  /** Blend progress (0-1) */
  blendProgress?: number;
}

/**
 * LOD (Level of Detail) configuration for units
 */
export interface UnitLODConfig {
  /** Distance thresholds for LOD levels */
  distances: number[];

  /** Mesh complexity per LOD level */
  meshes: BABYLON.Mesh[];

  /** Whether to disable animations at far LOD */
  disableAnimationAtFar?: boolean;
}

/**
 * Unit pool configuration
 */
export interface PoolConfig {
  /** Initial pool size */
  initialSize: number;

  /** Maximum pool size (0 = unlimited) */
  maxSize?: number;

  /** Whether to grow the pool automatically */
  autoGrow?: boolean;
}
