/**
 * Terrain Chunk - Individual terrain chunk with LOD support
 */

import * as BABYLON from '@babylonjs/core';
import { DEFAULT_LOD_CONFIG, getLODLevel, getSubdivisions } from './TerrainLOD';
import type { TerrainLODConfig } from './types';

/**
 * Terrain chunk with automatic LOD switching
 */
export class TerrainChunk {
  public mesh: BABYLON.Mesh;
  public lodLevel: number = 0;
  public bounds: BABYLON.BoundingBox;
  public isVisible: boolean = true;

  private lodMeshes: BABYLON.Mesh[] = [];
  private scene: BABYLON.Scene;
  private chunkX: number;
  private chunkZ: number;
  private chunkSize: number;
  private heightmapUrl: string;
  private minHeight: number;
  private maxHeight: number;
  private lodConfig: TerrainLODConfig;

  constructor(
    scene: BABYLON.Scene,
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    heightmapUrl: string,
    minHeight: number = 0,
    maxHeight: number = 100,
    lodConfig: TerrainLODConfig = DEFAULT_LOD_CONFIG
  ) {
    this.scene = scene;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.chunkSize = chunkSize;
    this.heightmapUrl = heightmapUrl;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
    this.lodConfig = lodConfig;

    // Create placeholder mesh (will be replaced when LOD meshes are ready)
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      `chunk_${chunkX}_${chunkZ}`,
      { width: chunkSize, height: chunkSize, subdivisions: 1 },
      scene
    );

    this.mesh.position.x = chunkX * chunkSize;
    this.mesh.position.z = chunkZ * chunkSize;

    // Get bounds
    this.bounds = this.mesh.getBoundingInfo().boundingBox;
  }

  /**
   * Initialize LOD meshes asynchronously
   * Call this after construction to load heightmap-based meshes
   */
  async initializeLODMeshes(): Promise<void> {
    return new Promise((resolve) => {
      let loadedCount = 0;
      const totalLODs = this.lodConfig.levels.length;

      // Create all LOD levels
      for (let i = 0; i < totalLODs; i++) {
        const subdivisions = getSubdivisions(i, this.lodConfig);

        const mesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
          `chunk_${this.chunkX}_${this.chunkZ}_lod${i}`,
          this.heightmapUrl,
          {
            width: this.chunkSize,
            height: this.chunkSize,
            subdivisions: subdivisions,
            minHeight: this.minHeight,
            maxHeight: this.maxHeight,
            onReady: () => {
              loadedCount++;
              if (loadedCount === totalLODs) {
                // All LOD meshes loaded
                this.onAllLODsReady();
                resolve();
              }
            },
            updatable: false,
          },
          this.scene
        );

        mesh.position.x = this.chunkX * this.chunkSize;
        mesh.position.z = this.chunkZ * this.chunkSize;
        mesh.isVisible = false; // Hidden until activated
        mesh.freezeWorldMatrix(); // Static terrain optimization

        this.lodMeshes.push(mesh);
      }
    });
  }

  /**
   * Called when all LOD meshes are ready
   */
  private onAllLODsReady(): void {
    // Dispose placeholder mesh
    if (this.mesh !== null && this.mesh !== undefined && !this.lodMeshes.includes(this.mesh)) {
      this.mesh.dispose();
    }

    // Set LOD 0 as active mesh
    const lod0 = this.lodMeshes[0];
    if (lod0 !== null && lod0 !== undefined) {
      this.mesh = lod0;
      this.mesh.isVisible = this.isVisible;
      this.bounds = this.mesh.getBoundingInfo().boundingBox;
    }
  }

  /**
   * Update LOD level based on camera distance
   *
   * @param cameraPosition - Current camera position
   */
  updateLOD(cameraPosition: BABYLON.Vector3): void {
    if (this.lodMeshes.length === 0) return;

    const distance = BABYLON.Vector3.Distance(cameraPosition, this.bounds.centerWorld);

    const newLOD = getLODLevel(distance, this.lodConfig);

    if (newLOD !== this.lodLevel) {
      // Hide old LOD
      const oldMesh = this.lodMeshes[this.lodLevel];
      if (oldMesh) {
        oldMesh.isVisible = false;
      }

      // Show new LOD
      this.lodLevel = newLOD;
      const newMesh = this.lodMeshes[newLOD];
      if (newMesh) {
        this.mesh = newMesh;
        this.mesh.isVisible = this.isVisible;
      }
    }
  }

  /**
   * Check if chunk is in camera frustum
   *
   * @param frustumPlanes - Camera frustum planes
   * @returns True if chunk is visible
   */
  isInFrustum(frustumPlanes: BABYLON.Plane[]): boolean {
    return this.bounds.isInFrustum(frustumPlanes);
  }

  /**
   * Set visibility of chunk
   *
   * @param visible - Visibility state
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.mesh !== null && this.mesh !== undefined) {
      this.mesh.isVisible = visible;
    }
  }

  /**
   * Apply material to all LOD meshes
   *
   * @param material - Material to apply
   */
  setMaterial(material: BABYLON.Material): void {
    for (const mesh of this.lodMeshes) {
      mesh.material = material;
    }
    if (this.mesh !== null && this.mesh !== undefined && !this.lodMeshes.includes(this.mesh)) {
      this.mesh.material = material;
    }
  }

  /**
   * Get height at local position within chunk
   *
   * @param x - Local X position
   * @param z - Local Z position
   * @returns Height at position
   */
  getHeightAtPosition(x: number, z: number): number {
    if (this.mesh === null || this.mesh === undefined) return 0;

    const worldX = this.chunkX * this.chunkSize + x;
    const worldZ = this.chunkZ * this.chunkSize + z;

    const ray = new BABYLON.Ray(
      new BABYLON.Vector3(worldX, 1000, worldZ),
      new BABYLON.Vector3(0, -1, 0)
    );

    const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh === this.mesh);

    return pickInfo?.pickedPoint?.y ?? 0;
  }

  /**
   * Dispose chunk and all LOD meshes
   */
  dispose(): void {
    for (const mesh of this.lodMeshes) {
      mesh.dispose();
    }
    this.lodMeshes = [];

    if (this.mesh !== null && this.mesh !== undefined && !this.lodMeshes.includes(this.mesh)) {
      this.mesh.dispose();
    }
  }
}
