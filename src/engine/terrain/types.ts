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
  /** Texture URLs for terrain materials */
  textures?: string[];
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
