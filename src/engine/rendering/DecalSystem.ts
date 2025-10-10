/**
 * Decal System - Texture Decals Only
 *
 * Provides:
 * - 50 Decals Max @ MEDIUM
 * - Decal Types: scorch marks, blood, footprints, markers
 * - Auto-fade oldest when limit reached
 * - Uses projected textures (not mesh decals)
 *
 * Target: <2ms for 50 decals
 */

import * as BABYLON from '@babylonjs/core';
import { QualityPreset } from './types';

/**
 * Decal type
 */
export type DecalType = 'scorch' | 'blood' | 'footprint' | 'marker' | 'arrow' | 'custom';

/**
 * Decal configuration
 */
export interface DecalConfig {
  /** Decal type */
  type: DecalType;

  /** Position */
  position: BABYLON.Vector3;

  /** Normal direction */
  normal?: BABYLON.Vector3;

  /** Size */
  size?: BABYLON.Vector2;

  /** Rotation (radians) */
  rotation?: number;

  /** Texture URL (for custom type) */
  textureUrl?: string;

  /** Lifetime (0 = permanent) */
  lifetime?: number;

  /** Fade duration (ms) */
  fadeDuration?: number;
}

/**
 * Active decal instance
 */
interface DecalInstance {
  /** Decal ID */
  id: string;

  /** Decal mesh */
  mesh: BABYLON.Mesh;

  /** Decal type */
  type: DecalType;

  /** Creation time */
  createdAt: number;

  /** Lifetime (0 = permanent) */
  lifetime: number;

  /** Is fading */
  isFading: boolean;
}

/**
 * Decal statistics
 */
export interface DecalStats {
  /** Total decals */
  totalDecals: number;

  /** Active decals */
  activeDecals: number;

  /** Fading decals */
  fadingDecals: number;

  /** Estimated frame time (ms) */
  estimatedFrameTimeMs: number;
}

/**
 * Decal system using projected textures
 *
 * @example
 * ```typescript
 * const decals = new DecalSystem(scene, {
 *   quality: QualityPreset.MEDIUM,
 * });
 *
 * const decalId = await decals.createDecal({
 *   type: 'scorch',
 *   position: new BABYLON.Vector3(0, 0, 0),
 *   normal: new BABYLON.Vector3(0, 1, 0),
 *   size: new BABYLON.Vector2(2, 2),
 * });
 * ```
 */
export class DecalSystem {
  private scene: BABYLON.Scene;
  private quality: QualityPreset;
  private decals: Map<string, DecalInstance> = new Map();
  private maxDecals: number;
  private nextDecalId: number = 0;
  private _targetMeshes: BABYLON.AbstractMesh[] = [];

  constructor(scene: BABYLON.Scene, config: { quality: QualityPreset }) {
    this.scene = scene;
    this.quality = config.quality;

    // Set limits based on quality
    this.maxDecals = this.getMaxDecals(config.quality);

    console.log(`Decal system initialized (max ${this.maxDecals} decals)`);
  }

  /**
   * Get max decals for quality
   */
  private getMaxDecals(quality: QualityPreset): number {
    switch (quality) {
      case QualityPreset.LOW:
        return 25;
      case QualityPreset.MEDIUM:
        return 50;
      case QualityPreset.HIGH:
        return 75;
      case QualityPreset.ULTRA:
        return 100;
      default:
        return 50;
    }
  }

  /**
   * Set target meshes for decal projection
   */
  public setTargetMeshes(meshes: BABYLON.AbstractMesh[]): void {
    this._targetMeshes = meshes;
    console.log(`Decal target meshes set: ${meshes.length} meshes`);
  }

  /**
   * Create a new decal
   */
  public createDecal(config: DecalConfig): string {
    // Check limit
    if (this.decals.size >= this.maxDecals) {
      // Remove oldest decal
      this.removeOldestDecal();
    }

    const decalId = `decal_${this.nextDecalId++}`;

    // Get decal texture
    const textureUrl = config.textureUrl ?? this.getDecalTexture(config.type);

    // Create decal mesh
    const size = config.size ?? new BABYLON.Vector2(1, 1);
    const normal = config.normal ?? new BABYLON.Vector3(0, 1, 0);

    // Create decal using MeshBuilder
    // Note: In production, we'd use DecalMapConfiguration for better performance
    // For now, we use simple projected quads
    const decalMesh = BABYLON.MeshBuilder.CreatePlane(
      decalId,
      { size: size.x, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      this.scene
    );

    // Position and orient
    decalMesh.position = config.position.clone();

    // Orient to normal
    const up = normal.clone();
    const right = BABYLON.Vector3.Cross(up, BABYLON.Vector3.Forward()).normalize();
    const forward = BABYLON.Vector3.Cross(right, up).normalize();

    decalMesh.rotation = BABYLON.Vector3.Zero();
    decalMesh.lookAt(config.position.add(forward));
    decalMesh.rotate(BABYLON.Axis.Z, config.rotation ?? 0);

    // Create material
    const material = new BABYLON.StandardMaterial(`${decalId}_mat`, this.scene);
    material.diffuseTexture = new BABYLON.Texture(textureUrl, this.scene);
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

    // Offset slightly to avoid z-fighting
    decalMesh.position.y += 0.01;

    decalMesh.material = material;

    // Store decal
    this.decals.set(decalId, {
      id: decalId,
      mesh: decalMesh,
      type: config.type,
      createdAt: Date.now(),
      lifetime: config.lifetime ?? 0,
      isFading: false,
    });

    console.log(`Created ${config.type} decal: ${decalId}`);
    return decalId;
  }

  /**
   * Get decal texture URL based on type
   */
  private getDecalTexture(type: DecalType): string {
    // In production, these would be real texture URLs
    // For now, return placeholder URLs
    switch (type) {
      case 'scorch':
        return 'https://assets.babylonjs.com/textures/rock.png'; // Placeholder
      case 'blood':
        return 'https://assets.babylonjs.com/textures/rock.png'; // Placeholder
      case 'footprint':
        return 'https://assets.babylonjs.com/textures/rock.png'; // Placeholder
      case 'marker':
        return 'https://assets.babylonjs.com/textures/flare.png'; // Placeholder
      case 'arrow':
        return 'https://assets.babylonjs.com/textures/flare.png'; // Placeholder
      default:
        return 'https://assets.babylonjs.com/textures/flare.png'; // Placeholder
    }
  }

  /**
   * Remove oldest decal
   */
  private removeOldestDecal(): void {
    let oldestDecal: DecalInstance | null = null;
    let oldestTime = Infinity;

    for (const decal of this.decals.values()) {
      if (decal.createdAt < oldestTime) {
        oldestTime = decal.createdAt;
        oldestDecal = decal;
      }
    }

    if (oldestDecal != null) {
      this.removeDecal(oldestDecal.id);
    }
  }

  /**
   * Remove decal
   */
  public removeDecal(decalId: string): void {
    const decal = this.decals.get(decalId);
    if (decal == null) {
      return;
    }

    decal.mesh.dispose();
    this.decals.delete(decalId);

    console.log(`Decal removed: ${decalId}`);
  }

  /**
   * Update decals (check for expired)
   */
  public update(): void {
    const now = Date.now();

    for (const [_decalId, decal] of this.decals.entries()) {
      // Check if decal has expired
      if (decal.lifetime > 0 && now - decal.createdAt > decal.lifetime) {
        if (!decal.isFading) {
          // Start fading
          this.startFading(decal);
        }
      }
    }
  }

  /**
   * Start fading decal
   */
  private startFading(decal: DecalInstance): void {
    decal.isFading = true;

    const material = decal.mesh.material as BABYLON.StandardMaterial;
    if (material != null) {
      // Fade out over 1 second
      const fadeStart = Date.now();
      const fadeDuration = 1000;

      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - fadeStart;
        const progress = Math.min(elapsed / fadeDuration, 1.0);

        material.alpha = 1.0 - progress;

        if (progress >= 1.0) {
          clearInterval(fadeInterval);
          this.removeDecal(decal.id);
        }
      }, 16); // ~60fps
    }
  }

  /**
   * Update quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.quality) {
      return;
    }

    console.log(`Updating decal quality: ${this.quality} → ${quality}`);

    const newMaxDecals = this.getMaxDecals(quality);
    this.quality = quality;
    this.maxDecals = newMaxDecals;

    // Remove excess decals if downgrading
    while (this.decals.size > newMaxDecals) {
      this.removeOldestDecal();
    }
  }

  /**
   * Get decal statistics
   */
  public getStats(): DecalStats {
    let fadingDecals = 0;

    for (const decal of this.decals.values()) {
      if (decal.isFading) {
        fadingDecals++;
      }
    }

    // Estimate frame time (~0.04ms per decal)
    const estimatedFrameTimeMs = this.decals.size * 0.04;

    return {
      totalDecals: this.decals.size,
      activeDecals: this.decals.size - fadingDecals,
      fadingDecals,
      estimatedFrameTimeMs,
    };
  }

  /**
   * Clear all decals
   */
  public clearAll(): void {
    for (const decal of this.decals.values()) {
      decal.mesh.dispose();
    }
    this.decals.clear();
    console.log('All decals cleared');
  }

  /**
   * Dispose of decal system
   */
  public dispose(): void {
    this.clearAll();
    console.log('Decal system disposed');
  }
}
