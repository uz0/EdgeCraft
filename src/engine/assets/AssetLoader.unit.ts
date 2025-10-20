/**
 * Unit tests for AssetLoader
 */

import { AssetLoader, AssetManifest, TextureAsset, ModelAsset } from './AssetLoader';
import * as BABYLON from '@babylonjs/core';

jest.mock('@babylonjs/core');
jest.mock('@babylonjs/loaders/glTF');

global.fetch = jest.fn();

describe('AssetLoader', () => {
  let scene: BABYLON.Scene;
  let loader: AssetLoader;
  let mockTexture: jest.Mocked<BABYLON.Texture>;
  let mockMesh: jest.Mocked<BABYLON.Mesh>;

  const createMockManifest = (): AssetManifest => ({
    textures: {
      test_texture: {
        id: 'test_texture',
        path: '/assets/textures/test.png',
        normalPath: '/assets/textures/test_normal.png',
        roughnessPath: '/assets/textures/test_roughness.png',
        license: 'CC0',
        author: 'Test Author',
        sourceUrl: 'https://example.com',
      },
      terrain_grass: {
        id: 'terrain_grass',
        path: '/assets/textures/grass.png',
        license: 'MIT',
        author: 'Grass Author',
        sourceUrl: 'https://grass.example.com',
      },
    },
    models: {
      test_model: {
        id: 'test_model',
        path: '/assets/models/test.glb',
        triangles: 1000,
        license: 'CC0',
        author: 'Model Author',
        sourceUrl: 'https://models.example.com',
      },
      tree_oak: {
        id: 'tree_oak',
        path: '/assets/models/tree_oak.glb',
        triangles: 5000,
        license: 'MIT',
        author: 'Tree Author',
        sourceUrl: 'https://trees.example.com',
        fallback: '/assets/models/tree_simple.glb',
      },
    },
  });

  beforeEach(() => {
    scene = new BABYLON.Scene(null as any);

    mockTexture = {
      name: '',
      dispose: jest.fn(),
    } as any;

    mockMesh = {
      name: '',
      dispose: jest.fn(),
      setEnabled: jest.fn(),
      thinInstanceAdd: jest.fn(),
      getTotalVertices: jest.fn().mockReturnValue(100),
    } as any;

    (BABYLON.Texture as any) = jest.fn(() => mockTexture);
    (BABYLON.MeshBuilder.CreateBox as any) = jest.fn(() => mockMesh);
    (BABYLON.SceneLoader.ImportMeshAsync as any) = jest.fn().mockResolvedValue({
      meshes: [mockMesh],
    });

    (global.fetch as jest.Mock).mockClear();

    loader = new AssetLoader(scene);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default manifest path', () => {
      const defaultLoader = new AssetLoader(scene);
      expect(defaultLoader).toBeDefined();
    });

    it('should initialize with custom manifest path', () => {
      const customLoader = new AssetLoader(scene, '/custom/manifest.json');
      expect(customLoader).toBeDefined();
    });

    it('should initialize empty cache maps', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockManifest(),
      });

      await loader.loadManifest();

      expect(() => loader.loadTexture('unknown_texture')).not.toThrow();
    });
  });

  describe('loadManifest', () => {
    it('should load manifest from default path', async () => {
      const manifest = createMockManifest();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => manifest,
      });

      await loader.loadManifest();

      expect(global.fetch).toHaveBeenCalledWith('/assets/manifest.json');
    });

    it('should load manifest from custom path', async () => {
      const customLoader = new AssetLoader(scene, '/custom/path/manifest.json');
      const manifest = createMockManifest();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => manifest,
      });

      await customLoader.loadManifest();

      expect(global.fetch).toHaveBeenCalledWith('/custom/path/manifest.json');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(loader.loadManifest()).resolves.not.toThrow();
    });

    it('should create empty manifest on fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await loader.loadManifest();

      expect(() => loader.loadTexture('any_texture')).not.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(loader.loadManifest()).resolves.not.toThrow();
    });
  });

  describe('loadTexture', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockManifest(),
      });
      await loader.loadManifest();
    });

    it('should throw error if manifest not loaded', () => {
      const freshLoader = new AssetLoader(scene);
      expect(() => freshLoader.loadTexture('test_texture')).toThrow('Manifest not loaded');
    });

    it('should load texture from manifest', () => {
      const texture = loader.loadTexture('test_texture');

      expect(BABYLON.Texture).toHaveBeenCalledWith('/assets/textures/test.png', scene);
      expect(texture).toBe(mockTexture);
      expect(mockTexture.name).toBe('test_texture');
    });

    it('should cache loaded textures', () => {
      const texture1 = loader.loadTexture('test_texture');
      const texture2 = loader.loadTexture('test_texture');

      expect(texture1).toBe(texture2);
      expect(BABYLON.Texture).toHaveBeenCalledTimes(1);
    });

    it('should return fallback texture for unknown ID', () => {
      const texture = loader.loadTexture('unknown_texture');

      expect(texture).toBeDefined();
      expect(BABYLON.Texture).toHaveBeenCalledWith('/assets/textures/fallback.png', scene);
    });

    it('should handle texture loading errors with fallback', () => {
      let callCount = 0;
      (BABYLON.Texture as any) = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Failed to load texture');
        }
        return mockTexture;
      });

      const texture = loader.loadTexture('test_texture');

      expect(texture).toBeDefined();
      expect(BABYLON.Texture).toHaveBeenCalledWith('/assets/textures/fallback.png', scene);
    });

    it('should load multiple different textures', () => {
      const mockTexture2 = {
        name: '',
        dispose: jest.fn(),
      } as any;

      let callCount = 0;
      (BABYLON.Texture as any) = jest.fn((path: string) => {
        callCount++;
        const tex = callCount === 1 ? mockTexture : mockTexture2;
        return tex;
      });

      const texture1 = loader.loadTexture('test_texture');
      const texture2 = loader.loadTexture('terrain_grass');

      expect(texture1).toBe(mockTexture);
      expect(texture2).toBe(mockTexture2);
      expect(texture1).not.toBe(texture2);
      expect(BABYLON.Texture).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadModel', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockManifest(),
      });
      await loader.loadManifest();
    });

    it('should throw error if manifest not loaded', async () => {
      const freshLoader = new AssetLoader(scene);
      await expect(freshLoader.loadModel('test_model')).rejects.toThrow('Manifest not loaded');
    });

    it('should load model from manifest', async () => {
      const model = await loader.loadModel('test_model');

      expect(BABYLON.SceneLoader.ImportMeshAsync).toHaveBeenCalledWith(
        '',
        '/assets/models/',
        'test.glb',
        scene
      );
      expect(model).toBe(mockMesh);
      expect(model.name).toBe('test_model');
    });

    it('should cache loaded models', async () => {
      const model1 = await loader.loadModel('test_model');
      const model2 = await loader.loadModel('test_model');

      expect(model1).toBe(model2);
      expect(BABYLON.SceneLoader.ImportMeshAsync).toHaveBeenCalledTimes(1);
    });

    it('should return fallback box for unknown ID', async () => {
      const model = await loader.loadModel('unknown_model');

      expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
      expect(model).toBe(mockMesh);
    });

    it('should handle model loading errors with fallback', async () => {
      (BABYLON.SceneLoader.ImportMeshAsync as any) = jest.fn().mockRejectedValue(
        new Error('Failed to load model')
      );

      const model = await loader.loadModel('test_model');

      expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
      expect(model).toBeDefined();
    });

    it('should keep loaded models enabled for thin instancing', async () => {
      await loader.loadModel('test_model');

      expect(mockMesh.setEnabled).not.toHaveBeenCalled();
    });

    it('should load multiple different models', async () => {
      const mockMesh2 = {
        name: '',
        dispose: jest.fn(),
        setEnabled: jest.fn(),
        thinInstanceAdd: jest.fn(),
        getTotalVertices: jest.fn().mockReturnValue(100),
      } as any;

      let callCount = 0;
      (BABYLON.SceneLoader.ImportMeshAsync as any) = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          meshes: [callCount === 1 ? mockMesh : mockMesh2],
        });
      });

      const model1 = await loader.loadModel('test_model');
      const model2 = await loader.loadModel('tree_oak');

      expect(model1).toBe(mockMesh);
      expect(model2).toBe(mockMesh2);
      expect(model1).not.toBe(model2);
      expect(BABYLON.SceneLoader.ImportMeshAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockManifest(),
      });
      await loader.loadManifest();
    });

    it('should dispose all loaded textures', () => {
      loader.loadTexture('test_texture');
      loader.loadTexture('terrain_grass');

      loader.dispose();

      expect(mockTexture.dispose).toHaveBeenCalled();
    });

    it('should dispose all loaded models', async () => {
      await loader.loadModel('test_model');
      await loader.loadModel('tree_oak');

      loader.dispose();

      expect(mockMesh.dispose).toHaveBeenCalled();
    });

    it('should clear texture cache after dispose', () => {
      loader.loadTexture('test_texture');
      loader.dispose();

      const texture = loader.loadTexture('test_texture');
      expect(BABYLON.Texture).toHaveBeenCalledTimes(2);
    });

    it('should clear model cache after dispose', async () => {
      await loader.loadModel('test_model');
      loader.dispose();

      await loader.loadModel('test_model');
      expect(BABYLON.SceneLoader.ImportMeshAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle dispose when no assets loaded', () => {
      expect(() => loader.dispose()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockManifest(),
      });
      await loader.loadManifest();
    });

    it('should handle empty asset ID', () => {
      const texture = loader.loadTexture('');
      expect(texture).toBeDefined();
    });

    it('should handle null asset ID', () => {
      const texture = loader.loadTexture(null as any);
      expect(texture).toBeDefined();
    });

    it('should handle undefined asset ID', () => {
      const texture = loader.loadTexture(undefined as any);
      expect(texture).toBeDefined();
    });

    it('should handle concurrent texture loads', () => {
      const texture1 = loader.loadTexture('test_texture');
      const texture2 = loader.loadTexture('test_texture');
      const texture3 = loader.loadTexture('test_texture');

      expect(texture1).toBe(texture2);
      expect(texture2).toBe(texture3);
      expect(BABYLON.Texture).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent model loads', async () => {
      const promises = [
        loader.loadModel('test_model'),
        loader.loadModel('test_model'),
        loader.loadModel('test_model'),
      ];

      const models = await Promise.all(promises);

      expect(models[0]).toBe(models[1]);
      expect(models[1]).toBe(models[2]);
    });
  });
});
