/**
 * Tests for DrawCallOptimizer
 */

import * as BABYLON from '@babylonjs/core';
import { DrawCallOptimizer } from '../DrawCallOptimizer';

// Skip in CI environment (no WebGL context available)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null ? describe : describe.skip;

describeIfWebGL('DrawCallOptimizer', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let optimizer: DrawCallOptimizer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    optimizer = new DrawCallOptimizer(scene);
  });

  afterEach(() => {
    optimizer.clear();
    scene.dispose();
    engine.dispose();
  });

  describe('mesh merging', () => {
    it('should merge static meshes when above threshold', () => {
      // Create 15 static meshes (above default minimum of 10)
      for (let i = 0; i < 15; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true } as Record<string, unknown>;
        mesh.position = new BABYLON.Vector3(i, 0, 0);
      }

      const result = optimizer.mergeStaticMeshes();

      expect(result.sourceCount).toBe(15);
      expect(result.drawCallsSaved).toBeGreaterThan(0);
    });

    it('should not merge when below threshold', () => {
      // Create only 5 static meshes (below default minimum of 10)
      for (let i = 0; i < 5; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true } as Record<string, unknown>;
      }

      const result = optimizer.mergeStaticMeshes();

      expect(result.drawCallsSaved).toBe(0);
    });

    it('should group meshes by material', () => {
      const mat1 = new BABYLON.StandardMaterial('mat1', scene);
      const mat2 = new BABYLON.StandardMaterial('mat2', scene);

      // Create 10 meshes with mat1
      for (let i = 0; i < 10; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box1_${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true } as Record<string, unknown>;
        mesh.material = mat1;
      }

      // Create 10 meshes with mat2
      for (let i = 0; i < 10; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box2_${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true } as Record<string, unknown>;
        mesh.material = mat2;
      }

      const result = optimizer.mergeStaticMeshes();

      // Should create 2 merged meshes (one per material group)
      expect(result.sourceCount).toBe(20);
    });
  });

  describe('statistics', () => {
    it('should track mesh reduction', () => {
      for (let i = 0; i < 15; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true } as Record<string, unknown>;
      }

      optimizer.mergeStaticMeshes();

      const stats = optimizer.getStats();
      expect(stats.originalMeshCount).toBeGreaterThan(0);
      expect(stats.mergedMeshCount).toBeGreaterThan(0);
      expect(stats.reductionPercent).toBeGreaterThan(0);
    });
  });

  describe('batching', () => {
    it('should handle dynamic mesh batching', () => {
      const meshes: BABYLON.Mesh[] = [];

      // Create meshes with same geometry
      for (let i = 0; i < 5; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        meshes.push(mesh);
      }

      // Should not throw
      expect(() => {
        optimizer.batchDynamicMeshes(meshes);
      }).not.toThrow();
    });
  });
});
