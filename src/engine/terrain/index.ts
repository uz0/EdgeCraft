/**
 * Terrain module exports
 */

// Basic terrain renderer
export { TerrainRenderer } from './TerrainRenderer';

// Advanced terrain system
export { AdvancedTerrainRenderer } from './AdvancedTerrainRenderer';
export { TerrainMaterial } from './TerrainMaterial';
export { TerrainChunk } from './TerrainChunk';
export { TerrainQuadtree } from './TerrainQuadtree';
export {
  DEFAULT_LOD_CONFIG,
  getLODLevel,
  getSubdivisions,
  calculateOptimalChunkSize,
} from './TerrainLOD';

// Types
export * from './types';
