/**
 * PBR Material System
 *
 * Provides:
 * - glTF 2.0 Compatible: Full PBR workflow
 * - Material Sharing: 100+ materials via frozen instances
 * - Texture Support: Albedo, Normal, Metallic/Roughness, AO, Emissive
 * - material.freeze() after setup for performance
 * - Pre-load common materials on startup
 *
 * Target: <1ms overhead
 */

import * as BABYLON from '@babylonjs/core';

/**
 * PBR material configuration
 */
export interface PBRMaterialConfig {
  /** Material name */
  name: string;

  /** Albedo (base color) texture URL */
  albedoTextureUrl?: string;

  /** Albedo color (if no texture) */
  albedoColor?: BABYLON.Color3;

  /** Normal map URL */
  normalTextureUrl?: string;

  /** Metallic/Roughness texture URL (ORM format) */
  metallicRoughnessTextureUrl?: string;

  /** Metallic value (0-1) */
  metallic?: number;

  /** Roughness value (0-1) */
  roughness?: number;

  /** Ambient Occlusion texture URL */
  aoTextureUrl?: string;

  /** Emissive texture URL */
  emissiveTextureUrl?: string;

  /** Emissive color */
  emissiveColor?: BABYLON.Color3;

  /** Emissive intensity */
  emissiveIntensity?: number;

  /** Enable alpha mode */
  alphaMode?: 'opaque' | 'mask' | 'blend';

  /** Alpha cutoff (for mask mode) */
  alphaCutoff?: number;

  /** Double-sided */
  doubleSided?: boolean;

  /** Freeze material after creation (recommended) */
  freeze?: boolean;
}

/**
 * Material statistics
 */
export interface PBRMaterialStats {
  /** Total materials */
  totalMaterials: number;

  /** Frozen materials */
  frozenMaterials: number;

  /** Shared instances */
  sharedInstances: number;

  /** Memory usage (MB) */
  estimatedMemoryMB: number;
}

/**
 * PBR material system with caching and optimization
 *
 * @example
 * ```typescript
 * const pbrSystem = new PBRMaterialSystem(scene);
 *
 * const material = await pbrSystem.createMaterial({
 *   name: 'woodMaterial',
 *   albedoTextureUrl: '/textures/wood_albedo.png',
 *   normalTextureUrl: '/textures/wood_normal.png',
 *   roughness: 0.8,
 *   metallic: 0.0,
 *   freeze: true,
 * });
 *
 * mesh.material = material;
 * ```
 */
export class PBRMaterialSystem {
  private scene: BABYLON.Scene;
  private materialCache: Map<string, BABYLON.PBRMaterial> = new Map();
  private textureCache: Map<string, BABYLON.Texture> = new Map();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Create or get cached PBR material
   */
  public async createMaterial(config: PBRMaterialConfig): Promise<BABYLON.PBRMaterial> {
    // Check cache
    const cached = this.materialCache.get(config.name);
    if (cached != null) {
      return cached;
    }

    // Create new PBR material
    const material = new BABYLON.PBRMaterial(config.name, this.scene);

    // Configure albedo
    if (config.albedoTextureUrl != null) {
      material.albedoTexture = await this.loadTexture(config.albedoTextureUrl);
    } else if (config.albedoColor != null) {
      material.albedoColor = config.albedoColor;
    } else {
      material.albedoColor = new BABYLON.Color3(1, 1, 1); // White default
    }

    // Configure normal map
    if (config.normalTextureUrl != null) {
      material.bumpTexture = await this.loadTexture(config.normalTextureUrl);
    }

    // Configure metallic/roughness
    if (config.metallicRoughnessTextureUrl != null) {
      const ormTexture = await this.loadTexture(config.metallicRoughnessTextureUrl);
      material.metallicTexture = ormTexture;
      material.useRoughnessFromMetallicTextureAlpha = false;
      material.useRoughnessFromMetallicTextureGreen = true;
      material.useMetallnessFromMetallicTextureBlue = true;
    } else {
      material.metallic = config.metallic ?? 0.0;
      material.roughness = config.roughness ?? 1.0;
    }

    // Configure ambient occlusion
    if (config.aoTextureUrl != null) {
      material.ambientTexture = await this.loadTexture(config.aoTextureUrl);
      material.useAmbientOcclusionFromMetallicTextureRed = true;
    }

    // Configure emissive
    if (config.emissiveTextureUrl != null) {
      material.emissiveTexture = await this.loadTexture(config.emissiveTextureUrl);
    }
    if (config.emissiveColor != null) {
      material.emissiveColor = config.emissiveColor;
    }
    if (config.emissiveIntensity != null) {
      material.emissiveIntensity = config.emissiveIntensity;
    }

    // Configure alpha mode
    switch (config.alphaMode) {
      case 'opaque':
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
        break;
      case 'mask':
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
        material.alphaCutOff = config.alphaCutoff ?? 0.5;
        break;
      case 'blend':
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
        break;
      default:
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
    }

    // Double-sided
    if (config.doubleSided === true) {
      material.backFaceCulling = false;
      material.twoSidedLighting = true;
    }

    // Enable environment reflections
    material.environmentIntensity = 1.0;

    // Freeze material for performance
    if (config.freeze !== false) {
      // Default to freezing
      material.freeze();
    }

    // Cache material
    this.materialCache.set(config.name, material);

    return material;
  }

  /**
   * Load texture with caching
   */
  private async loadTexture(url: string): Promise<BABYLON.Texture> {
    // Check cache
    const cached = this.textureCache.get(url);
    if (cached != null) {
      return cached;
    }

    // Load texture
    return new Promise((resolve, reject) => {
      const texture = new BABYLON.Texture(
        url,
        this.scene,
        false, // noMipmap
        true, // invertY
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        () => {
          this.textureCache.set(url, texture);
          resolve(texture);
        },
        (_message) => {
          reject(new Error(`Failed to load texture: ${url}`));
        }
      );
    });
  }

  /**
   * Get cached material
   */
  public getMaterial(name: string): BABYLON.PBRMaterial | undefined {
    return this.materialCache.get(name);
  }

  /**
   * Create simple PBR material
   */
  public createSimpleMaterial(
    name: string,
    color: BABYLON.Color3,
    metallic: number = 0.0,
    roughness: number = 1.0
  ): BABYLON.PBRMaterial {
    // Check cache
    const cached = this.materialCache.get(name);
    if (cached != null) {
      return cached;
    }

    const material = new BABYLON.PBRMaterial(name, this.scene);
    material.albedoColor = color;
    material.metallic = metallic;
    material.roughness = roughness;
    material.freeze();

    this.materialCache.set(name, material);
    return material;
  }

  /**
   * Pre-load common materials
   */
  public preloadCommonMaterials(): void {
    const commonMaterials = [
      // Basic colors
      { name: 'white', color: new BABYLON.Color3(1, 1, 1), metallic: 0, roughness: 1 },
      { name: 'black', color: new BABYLON.Color3(0, 0, 0), metallic: 0, roughness: 1 },
      { name: 'red', color: new BABYLON.Color3(1, 0, 0), metallic: 0, roughness: 0.8 },
      { name: 'green', color: new BABYLON.Color3(0, 1, 0), metallic: 0, roughness: 0.8 },
      { name: 'blue', color: new BABYLON.Color3(0, 0, 1), metallic: 0, roughness: 0.8 },

      // Metals
      { name: 'gold', color: new BABYLON.Color3(1, 0.8, 0.2), metallic: 1, roughness: 0.3 },
      { name: 'silver', color: new BABYLON.Color3(0.9, 0.9, 0.9), metallic: 1, roughness: 0.2 },
      { name: 'bronze', color: new BABYLON.Color3(0.8, 0.5, 0.2), metallic: 1, roughness: 0.4 },

      // Common surfaces
      { name: 'wood', color: new BABYLON.Color3(0.6, 0.4, 0.2), metallic: 0, roughness: 0.9 },
      { name: 'stone', color: new BABYLON.Color3(0.5, 0.5, 0.5), metallic: 0, roughness: 0.8 },
      { name: 'grass', color: new BABYLON.Color3(0.2, 0.6, 0.2), metallic: 0, roughness: 0.95 },
    ];

    for (const config of commonMaterials) {
      this.createSimpleMaterial(config.name, config.color, config.metallic, config.roughness);
    }
  }

  /**
   * Unfreeze material for editing
   */
  public unfreezeMaterial(name: string): void {
    const material = this.materialCache.get(name);
    if (material != null) {
      material.unfreeze();
    }
  }

  /**
   * Freeze material for performance
   */
  public freezeMaterial(name: string): void {
    const material = this.materialCache.get(name);
    if (material != null) {
      material.freeze();
    }
  }

  /**
   * Get material statistics
   */
  public getStats(): PBRMaterialStats {
    let frozenCount = 0;
    let sharedInstances = 0;

    for (const material of this.materialCache.values()) {
      if (material.isFrozen) {
        frozenCount++;
      }

      // Count meshes using this material
      const meshes = this.scene.meshes.filter((m) => m.material === material);
      if (meshes.length > 1) {
        sharedInstances += meshes.length - 1;
      }
    }

    // Estimate memory
    const textureMemory = this.textureCache.size * 2; // ~2MB per texture (rough estimate)
    const materialMemory = this.materialCache.size * 0.1; // ~100KB per material
    const estimatedMemoryMB = textureMemory + materialMemory;

    return {
      totalMaterials: this.materialCache.size,
      frozenMaterials: frozenCount,
      sharedInstances,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 10) / 10,
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();

    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clearCache();
  }
}
