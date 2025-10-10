/**
 * UnitPool - Object pooling for unit instances
 *
 * Implements object pooling to avoid frequent allocations:
 * - Reuses unit instance objects
 * - Reduces garbage collection pressure
 * - Improves performance for spawn/despawn operations
 */

import * as BABYLON from '@babylonjs/core';
import { UnitInstance, PoolConfig } from './types';

/**
 * Object pool for efficient unit instance management
 */
export class UnitPool {
  private available: UnitInstance[] = [];
  private inUse: Set<string> = new Set();
  private config: Required<PoolConfig>;
  private idCounter: number = 0;

  /**
   * Creates a new unit pool
   * @param config - Pool configuration
   */
  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      initialSize: config.initialSize ?? 100,
      maxSize: config.maxSize ?? 0, // 0 = unlimited
      autoGrow: config.autoGrow ?? true,
    };

    // Pre-allocate initial pool
    this.preallocate(this.config.initialSize);
  }

  /**
   * Pre-allocates unit instances
   * @param count - Number of instances to allocate
   */
  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.available.push(this.createInstance());
    }
  }

  /**
   * Creates a new unit instance with default values
   * @returns New unit instance
   */
  private createInstance(): UnitInstance {
    return {
      id: this.generateId(),
      position: BABYLON.Vector3.Zero(),
      rotation: 0,
      teamColor: BABYLON.Color3.White(),
      animationState: 'idle',
      animationTime: 0,
      scale: 1,
    };
  }

  /**
   * Generates a unique ID for a unit
   * @returns Unique ID string
   */
  private generateId(): string {
    return `unit_${this.idCounter++}_${Date.now()}`;
  }

  /**
   * Acquires a unit instance from the pool
   * @param initialData - Initial data to apply to the instance
   * @returns Unit instance
   */
  acquire(initialData?: Partial<UnitInstance>): UnitInstance | null {
    let instance: UnitInstance | undefined;

    // Try to get from available pool
    if (this.available.length > 0) {
      instance = this.available.pop();
    } else if (this.config.autoGrow) {
      // Check max size limit
      if (this.config.maxSize > 0 && this.inUse.size >= this.config.maxSize) {
        console.warn(`Unit pool at maximum capacity: ${this.config.maxSize}`);
        return null;
      }

      // Create new instance
      instance = this.createInstance();
    } else {
      console.warn('Unit pool exhausted and auto-grow is disabled');
      return null;
    }

    if (!instance) {
      return null;
    }

    // Reset to default values
    instance.id = this.generateId();
    instance.position = BABYLON.Vector3.Zero();
    instance.rotation = 0;
    instance.teamColor = BABYLON.Color3.White();
    instance.animationState = 'idle';
    instance.animationTime = 0;
    instance.scale = 1;

    // Apply initial data
    if (initialData) {
      Object.assign(instance, initialData);
    }

    // Mark as in use
    this.inUse.add(instance.id);

    return instance;
  }

  /**
   * Returns a unit instance to the pool
   * @param instance - Unit instance to release
   */
  release(instance: UnitInstance): void {
    if (!this.inUse.has(instance.id)) {
      console.warn(`Attempting to release unit not from this pool: ${instance.id}`);
      return;
    }

    // Remove from in-use set
    this.inUse.delete(instance.id);

    // Add back to available pool
    this.available.push(instance);
  }

  /**
   * Releases multiple instances at once
   * @param instances - Array of instances to release
   */
  releaseMultiple(instances: UnitInstance[]): void {
    for (const instance of instances) {
      this.release(instance);
    }
  }

  /**
   * Gets the number of available instances
   * @returns Available count
   */
  getAvailableCount(): number {
    return this.available.length;
  }

  /**
   * Gets the number of instances in use
   * @returns In-use count
   */
  getInUseCount(): number {
    return this.inUse.size;
  }

  /**
   * Gets the total pool size
   * @returns Total size
   */
  getTotalSize(): number {
    return this.available.length + this.inUse.size;
  }

  /**
   * Gets pool utilization as a percentage
   * @returns Utilization (0-100)
   */
  getUtilization(): number {
    const total = this.getTotalSize();
    if (total === 0) {
      return 0;
    }
    return (this.inUse.size / total) * 100;
  }

  /**
   * Gets pool statistics
   * @returns Pool stats
   */
  getStats(): {
    available: number;
    inUse: number;
    total: number;
    utilization: number;
    maxSize: number;
  } {
    return {
      available: this.getAvailableCount(),
      inUse: this.getInUseCount(),
      total: this.getTotalSize(),
      utilization: this.getUtilization(),
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Shrinks the pool by removing excess available instances
   * @param targetSize - Target available pool size
   */
  shrink(targetSize: number): void {
    const excess = this.available.length - targetSize;
    if (excess > 0) {
      this.available.splice(0, excess);
    }
  }

  /**
   * Grows the pool by adding more available instances
   * @param count - Number of instances to add
   */
  grow(count: number): void {
    // Check max size limit
    if (this.config.maxSize > 0) {
      const currentTotal = this.getTotalSize();
      const maxGrowth = this.config.maxSize - currentTotal;
      count = Math.min(count, maxGrowth);
    }

    this.preallocate(count);
  }

  /**
   * Clears the pool and releases all instances
   */
  clear(): void {
    this.available = [];
    this.inUse.clear();
    this.idCounter = 0;
  }

  /**
   * Checks if a unit ID is currently in use
   * @param unitId - Unit ID to check
   * @returns True if in use
   */
  isInUse(unitId: string): boolean {
    return this.inUse.has(unitId);
  }

  /**
   * Gets the pool configuration
   * @returns Pool config
   */
  getConfig(): Required<PoolConfig> {
    return { ...this.config };
  }

  /**
   * Updates pool configuration
   * @param config - New configuration
   */
  updateConfig(config: Partial<PoolConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
