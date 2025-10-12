/**
 * AssetLoader - Manages loading and caching of game assets
 * Part of PRP 2.12: Legal Asset Library
 */

import * as BABYLON from '@babylonjs/core';

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
        throw new Error(\`Failed to load manifest: \${response.statusText}\`);
      }
      this.manifest = await response.json();
      console.log('[AssetLoader] Manifest loaded:', {
        textures: Object.keys(this.manifest.textures).length,
        models: Object.keys(this.manifest.models).length,
      });
    } catch (error) {
      console.error('[AssetLoader] Failed to load manifest:', error);
      this.manifest = { textures: {}, models: {} };
    }
  }

  async loadTexture(id: string): Promise<BABYLON.Texture> {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call loadManifest() first.');
    }

    if (this.loadedTextures.has(id)) {
      return this.loadedTextures.get(id)!;
    }

    const asset = this.manifest.textures[id];
    if (!asset) {
      console.warn(\`[AssetLoader] Texture not found: \${id}, using fallback\`);
      return this.createFallbackTexture();
    }

    try {
      const texture = new BABYLON.Texture(asset.path, this.scene);
      texture.name = id;
      this.loadedTextures.set(id, texture);
      console.log(\`[AssetLoader] Loaded texture: \${id} from \${asset.path}\`);
      return texture;
    } catch (error) {
      console.error(\`[AssetLoader] Failed to load texture \${id}:\`, error);
      return this.createFallbackTexture();
    }
  }

  async loadModel(id: string): Promise<BABYLON.Mesh> {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call loadManifest() first.');
    }

    if (this.loadedModels.has(id)) {
      const cached = this.loadedModels.get(id)!;
      return cached.clone(\`\${id}_instance_\${Date.now()}\`, null)!;
    }

    const asset = this.manifest.models[id];
    if (!asset) {
      if (asset?.fallback) {
        console.warn(\`[AssetLoader] Model not found: \${id}, trying fallback: \${asset.fallback}\`);
        return this.loadModel(asset.fallback);
      }
      console.warn(\`[AssetLoader] Model not found: \${id}, using fallback box\`);
      return this.createFallbackBox();
    }

    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', asset.path, this.scene);
      if (!result.meshes || result.meshes.length === 0) {
        throw new Error('No meshes imported');
      }
      const mesh = result.meshes[0] as BABYLON.Mesh;
      mesh.name = id;
      this.loadedModels.set(id, mesh);
      console.log(\`[AssetLoader] Loaded model: \${id} from \${asset.path}\`);
      return mesh.clone(\`\${id}_instance_\${Date.now()}\`, null)!;
    } catch (error) {
      console.error(\`[AssetLoader] Failed to load model \${id}:\`, error);
      return this.createFallbackBox();
    }
  }

  private createFallbackTexture(): BABYLON.Texture {
    const texture = new BABYLON.Texture('/assets/textures/fallback.png', this.scene);
    return texture;
  }

  private createFallbackBox(): BABYLON.Mesh {
    const box = BABYLON.MeshBuilder.CreateBox(\`fallback_box_\${Date.now()}\`, { size: 1 }, this.scene);
    const material = new BABYLON.StandardMaterial(\`fallback_mat_\${Date.now()}\`, this.scene);
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
    console.log('[AssetLoader] Disposing assets...');
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
