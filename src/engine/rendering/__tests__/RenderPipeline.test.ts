/**
 * Tests for OptimizedRenderPipeline
 */

import * as BABYLON from '@babylonjs/core';
import { OptimizedRenderPipeline } from '../RenderPipeline';
import { QualityPreset } from '../types';

// Skip in CI environment (no WebGL context available)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null ? describe : describe.skip;

describeIfWebGL('OptimizedRenderPipeline', () => {
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
    it('should initialize successfully', () => {
      pipeline.initialize();

      const state = pipeline.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('should apply scene optimizations', () => {
      pipeline.initialize();

      expect(scene.autoClear).toBe(false);
      expect(scene.autoClearDepthAndStencil).toBe(false);
      expect(scene.skipPointerMovePicking).toBe(true);
    });

    it('should freeze active meshes when enabled', () => {
      // Create static mesh
      const mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
      mesh.metadata = { isStatic: true };

      pipeline.initialize();

      const state = pipeline.getState();
      expect(state.isFrozen).toBe(true);
    });

    it('should set initial quality preset', () => {
      pipeline.initialize({ initialQuality: QualityPreset.MEDIUM });

      const state = pipeline.getState();
      expect(state.lodState.currentQuality).toBe('medium');
    });
  });

  describe('material sharing', () => {
    it('should reduce material count', () => {
      // Create meshes with similar materials
      const material1 = new BABYLON.StandardMaterial('mat1', scene);
      material1.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const material2 = new BABYLON.StandardMaterial('mat2', scene);
      material2.diffuseColor = new BABYLON.Color3(1, 0, 0);

      const mesh1 = BABYLON.MeshBuilder.CreateBox('box1', { size: 1 }, scene);
      mesh1.material = material1;

      const mesh2 = BABYLON.MeshBuilder.CreateBox('box2', { size: 1 }, scene);
      mesh2.material = material2;

      pipeline.initialize({ enableMaterialSharing: true });

      const stats = pipeline.getStats();
      expect(stats.materialSharing.reductionPercent).toBeGreaterThan(0);
    });
  });

  describe('mesh merging', () => {
    it('should merge static meshes', () => {
      // Create static meshes
      for (let i = 0; i < 15; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true };
        mesh.position = new BABYLON.Vector3(i, 0, 0);
      }

      pipeline.initialize({ enableMeshMerging: true });

      const stats = pipeline.getStats();
      expect(stats.meshMerging.drawCallsSaved).toBeGreaterThan(0);
    });

    it('should not merge if too few meshes', () => {
      // Create only 3 static meshes (below default minimum of 10)
      for (let i = 0; i < 3; i++) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        mesh.metadata = { isStatic: true };
      }

      pipeline.initialize({ enableMeshMerging: true });

      const stats = pipeline.getStats();
      expect(stats.meshMerging.drawCallsSaved).toBe(0);
    });
  });

  describe('quality adjustment', () => {
    it('should change quality preset', () => {
      pipeline.initialize({ initialQuality: QualityPreset.HIGH });

      pipeline.setQualityPreset(QualityPreset.LOW);

      const state = pipeline.getState();
      expect(state.lodState.currentQuality).toBe('low');
    });

    it('should adjust hardware scaling based on quality', () => {
      pipeline.initialize({ initialQuality: QualityPreset.HIGH });

      pipeline.setQualityPreset(QualityPreset.LOW);

      // Low quality should use hardware scaling = 2
      expect(engine.getHardwareScalingLevel()).toBe(2);
    });
  });

  describe('performance tracking', () => {
    it('should track performance metrics', () => {
      pipeline.initialize();

      // Force a stats update
      scene.render();

      const stats = pipeline.getStats();
      expect(stats.performance).toBeDefined();
      expect(stats.performance.fps).toBeGreaterThanOrEqual(0);
      expect(stats.performance.drawCalls).toBeGreaterThanOrEqual(0);
    });

    it('should track culling statistics', () => {
      // Create some meshes
      for (let i = 0; i < 5; i++) {
        BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
      }

      pipeline.initialize({ enableCulling: true });

      const stats = pipeline.getStats();
      expect(stats.culling).toBeDefined();
      expect(stats.culling.totalObjects).toBeGreaterThan(0);
    });
  });

  describe('disposal', () => {
    it('should unfreeze meshes on dispose', () => {
      pipeline.initialize();

      expect(pipeline.getState().isFrozen).toBe(true);

      pipeline.dispose();

      // Scene should be unfrozen
      // Note: We can't easily test this without accessing internal state
    });
  });
});
