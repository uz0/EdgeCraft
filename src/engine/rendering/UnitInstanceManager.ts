/**
 * UnitInstanceManager - Manages thin instances for a single unit type
 *
 * Provides high-performance unit rendering using GPU instancing:
 * - 1 draw call per unit type (not per unit)
 * - Dynamic instance buffers for transforms, colors, and animation data
 * - Automatic buffer growth as units are added
 * - Batch updates for optimal performance
 */

import * as BABYLON from '@babylonjs/core';
import { UnitInstance } from './types';

/**
 * Manages instances of a single unit type using thin instances
 */
export class UnitInstanceManager {
  private mesh: BABYLON.Mesh;
  private instances: UnitInstance[] = [];
  private matrixBuffer!: Float32Array;
  private colorBuffer!: Float32Array;
  private animBuffer!: Float32Array;
  private bufferDirty: boolean = true;
  private capacity: number;
  private animationClips: Map<string, number> = new Map();

  /**
   * Creates a new instance manager for a unit type
   * @param _scene - Babylon.js scene (unused in current implementation but kept for API consistency)
   * @param mesh - Base mesh for this unit type
   * @param initialCapacity - Initial buffer capacity
   */
  constructor(_scene: BABYLON.Scene, mesh: BABYLON.Mesh, initialCapacity: number = 100) {
    this.mesh = mesh;
    this.capacity = initialCapacity;
    this.initializeMesh();
    this.allocateBuffers(initialCapacity);
  }

  /**
   * Initializes the mesh for thin instancing
   */
  private initializeMesh(): void {
    // Disable picking for performance (can be enabled if needed)
    this.mesh.thinInstanceEnablePicking = false;

    // Ensure the mesh is ready for instancing
    this.mesh.alwaysSelectAsActiveMesh = true;
  }

  /**
   * Allocates or reallocates instance buffers
   * @param capacity - Number of instances to support
   */
  private allocateBuffers(capacity: number): void {
    // Matrix buffer: 4x4 transform per instance = 16 floats
    this.matrixBuffer = new Float32Array(capacity * 16);

    // Color buffer: RGBA team color = 4 floats
    this.colorBuffer = new Float32Array(capacity * 4);

    // Animation buffer: [animIndex, animTime, blend, reserved] = 4 floats
    this.animBuffer = new Float32Array(capacity * 4);

    // Register buffers with the mesh
    this.mesh.thinInstanceSetBuffer('matrix', this.matrixBuffer, 16);
    this.mesh.thinInstanceSetBuffer('color', this.colorBuffer, 4);
    this.mesh.thinInstanceSetBuffer('animData', this.animBuffer, 4);

    this.capacity = capacity;
  }

  /**
   * Adds a new unit instance
   * @param instance - Unit instance data
   * @returns Index of the added instance
   */
  addInstance(instance: UnitInstance): number {
    const index = this.instances.length;

    // Grow buffers if needed
    if (index >= this.capacity) {
      this.growBuffers();
    }

    this.instances.push(instance);
    this.updateInstanceBuffer(index, instance);
    this.bufferDirty = true;

    return index;
  }

  /**
   * Updates an existing unit instance
   * @param index - Instance index
   * @param instance - Updated instance data
   */
  updateInstance(index: number, instance: Partial<UnitInstance>): void {
    if (index < 0 || index >= this.instances.length) {
      console.warn(`Invalid instance index: ${index}`);
      return;
    }

    const currentInstance = this.instances[index];
    if (!currentInstance) {
      console.warn(`Instance not found at index: ${index}`);
      return;
    }

    // Merge partial update with existing data
    this.instances[index] = {
      ...currentInstance,
      ...instance,
    };

    this.updateInstanceBuffer(index, this.instances[index]);
    this.bufferDirty = true;
  }

  /**
   * Removes a unit instance
   * @param index - Instance index to remove
   */
  removeInstance(index: number): void {
    if (index < 0 || index >= this.instances.length) {
      console.warn(`Invalid instance index: ${index}`);
      return;
    }

    // Remove from instances array
    this.instances.splice(index, 1);

    // Rebuild all buffers (indices have shifted)
    this.rebuildBuffers();
  }

  /**
   * Gets an instance by index
   * @param index - Instance index
   * @returns Unit instance data
   */
  getInstance(index: number): UnitInstance | undefined {
    return this.instances[index];
  }

  /**
   * Gets all instances
   * @returns Array of all unit instances
   */
  getAllInstances(): UnitInstance[] {
    return [...this.instances];
  }

  /**
   * Updates instance buffer data for a single instance
   * @param index - Instance index
   * @param instance - Instance data
   */
  private updateInstanceBuffer(index: number, instance: UnitInstance): void {
    // Build transform matrix
    const scale = typeof instance.scale === 'number' ? instance.scale : 1;
    const scaleVec = new BABYLON.Vector3(scale, scale, scale);
    const rotation = instance.rotation ?? 0;
    const position = instance.position ?? BABYLON.Vector3.Zero();
    const matrix = BABYLON.Matrix.Compose(
      scaleVec,
      BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), rotation),
      position
    );

    // Write matrix to buffer (16 floats)
    const matrixOffset = index * 16;
    matrix.copyToArray(this.matrixBuffer, matrixOffset);

    // Write team color to buffer (4 floats: RGBA)
    const colorOffset = index * 4;
    const teamColor = instance.teamColor ?? BABYLON.Color3.White();
    this.colorBuffer[colorOffset] = teamColor.r;
    this.colorBuffer[colorOffset + 1] = teamColor.g;
    this.colorBuffer[colorOffset + 2] = teamColor.b;
    this.colorBuffer[colorOffset + 3] = 1.0; // alpha

    // Write animation data
    const animOffset = index * 4;
    const animIndex = this.getAnimationIndex(instance.animationState ?? 'idle');
    this.animBuffer[animOffset] = animIndex;
    this.animBuffer[animOffset + 1] = instance.animationTime ?? 0;
    this.animBuffer[animOffset + 2] = 0.0; // blend weight (for future use)
    this.animBuffer[animOffset + 3] = 0.0; // reserved
  }

  /**
   * Flushes buffer updates to the GPU
   * Should be called once per frame after all updates
   */
  flushBuffers(): void {
    if (!this.bufferDirty) {
      return;
    }

    // Update instance count
    this.mesh.thinInstanceCount = this.instances.length;

    // Notify Babylon that buffers have changed
    this.mesh.thinInstanceBufferUpdated('matrix');
    this.mesh.thinInstanceBufferUpdated('color');
    this.mesh.thinInstanceBufferUpdated('animData');

    this.bufferDirty = false;
  }

  /**
   * Grows the instance buffers when capacity is exceeded
   */
  private growBuffers(): void {
    const newCapacity = Math.max(this.capacity * 2, 100);
    console.log(`Growing instance buffers: ${this.capacity} -> ${newCapacity} units`);

    const oldMatrixBuffer = this.matrixBuffer;
    const oldColorBuffer = this.colorBuffer;
    const oldAnimBuffer = this.animBuffer;

    this.allocateBuffers(newCapacity);

    // Copy old data to new buffers
    this.matrixBuffer.set(oldMatrixBuffer);
    this.colorBuffer.set(oldColorBuffer);
    this.animBuffer.set(oldAnimBuffer);

    this.bufferDirty = true;
  }

  /**
   * Rebuilds all buffers from scratch (used after removal)
   */
  private rebuildBuffers(): void {
    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];
      if (instance) {
        this.updateInstanceBuffer(i, instance);
      }
    }
    this.bufferDirty = true;
  }

  /**
   * Registers animation clips with their indices
   * @param animations - Map of animation name to index
   */
  registerAnimations(animations: Map<string, number>): void {
    this.animationClips = animations;
  }

  /**
   * Gets the index of an animation by name
   * @param animationName - Animation name
   * @returns Animation index (0 if not found)
   */
  private getAnimationIndex(animationName: string): number {
    return this.animationClips.get(animationName) ?? 0;
  }

  /**
   * Gets the number of instances
   * @returns Instance count
   */
  getInstanceCount(): number {
    return this.instances.length;
  }

  /**
   * Gets the current buffer capacity
   * @returns Buffer capacity
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Gets the base mesh
   * @returns Babylon.js mesh
   */
  getMesh(): BABYLON.Mesh {
    return this.mesh;
  }

  /**
   * Clears all instances
   */
  clear(): void {
    this.instances = [];
    this.mesh.thinInstanceCount = 0;
    this.bufferDirty = true;
  }

  /**
   * Disposes of the instance manager and its resources
   */
  dispose(): void {
    this.clear();
    this.mesh.dispose();
    this.animationClips.clear();
  }

  /**
   * Gets memory usage estimate in bytes
   * @returns Memory usage
   */
  getMemoryUsage(): number {
    const matrixBytes = this.matrixBuffer.byteLength;
    const colorBytes = this.colorBuffer.byteLength;
    const animBytes = this.animBuffer.byteLength;
    return matrixBytes + colorBytes + animBytes;
  }

  /**
   * Updates multiple instances efficiently
   * @param updates - Array of [index, instance] pairs to update
   */
  batchUpdate(updates: Array<[number, Partial<UnitInstance>]>): void {
    for (const [index, instance] of updates) {
      if (index >= 0 && index < this.instances.length) {
        const currentInstance = this.instances[index];
        if (currentInstance) {
          this.instances[index] = {
            ...currentInstance,
            ...instance,
          };
          this.updateInstanceBuffer(index, this.instances[index]);
        }
      }
    }
    this.bufferDirty = true;
  }

  /**
   * Finds instances within a radius
   * @param center - Center position
   * @param radius - Search radius
   * @returns Array of [index, instance] pairs
   */
  findInstancesInRadius(center: BABYLON.Vector3, radius: number): Array<[number, UnitInstance]> {
    const results: Array<[number, UnitInstance]> = [];
    const radiusSquared = radius * radius;

    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];
      if (!instance || !instance.position) {
        continue;
      }

      const distSquared = BABYLON.Vector3.DistanceSquared(instance.position, center);

      if (distSquared <= radiusSquared) {
        results.push([i, instance]);
      }
    }

    return results;
  }
}
