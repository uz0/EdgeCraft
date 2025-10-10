/**
 * Shadow Caster Manager - Intelligent shadow method selection
 *
 * Manages shadow casting for all objects in the scene, automatically
 * selecting between CSM (expensive, high quality) and blob shadows
 * (cheap, acceptable quality) based on object type and system load.
 */

import * as BABYLON from '@babylonjs/core';
import { CascadedShadowSystem } from './CascadedShadowSystem';
import { BlobShadowSystem } from './BlobShadowSystem';
import { ShadowCasterConfig, ShadowCasterStats } from './types';

/**
 * Manager for shadow casting across different object types
 *
 * Automatically selects the appropriate shadow method:
 * - Heroes & Buildings → CSM (high quality)
 * - Regular Units → Blob shadows (performance)
 * - Doodads → No shadows (maximum performance)
 *
 * @example
 * ```typescript
 * const manager = new ShadowCasterManager(scene, 50);
 *
 * manager.registerObject('hero1', heroMesh, 'hero');
 * manager.registerObject('building1', buildingMesh, 'building');
 * manager.registerObject('warrior1', warriorMesh, 'unit');
 *
 * // Update unit position (blob shadow follows)
 * manager.updateObject('warrior1', newPosition);
 * ```
 */
export class ShadowCasterManager {
  private csmSystem: CascadedShadowSystem;
  private blobSystem: BlobShadowSystem;
  private config: Map<string, ShadowCasterConfig> = new Map();
  private maxCSMCasters: number;

  constructor(scene: BABYLON.Scene, maxCSMCasters: number = 50) {
    this.maxCSMCasters = maxCSMCasters;

    // Initialize CSM system with default settings
    this.csmSystem = new CascadedShadowSystem(scene, {
      numCascades: 3,
      shadowMapSize: 2048,
      enablePCF: true,
    });

    // Initialize blob shadow system
    this.blobSystem = new BlobShadowSystem(scene);
  }

  /**
   * Register an object for shadow casting
   *
   * Automatically selects the appropriate shadow method based on object type
   * and current system load.
   *
   * Shadow method selection:
   * - Heroes: CSM (if under limit), otherwise blob
   * - Buildings: CSM (if under limit), otherwise blob
   * - Units: Always blob shadows
   * - Doodads: No shadows
   *
   * @param id - Unique identifier for the object
   * @param mesh - The Babylon.js mesh
   * @param type - Object type determining shadow priority
   *
   * @example
   * ```typescript
   * manager.registerObject('hero1', heroMesh, 'hero');
   * manager.registerObject('barracks1', barracks, 'building');
   * manager.registerObject('footman1', footman, 'unit');
   * ```
   */
  public registerObject(
    id: string,
    mesh: BABYLON.AbstractMesh,
    type: ShadowCasterConfig['type']
  ): void {
    // Check current CSM load
    const csmCount = this.csmSystem.getShadowCasterCount();

    // Decide shadow method based on type and current CSM load
    let castMethod: ShadowCasterConfig['castMethod'];

    if (type === 'hero' || type === 'building') {
      // High priority - use CSM if under limit, otherwise blob
      castMethod = csmCount < this.maxCSMCasters ? 'csm' : 'blob';
    } else if (type === 'unit') {
      // Regular units always use blob shadows for performance
      castMethod = 'blob';
    } else {
      // Doodads - no shadows (decorative objects don't need shadows)
      castMethod = 'none';
    }

    // Store configuration
    this.config.set(id, { type, castMethod });

    // Apply shadow method
    if (castMethod === 'csm') {
      this.csmSystem.addShadowCaster(mesh, ShadowPriority.HIGH);
    } else if (castMethod === 'blob') {
      this.blobSystem.createBlobShadow(id, mesh.position);
    }
    // 'none' - do nothing
  }

  /**
   * Update an object's position
   *
   * For blob shadows, updates the shadow position to follow the object.
   * CSM shadows automatically follow their meshes.
   *
   * @param id - Unique identifier for the object
   * @param position - New world position
   *
   * @example
   * ```typescript
   * manager.updateObject('warrior1', unit.getPosition());
   * ```
   */
  public updateObject(id: string, position: BABYLON.Vector3): void {
    const config = this.config.get(id);

    if (config?.castMethod === 'blob') {
      this.blobSystem.updateBlobShadow(id, position);
    }
    // CSM shadows automatically follow their meshes, no update needed
  }

  /**
   * Remove an object from shadow management
   *
   * @param id - Unique identifier for the object
   * @param mesh - The mesh (required for CSM removal)
   *
   * @example
   * ```typescript
   * manager.removeObject('warrior1', warriorMesh);
   * ```
   */
  public removeObject(id: string, mesh?: BABYLON.AbstractMesh): void {
    const config = this.config.get(id);

    if (config?.castMethod === 'csm' && mesh) {
      this.csmSystem.removeShadowCaster(mesh);
    } else if (config?.castMethod === 'blob') {
      this.blobSystem.removeBlobShadow(id);
    }

    this.config.delete(id);
  }

  /**
   * Enable shadows for a mesh (make it receive shadows)
   *
   * @param mesh - The mesh to receive shadows (e.g., terrain)
   *
   * @example
   * ```typescript
   * manager.enableShadowsForMesh(terrainMesh);
   * ```
   */
  public enableShadowsForMesh(mesh: BABYLON.AbstractMesh): void {
    this.csmSystem.enableShadowsForMesh(mesh);
  }

  /**
   * Get shadow system statistics
   *
   * @returns Statistics about CSM casters, blob shadows, and total objects
   *
   * @example
   * ```typescript
   * const stats = manager.getStats();
   * console.log(`CSM: ${stats.csmCasters}, Blob: ${stats.blobShadows}`);
   * ```
   */
  public getStats(): ShadowCasterStats {
    return {
      csmCasters: this.csmSystem.getShadowCasterCount(),
      blobShadows: this.blobSystem.getBlobCount(),
      totalObjects: this.config.size,
    };
  }

  /**
   * Get the CSM system instance
   *
   * @returns The cascaded shadow system
   */
  public getCSMSystem(): CascadedShadowSystem {
    return this.csmSystem;
  }

  /**
   * Get the blob shadow system instance
   *
   * @returns The blob shadow system
   */
  public getBlobSystem(): BlobShadowSystem {
    return this.blobSystem;
  }

  /**
   * Dispose of all shadow systems and resources
   */
  public dispose(): void {
    this.csmSystem.dispose();
    this.blobSystem.dispose();
    this.config.clear();
  }
}
