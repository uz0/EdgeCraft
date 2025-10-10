/**
 * Asset Manager - Handles loading and caching of game assets
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Asset cache entry
 */
interface AssetCacheEntry<T> {
  asset: T;
  timestamp: number;
  refCount: number;
}

/**
 * Asset Manager for loading and caching game assets
 *
 * @example
 * ```typescript
 * const manager = new AssetManager(scene);
 * const texture = await manager.loadTexture('grass.png', '/assets/textures/grass.png');
 * ```
 */
export class AssetManager {
  private scene: BABYLON.Scene;
  private textureCache: Map<string, AssetCacheEntry<BABYLON.Texture>> = new Map();
  private meshCache: Map<string, AssetCacheEntry<BABYLON.AbstractMesh>> = new Map();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Load texture with caching
   */
  public async loadTexture(name: string, url: string): Promise<BABYLON.Texture> {
    // Check cache
    const cached = this.textureCache.get(name);
    if (cached) {
      cached.refCount++;
      return cached.asset;
    }

    // Load texture
    const texture = new BABYLON.Texture(url, this.scene);

    // Wait for texture to load
    await new Promise<void>((resolve) => {
      texture.onLoadObservable.addOnce(() => resolve());
    });

    // Cache texture
    this.textureCache.set(name, {
      asset: texture,
      timestamp: Date.now(),
      refCount: 1,
    });

    return texture;
  }

  /**
   * Load mesh from file
   */
  public async loadMesh(
    name: string,
    url: string,
    fileName: string
  ): Promise<BABYLON.AbstractMesh> {
    // Check cache
    const cached = this.meshCache.get(name);
    if (cached) {
      cached.refCount++;
      const clonedMesh = cached.asset.clone(name + '_clone', null);
      if (!clonedMesh) {
        throw new Error(`Failed to clone mesh: ${name}`);
      }
      return clonedMesh;
    }

    // Load mesh
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', url, fileName, this.scene);

    if (result.meshes.length === 0) {
      throw new Error(`No meshes found in file: ${fileName}`);
    }

    const mesh = result.meshes[0];
    if (!mesh) {
      throw new Error(`Failed to load mesh from file: ${fileName}`);
    }

    // Cache mesh
    this.meshCache.set(name, {
      asset: mesh,
      timestamp: Date.now(),
      refCount: 1,
    });

    return mesh;
  }

  /**
   * Get texture from cache
   */
  public getTexture(name: string): BABYLON.Texture | undefined {
    return this.textureCache.get(name)?.asset;
  }

  /**
   * Get mesh from cache
   */
  public getMesh(name: string): BABYLON.AbstractMesh | undefined {
    return this.meshCache.get(name)?.asset;
  }

  /**
   * Release texture reference
   */
  public releaseTexture(name: string): void {
    const cached = this.textureCache.get(name);
    if (!cached) return;

    cached.refCount--;
    if (cached.refCount <= 0) {
      cached.asset.dispose();
      this.textureCache.delete(name);
    }
  }

  /**
   * Release mesh reference
   */
  public releaseMesh(name: string): void {
    const cached = this.meshCache.get(name);
    if (!cached) return;

    cached.refCount--;
    if (cached.refCount <= 0) {
      cached.asset.dispose();
      this.meshCache.delete(name);
    }
  }

  /**
   * Clear all caches
   */
  public clearAll(): void {
    // Dispose all textures
    for (const entry of this.textureCache.values()) {
      entry.asset.dispose();
    }
    this.textureCache.clear();

    // Dispose all meshes
    for (const entry of this.meshCache.values()) {
      entry.asset.dispose();
    }
    this.meshCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    textureCount: number;
    meshCount: number;
    totalMemory: number;
  } {
    return {
      textureCount: this.textureCache.size,
      meshCount: this.meshCache.size,
      totalMemory: 0, // TODO: Calculate actual memory usage
    };
  }
}
