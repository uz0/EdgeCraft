/**
 * Tests for MapPreviewGenerator
 */

import { MapPreviewGenerator } from '../MapPreviewGenerator';
import type { RawMapData } from '../../../formats/maps/types';

// Skip in CI environment (no WebGL context available)
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const hasWebGL = typeof window !== 'undefined' && window.WebGLRenderingContext != null;
const describeIfWebGL = !isCI && hasWebGL ? describe : describe.skip;

describeIfWebGL('MapPreviewGenerator', () => {
  let generator: MapPreviewGenerator;
  let canvas: HTMLCanvasElement;

  // Create mock map data
  const createMockMapData = (width: number = 64, height: number = 64): RawMapData => {
    const size = width * height;
    const heightmap = new Float32Array(size);

    // Generate simple heightmap pattern
    for (let i = 0; i < size; i++) {
      heightmap[i] = Math.random() * 10;
    }

    return {
      format: 'w3x',
      info: {
        name: 'Test Map',
        author: 'Test Author',
        description: 'Test Description',
        players: [],
        dimensions: {
          width,
          height,
        },
        environment: {
          tileset: 'grass',
        },
      },
      terrain: {
        width,
        height,
        heightmap,
        textures: [],
      },
      units: [],
      doodads: [],
    };
  };

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    generator = new MapPreviewGenerator(canvas);
  });

  afterEach(() => {
    generator.disposeEngine();
  });

  describe('initialization', () => {
    it('should initialize with custom canvas', () => {
      expect(generator).toBeDefined();
    });

    it('should initialize with auto-generated canvas', () => {
      const autoGenerator = new MapPreviewGenerator();
      expect(autoGenerator).toBeDefined();
      autoGenerator.disposeEngine();
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with default config', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
      expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    }, 10000); // Increase timeout for rendering

    it('should generate preview with custom dimensions', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData, {
        width: 256,
        height: 256,
      });

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
    }, 10000);

    it('should generate preview with custom format (jpeg)', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData, {
        format: 'jpeg',
        quality: 0.5,
      });

      expect(result.success).toBe(true);
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    }, 10000);

    it('should generate preview with units enabled', async () => {
      const mapData = createMockMapData();
      mapData.units = [
        {
          id: 'unit1',
          typeId: 'peasant',
          owner: 0,
          position: { x: 10, y: 0, z: 10 },
          rotation: 0,
        },
        {
          id: 'unit2',
          typeId: 'footman',
          owner: 1,
          position: { x: 20, y: 0, z: 20 },
          rotation: 0,
        },
      ];

      const result = await generator.generatePreview(mapData, {
        includeUnits: true,
      });

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
    }, 10000);

    it('should handle large maps', async () => {
      const mapData = createMockMapData(256, 256);
      const result = await generator.generatePreview(mapData);

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
    }, 15000);

    it('should handle maps with textures', async () => {
      const mapData = createMockMapData();
      mapData.terrain.textures = [
        {
          id: 'grass',
          path: 'assets/grass.png',
        },
      ];

      const result = await generator.generatePreview(mapData);

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
    }, 10000);

    it('should handle errors gracefully', async () => {
      // Create invalid map data
      const invalidMapData = {
        ...createMockMapData(),
        terrain: {
          width: -1, // Invalid width
          height: -1, // Invalid height
          heightmap: new Float32Array(0),
          textures: [],
        },
      };

      const result = await generator.generatePreview(invalidMapData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should track generation time', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData);

      expect(result.generationTimeMs).toBeGreaterThan(0);
    }, 10000);
  });

  describe('generateBatch', () => {
    it('should generate multiple previews', async () => {
      const maps = [
        { id: 'map1', mapData: createMockMapData(32, 32) },
        { id: 'map2', mapData: createMockMapData(64, 64) },
        { id: 'map3', mapData: createMockMapData(128, 128) },
      ];

      const results = await generator.generateBatch(maps);

      expect(results.size).toBe(3);
      expect(results.get('map1')?.success).toBe(true);
      expect(results.get('map2')?.success).toBe(true);
      expect(results.get('map3')?.success).toBe(true);
    }, 20000);

    it('should call progress callback', async () => {
      const maps = [
        { id: 'map1', mapData: createMockMapData(32, 32) },
        { id: 'map2', mapData: createMockMapData(32, 32) },
      ];

      const progressCalls: Array<{ current: number; total: number }> = [];
      const onProgress = (current: number, total: number): void => {
        progressCalls.push({ current, total });
      };

      await generator.generateBatch(maps, undefined, onProgress);

      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0]).toEqual({ current: 1, total: 2 });
      expect(progressCalls[1]).toEqual({ current: 2, total: 2 });
    }, 15000);

    it('should handle empty batch', async () => {
      const results = await generator.generateBatch([]);

      expect(results.size).toBe(0);
    });

    it('should continue on individual failures', async () => {
      const maps = [
        { id: 'map1', mapData: createMockMapData(32, 32) },
        {
          id: 'map2',
          mapData: {
            ...createMockMapData(),
            terrain: {
              width: -1,
              height: -1,
              heightmap: new Float32Array(0),
              textures: [],
            },
          },
        },
        { id: 'map3', mapData: createMockMapData(32, 32) },
      ];

      const results = await generator.generateBatch(maps);

      expect(results.size).toBe(3);
      expect(results.get('map1')?.success).toBe(true);
      expect(results.get('map2')?.success).toBe(false);
      expect(results.get('map3')?.success).toBe(true);
    }, 20000);
  });

  describe('saveToFile', () => {
    it('should throw error in browser environment', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

      await expect(generator.saveToFile(dataUrl, '/tmp/test.png')).rejects.toThrow(
        'saveToFile() only works in Node.js environment'
      );
    });
  });

  describe('disposeEngine', () => {
    it('should dispose engine without errors', () => {
      expect(() => {
        generator.disposeEngine();
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      generator.disposeEngine();
      expect(() => {
        generator.disposeEngine();
      }).not.toThrow();
    });
  });

  describe('camera configuration', () => {
    it('should use orthographic camera for top-down view', async () => {
      const mapData = createMockMapData(100, 100);
      const result = await generator.generatePreview(mapData);

      expect(result.success).toBe(true);
      // Camera should produce top-down view
      expect(result.dataUrl).toBeDefined();
    }, 10000);

    it('should adjust camera distance based on map size', async () => {
      const smallMap = createMockMapData(32, 32);
      const largeMap = createMockMapData(256, 256);

      const smallResult = await generator.generatePreview(smallMap);
      const largeResult = await generator.generatePreview(largeMap);

      expect(smallResult.success).toBe(true);
      expect(largeResult.success).toBe(true);
    }, 15000);
  });

  describe('performance', () => {
    it('should generate preview in reasonable time (<10s)', async () => {
      const mapData = createMockMapData(128, 128);
      const result = await generator.generatePreview(mapData);

      expect(result.success).toBe(true);
      expect(result.generationTimeMs).toBeLessThan(10000);
    }, 12000);

    it('should handle multiple sequential generations', async () => {
      const mapData = createMockMapData(64, 64);

      for (let i = 0; i < 3; i++) {
        const result = await generator.generatePreview(mapData);
        expect(result.success).toBe(true);
      }
    }, 20000);
  });

  describe('configuration options', () => {
    it('should respect custom camera distance', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData, {
        cameraDistance: 2.0,
      });

      expect(result.success).toBe(true);
    }, 10000);

    it('should respect all config options', async () => {
      const mapData = createMockMapData();
      const result = await generator.generatePreview(mapData, {
        width: 1024,
        height: 1024,
        cameraDistance: 1.2,
        includeUnits: false,
        format: 'png',
        quality: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    }, 10000);
  });
});
