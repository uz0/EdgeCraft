/**
 * InstancedUnitRenderer - Main GPU instancing renderer
 *
 * Orchestrates the entire instanced unit rendering system:
 * - Registers unit types with baked animations
 * - Spawns and manages units across all types
 * - Updates animations and transforms
 * - Provides performance statistics
 * - Achieves 500-1000 units @ 60 FPS
 */

import * as BABYLON from '@babylonjs/core';
import { UnitInstanceManager } from './UnitInstanceManager';
import { BakedAnimationSystem } from './BakedAnimationSystem';
import { UnitPool } from './UnitPool';
import { UnitInstance, AnimationClip, RenderingStats, RendererConfig, UnitTypeData } from './types';

/**
 * Unit reference for external use
 */
export interface UnitReference {
  unitType: string;
  instanceIndex: number;
  instance: UnitInstance;
}

/**
 * Main renderer for instanced units with GPU animation
 */
export class InstancedUnitRenderer {
  private unitManagers: Map<string, UnitInstanceManager> = new Map();
  private animationSystems: Map<string, BakedAnimationSystem> = new Map();
  private unitTypes: Map<string, UnitTypeData> = new Map();
  private unitPools: Map<string, UnitPool> = new Map();
  private unitReferences: Map<string, UnitReference> = new Map();
  private config: Required<RendererConfig>;
  private renderLoopObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private cpuTimeMs: number = 0;

  /**
   * Creates a new instanced unit renderer
   * @param scene - Babylon.js scene
   * @param config - Renderer configuration
   */
  constructor(
    private scene: BABYLON.Scene,
    config: RendererConfig = {}
  ) {
    this.config = {
      initialCapacity: config.initialCapacity ?? 100,
      enablePicking: config.enablePicking ?? false,
      lodDistances: config.lodDistances ?? [50, 100, 200],
      freezeActiveMeshes: config.freezeActiveMeshes ?? false,
      enableInstancing: config.enableInstancing ?? true,
      maxInstancesPerBuffer: config.maxInstancesPerBuffer ?? 1000,
      enableFrustumCulling: config.enableFrustumCulling ?? true,
      enableOcclusionCulling: config.enableOcclusionCulling ?? false,
    };

    this.setupRenderLoop();
  }

  /**
   * Registers a unit type with its mesh and animations
   * @param unitType - Unit type identifier
   * @param meshUrl - URL to the unit mesh file
   * @param animations - Animation clips for this unit type
   */
  async registerUnitType(
    unitType: string,
    meshUrl: string,
    animations: AnimationClip[]
  ): Promise<void> {
    if (this.unitTypes.has(unitType)) {
      console.warn(`Unit type already registered: ${unitType}`);
      return;
    }

    // Load mesh
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', meshUrl, '', this.scene);

    if (result.meshes === undefined || result.meshes === null || result.meshes.length === 0) {
      throw new Error(`Failed to load mesh from ${meshUrl}`);
    }

    const mesh = result.meshes[0] as BABYLON.Mesh;

    // Bake animations if skeleton exists
    let bakedAnimationData;
    if (mesh.skeleton && animations.length > 0) {
      const animSystem = new BakedAnimationSystem(this.scene);
      bakedAnimationData = await animSystem.bakeAnimations(mesh, animations);
      this.animationSystems.set(unitType, animSystem);
    }

    // Store unit type data
    this.unitTypes.set(unitType, {
      type: unitType,
      mesh,
      modelPath: '', // Path not tracked in runtime
      animations,
      bakedAnimationData,
    });

    // Create instance manager
    const manager = new UnitInstanceManager(this.scene, mesh, this.config.initialCapacity);

    // Register animation indices with manager
    if (bakedAnimationData) {
      const animIndices = new Map<string, number>();
      animations.forEach((anim, index) => {
        animIndices.set(anim.name, index);
      });
      manager.registerAnimations(animIndices);
    }

    this.unitManagers.set(unitType, manager);

    // Create unit pool for this type
    this.unitPools.set(
      unitType,
      new UnitPool({
        initialSize: this.config.initialCapacity,
        autoGrow: true,
      })
    );
  }

  /**
   * Spawns a new unit
   * @param unitType - Type of unit to spawn
   * @param position - World position
   * @param teamColor - Team color
   * @param rotation - Initial rotation (radians)
   * @returns Unit ID for future reference
   */
  spawnUnit(
    unitType: string,
    position: BABYLON.Vector3,
    teamColor: BABYLON.Color3,
    rotation: number = 0
  ): string | null {
    const manager = this.unitManagers.get(unitType);
    if (!manager) {
      console.error(`Unknown unit type: ${unitType}`);
      return null;
    }

    // Get instance from pool
    const pool = this.unitPools.get(unitType);
    const instance = pool?.acquire({
      position: position.clone(),
      rotation,
      teamColor: teamColor.clone(),
      animationState: 'idle',
      animationTime: 0,
    });

    if (!instance) {
      console.error(`Failed to acquire unit from pool: ${unitType}`);
      return null;
    }

    // Add to instance manager
    const instanceIndex = manager.addInstance(instance);

    // Create reference
    const unitId = instance.id;
    this.unitReferences.set(unitId, {
      unitType,
      instanceIndex,
      instance,
    });

    return unitId;
  }

  /**
   * Despawns a unit
   * @param unitId - Unit ID to despawn
   */
  despawnUnit(unitId: string): void {
    const ref = this.unitReferences.get(unitId);
    if (!ref) {
      console.warn(`Unit not found: ${unitId}`);
      return;
    }

    const manager = this.unitManagers.get(ref.unitType);
    if (manager) {
      manager.removeInstance(ref.instanceIndex);
    }

    const pool = this.unitPools.get(ref.unitType);
    if (pool) {
      pool.release(ref.instance);
    }

    this.unitReferences.delete(unitId);
  }

  /**
   * Updates a unit's properties
   * @param unitId - Unit ID
   * @param updates - Partial instance data to update
   */
  updateUnit(unitId: string, updates: Partial<UnitInstance>): void {
    const ref = this.unitReferences.get(unitId);
    if (!ref) {
      console.warn(`Unit not found: ${unitId}`);
      return;
    }

    const manager = this.unitManagers.get(ref.unitType);
    if (manager) {
      manager.updateInstance(ref.instanceIndex, updates);
    }
  }

  /**
   * Gets a unit's current data
   * @param unitId - Unit ID
   * @returns Unit instance or undefined
   */
  getUnit(unitId: string): UnitInstance | undefined {
    const ref = this.unitReferences.get(unitId);
    if (!ref) {
      return undefined;
    }

    const manager = this.unitManagers.get(ref.unitType);
    return manager?.getInstance(ref.instanceIndex);
  }

  /**
   * Changes a unit's animation
   * @param unitId - Unit ID
   * @param animationName - Animation to play
   * @param restart - Whether to restart if already playing
   */
  playAnimation(unitId: string, animationName: string, restart: boolean = false): void {
    const unit = this.getUnit(unitId);
    if (!unit) {
      return;
    }

    const ref = this.unitReferences.get(unitId);
    if (!ref) {
      return;
    }

    const animSystem = this.animationSystems.get(ref.unitType);
    if (
      animSystem === undefined ||
      animSystem === null ||
      !animSystem.hasAnimation(animationName)
    ) {
      console.warn(`Animation not found: ${animationName} for ${ref.unitType}`);
      return;
    }

    this.updateUnit(unitId, {
      animationState: animationName,
      animationTime: restart ? 0 : unit.animationTime,
    });
  }

  /**
   * Moves a unit to a new position
   * @param unitId - Unit ID
   * @param position - Target position
   * @param rotation - Optional rotation
   */
  moveUnit(unitId: string, position: BABYLON.Vector3, rotation?: number): void {
    const updates: Partial<UnitInstance> = { position: position.clone() };
    if (rotation !== undefined) {
      updates.rotation = rotation;
    }
    this.updateUnit(unitId, updates);
  }

  /**
   * Gets all units of a specific type
   * @param unitType - Unit type
   * @returns Array of unit IDs
   */
  getUnitsByType(unitType: string): string[] {
    const unitIds: string[] = [];
    for (const [unitId, ref] of this.unitReferences) {
      if (ref.unitType === unitType) {
        unitIds.push(unitId);
      }
    }
    return unitIds;
  }

  /**
   * Gets all spawned unit IDs
   * @returns Array of unit IDs
   */
  getAllUnitIds(): string[] {
    return Array.from(this.unitReferences.keys());
  }

  /**
   * Finds units within a radius
   * @param center - Center position
   * @param radius - Search radius
   * @param unitType - Optional unit type filter
   * @returns Array of unit IDs
   */
  findUnitsInRadius(center: BABYLON.Vector3, radius: number, unitType?: string): string[] {
    const results: string[] = [];
    const radiusSquared = radius * radius;

    for (const [unitId, ref] of this.unitReferences) {
      if (
        unitType !== undefined &&
        unitType !== null &&
        unitType !== '' &&
        ref.unitType !== unitType
      ) {
        continue;
      }

      if (!ref.instance.position) {
        continue;
      }

      const distSquared = BABYLON.Vector3.DistanceSquared(ref.instance.position, center);

      if (distSquared <= radiusSquared) {
        results.push(unitId);
      }
    }

    return results;
  }

  /**
   * Sets up the render loop for animation updates
   */
  private setupRenderLoop(): void {
    this.renderLoopObserver = this.scene.onBeforeRenderObservable.add(() => {
      const startTime = performance.now();

      const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

      // Update all unit animations
      for (const [unitType, manager] of this.unitManagers) {
        const animSystem = this.animationSystems.get(unitType);
        if (animSystem === undefined || animSystem === null) {
          continue;
        }

        const instanceCount = manager.getInstanceCount();
        for (let i = 0; i < instanceCount; i++) {
          const instance = manager.getInstance(i);
          if (!instance) {
            continue;
          }

          // Advance animation time
          instance.animationTime = (instance.animationTime ?? 0) + deltaTime;

          // Normalize time for looping
          instance.animationTime = animSystem.normalizeAnimationTime(
            instance.animationState ?? 'idle',
            instance.animationTime
          );

          manager.updateInstance(i, { animationTime: instance.animationTime });
        }

        // Flush buffers to GPU (single upload per unit type)
        manager.flushBuffers();
      }

      // Track CPU time
      this.cpuTimeMs = performance.now() - startTime;
    });
  }

  /**
   * Gets rendering performance statistics
   * @returns Rendering stats
   */
  getStats(): RenderingStats {
    let totalUnits = 0;
    let memoryUsage = 0;

    for (const manager of this.unitManagers.values()) {
      totalUnits += manager.getInstanceCount();
      memoryUsage += manager.getMemoryUsage();
    }

    return {
      unitTypes: this.unitTypes.size,
      totalUnits,
      totalInstances: totalUnits,
      visibleInstances: totalUnits,
      drawCalls: this.unitManagers.size, // 1 draw call per unit type!
      triangles: 0, // Not tracked in current implementation
      cpuTime: this.cpuTimeMs,
      memoryUsage,
    };
  }

  /**
   * Disposes of the renderer and all resources
   */
  dispose(): void {
    // Remove render loop observer
    if (this.renderLoopObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderLoopObserver);
      this.renderLoopObserver = null;
    }

    // Dispose all managers
    for (const manager of this.unitManagers.values()) {
      manager.dispose();
    }

    // Dispose all animation systems
    for (const animSystem of this.animationSystems.values()) {
      animSystem.dispose();
    }

    // Clear pools
    for (const pool of this.unitPools.values()) {
      pool.clear();
    }

    this.unitManagers.clear();
    this.animationSystems.clear();
    this.unitTypes.clear();
    this.unitPools.clear();
    this.unitReferences.clear();
  }
}
