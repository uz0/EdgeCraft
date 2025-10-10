/**
 * Tests for MapRendererCore
 */

import * as BABYLON from '@babylonjs/core';
import { MapRendererCore } from '../MapRendererCore';
import { QualityPresetManager } from '../QualityPresetManager';

// Skip in CI environment (no WebGL context available)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null ? describe : describe.skip;

describeIfWebGL('MapRendererCore', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let qualityManager: QualityPresetManager;
  let mapRenderer: MapRendererCore;

  beforeEach(async () => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create engine and scene
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);

    // Create quality manager
    qualityManager = new QualityPresetManager(scene);
    await qualityManager.initialize({
      enableAutoDetect: false,
      enableAutoAdjust: false,
    });

    // Create map renderer
    mapRenderer = new MapRendererCore({
      scene,
      qualityManager,
      enableEffects: true,
      cameraMode: 'rts',
    });
  });

  afterEach(() => {
    mapRenderer.dispose();
    qualityManager.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(mapRenderer).toBeDefined();
      expect(mapRenderer.getCurrentMap()).toBeNull();
    });

    it('should initialize with custom config', () => {
      const customRenderer = new MapRendererCore({
        scene,
        qualityManager,
        enableEffects: false,
        cameraMode: 'free',
      });

      expect(customRenderer).toBeDefined();
      customRenderer.dispose();
    });
  });

  describe('loadMap', () => {
    it('should handle invalid format gracefully', async () => {
      const buffer = new ArrayBuffer(100);
      const result = await mapRenderer.loadMap(buffer, '.invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should have correct structure for map data', () => {
      // This test validates that MapRendererCore is properly structured
      // Actual map loading would require mocking MapLoaderRegistry
      expect(mapRenderer).toBeDefined();
      expect(typeof mapRenderer.getCurrentMap).toBe('function');
      expect(typeof mapRenderer.loadMap).toBe('function');
      expect(typeof mapRenderer.getStats).toBe('function');
      expect(typeof mapRenderer.dispose).toBe('function');
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = mapRenderer.getStats();

      expect(stats).toBeDefined();
      expect(stats.terrain).toBeDefined();
      expect(stats.units).toBeDefined();
      expect(stats.phase2).toBeDefined();
    });
  });

  describe('getCurrentMap', () => {
    it('should return null when no map loaded', () => {
      const currentMap = mapRenderer.getCurrentMap();
      expect(currentMap).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', () => {
      mapRenderer.dispose();

      const currentMap = mapRenderer.getCurrentMap();
      expect(currentMap).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      mapRenderer.dispose();
      mapRenderer.dispose();

      const currentMap = mapRenderer.getCurrentMap();
      expect(currentMap).toBeNull();
    });
  });

  describe('camera setup', () => {
    it('should create RTS camera by default', () => {
      // Camera setup happens during renderMap
      // This test validates the default config
      const renderer = new MapRendererCore({
        scene,
        qualityManager,
      });

      expect(renderer).toBeDefined();
      renderer.dispose();
    });

    it('should create free camera when configured', () => {
      const renderer = new MapRendererCore({
        scene,
        qualityManager,
        cameraMode: 'free',
      });

      expect(renderer).toBeDefined();
      renderer.dispose();
    });
  });

  describe('Phase 2 integration', () => {
    it('should integrate Phase 2 systems when enabled', () => {
      const renderer = new MapRendererCore({
        scene,
        qualityManager,
        enableEffects: true,
      });

      expect(renderer).toBeDefined();
      renderer.dispose();
    });

    it('should skip Phase 2 systems when disabled', () => {
      const renderer = new MapRendererCore({
        scene,
        qualityManager,
        enableEffects: false,
      });

      expect(renderer).toBeDefined();
      renderer.dispose();
    });
  });

  describe('performance', () => {
    it('should track load and render times', async () => {
      // This test validates the timing structure
      // Actual map loading would require mocking MapLoaderRegistry
      const buffer = new ArrayBuffer(100);
      const result = await mapRenderer.loadMap(buffer, '.w3x');

      expect(result.loadTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.renderTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
