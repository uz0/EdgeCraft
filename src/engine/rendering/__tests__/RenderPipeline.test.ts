/**
 * Tests for OptimizedRenderPipeline
 */

import * as BABYLON from '@babylonjs/core';
import { OptimizedRenderPipeline } from '../RenderPipeline';

describe('OptimizedRenderPipeline', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let pipeline: OptimizedRenderPipeline;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create engine and scene
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);

    // Create pipeline
    pipeline = new OptimizedRenderPipeline(scene);
  });

  afterEach(() => {
    pipeline.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await pipeline.initialize();

      const state = pipeline.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('should apply scene optimizations', async () => {
      await pipeline.initialize();

      expect(scene.autoClear).toBe(false);
      expect(scene.autoClearDepthAndStencil).toBe(false);
      expect(scene.skipPointerMovePicking).toBe(true);
    });

    it('should freeze active meshes when enabled', async () => {
      // Create static mesh
      const mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
      (mesh.metadata as any) = { isStatic: true };

      await pipeline.initialize();

      const state = pipeline.getState();
      expect(state.isFrozen).toBe(true);
    });

    it('should set initial quality preset', async () => {
      await pipeline.initialize({ initialQuality: 'medium' as any });

      const state = pipeline.getState();
      expect(state.lodState.currentQuality).toBe('medium');
    });
  });

  describe('material sharing', () => {
    it('should reduce material count', async () => {
      // Create meshes with similar materials
      const material1 = new BABYLON.StandardMaterial('mat1', scene);
      material1.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const material2 = new BABYLON.StandardMaterial('mat2', scene);
      material2.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const mesh1 = BABYLON.MeshBuilder.CreateBox('box1', { size: 1 }, scene);
      mesh1.material = material1;

      const mesh2 = BABYLON.MeshBuilder.CreateBox('box2', { size: 1 }, scene);
      mesh2.material = material2;

      await pipeline.initialize({ enableMaterialSharing: true });

      const stats = pipeline.getStats();
      expect(stats.materialSharing.reductionPercent).toBeGreaterThan(0);
    });
  });

  describe('mesh merging', () => {
    it('should merge static meshes', async () => {
      // Create static meshes
      for (let i = 0; i < 15; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        (mesh.metadata as any) = { isStatic: true };
        mesh.position = new BABYLON.Vector3(i, 0, 0);
      }

      await pipeline.initialize({ enableMeshMerging: true });

      const stats = pipeline.getStats();
      expect(stats.meshMerging.drawCallsSaved).toBeGreaterThan(0);
    });

    it('should not merge if too few meshes', async () => {
      // Create only 3 static meshes (below default minimum of 10)
      for (let i = 0; i < 3; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        (mesh.metadata as any) = { isStatic: true };
      }

      await pipeline.initialize({ enableMeshMerging: true });

      const stats = pipeline.getStats();
      expect(stats.meshMerging.drawCallsSaved).toBe(0);
    });
  });

  describe('quality adjustment', () => {
    it('should change quality preset', async () => {
      await pipeline.initialize({ initialQuality: 'high' as any });

      pipeline.setQualityPreset('low' as any);

      const state = pipeline.getState();
      expect(state.lodState.currentQuality).toBe('low');
    });

    it('should adjust hardware scaling based on quality', async () => {
      await pipeline.initialize({ initialQuality: 'high' as any });

      pipeline.setQualityPreset('low' as any);

      // Low quality should use hardware scaling = 2
      expect(engine.getHardwareScalingLevel()).toBe(2);
    });
  });

  describe('performance tracking', () => {
    it('should track performance metrics', async () => {
      await pipeline.initialize();

      // Force a stats update
      scene.render();

      const stats = pipeline.getStats();
      expect(stats.performance).toBeDefined();
      expect(stats.performance.fps).toBeGreaterThanOrEqual(0);
      expect(stats.performance.drawCalls).toBeGreaterThanOrEqual(0);
    });

    it('should track culling statistics', async () => {
      // Create some meshes
      for (let i = 0; i < 5; i++) {
        BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
      }

      await pipeline.initialize({ enableCulling: true });

      const stats = pipeline.getStats();
      expect(stats.culling).toBeDefined();
      expect(stats.culling.totalObjects).toBeGreaterThan(0);
    });
  });

  describe('disposal', () => {
    it('should unfreeze meshes on dispose', async () => {
      await pipeline.initialize();

      expect(pipeline.getState().isFrozen).toBe(true);

      pipeline.dispose();

      // Scene should be unfrozen
      // Note: We can't easily test this without accessing internal state
    });
  });
});
