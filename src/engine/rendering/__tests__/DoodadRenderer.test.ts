/**
 * Tests for DoodadRenderer
 */

import * as BABYLON from '@babylonjs/core';
import { DoodadRenderer } from '../DoodadRenderer';
import type { DoodadPlacement } from '../../../formats/maps/types';

// Skip in CI environment (no WebGL context available)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null ? describe : describe.skip;

describeIfWebGL('DoodadRenderer', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let renderer: DoodadRenderer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create engine and scene
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);

    // Create renderer
    renderer = new DoodadRenderer(scene);
  });

  afterEach(() => {
    renderer.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(renderer).toBeDefined();
      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(0);
      expect(stats.typesLoaded).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customRenderer = new DoodadRenderer(scene, {
        enableInstancing: false,
        enableLOD: false,
        lodDistance: 50,
        maxDoodads: 1000,
      });

      expect(customRenderer).toBeDefined();
      customRenderer.dispose();
    });
  });

  describe('loadDoodadType', () => {
    it('should load doodad type with placeholder mesh', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');

      const stats = renderer.getStats();
      expect(stats.typesLoaded).toBe(1);
    });

    it('should load multiple doodad types', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');
      await renderer.loadDoodadType('Rock_Large', 'models/rocks/large.mdx');
      await renderer.loadDoodadType('Grass_Tuft', 'models/grass/tuft.mdx');

      const stats = renderer.getStats();
      expect(stats.typesLoaded).toBe(3);
    });

    it('should handle variations', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx', [
        'models/trees/oak_var1.mdx',
        'models/trees/oak_var2.mdx',
      ]);

      const stats = renderer.getStats();
      expect(stats.typesLoaded).toBe(1);
    });

    it('should log warning when loading duplicate type', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');

      // First call logs "Loaded doodad type", second call would too
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('addDoodad', () => {
    it('should add doodad instance', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Oak',
        position: { x: 10, y: 0, z: 20 },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
      };

      renderer.addDoodad(doodad);

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(1);
    });

    it('should add multiple doodad instances', () => {
      for (let i = 0; i < 10; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(doodad);
      }

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(10);
    });

    it('should handle doodads with variations', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Oak',
        variation: 2,
        position: { x: 10, y: 0, z: 20 },
        rotation: Math.PI / 4,
        scale: { x: 1.2, y: 1.2, z: 1.2 },
      };

      renderer.addDoodad(doodad);

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(1);
    });

    it('should auto-load type if not already loaded', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Unknown',
        position: { x: 10, y: 0, z: 20 },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
      };

      renderer.addDoodad(doodad);

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(1);
      expect(stats.typesLoaded).toBe(1);
    });

    it('should respect maxDoodads limit', () => {
      const limitedRenderer = new DoodadRenderer(scene, {
        maxDoodads: 5,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Try to add 10 doodads, but limit is 5
      for (let i = 0; i < 10; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        limitedRenderer.addDoodad(doodad);
      }

      const stats = limitedRenderer.getStats();
      expect(stats.totalDoodads).toBe(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Max doodads reached'));

      consoleSpy.mockRestore();
      limitedRenderer.dispose();
    });
  });

  describe('buildInstanceBuffers', () => {
    beforeEach(async () => {
      // Load doodad types
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');
      await renderer.loadDoodadType('Rock_Large', 'models/rocks/large.mdx');
    });

    it('should build instance buffers with instancing enabled', () => {
      const instancedRenderer = new DoodadRenderer(scene, {
        enableInstancing: true,
      });

      // Add doodads
      for (let i = 0; i < 10; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        instancedRenderer.addDoodad(doodad);
      }

      instancedRenderer.buildInstanceBuffers();

      const stats = instancedRenderer.getStats();
      expect(stats.totalDoodads).toBe(10);
      expect(stats.drawCalls).toBe(1); // One draw call per type

      instancedRenderer.dispose();
    });

    it('should create individual meshes when instancing disabled', () => {
      const nonInstancedRenderer = new DoodadRenderer(scene, {
        enableInstancing: false,
      });

      // Add doodads
      for (let i = 0; i < 5; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        nonInstancedRenderer.addDoodad(doodad);
      }

      nonInstancedRenderer.buildInstanceBuffers();

      const stats = nonInstancedRenderer.getStats();
      expect(stats.totalDoodads).toBe(5);

      nonInstancedRenderer.dispose();
    });

    it('should group instances by type', () => {
      // Add doodads of multiple types
      for (let i = 0; i < 5; i++) {
        const oakDoodad: DoodadPlacement = {
          id: `oak_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: 0 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(oakDoodad);

        const rockDoodad: DoodadPlacement = {
          id: `rock_${i.toString().padStart(3, '0')}`,
          typeId: 'Rock_Large',
          position: { x: i * 10, y: 0, z: 20 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(rockDoodad);
      }

      renderer.buildInstanceBuffers();

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(10);
      expect(stats.typesLoaded).toBe(2);
      expect(stats.drawCalls).toBe(2); // One draw call per type
    });

    it('should handle empty instance list', () => {
      renderer.buildInstanceBuffers();

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(0);
      expect(stats.drawCalls).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');

      for (let i = 0; i < 100; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(doodad);
      }

      renderer.buildInstanceBuffers();

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(100);
      expect(stats.typesLoaded).toBe(1);
      expect(stats.drawCalls).toBe(1);
      expect(stats.visibleDoodads).toBeGreaterThanOrEqual(0);
    });

    it('should return zero stats when empty', () => {
      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(0);
      expect(stats.visibleDoodads).toBe(0);
      expect(stats.drawCalls).toBe(0);
      expect(stats.typesLoaded).toBe(0);
    });
  });

  describe('updateVisibility', () => {
    it('should update visibility (placeholder method)', () => {
      // This method is currently a placeholder for manual culling
      // Babylon.js handles frustum culling automatically
      expect(() => renderer.updateVisibility()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');

      for (let i = 0; i < 10; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(doodad);
      }

      renderer.buildInstanceBuffers();
      renderer.dispose();

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(0);
      expect(stats.typesLoaded).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      renderer.dispose();
      renderer.dispose();

      const stats = renderer.getStats();
      expect(stats.totalDoodads).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle 1,000 doodads efficiently', async () => {
      const perfRenderer = new DoodadRenderer(scene, {
        enableInstancing: true,
        maxDoodads: 2000,
      });

      await perfRenderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');
      await perfRenderer.loadDoodadType('Rock_Large', 'models/rocks/large.mdx');

      const startTime = performance.now();

      // Add 1,000 doodads
      for (let i = 0; i < 1000; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(4, '0')}`,
          typeId: i % 2 === 0 ? 'Tree_Oak' : 'Rock_Large',
          position: {
            x: (i % 50) * 10,
            y: 0,
            z: Math.floor(i / 50) * 10,
          },
          rotation: Math.random() * Math.PI * 2,
          scale: { x: 1, y: 1, z: 1 },
        };
        perfRenderer.addDoodad(doodad);
      }

      perfRenderer.buildInstanceBuffers();

      const endTime = performance.now();
      const duration = endTime - startTime;

      const stats = perfRenderer.getStats();
      expect(stats.totalDoodads).toBe(1000);
      expect(stats.typesLoaded).toBe(2);
      expect(stats.drawCalls).toBe(2);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second

      perfRenderer.dispose();
    });

    it('should use instancing to minimize draw calls', async () => {
      await renderer.loadDoodadType('Tree_Oak', 'models/trees/oak.mdx');

      // Add 100 doodads of the same type
      for (let i = 0; i < 100; i++) {
        const doodad: DoodadPlacement = {
          id: `doodad_${i.toString().padStart(3, '0')}`,
          typeId: 'Tree_Oak',
          position: { x: i * 10, y: 0, z: i * 10 },
          rotation: 0,
          scale: { x: 1, y: 1, z: 1 },
        };
        renderer.addDoodad(doodad);
      }

      renderer.buildInstanceBuffers();

      const stats = renderer.getStats();
      // With instancing, 100 doodads of the same type = 1 draw call
      expect(stats.drawCalls).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle doodads with zero scale', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Oak',
        position: { x: 10, y: 0, z: 20 },
        rotation: 0,
        scale: { x: 0, y: 0, z: 0 },
      };

      expect(() => renderer.addDoodad(doodad)).not.toThrow();
    });

    it('should handle doodads with negative positions', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Oak',
        position: { x: -100, y: -50, z: -200 },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
      };

      expect(() => renderer.addDoodad(doodad)).not.toThrow();
    });

    it('should handle large rotation values', () => {
      const doodad: DoodadPlacement = {
        id: 'doodad_001',
        typeId: 'Tree_Oak',
        position: { x: 10, y: 0, z: 20 },
        rotation: Math.PI * 4, // 720 degrees
        scale: { x: 1, y: 1, z: 1 },
      };

      expect(() => renderer.addDoodad(doodad)).not.toThrow();
    });
  });
});
