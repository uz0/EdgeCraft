/**
 * AssetLoader - Manages loading and caching of game assets
 * Part of PRP 2.12: Legal Asset Library
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF'; // Required for GLB/glTF file loading

export interface AssetManifest {
  textures: Record<string, TextureAsset>;
  models: Record<string, ModelAsset>;
}

export interface TextureAsset {
  id: string;
  path: string;
  normalPath?: string;
  roughnessPath?: string;
  license: string;
  author: string;
  sourceUrl: string;
}

export interface ModelAsset {
  id: string;
  path: string;
  triangles: number;
  license: string;
  author: string;
  sourceUrl: string;
  fallback?: string;
}

export class AssetLoader {
  private scene: BABYLON.Scene;
  private manifest: AssetManifest | null = null;
  private loadedTextures: Map<string, BABYLON.Texture>;
  private loadedModels: Map<string, BABYLON.Mesh>;
  private manifestPath: string;

  constructor(scene: BABYLON.Scene, manifestPath: string = '/assets/manifest.json') {
    this.scene = scene;
    this.manifestPath = manifestPath;
    this.loadedTextures = new Map();
    this.loadedModels = new Map();
  }

  async loadManifest(): Promise<void> {
    try {
      const response = await fetch(this.manifestPath);
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`);
      }
      this.manifest = (await response.json()) as AssetManifest;
    } catch (error) {
      console.error('[AssetLoader] Failed to load manifest:', error);
      this.manifest = { textures: {}, models: {} };
    }
  }

  loadTexture(id: string): BABYLON.Texture {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call loadManifest() first.');
    }

    if (this.loadedTextures.has(id)) {
      return this.loadedTextures.get(id)!;
    }

    const asset = this.manifest.textures[id];
    if (!asset) {
      console.warn(`[AssetLoader] Texture not found: ${id}, using fallback`);
      return this.createFallbackTexture();
    }

    try {
      const texture = new BABYLON.Texture(asset.path, this.scene);
      texture.name = id;
      this.loadedTextures.set(id, texture);
      return texture;
    } catch (error) {
      console.error(`[AssetLoader] Failed to load texture ${id}:`, error);
      return this.createFallbackTexture();
    }
  }

  async loadModel(id: string): Promise<BABYLON.Mesh> {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call loadManifest() first.');
    }

    if (this.loadedModels.has(id)) {
      // Return the cached original mesh for thin instancing
      return this.loadedModels.get(id)!;
    }

    const asset = this.manifest.models[id];
    if (!asset) {
      console.warn(`[AssetLoader] Model not found: ${id}, using fallback box`);
      return this.createFallbackBox();
    }

    // Model has fallback specified (skip logging)

    try {
      // Split path into rootUrl and filename for Babylon.js
      const lastSlash = asset.path.lastIndexOf('/');
      const rootUrl = asset.path.substring(0, lastSlash + 1);
      const filename = asset.path.substring(lastSlash + 1);

      const result = await BABYLON.SceneLoader.ImportMeshAsync('', rootUrl, filename, this.scene);
      if (result.meshes.length === 0) {
        throw new Error('No meshes imported');
      }

      // Find first mesh with actual geometry (glTF files often have empty parent nodes)
      let mesh: BABYLON.Mesh | null = null;
      for (const m of result.meshes) {
        if (m instanceof BABYLON.Mesh && m.getTotalVertices() > 0) {
          mesh = m;
          break;
        }
      }

      // Fallback to first mesh if no geometry found
      if (!mesh) {
        console.warn(`[AssetLoader] No mesh with geometry found in ${id}, using first mesh`);
        mesh = result.meshes[0] as BABYLON.Mesh;
      }

      mesh.name = id;

      // Ensure mesh has a visible material
      if (!mesh.material) {
        const material = new BABYLON.StandardMaterial(`${id}_material`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Light gray fallback
        mesh.material = material;
      } else {
        // Ensure existing material has visible color
        const material = mesh.material as BABYLON.StandardMaterial;
        if (material.diffuseColor != null) {
          // Check if diffuse color is black (0,0,0)
          const color = material.diffuseColor;
          if (color.r === 0 && color.g === 0 && color.b === 0) {
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
          }
        } else {
          material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        }
      }

      // Keep base mesh enabled for thin instancing to work
      // DoodadRenderer will handle visibility
      this.loadedModels.set(id, mesh);
      return mesh; // Return the original mesh for thin instancing
    } catch (error) {
      console.error(`[AssetLoader] Failed to load model ${id}:`, error);
      return this.createFallbackBox();
    }
  }

  private createFallbackTexture(): BABYLON.Texture {
    const texture = new BABYLON.Texture('/assets/textures/fallback.png', this.scene);
    return texture;
  }

  private createFallbackBox(): BABYLON.Mesh {
    const box = BABYLON.MeshBuilder.CreateBox(
      `fallback_box_${Date.now()}`,
      { size: 1 },
      this.scene
    );
    const material = new BABYLON.StandardMaterial(`fallback_mat_${Date.now()}`, this.scene);
    material.diffuseColor = new BABYLON.Color3(1, 0, 1);
    box.material = material;
    return box;
  }

  getAvailableTextures(): string[] {
    return this.manifest ? Object.keys(this.manifest.textures) : [];
  }

  getAvailableModels(): string[] {
    return this.manifest ? Object.keys(this.manifest.models) : [];
  }

  dispose(): void {
    for (const texture of this.loadedTextures.values()) {
      texture.dispose();
    }
    for (const mesh of this.loadedModels.values()) {
      mesh.dispose();
    }
    this.loadedTextures.clear();
    this.loadedModels.clear();
  }
}
