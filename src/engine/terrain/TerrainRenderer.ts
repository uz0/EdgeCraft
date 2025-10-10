/**
 * Terrain Renderer - Handles heightmap-based terrain rendering
 */

import * as BABYLON from '@babylonjs/core';
import type { TerrainOptions, TerrainLoadResult, TerrainLoadStatus } from './types';

/**
 * Terrain renderer for creating and managing heightmap-based terrain
 *
 * @example
 * ```typescript
 * const terrain = new TerrainRenderer(scene);
 * await terrain.loadHeightmap('/assets/heightmap.png', {
 *   width: 256,
 *   height: 256,
 *   subdivisions: 64,
 *   maxHeight: 50
 * });
 * ```
 */
export class TerrainRenderer {
  private scene: BABYLON.Scene;
  private mesh?: BABYLON.GroundMesh;
  private material?: BABYLON.StandardMaterial;
  private loadStatus: TerrainLoadStatus = 'idle' as TerrainLoadStatus;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
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

      return await new Promise((resolve) => {
        this.mesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
          'terrain',
          heightmapUrl,
          {
            width: options.width,
            height: options.height,
            subdivisions: options.subdivisions,
            minHeight: options.minHeight ?? 0,
            maxHeight: options.maxHeight,
            onReady: (mesh) => {
              this.applyMaterial(mesh, options);
              this.loadStatus = 'loaded' as TerrainLoadStatus;
              resolve({
                status: this.loadStatus,
                mesh: mesh,
              });
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
  private applyMaterial(mesh: BABYLON.GroundMesh, options: TerrainOptions): void {
    this.material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);

    // Apply diffuse texture if available
    if (
      options.textures &&
      options.textures.length > 0 &&
      options.textures[0] !== undefined &&
      options.textures[0] !== ''
    ) {
      const texture = new BABYLON.Texture(options.textures[0], this.scene);
      this.material.diffuseTexture = texture;

      // Set UV scaling for better tiling
      texture.uScale = options.width / 10;
      texture.vScale = options.height / 10;
    } else {
      // Default grass-like color
      this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
    }

    // Enable backface culling for performance
    this.material.backFaceCulling = true;

    // Apply material to mesh
    mesh.material = this.material;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
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
