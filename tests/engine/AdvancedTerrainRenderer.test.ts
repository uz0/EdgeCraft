/**
 * Advanced Terrain Renderer tests
 *
 * Note: These tests require full WebGL support which is not available in CI environments.
 * They are skipped for now and should be run in a browser environment for integration testing.
 */

import * as BABYLON from '@babylonjs/core';
import { AdvancedTerrainRenderer } from '@/engine/terrain/AdvancedTerrainRenderer';
import type { AdvancedTerrainOptions } from '@/engine/terrain/types';

describe.skip('AdvancedTerrainRenderer', () => {
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let renderer: AdvancedTerrainRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    renderer = new AdvancedTerrainRenderer();
  });

  afterEach(() => {
    renderer.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('initialization', () => {
    it('should create advanced terrain renderer', () => {
      expect(renderer).toBeDefined();
      expect(renderer.isReady()).toBe(false);
    });

    it('should validate required options', async () => {
      const invalidOptions = {
        width: 0,
        height: 0,
        textureLayers: [],
      } as unknown as AdvancedTerrainOptions;

      await expect(renderer.initialize(scene, invalidOptions)).rejects.toThrow();
    });

    it('should reject missing heightmap', async () => {
      const options = {
        width: 256,
        height: 256,
        splatmap: '/test.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      } as unknown as AdvancedTerrainOptions;

      await expect(renderer.initialize(scene, options)).rejects.toThrow(
        'Heightmap URL is required'
      );
    });

    it('should reject missing splatmap', async () => {
      const options = {
        width: 256,
        height: 256,
        heightmap: '/test.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      } as unknown as AdvancedTerrainOptions;

      await expect(renderer.initialize(scene, options)).rejects.toThrow('Splatmap URL is required');
    });

    it('should reject empty texture layers', async () => {
      const options = {
        width: 256,
        height: 256,
        heightmap: '/test.png',
        splatmap: '/test.png',
        textureLayers: [],
      } as unknown as AdvancedTerrainOptions;

      await expect(renderer.initialize(scene, options)).rejects.toThrow(
        'At least one texture layer is required'
      );
    });
  });

  describe('material management', () => {
    it('should create terrain material on initialization', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [
          { diffuseTexture: '/grass.png', scale: 10 },
          { diffuseTexture: '/rock.png', scale: 8 },
        ],
      };

      await renderer.initialize(scene, options);

      const material = renderer.getMaterial();
      expect(material).toBeDefined();
    });

    it('should support up to 4 texture layers', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [
          { diffuseTexture: '/grass.png', scale: 10 },
          { diffuseTexture: '/rock.png', scale: 8 },
          { diffuseTexture: '/dirt.png', scale: 12 },
          { diffuseTexture: '/snow.png', scale: 6 },
        ],
      };

      await renderer.initialize(scene, options);

      const material = renderer.getMaterial();
      expect(material).toBeDefined();
    });

    it('should warn about more than 4 texture layers', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [
          { diffuseTexture: '/grass.png', scale: 10 },
          { diffuseTexture: '/rock.png', scale: 8 },
          { diffuseTexture: '/dirt.png', scale: 12 },
          { diffuseTexture: '/snow.png', scale: 6 },
          { diffuseTexture: '/sand.png', scale: 7 }, // 5th layer
        ],
      };

      await renderer.initialize(scene, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Only first 4 texture layers will be used');
      consoleWarnSpy.mockRestore();
    });

    it('should update light direction', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      const newDirection = new BABYLON.Vector3(1, -1, 0);
      expect(() => renderer.setLightDirection(newDirection)).not.toThrow();
    });
  });

  describe('quadtree management', () => {
    it('should create quadtree on initialization', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      const quadtree = renderer.getQuadtree();
      expect(quadtree).toBeDefined();
    });

    it('should report chunk counts', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        chunkSize: 64,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      expect(renderer.getTotalChunkCount()).toBeGreaterThan(0);
      expect(renderer.getActiveChunkCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('height queries', () => {
    it('should get height at position', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      const height = renderer.getHeightAtPosition(128, 128);
      expect(typeof height).toBe('number');
    });

    it('should return 0 for invalid positions when not initialized', () => {
      const height = renderer.getHeightAtPosition(0, 0);
      expect(height).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('should mark as ready after initialization', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      expect(renderer.isReady()).toBe(false);

      await renderer.initialize(scene, options);

      expect(renderer.isReady()).toBe(true);
    });

    it('should dispose all resources', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      expect(renderer.isReady()).toBe(true);

      renderer.dispose();

      expect(renderer.isReady()).toBe(false);
      expect(renderer.getMaterial()).toBeUndefined();
      expect(renderer.getQuadtree()).toBeUndefined();
    });

    it('should handle multiple dispose calls', async () => {
      const options: AdvancedTerrainOptions = {
        width: 256,
        height: 256,
        heightmap: '/test-heightmap.png',
        splatmap: '/test-splatmap.png',
        textureLayers: [{ diffuseTexture: '/grass.png', scale: 10 }],
      };

      await renderer.initialize(scene, options);

      expect(() => {
        renderer.dispose();
        renderer.dispose();
        renderer.dispose();
      }).not.toThrow();
    });
  });
});
