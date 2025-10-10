/**
 * SC2-specific map data structures
 * StarCraft 2 map format types
 */

/**
 * SC2 Document Info - Map metadata from DocumentInfo file
 */
export interface SC2DocumentInfo {
  name: string;
  author: string;
  description: string;
  version: string;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * SC2 Terrain Data - Heightmap and texture information
 */
export interface SC2TerrainData {
  heightmap: number[][];
  tileset: string;
  textures: SC2Texture[];
  water?: {
    level: number;
    type: string;
  };
}

/**
 * SC2 Texture Layer
 */
export interface SC2Texture {
  path: string;
  scale: number;
}

/**
 * SC2 Unit Placement
 */
export interface SC2Unit {
  type: string;
  owner: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
}

/**
 * SC2 Doodad (decoration) Placement
 */
export interface SC2Doodad {
  type: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
  variation: number;
}
