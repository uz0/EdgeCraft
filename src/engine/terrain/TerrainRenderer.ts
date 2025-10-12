/**
 * Terrain Renderer - Handles heightmap-based terrain rendering
 */

import * as BABYLON from '@babylonjs/core';
import type { TerrainOptions, TerrainLoadResult, TerrainLoadStatus } from './types';
import type { AssetLoader } from '../assets/AssetLoader';
import { mapAssetID } from '../assets/AssetMap';

/**
 * Terrain renderer for creating and managing heightmap-based terrain
 *
 * @example
 * ```typescript
 * const terrain = new TerrainRenderer(scene, assetLoader);
 * await terrain.loadHeightmap('/assets/heightmap.png', {
 *   width: 256,
 *   height: 256,
 *   subdivisions: 64,
 *   maxHeight: 50,
 *   textureId: 'Ashenvale'
 * });
 * ```
 */
export class TerrainRenderer {
  private scene: BABYLON.Scene;
  private assetLoader: AssetLoader;
  private mesh?: BABYLON.GroundMesh;
  private material?: BABYLON.StandardMaterial;
  private loadStatus: TerrainLoadStatus = 'idle' as TerrainLoadStatus;

  constructor(scene: BABYLON.Scene, assetLoader: AssetLoader) {
    this.scene = scene;
    this.assetLoader = assetLoader;
  }

  /**
   * Load terrain from heightmap image
   */
  public async loadHeightmap(
    heightmapUrl: string,
    options: TerrainOptions
  ): Promise<TerrainLoadResult> {
    try {
      this.loadStatus = 'loading' as TerrainLoadStatus;

      return await new Promise((resolve, reject) => {
        this.mesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
          'terrain',
          heightmapUrl,
          {
            width: options.width,
            height: options.height,
            subdivisions: options.subdivisions,
            minHeight: options.minHeight ?? 0,
            maxHeight: options.maxHeight,
            onReady: async (mesh) => {
              try {
                await this.applyMaterial(mesh, options);
                this.loadStatus = 'loaded' as TerrainLoadStatus;
                resolve({
                  status: this.loadStatus,
                  mesh: mesh,
                });
              } catch (materialError) {
                console.error('[TerrainRenderer] Failed to apply material:', materialError);
                this.loadStatus = 'error' as TerrainLoadStatus;
                reject(materialError);
              }
            },
            updatable: false,
          },
          this.scene
        );

        // Set wireframe if requested
        if (options.wireframe === true) {
          this.mesh.material = new BABYLON.StandardMaterial('wireframe', this.scene);
          (this.mesh.material as BABYLON.StandardMaterial).wireframe = true;
        }
      });
    } catch (error) {
      this.loadStatus = 'error' as TerrainLoadStatus;
      return {
        status: this.loadStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply material and textures to terrain
   */
  private async applyMaterial(mesh: BABYLON.GroundMesh, options: TerrainOptions): Promise<void> {
    this.material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);

    // Try to load texture from AssetLoader if textureId is provided
    if (options.textureId) {
      try {
        // Map the terrain texture ID to our asset ID
        const mappedId = mapAssetID('w3x', 'terrain', options.textureId);
        console.log(`[TerrainRenderer] Mapped texture ID: ${options.textureId} -> ${mappedId}`);

        // Load the diffuse texture
        const diffuseTexture = await this.assetLoader.loadTexture(mappedId);
        this.material.diffuseTexture = diffuseTexture;
        this.material.diffuseTexture.uScale = 16;
        this.material.diffuseTexture.vScale = 16;

        // Try to load normal map (if available)
        try {
          const normalTexture = await this.assetLoader.loadTexture(`${mappedId}_normal`);
          this.material.bumpTexture = normalTexture;
          this.material.bumpTexture.uScale = 16;
          this.material.bumpTexture.vScale = 16;
        } catch {
          // Normal map not available, continue without it
        }

        // Try to load roughness map (if available)
        try {
          const roughnessTexture = await this.assetLoader.loadTexture(`${mappedId}_roughness`);
          this.material.specularTexture = roughnessTexture;
          this.material.specularTexture.uScale = 16;
          this.material.specularTexture.vScale = 16;
        } catch {
          // Roughness map not available, use default specular
          this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        }

        console.log(`[TerrainRenderer] Loaded texture: ${mappedId} for terrain`);
      } catch (error) {
        console.warn(`[TerrainRenderer] Failed to load texture for ${options.textureId}, using fallback color`, error);
        // Fallback to default grass color
        this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
        this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      }
    } else {
      // No textureId provided, use default grass color
      console.log('[TerrainRenderer] No textureId provided, using default grass color');
      this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
      this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    }

    // Enable backface culling for performance
    this.material.backFaceCulling = true;

    // Apply material to mesh
    mesh.material = this.material;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;

    console.log(
      `[TerrainRenderer] Material applied: mesh=${mesh.name}, ` +
        `position=${mesh.position.toString()}, ` +
        `visible=${mesh.isVisible}, ` +
        `material=${this.material?.name ?? 'none'}`
    );
  }

  /**
   * Create flat terrain (for testing)
   */
  public createFlatTerrain(
    width: number,
    height: number,
    subdivisions: number
  ): BABYLON.GroundMesh {
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      'flatTerrain',
      {
        width,
        height,
        subdivisions,
      },
      this.scene
    );

    // Apply default material
    this.material = new BABYLON.StandardMaterial('flatTerrainMaterial', this.scene);
    this.material.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.4);
    this.mesh.material = this.material;

    this.loadStatus = 'loaded' as TerrainLoadStatus;
    return this.mesh;
  }

  /**
   * Get terrain mesh
   */
  public getMesh(): BABYLON.GroundMesh | undefined {
    return this.mesh;
  }

  /**
   * Get terrain material
   */
  public getMaterial(): BABYLON.StandardMaterial | undefined {
    return this.material;
  }

  /**
   * Get load status
   */
  public getLoadStatus(): TerrainLoadStatus {
    return this.loadStatus;
  }

  /**
   * Get height at world position
   */
  public getHeightAtPosition(x: number, z: number): number {
    if (!this.mesh) return 0;

    const ray = new BABYLON.Ray(new BABYLON.Vector3(x, 1000, z), new BABYLON.Vector3(0, -1, 0));
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh === this.mesh);

    return pickInfo?.pickedPoint?.y ?? 0;
  }

  /**
   * Update terrain texture
   */
  public updateTexture(textureUrl: string): void {
    if (!this.material) return;

    this.material.diffuseTexture?.dispose();
    this.material.diffuseTexture = new BABYLON.Texture(textureUrl, this.scene);
  }

  /**
   * Dispose terrain and resources
   */
  public dispose(): void {
    this.material?.dispose();
    this.mesh?.dispose();
    this.loadStatus = 'idle' as TerrainLoadStatus;
  }
}
