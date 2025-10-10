/**
 * Tests for MaterialCache
 */

import * as BABYLON from '@babylonjs/core';
import { MaterialCache } from '../MaterialCache';

describe('MaterialCache', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let cache: MaterialCache;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    cache = new MaterialCache(scene);
  });

  afterEach(() => {
    cache.clear();
    scene.dispose();
    engine.dispose();
  });

  describe('material sharing', () => {
    it('should share identical materials', () => {
      // Create identical materials
      const mat1 = new BABYLON.StandardMaterial('mat1', scene);
      mat1.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const mat2 = new BABYLON.StandardMaterial('mat2', scene);
      mat2.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const mesh1 = BABYLON.MeshBuilder.CreateBox('box1', { size: 1 }, scene);
      mesh1.material = mat1;

      const mesh2 = BABYLON.MeshBuilder.CreateBox('box2', { size: 1 }, scene);
      mesh2.material = mat2;

      cache.optimizeMeshMaterials();

      // Both meshes should now share the same material instance
      expect(mesh1.material).toBe(mesh2.material);
    });

    it('should not share different materials', () => {
      const mat1 = new BABYLON.StandardMaterial('mat1', scene);
      mat1.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const mat2 = new BABYLON.StandardMaterial('mat2', scene);
      mat2.diffuseColor = new BABYLON.Color3(0, 1, 0);

      const mesh1 = BABYLON.MeshBuilder.CreateBox('box1', { size: 1 }, scene);
      mesh1.material = mat1;

      const mesh2 = BABYLON.MeshBuilder.CreateBox('box2', { size: 1 }, scene);
      mesh2.material = mat2;

      cache.optimizeMeshMaterials();

      // Materials are different, so they should not be shared
      expect(mesh1.material).not.toBe(mesh2.material);
    });
  });

  describe('statistics', () => {
    it('should track material reduction', () => {
      // Create 10 meshes with identical materials
      for (let i = 0; i < 10; i++) {
        const mat = new BABYLON.StandardMaterial(`mat${i}`, scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);

        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.material = mat;
      }

      cache.optimizeMeshMaterials();

      const stats = cache.getStats();
      expect(stats.originalCount).toBe(10);
      expect(stats.sharedCount).toBeLessThan(stats.originalCount);
      expect(stats.reductionPercent).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should respect cache size limit', () => {
      const smallCache = new MaterialCache(scene, { maxCacheSize: 5 });

      // Create more materials than cache size
      for (let i = 0; i < 10; i++) {
        const mat = new BABYLON.StandardMaterial(`mat${i}`, scene);
        mat.diffuseColor = new BABYLON.Color3(Math.random(), 0, 0);

        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.material = mat;
      }

      smallCache.optimizeMeshMaterials();

      // Cache size should not exceed limit
      expect(smallCache.getCacheSize()).toBeLessThanOrEqual(5);
    });

    it('should clear cache', () => {
      const mat = new BABYLON.StandardMaterial('mat', scene);
      const mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
      mesh.material = mat;

      cache.optimizeMeshMaterials();
      expect(cache.getCacheSize()).toBeGreaterThan(0);

      cache.clear();
      expect(cache.getCacheSize()).toBe(0);
    });
  });
});
