/**
 * Scene Manager - Handles scene lifecycle and configuration
 */

import * as BABYLON from '@babylonjs/core';
import type { SceneOptions, SceneCallbacks } from './types';

/**
 * Scene manager for handling scene lifecycle and configuration
 *
 * @example
 * ```typescript
 * const manager = new SceneManager(scene);
 * manager.configure({ autoClear: false });
 * manager.setCallbacks({
 * });
 * ```
 */
export class SceneManager {
  private scene: BABYLON.Scene;
  private callbacks: SceneCallbacks = {};

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Configure scene options
   */
  public configure(options: SceneOptions): void {
    if (options.autoClear !== undefined) {
      this.scene.autoClear = options.autoClear;
    }

    if (options.autoClearDepthAndStencil !== undefined) {
      this.scene.autoClearDepthAndStencil = options.autoClearDepthAndStencil;
    }
  }

  /**
   * Set scene lifecycle callbacks
   */
  public setCallbacks(callbacks: SceneCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };

    if (callbacks.onBeforeRender) {
      this.scene.onBeforeRenderObservable.add(callbacks.onBeforeRender);
    }

    if (callbacks.onAfterRender) {
      this.scene.onAfterRenderObservable.add(callbacks.onAfterRender);
    }

    if (callbacks.onReady) {
      this.scene.onReadyObservable.add(callbacks.onReady);
    }
  }

  /**
   * Clear all callbacks
   */
  public clearCallbacks(): void {
    this.scene.onBeforeRenderObservable.clear();
    this.scene.onAfterRenderObservable.clear();
    this.scene.onReadyObservable.clear();
    this.callbacks = {};
  }

  /**
   * Get scene statistics
   */
  public getStats(): {
    totalVertices: number;
    activeMeshes: number;
    totalMeshes: number;
    activeBones: number;
  } {
    return {
      totalVertices: this.scene.getTotalVertices(),
      activeMeshes: this.scene.getActiveMeshes().length,
      totalMeshes: this.scene.meshes.length,
      activeBones: this.scene.getActiveBones(),
    };
  }

  /**
   * Enable debug layer
   */
  public async enableDebug(): Promise<void> {
    await this.scene.debugLayer.show();
  }

  /**
   * Disable debug layer
   */
  public hideDebug(): void {
    this.scene.debugLayer.hide();
  }
}
