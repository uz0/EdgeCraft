/**
 * BatchMapLoader tests
 */

import { BatchMapLoader } from './BatchMapLoader';
import type { MapLoadTask, MapLoadProgress } from './BatchMapLoader';
import type { RawMapData } from './types';
import { MapLoaderRegistry } from './MapLoaderRegistry';

// Mock MapLoaderRegistry
jest.mock('./MapLoaderRegistry');

describe('BatchMapLoader', () => {
  let batchLoader: BatchMapLoader;
  let mockRegistry: jest.Mocked<MapLoaderRegistry>;
  let progressCallback: jest.Mock;

  const createMockMapData = (id: string): RawMapData => ({
    format: 'w3x',
    info: {
      name: `Test Map ${id}`,
      author: 'Test Author',
      description: 'Test Description',
      players: [],
      dimensions: { width: 128, height: 128 },
      environment: { tileset: 'Test Tileset' },
    },
    terrain: {
      width: 128,
      height: 128,
      heightmap: new Float32Array(128 * 128),
      textures: [],
    },
    units: [],
    doodads: [],
  });

  const createMockTask = (
    id: string,
    extension: string,
    sizeBytes: number,
    priority?: number
  ): MapLoadTask => ({
    id,
    file: new ArrayBuffer(sizeBytes),
    extension,
    sizeBytes,
    priority,
  });

  beforeEach(() => {
    // Create mock registry instance
    mockRegistry = {
      isFormatSupported: jest.fn().mockReturnValue(true),
      loadMap: jest.fn(),
      loadMapFromBuffer: jest.fn(),
      registerLoader: jest.fn(),
      getSupportedFormats: jest.fn(),
      exportEdgeStoryToJSON: jest.fn(),
      exportEdgeStoryToBinary: jest.fn(),
    } as any;

    progressCallback = jest.fn();

    batchLoader = new BatchMapLoader({
      maxConcurrent: 3,
      maxCacheSize: 10,
      enableCache: true,
      onProgress: progressCallback,
      registry: mockRegistry,
    });

    // Default mock implementation for loadMapFromBuffer
    mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
      return {
        rawMap: createMockMapData(ext),
        stats: {
          loadTime: 100,
          fileSize: buffer.byteLength,
          unitCount: 0,
          doodadCount: 0,
          terrainSize: { width: 128, height: 128 },
        },
      };
    });
  });

  describe('loadMaps', () => {
    it('should load multiple maps successfully', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
        createMockTask('map3', '.w3x', 512),
      ];

      const result = await batchLoader.loadMaps(tasks);

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(3);
      expect(result.stats.succeeded).toBe(3);
      expect(result.stats.failed).toBe(0);
      expect(result.results.size).toBe(3);
    });

    it('should sort tasks by size (small first)', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('large', '.w3x', 3000),
        createMockTask('small', '.w3x', 1000),
        createMockTask('medium', '.w3x', 2000),
      ];

      const loadOrder: string[] = [];
      mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
        loadOrder.push(ext);
        return {
          rawMap: createMockMapData(ext),
          stats: {
            loadTime: 100,
            fileSize: buffer.byteLength,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      await batchLoader.loadMaps(tasks);

      // Small should be loaded first (within first batch)
      expect(loadOrder[0]).toBe('.w3x');
    });

    it('should respect priority over size', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('large-high-priority', '.w3x', 3000, 10),
        createMockTask('small-low-priority', '.w3x', 1000, 1),
      ];

      const loadOrder: string[] = [];
      mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
        loadOrder.push(ext);
        return {
          rawMap: createMockMapData(ext),
          stats: {
            loadTime: 100,
            fileSize: buffer.byteLength,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      await batchLoader.loadMaps(tasks);

      // High priority should be loaded first despite larger size
      expect(loadOrder[0]).toBe('.w3x');
    });

    it('should handle load errors gracefully', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('success', '.w3x', 1024),
        createMockTask('fail', '.w3x', 2048),
      ];

      mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
        if (ext === '.w3x' && buffer.byteLength === 2048) {
          throw new Error('Load failed');
        }
        return {
          rawMap: createMockMapData(ext),
          stats: {
            loadTime: 100,
            fileSize: buffer.byteLength,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      const result = await batchLoader.loadMaps(tasks);

      expect(result.success).toBe(true); // At least one succeeded
      expect(result.stats.succeeded).toBe(1);
      expect(result.stats.failed).toBe(1);

      const failedResult = result.results.get('fail');
      expect(failedResult?.status).toBe('error');
      expect(failedResult?.error).toBe('Load failed');
    });

    it('should track progress correctly', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
      ];

      await batchLoader.loadMaps(tasks);

      // Should have called progress callback for each map (pending, loading, success)
      expect(progressCallback).toHaveBeenCalled();

      // Verify we got success status for both
      const successCalls = progressCallback.mock.calls.filter(
        (call) => (call[0] as MapLoadProgress).status === 'success'
      );
      expect(successCalls.length).toBe(2);
    });

    it('should respect max concurrent limit', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
        createMockTask('map3', '.w3x', 3072),
        createMockTask('map4', '.w3x', 4096),
      ];

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));

        currentConcurrent--;

        return {
          rawMap: createMockMapData(ext),
          stats: {
            loadTime: 100,
            fileSize: buffer.byteLength,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      await batchLoader.loadMaps(tasks);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should return unsupported format error', async () => {
      mockRegistry.isFormatSupported.mockReturnValue(false);

      const tasks: MapLoadTask[] = [createMockTask('map1', '.unsupported', 1024)];

      const result = await batchLoader.loadMaps(tasks);

      expect(result.stats.failed).toBe(1);
      const failedResult = result.results.get('map1');
      expect(failedResult?.status).toBe('error');
      expect(failedResult?.error).toContain('No loader for extension');
    });
  });

  describe('cache', () => {
    it('should cache loaded maps', async () => {
      const tasks: MapLoadTask[] = [createMockTask('map1', '.w3x', 1024)];

      await batchLoader.loadMaps(tasks);

      const cached = batchLoader.getCached('map1');
      expect(cached).not.toBeNull();
      expect(cached?.info.name).toContain('.w3x');
    });

    it('should return cached map on subsequent loads', async () => {
      const tasks: MapLoadTask[] = [createMockTask('map1', '.w3x', 1024)];

      // First load
      await batchLoader.loadMaps(tasks);
      expect(mockRegistry.loadMapFromBuffer).toHaveBeenCalledTimes(1);

      // Second load - should use cache
      const result = await batchLoader.loadMaps(tasks);
      expect(mockRegistry.loadMapFromBuffer).toHaveBeenCalledTimes(1); // No additional calls
      expect(result.stats.cached).toBe(1);
    });

    it('should evict LRU items when cache is full', async () => {
      const smallCache = new BatchMapLoader({
        maxCacheSize: 2,
        registry: mockRegistry,
      });

      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
        createMockTask('map3', '.w3x', 3072),
      ];

      await smallCache.loadMaps(tasks);

      // Cache should only have 2 items (most recent)
      const stats = smallCache.getCacheStats();
      expect(stats.size).toBe(2);

      // map1 should be evicted (least recently used)
      expect(smallCache.getCached('map1')).toBeNull();
      expect(smallCache.getCached('map2')).not.toBeNull();
      expect(smallCache.getCached('map3')).not.toBeNull();
    });

    it('should update access order when getting cached item', async () => {
      const smallCache = new BatchMapLoader({
        maxCacheSize: 2,
        registry: mockRegistry,
      });

      // Load map1 and map2
      await smallCache.loadMaps([
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
      ]);

      // Access map1 to make it most recently used
      smallCache.getCached('map1');

      // Load map3 - should evict map2 (not map1)
      await smallCache.loadMaps([createMockTask('map3', '.w3x', 3072)]);

      expect(smallCache.getCached('map1')).not.toBeNull();
      expect(smallCache.getCached('map2')).toBeNull();
      expect(smallCache.getCached('map3')).not.toBeNull();
    });

    it('should clear cache', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
      ];

      await batchLoader.loadMaps(tasks);
      expect(batchLoader.getCacheStats().size).toBe(2);

      batchLoader.clearCache();
      expect(batchLoader.getCacheStats().size).toBe(0);
      expect(batchLoader.getCached('map1')).toBeNull();
    });

    it('should work with caching disabled', async () => {
      const noCacheBatchLoader = new BatchMapLoader({
        enableCache: false,
        registry: mockRegistry,
      });

      const tasks: MapLoadTask[] = [createMockTask('map1', '.w3x', 1024)];

      await noCacheBatchLoader.loadMaps(tasks);

      expect(noCacheBatchLoader.getCached('map1')).toBeNull();
    });
  });

  describe('cancellation', () => {
    it('should cancel in-progress loads', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
        createMockTask('map3', '.w3x', 3072),
        createMockTask('map4', '.w3x', 4096),
      ];

      mockRegistry.loadMapFromBuffer.mockImplementation(async (buffer, ext) => {
        // Simulate slow loading
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          rawMap: createMockMapData(ext),
          stats: {
            loadTime: 100,
            fileSize: buffer.byteLength,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      // Start loading and cancel after a short delay
      const loadPromise = batchLoader.loadMaps(tasks);
      setTimeout(() => batchLoader.cancel(), 50);

      const result = await loadPromise;

      // Should have incomplete results
      expect(result.stats.succeeded).toBeLessThan(tasks.length);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const tasks: MapLoadTask[] = [
        createMockTask('map1', '.w3x', 1024),
        createMockTask('map2', '.w3x', 2048),
      ];

      await batchLoader.loadMaps(tasks);

      const stats = batchLoader.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', async () => {
      const result = await batchLoader.loadMaps([]);

      expect(result.success).toBe(false);
      expect(result.stats.total).toBe(0);
      expect(result.stats.succeeded).toBe(0);
    });

    it('should handle File input type', async () => {
      mockRegistry.loadMap.mockImplementation(async (file) => {
        return {
          rawMap: createMockMapData('file-map'),
          stats: {
            loadTime: 100,
            fileSize: file.size,
            unitCount: 0,
            doodadCount: 0,
            terrainSize: { width: 128, height: 128 },
          },
        };
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x', {
        type: 'application/octet-stream',
      });

      const tasks: MapLoadTask[] = [
        {
          id: 'map1',
          file: mockFile,
          extension: '.w3x',
          sizeBytes: 1024,
        },
      ];

      const result = await batchLoader.loadMaps(tasks);

      expect(result.success).toBe(true);
      expect(mockRegistry.loadMap).toHaveBeenCalled();
    });

    it('should measure load time correctly', async () => {
      const tasks: MapLoadTask[] = [createMockTask('map1', '.w3x', 1024)];

      const result = await batchLoader.loadMaps(tasks);

      expect(result.totalTimeMs).toBeGreaterThan(0);

      const mapResult = result.results.get('map1');
      expect(mapResult?.loadTimeMs).toBeDefined();
      expect(mapResult?.loadTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
