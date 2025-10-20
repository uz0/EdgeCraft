/**
 * Cascaded Shadow Map System - Professional quality shadow rendering
 *
 * Implements Cascaded Shadow Maps (CSM) to provide high-quality shadows
 * across large RTS camera distances (100m to 1000m+).
 */

import * as BABYLON from '@babylonjs/core';
import { CSMConfiguration, ShadowStats, ShadowPriority } from './types';

/**
 * Cascaded shadow mapping system for professional shadow quality
 *
 * CSM divides the camera frustum into multiple cascades, each with its own
 * shadow map. Near cascades have higher detail, far cascades cover more area.
 * This provides excellent shadow quality at all distances.
 *
 * @example
 * ```typescript
 * const csm = new CascadedShadowSystem(scene, {
 *   numCascades: 3,
 *   shadowMapSize: 2048,
 *   enablePCF: true
 * });
 *
 * csm.addShadowCaster(heroMesh, 'high');
 * csm.enableShadowsForMesh(terrainMesh);
 * ```
 */
export class CascadedShadowSystem {
  private shadowGenerator!: BABYLON.CascadedShadowGenerator;
  private directionalLight!: BABYLON.DirectionalLight;
  private shadowCasters: Set<BABYLON.AbstractMesh> = new Set();
  private config: CSMConfiguration;
  private scene: BABYLON.Scene;

  constructor(scene: BABYLON.Scene, config?: Partial<CSMConfiguration>) {
    this.scene = scene;
    this.config = {
      numCascades: 3,
      shadowMapSize: 2048,
      cascadeBlendPercentage: 0.1,
      enablePCF: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize the cascaded shadow system
   *
   * Creates directional light (sun) and configures the shadow generator
   * with optimal settings for RTS rendering.
   */
  private initialize(): void {
    // Create directional light (sun)
    // Direction: 45° angle from above, from top-right
    this.directionalLight = new BABYLON.DirectionalLight(
      'shadowLight',
      new BABYLON.Vector3(-1, -2, -1),
      this.scene
    );

    this.directionalLight.intensity = 1.0;

    // Create Cascaded Shadow Generator
    this.shadowGenerator = new BABYLON.CascadedShadowGenerator(
      this.config.shadowMapSize,
      this.directionalLight
    );

    // Configure number of cascades
    this.shadowGenerator.numCascades = this.config.numCascades;
    this.shadowGenerator.cascadeBlendPercentage = this.config.cascadeBlendPercentage ?? 0.1;

    if (this.config.splitDistances) {
      interface ShadowGeneratorWithSplits {
        splitFrustum?: boolean;
        setCascadeSplitDistances?: (distances: number[]) => void;
      }

      const generator = this.shadowGenerator as unknown as ShadowGeneratorWithSplits;
      generator.splitFrustum = false;

      if (generator.setCascadeSplitDistances) {
        generator.setCascadeSplitDistances(this.config.splitDistances);
      }
    } else {
      interface ShadowGeneratorWithSplits {
        splitFrustum?: boolean;
      }

      const generator = this.shadowGenerator as unknown as ShadowGeneratorWithSplits;
      generator.splitFrustum = true;
    }

    // Shadow quality settings
    if (this.config.enablePCF === true) {
      // Enable Percentage Closer Filtering for soft shadows
      this.shadowGenerator.usePercentageCloserFiltering = true;
      this.shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
    }

    // Shadow bias settings to prevent artifacts
    // - bias: Prevents shadow acne (dark spots on surfaces)
    // - normalBias: Uses surface normal for better accuracy
    this.shadowGenerator.bias = 0.00001;
    this.shadowGenerator.normalBias = 0.02;

    // Disable expensive features not needed for RTS
    this.shadowGenerator.useContactHardeningShadow = false;

    // Stabilization reduces flickering when camera or objects move
    this.shadowGenerator.stabilizeCascades = true;

    // Debug visualization (disable in production)
    this.shadowGenerator.debug = false;
  }

  /**
   * Add a mesh as a shadow caster
   *
   * Only high-priority objects should use CSM shadows.
   * Medium/low priority objects should use blob shadows instead.
   *
   * @param mesh - The mesh to cast shadows
   * @param priority - Shadow casting priority (only 'high' uses CSM)
   *
   * @example
   * ```typescript
   * csm.addShadowCaster(heroMesh, 'high');
   * csm.addShadowCaster(buildingMesh, 'high');
   * ```
   */
  public addShadowCaster(mesh: BABYLON.AbstractMesh, priority: ShadowPriority): void {
    // Only add high priority objects to CSM
    // Medium/low priority should use blob shadows (see BlobShadowSystem)
    if (priority === ShadowPriority.HIGH) {
      this.shadowGenerator.addShadowCaster(mesh);
      this.shadowCasters.add(mesh);
    }
  }

  /**
   * Remove a mesh from shadow casting
   *
   * @param mesh - The mesh to stop casting shadows
   *
   * @example
   * ```typescript
   * csm.removeShadowCaster(heroMesh);
   * ```
   */
  public removeShadowCaster(mesh: BABYLON.AbstractMesh): void {
    this.shadowGenerator.removeShadowCaster(mesh);
    this.shadowCasters.delete(mesh);
  }

  /**
   * Enable a mesh to receive shadows
   *
   * Typically used for terrain, ground planes, and buildings.
   *
   * @param mesh - The mesh to receive shadows
   *
   * @example
   * ```typescript
   * csm.enableShadowsForMesh(terrainMesh);
   * ```
   */
  public enableShadowsForMesh(mesh: BABYLON.AbstractMesh): void {
    mesh.receiveShadows = true;
  }

  /**
   * Update the light direction (sun angle)
   *
   * @param direction - New light direction vector
   *
   * @example
   * ```typescript
   * csm.updateLightDirection(new Vector3(-1, -2, -1));
   * ```
   */
  public updateLightDirection(direction: BABYLON.Vector3): void {
    this.directionalLight.direction = direction.normalize();
  }

  /**
   * Set the time of day (updates sun angle)
   *
   * Automatically calculates sun position based on time of day.
   *
   * @param hour - Hour of day (0-24)
   *
   * @example
   * ```typescript
   * csm.setTimeOfDay(12); // Noon
   * csm.setTimeOfDay(6);  // Dawn
   * csm.setTimeOfDay(18); // Dusk
   * ```
   */
  public setTimeOfDay(hour: number): void {
    // Update sun angle based on time of day (0-24)
    // 0 = midnight, 6 = dawn, 12 = noon, 18 = dusk
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;

    const x = Math.sin(angle);
    const y = -Math.cos(angle);
    const z = -0.5;

    this.updateLightDirection(new BABYLON.Vector3(x, y, z));
  }

  /**
   * Get the number of shadow casters
   *
   * @returns Number of meshes casting CSM shadows
   */
  public getShadowCasterCount(): number {
    return this.shadowCasters.size;
  }

  /**
   * Get shadow system statistics
   *
   * @returns Statistics including cascade count, resolution, and memory usage
   *
   * @example
   * ```typescript
   * const stats = csm.getStats();
   * ```
   */
  public getStats(): ShadowStats {
    // Calculate memory usage
    // Each shadow map cascade uses: width × height × bytesPerPixel
    // Assuming RGBA32F format (4 bytes per pixel)
    const bytesPerPixel = 4;
    const memoryPerCascade = this.config.shadowMapSize * this.config.shadowMapSize * bytesPerPixel;
    const totalMemory = memoryPerCascade * this.config.numCascades;

    return {
      cascades: this.config.numCascades,
      shadowMapSize: this.config.shadowMapSize,
      shadowCasters: this.shadowCasters.size,
      memoryUsage: totalMemory,
      totalCasters: this.shadowCasters.size,
      activeCasters: this.shadowCasters.size,
      updatesPerFrame: 1,
    };
  }

  /**
   * Get the directional light instance
   *
   * @returns The directional light used for shadows
   */
  public getLight(): BABYLON.DirectionalLight {
    return this.directionalLight;
  }

  /**
   * Get the shadow generator instance
   *
   * @returns The Babylon.js cascaded shadow generator
   */
  public getShadowGenerator(): BABYLON.CascadedShadowGenerator {
    return this.shadowGenerator;
  }

  /**
   * Enable debug visualization of cascades
   *
   * Shows colored overlays indicating which cascade is being used.
   * Useful for debugging shadow quality issues.
   */
  public enableDebug(): void {
    this.shadowGenerator.debug = true;
  }

  /**
   * Disable debug visualization
   */
  public disableDebug(): void {
    this.shadowGenerator.debug = false;
  }

  /**
   * Dispose of all resources
   *
   * Cleans up shadow generator, light, and all internal state.
   */
  public dispose(): void {
    this.shadowGenerator.dispose();
    this.directionalLight.dispose();
    this.shadowCasters.clear();
  }
}
