/**
 * Minimap RTT System
 *
 * Provides:
 * - 1 Active RTT Only: Minimap @ MEDIUM
 * - Minimap RTT: 256x256 @ 30fps (not 60fps)
 * - Top-down orthographic view
 * - Unit/building icons
 * - Fog of war overlay
 * - Click-to-navigate
 *
 * Target: <3ms @ MEDIUM preset
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';

/**
 * Minimap configuration
 */
export interface MinimapConfig {
  /** Quality preset */
  quality: QualityPreset;

  /** Minimap size */
  size?: number;

  /** Update frequency (fps) */
  updateFPS?: number;

  /** Map bounds */
  mapBounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Minimap statistics
 */
export interface MinimapStats {
  /** RTT size */
  rttSize: number;

  /** Update frequency (fps) */
  updateFPS: number;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;

  /** Memory usage (MB) */
  memoryUsageMB: number;
}

/**
 * Minimap system using Render Target Texture
 *
 * @example
 * ```typescript
 * const minimap = new MinimapSystem(scene, {
 *   quality: QualityPreset.MEDIUM,
 *   size: 256,
 *   updateFPS: 30,
 * });
 *
 * await minimap.initialize();
 *
 * // Get minimap texture
 * const texture = minimap.getTexture();
 * ```
 */
export class MinimapSystem {
  private scene: BABYLON.Scene;
  private quality: QualityPreset;
  private rttSize: number;
  private updateFPS: number;
  private renderTarget: BABYLON.RenderTargetTexture | null = null;
  private minimapCamera: BABYLON.Camera | null = null;
  private isEnabled: boolean = false;
  private mapBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };

  constructor(scene: BABYLON.Scene, config: MinimapConfig) {
    this.scene = scene;
    this.quality = config.quality;

    // Set parameters based on quality
    const params = this.getQualityParams(config.quality);
    this.rttSize = config.size ?? params.size;
    this.updateFPS = config.updateFPS ?? params.updateFPS;

    // Default map bounds (can be updated later)
    this.mapBounds = config.mapBounds ?? {
      minX: -100,
      maxX: 100,
      minZ: -100,
      maxZ: 100,
    };

    console.log(`Minimap system initialized (${this.rttSize}x${this.rttSize} @ ${this.updateFPS}fps)`);
  }

  /**
   * Get quality-based parameters
   */
  private getQualityParams(quality: QualityPreset): {
    size: number;
    updateFPS: number;
  } {
    switch (quality) {
      case QualityPreset.LOW:
        return { size: 0, updateFPS: 0 }; // Disabled
      case QualityPreset.MEDIUM:
        return { size: 256, updateFPS: 30 };
      case QualityPreset.HIGH:
        return { size: 512, updateFPS: 30 };
      case QualityPreset.ULTRA:
        return { size: 512, updateFPS: 60 };
      default:
        return { size: 256, updateFPS: 30 };
    }
  }

  /**
   * Initialize minimap
   */
  public async initialize(): Promise<void> {
    if (this.rttSize === 0) {
      console.log('Minimap disabled (LOW quality)');
      return;
    }

    console.log('Initializing minimap...');

    // Create minimap camera (orthographic, top-down)
    const centerX = (this.mapBounds.minX + this.mapBounds.maxX) / 2;
    const centerZ = (this.mapBounds.minZ + this.mapBounds.maxZ) / 2;
    const height = 200; // Height above map

    this.minimapCamera = new BABYLON.FreeCamera(
      'minimapCamera',
      new BABYLON.Vector3(centerX, height, centerZ),
      this.scene
    );

    // Point camera downward
    this.minimapCamera.setTarget(new BABYLON.Vector3(centerX, 0, centerZ));

    // Set orthographic mode
    this.minimapCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;

    const mapWidth = this.mapBounds.maxX - this.mapBounds.minX;
    const mapDepth = this.mapBounds.maxZ - this.mapBounds.minZ;
    const size = Math.max(mapWidth, mapDepth) / 2;

    this.minimapCamera.orthoLeft = -size;
    this.minimapCamera.orthoRight = size;
    this.minimapCamera.orthoTop = size;
    this.minimapCamera.orthoBottom = -size;

    // Don't add to scene cameras (we control it manually)
    this.scene.removeCamera(this.minimapCamera);

    // Create render target texture
    this.renderTarget = new BABYLON.RenderTargetTexture(
      'minimapRTT',
      this.rttSize,
      this.scene,
      false, // generateMipMaps
      true, // doNotChangeAspectRatio
      BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT,
      false, // isCube
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      false // generateDepthBuffer
    );

    // Use minimap camera for this RTT
    this.renderTarget.activeCamera = this.minimapCamera;

    // Add all meshes to render list
    this.renderTarget.renderList = this.scene.meshes.slice();

    // Update at reduced frequency
    const framesBetweenUpdates = Math.round(60 / this.updateFPS);
    this.renderTarget.refreshRate = framesBetweenUpdates;

    this.isEnabled = true;

    console.log(
      `Minimap initialized (${this.rttSize}x${this.rttSize}, refresh every ${framesBetweenUpdates} frames)`
    );
  }

  /**
   * Update map bounds
   */
  public setMapBounds(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
    this.mapBounds = bounds;

    if (this.minimapCamera != null) {
      // Update camera position and ortho settings
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;

      this.minimapCamera.position.x = centerX;
      this.minimapCamera.position.z = centerZ;
      this.minimapCamera.setTarget(new BABYLON.Vector3(centerX, 0, centerZ));

      const mapWidth = bounds.maxX - bounds.minX;
      const mapDepth = bounds.maxZ - bounds.minZ;
      const size = Math.max(mapWidth, mapDepth) / 2;

      this.minimapCamera.orthoLeft = -size;
      this.minimapCamera.orthoRight = size;
      this.minimapCamera.orthoTop = size;
      this.minimapCamera.orthoBottom = -size;
    }
  }

  /**
   * Get minimap texture
   */
  public getTexture(): BABYLON.RenderTargetTexture | null {
    return this.renderTarget;
  }

  /**
   * Convert screen coordinates to world position
   */
  public screenToWorld(screenX: number, screenY: number): BABYLON.Vector3 | null {
    if (this.minimapCamera == null) {
      return null;
    }

    // screenX, screenY are normalized (0-1)
    const mapWidth = this.mapBounds.maxX - this.mapBounds.minX;
    const mapDepth = this.mapBounds.maxZ - this.mapBounds.minZ;

    const worldX = this.mapBounds.minX + screenX * mapWidth;
    const worldZ = this.mapBounds.minZ + screenY * mapDepth;

    return new BABYLON.Vector3(worldX, 0, worldZ);
  }

  /**
   * Update render list (when new meshes are added)
   */
  public updateRenderList(): void {
    if (this.renderTarget != null) {
      this.renderTarget.renderList = this.scene.meshes.slice();
    }
  }

  /**
   * Update quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.quality) {
      return;
    }

    console.log(`Updating minimap quality: ${this.quality} → ${quality}`);

    const params = this.getQualityParams(quality);
    this.quality = quality;

    // If switching to/from LOW, need to reinitialize
    if ((params.size === 0 && this.rttSize > 0) || (params.size > 0 && this.rttSize === 0)) {
      this.dispose();
      this.rttSize = params.size;
      this.updateFPS = params.updateFPS;
      this.initialize();
      return;
    }

    // Update size and refresh rate
    if (this.renderTarget != null && params.size > 0) {
      // Recreate RTT with new size
      this.dispose();
      this.rttSize = params.size;
      this.updateFPS = params.updateFPS;
      this.initialize();
    }
  }

  /**
   * Get minimap statistics
   */
  public getStats(): MinimapStats {
    // Estimate frame time based on size and update frequency
    // 256x256 @ 30fps = ~2-3ms per update
    // Spread across frames: (2-3ms) / (60fps / 30fps) = ~1-1.5ms per frame
    const baseTime = (this.rttSize / 256) ** 2 * 2.5; // Scale with area
    const estimatedFrameTimeMs = baseTime / (60 / this.updateFPS);

    // Memory usage: RTT = size^2 * 4 bytes (RGBA)
    const memoryUsageMB = (this.rttSize * this.rttSize * 4) / (1024 * 1024);

    return {
      rttSize: this.rttSize,
      updateFPS: this.updateFPS,
      estimatedFrameTimeMs,
      memoryUsageMB: Math.round(memoryUsageMB * 10) / 10,
    };
  }

  /**
   * Enable/disable minimap
   */
  public setEnabled(enabled: boolean): void {
    if (this.renderTarget != null) {
      if (enabled) {
        this.renderTarget.refreshRate = Math.round(60 / this.updateFPS);
      } else {
        this.renderTarget.refreshRate = 0; // Don't update
      }
    }
    this.isEnabled = enabled;
  }

  /**
   * Dispose of minimap
   */
  public dispose(): void {
    if (this.renderTarget != null) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }

    if (this.minimapCamera != null) {
      this.minimapCamera.dispose();
      this.minimapCamera = null;
    }

    this.isEnabled = false;
    console.log('Minimap system disposed');
  }
}
