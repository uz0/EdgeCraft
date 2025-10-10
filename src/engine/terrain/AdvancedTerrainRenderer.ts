/**
 * Advanced Terrain Renderer - Production-grade terrain system
 *
 * Features:
 * - Multi-texture splatting (4 layers)
 * - LOD system (4 levels)
 * - Quadtree chunking
 * - Frustum culling
 * - Custom GLSL shaders
 */

import * as BABYLON from '@babylonjs/core';
import { TerrainMaterial } from './TerrainMaterial';
import { TerrainQuadtree } from './TerrainQuadtree';
import { DEFAULT_LOD_CONFIG } from './TerrainLOD';
import type { AdvancedTerrainOptions, TerrainLODConfig } from './types';

/**
 * Advanced terrain renderer with multi-texture support and LOD
 *
 * @example
 * ```typescript
 * const terrain = new AdvancedTerrainRenderer();
 * await terrain.initialize(scene, {
 *   width: 256,
 *   height: 256,
 *   chunkSize: 64,
 *   heightmap: '/assets/heightmap.png',
 *   splatmap: '/assets/splatmap.png',
 *   textureLayers: [
 *     { diffuseTexture: '/assets/grass.png', scale: 10 },
 *     { diffuseTexture: '/assets/rock.png', scale: 8 },
 *     { diffuseTexture: '/assets/dirt.png', scale: 12 },
 *     { diffuseTexture: '/assets/snow.png', scale: 6 }
 *   ]
 * });
 * ```
 */
export class AdvancedTerrainRenderer {
  private quadtree?: TerrainQuadtree;
  private material?: TerrainMaterial;
  private scene?: BABYLON.Scene;
  private updateObserver?: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
  private isInitialized: boolean = false;

  /**
   * Initialize the advanced terrain system
   *
   * @param scene - Babylon.js scene
   * @param options - Terrain configuration options
   * @returns Promise that resolves when terrain is ready
   */
  async initialize(scene: BABYLON.Scene, options: AdvancedTerrainOptions): Promise<void> {
    this.scene = scene;

    // Validate options
    this.validateOptions(options);

    // 1. Create custom terrain material
    this.material = new TerrainMaterial('advancedTerrainMaterial', scene);

    // 2. Set up texture layers (up to 4)
    const layerCount = Math.min(options.textureLayers.length, 4);
    for (let i = 0; i < layerCount; i++) {
      const layer = options.textureLayers[i];
      if (layer) {
        this.material.setTextureLayer(i, layer);
      }
    }

    // 3. Set splatmap
    this.material.setSplatmap(options.splatmap);

    // 4. Create quadtree chunk system
    const lodConfig: TerrainLODConfig = DEFAULT_LOD_CONFIG;

    this.quadtree = new TerrainQuadtree(
      scene,
      options.width,
      options.height,
      options.heightmap,
      options.chunkSize,
      options.minHeight,
      options.maxHeight,
      lodConfig
    );

    // 5. Initialize chunks (async heightmap loading)
    await this.quadtree.initialize();

    // 6. Apply material to all chunks
    this.quadtree.setMaterial(this.material as BABYLON.Material);

    // 7. Set up update loop
    this.updateObserver = scene.onBeforeRenderObservable.add(() => {
      this.update();
    });

    this.isInitialized = true;
  }

  /**
   * Validate terrain options
   *
   * @param options - Options to validate
   */
  private validateOptions(options: AdvancedTerrainOptions): void {
    if (!options.width || options.width <= 0) {
      throw new Error('Terrain width must be positive');
    }
    if (!options.height || options.height <= 0) {
      throw new Error('Terrain height must be positive');
    }
    if (!options.heightmap || options.heightmap.trim() === '') {
      throw new Error('Heightmap URL is required');
    }
    if (
      options.splatmap === null ||
      options.splatmap === undefined ||
      options.splatmap.trim() === ''
    ) {
      throw new Error('Splatmap URL is required');
    }
    if (
      options.textureLayers === null ||
      options.textureLayers === undefined ||
      options.textureLayers.length === 0
    ) {
      throw new Error('At least one texture layer is required');
    }
    if (options.textureLayers.length > 4) {
      console.warn('Only first 4 texture layers will be used');
    }
  }

  /**
   * Update terrain system (called every frame)
   */
  private update(): void {
    if (!this.isInitialized || !this.quadtree || !this.scene || !this.material) {
      return;
    }

    const camera = this.scene.activeCamera;
    if (!camera) return;

    // Update quadtree (LOD + frustum culling)
    this.quadtree.update(camera);

    // Update material camera position for shader
    this.material.updateCameraPosition(camera);
  }

  /**
   * Get height at world position
   *
   * @param x - World X position
   * @param z - World Z position
   * @returns Height at position
   */
  getHeightAtPosition(x: number, z: number): number {
    if (!this.quadtree) return 0;
    return this.quadtree.getHeightAtPosition(x, z);
  }

  /**
   * Get number of active chunks
   *
   * @returns Active chunk count
   */
  getActiveChunkCount(): number {
    return this.quadtree?.getActiveChunkCount() ?? 0;
  }

  /**
   * Get total number of chunks
   *
   * @returns Total chunk count
   */
  getTotalChunkCount(): number {
    return this.quadtree?.getTotalChunkCount() ?? 0;
  }

  /**
   * Get terrain material
   *
   * @returns Terrain material
   */
  getMaterial(): TerrainMaterial | undefined {
    return this.material;
  }

  /**
   * Get terrain quadtree
   *
   * @returns Terrain quadtree
   */
  getQuadtree(): TerrainQuadtree | undefined {
    return this.quadtree;
  }

  /**
   * Update light direction
   *
   * @param direction - Light direction vector
   */
  setLightDirection(direction: BABYLON.Vector3): void {
    this.material?.setLightDirection(direction);
  }

  /**
   * Check if terrain is initialized
   *
   * @returns True if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose terrain and all resources
   */
  dispose(): void {
    // Remove update observer
    if (this.updateObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }

    // Dispose quadtree (disposes all chunks)
    this.quadtree?.dispose();
    this.quadtree = undefined;

    // Dispose material
    this.material?.dispose();
    this.material = undefined;

    this.isInitialized = false;
    this.scene = undefined;
  }
}
