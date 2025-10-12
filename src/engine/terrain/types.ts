/**
 * Terrain type definitions
 */

/**
 * Terrain options for heightmap-based terrain
 */
export interface TerrainOptions {
  /** Width of terrain */
  width: number;
  /** Height of terrain */
  height: number;
  /** Number of subdivisions (affects detail and performance) */
  subdivisions: number;
  /** Minimum height of terrain */
  minHeight?: number;
  /** Maximum height of terrain */
  maxHeight: number;
  /** Texture URLs for terrain materials (deprecated, use textureId instead) */
  textures?: string[];
  /** Texture ID from map data (e.g., 'Ashenvale', 'Agrs') */
  textureId?: string;
  /** Enable wireframe mode */
  wireframe?: boolean;
}

/**
 * Terrain data structure
 */
export interface TerrainData {
  /** Width of terrain */
  width: number;
  /** Height of terrain */
  height: number;
  /** Heightmap data */
  heightData: Float32Array;
  /** Texture paths */
  textures: string[];
}

/**
 * Terrain material options
 */
export interface TerrainMaterialOptions {
  /** Diffuse texture URL */
  diffuseTexture?: string;
  /** Normal map URL */
  normalTexture?: string;
  /** Specular map URL */
  specularTexture?: string;
  /** UV scale */
  uvScale?: number;
}

/**
 * Terrain loading status
 */
export enum TerrainLoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

/**
 * Terrain load result
 */
export interface TerrainLoadResult {
  status: TerrainLoadStatus;
  mesh?: {
    name: string;
    position: { x: number; y: number; z: number };
  };
  error?: string;
}

/**
 * Terrain texture layer for multi-texture splatting
 */
export interface TerrainTextureLayer {
  /** Diffuse texture URL */
  diffuseTexture: string;
  /** Normal map URL (optional) */
  normalTexture?: string;
  /** Tiling/scale factor for texture */
  scale: number;
}

/**
 * Advanced terrain options for multi-texture rendering
 */
export interface AdvancedTerrainOptions {
  /** Width of terrain in world units */
  width: number;
  /** Height of terrain in world units */
  height: number;
  /** Size of each terrain chunk (default: 64) */
  chunkSize?: number;
  /** Array of texture layers (up to 4) */
  textureLayers: TerrainTextureLayer[];
  /** Splatmap URL for texture blending */
  splatmap: string;
  /** Heightmap URL */
  heightmap: string;
  /** Minimum terrain height */
  minHeight?: number;
  /** Maximum terrain height */
  maxHeight?: number;
}

/**
 * LOD configuration for terrain chunks
 */
export interface TerrainLODConfig {
  /** LOD levels with subdivision counts */
  levels: number[];
  /** Distance thresholds for LOD switching */
  distances: number[];
}

/**
 * Terrain chunk bounds
 */
export interface ChunkBounds {
  /** Minimum X coordinate */
  minX: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Minimum Z coordinate */
  minZ: number;
  /** Maximum Z coordinate */
  maxZ: number;
}
