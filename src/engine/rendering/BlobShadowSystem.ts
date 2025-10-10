/**
 * Blob Shadow System - Cheap shadow rendering for regular units
 *
 * Uses projected decal planes with radial gradient textures instead of
 * expensive shadow mapping. Ideal for RTS games with hundreds of units.
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Blob shadow system for rendering cheap shadows
 *
 * This system creates simple circular shadow decals beneath units,
 * providing visual grounding without the performance cost of shadow maps.
 *
 * @example
 * ```typescript
 * const blobSystem = new BlobShadowSystem(scene);
 * blobSystem.createBlobShadow('unit1', new Vector3(0, 0, 0), 2.0);
 * blobSystem.updateBlobShadow('unit1', new Vector3(5, 0, 5));
 * ```
 */
export class BlobShadowSystem {
  private blobTexture!: BABYLON.Texture;
  private blobMeshes: Map<string, BABYLON.Mesh> = new Map();
  private scene: BABYLON.Scene;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.createBlobTexture();
  }

  /**
   * Create the shared blob shadow texture
   *
   * Generates a radial gradient texture that fades from dark center to transparent edge.
   * This texture is shared across all blob shadows for memory efficiency.
   */
  private createBlobTexture(): void {
    // Create a simple radial gradient texture for blob shadow
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient from center to edge
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    // Dark center fading to transparent edge
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Create Babylon.js texture from canvas
    this.blobTexture = new BABYLON.Texture(canvas.toDataURL(), this.scene);
  }

  /**
   * Create a blob shadow for a unit
   *
   * @param unitId - Unique identifier for the unit
   * @param position - World position for the shadow
   * @param size - Diameter of the shadow blob (default: 2 units)
   *
   * @example
   * ```typescript
   * blobSystem.createBlobShadow('warrior1', new Vector3(10, 0, 10), 2.5);
   * ```
   */
  public createBlobShadow(unitId: string, position: BABYLON.Vector3, size: number = 2): void {
    // Create a simple plane mesh for the blob
    const blob = BABYLON.MeshBuilder.CreatePlane(
      `blob_${unitId}`,
      { size: size },
      this.scene,
    );

    // Position slightly above ground to avoid z-fighting
    blob.position = position.clone();
    blob.position.y = 0.01;

    // Rotate to face up (lie flat on ground)
    blob.rotation.x = Math.PI / 2;

    // Create material with blob texture
    const material = new BABYLON.StandardMaterial(`blobMat_${unitId}`, this.scene);
    material.diffuseTexture = this.blobTexture;
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableLighting = true;

    // Assign material to blob
    blob.material = material;

    // Render before other objects to avoid sorting issues
    blob.renderingGroupId = 0;

    // Store blob mesh for later updates
    this.blobMeshes.set(unitId, blob);
  }

  /**
   * Update blob shadow position
   *
   * @param unitId - Unique identifier for the unit
   * @param position - New world position for the shadow
   *
   * @example
   * ```typescript
   * blobSystem.updateBlobShadow('warrior1', unit.getPosition());
   * ```
   */
  public updateBlobShadow(unitId: string, position: BABYLON.Vector3): void {
    const blob = this.blobMeshes.get(unitId);
    if (blob) {
      blob.position.x = position.x;
      blob.position.z = position.z;
      blob.position.y = 0.01; // Keep slightly above ground
    }
  }

  /**
   * Remove a blob shadow
   *
   * @param unitId - Unique identifier for the unit
   *
   * @example
   * ```typescript
   * blobSystem.removeBlobShadow('warrior1');
   * ```
   */
  public removeBlobShadow(unitId: string): void {
    const blob = this.blobMeshes.get(unitId);
    if (blob) {
      blob.dispose();
      this.blobMeshes.delete(unitId);
    }
  }

  /**
   * Get the number of active blob shadows
   *
   * @returns Number of blob shadows currently managed
   */
  public getBlobCount(): number {
    return this.blobMeshes.size;
  }

  /**
   * Dispose of all blob shadows and resources
   */
  public dispose(): void {
    // Dispose all blob meshes
    for (const blob of this.blobMeshes.values()) {
      blob.dispose();
    }
    this.blobMeshes.clear();

    // Dispose shared texture
    this.blobTexture.dispose();
  }
}
