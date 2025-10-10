/**
 * Terrain LOD System - Manages level-of-detail for terrain chunks
 */

import type { TerrainLODConfig } from './types';

/**
 * Default LOD configuration
 * - LOD 0: 64 subdivisions (0-200m)
 * - LOD 1: 32 subdivisions (200-400m)
 * - LOD 2: 16 subdivisions (400-800m)
 * - LOD 3: 8 subdivisions (800m+)
 */
export const DEFAULT_LOD_CONFIG: TerrainLODConfig = {
  levels: [64, 32, 16, 8],
  distances: [200, 400, 800],
};

/**
 * Get LOD level based on distance from camera
 *
 * @param distance - Distance from camera to chunk center
 * @param config - LOD configuration (optional)
 * @returns LOD level index (0-3)
 */
export function getLODLevel(
  distance: number,
  config: TerrainLODConfig = DEFAULT_LOD_CONFIG
): number {
  const distances = config.distances;
  if (!distances || distances.length === 0) {
    return 0;
  }

  for (let i = 0; i < distances.length; i++) {
    const threshold = distances[i];
    if (threshold !== undefined && distance < threshold) {
      return i;
    }
  }
  return config.levels.length - 1;
}

/**
 * Get subdivision count for a given LOD level
 *
 * @param lodLevel - LOD level index (0-3)
 * @param config - LOD configuration (optional)
 * @returns Number of subdivisions
 */
export function getSubdivisions(
  lodLevel: number,
  config: TerrainLODConfig = DEFAULT_LOD_CONFIG
): number {
  const level = config.levels[lodLevel];
  if (level !== undefined) {
    return level;
  }
  const fallback = config.levels[config.levels.length - 1];
  return fallback !== undefined ? fallback : 8;
}

/**
 * Calculate optimal chunk size based on terrain dimensions
 *
 * @param terrainWidth - Total terrain width
 * @param terrainHeight - Total terrain height
 * @returns Optimal chunk size
 */
export function calculateOptimalChunkSize(
  terrainWidth: number,
  terrainHeight: number
): number {
  // Aim for 4-16 chunks per dimension
  const minChunks = 4;
  const maxChunks = 16;

  // Start with 64 as default
  let chunkSize = 64;

  const chunksX = Math.ceil(terrainWidth / chunkSize);
  const chunksZ = Math.ceil(terrainHeight / chunkSize);

  // If too many chunks, increase chunk size
  if (chunksX > maxChunks || chunksZ > maxChunks) {
    chunkSize = Math.ceil(Math.max(terrainWidth, terrainHeight) / maxChunks);
  }

  // If too few chunks, decrease chunk size
  if (chunksX < minChunks && chunksZ < minChunks) {
    chunkSize = Math.ceil(Math.max(terrainWidth, terrainHeight) / minChunks);
  }

  // Ensure power of 2 for better performance
  return Math.pow(2, Math.ceil(Math.log2(chunkSize)));
}
