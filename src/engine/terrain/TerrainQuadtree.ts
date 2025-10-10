/**
 * Terrain Quadtree - Manages terrain chunks with frustum culling and LOD
 */

import * as BABYLON from '@babylonjs/core';
import { TerrainChunk } from './TerrainChunk';
import { DEFAULT_LOD_CONFIG, calculateOptimalChunkSize } from './TerrainLOD';
import type { TerrainLODConfig } from './types';

/**
 * Quadtree-based terrain chunk manager
 *
 * Handles dynamic loading/unloading and LOD management of terrain chunks
 */
export class TerrainQuadtree {
  private chunks: Map<string, TerrainChunk> = new Map();
  private activeChunks: Set<string> = new Set();
  private scene: BABYLON.Scene;
  private chunkSize: number;
  private heightmapUrl: string;
  private minHeight: number;
  private maxHeight: number;
  private lodConfig: TerrainLODConfig;
  private chunksX: number;
  private chunksZ: number;
  private isInitialized: boolean = false;

  constructor(
    scene: BABYLON.Scene,
    terrainWidth: number,
    terrainHeight: number,
    heightmapUrl: string,
    chunkSize?: number,
    minHeight: number = 0,
    maxHeight: number = 100,
    lodConfig: TerrainLODConfig = DEFAULT_LOD_CONFIG
  ) {
    this.scene = scene;
    this.heightmapUrl = heightmapUrl;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
    this.lodConfig = lodConfig;

    // Calculate optimal chunk size if not provided
    this.chunkSize = chunkSize || calculateOptimalChunkSize(terrainWidth, terrainHeight);

    // Calculate number of chunks
    this.chunksX = Math.ceil(terrainWidth / this.chunkSize);
    this.chunksZ = Math.ceil(terrainHeight / this.chunkSize);
  }

  /**
   * Initialize all chunks asynchronously
   */
  async initialize(): Promise<void> {
    const chunkPromises: Promise<void>[] = [];

    // Create all chunks
    for (let x = 0; x < this.chunksX; x++) {
      for (let z = 0; z < this.chunksZ; z++) {
        const key = this.getChunkKey(x, z);
        const chunk = new TerrainChunk(
          this.scene,
          x,
          z,
          this.chunkSize,
          this.heightmapUrl,
          this.minHeight,
          this.maxHeight,
          this.lodConfig
        );

        this.chunks.set(key, chunk);

        // Initialize LOD meshes asynchronously
        chunkPromises.push(chunk.initializeLODMeshes());
      }
    }

    // Wait for all chunks to initialize
    await Promise.all(chunkPromises);
    this.isInitialized = true;
  }

  /**
   * Update chunk visibility and LOD based on camera
   *
   * @param camera - Active camera
   */
  update(camera: BABYLON.Camera): void {
    if (!this.isInitialized) return;

    // Get frustum planes using Babylon.js Frustum utility
    const frustumPlanes = BABYLON.Frustum.GetPlanes(camera.getTransformationMatrix());
    const cameraPos = camera.globalPosition;

    // Clear active chunks
    this.activeChunks.clear();

    // Update each chunk
    for (const [key, chunk] of this.chunks) {
      const inFrustum = chunk.isInFrustum(frustumPlanes);

      if (inFrustum) {
        // Update LOD based on distance
        chunk.updateLOD(cameraPos);
        chunk.setVisible(true);
        this.activeChunks.add(key);
      } else {
        // Hide chunks outside frustum
        chunk.setVisible(false);
      }
    }
  }

  /**
   * Apply material to all chunks
   *
   * @param material - Material to apply
   */
  setMaterial(material: BABYLON.Material): void {
    for (const chunk of this.chunks.values()) {
      chunk.setMaterial(material);
    }
  }

  /**
   * Get chunk at grid position
   *
   * @param x - Chunk X index
   * @param z - Chunk Z index
   * @returns Terrain chunk or undefined
   */
  getChunk(x: number, z: number): TerrainChunk | undefined {
    return this.chunks.get(this.getChunkKey(x, z));
  }

  /**
   * Get chunk containing world position
   *
   * @param worldX - World X position
   * @param worldZ - World Z position
   * @returns Terrain chunk or undefined
   */
  getChunkAtWorldPosition(worldX: number, worldZ: number): TerrainChunk | undefined {
    const chunkX = Math.floor(worldX / this.chunkSize);
    const chunkZ = Math.floor(worldZ / this.chunkSize);
    return this.getChunk(chunkX, chunkZ);
  }

  /**
   * Get height at world position
   *
   * @param worldX - World X position
   * @param worldZ - World Z position
   * @returns Height at position
   */
  getHeightAtPosition(worldX: number, worldZ: number): number {
    const chunk = this.getChunkAtWorldPosition(worldX, worldZ);
    if (!chunk) return 0;

    const localX = worldX - Math.floor(worldX / this.chunkSize) * this.chunkSize;
    const localZ = worldZ - Math.floor(worldZ / this.chunkSize) * this.chunkSize;

    return chunk.getHeightAtPosition(localX, localZ);
  }

  /**
   * Get number of active (visible) chunks
   *
   * @returns Active chunk count
   */
  getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  /**
   * Get total number of chunks
   *
   * @returns Total chunk count
   */
  getTotalChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Get all chunks
   *
   * @returns Map of all chunks
   */
  getAllChunks(): Map<string, TerrainChunk> {
    return this.chunks;
  }

  /**
   * Generate chunk key from grid coordinates
   *
   * @param x - Chunk X index
   * @param z - Chunk Z index
   * @returns Chunk key string
   */
  private getChunkKey(x: number, z: number): string {
    return `${x}_${z}`;
  }

  /**
   * Dispose all chunks
   */
  dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    this.activeChunks.clear();
    this.isInitialized = false;
  }
}
