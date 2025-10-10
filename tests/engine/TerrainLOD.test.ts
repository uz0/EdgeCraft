/**
 * Terrain LOD System tests
 */

import { getLODLevel, getSubdivisions, calculateOptimalChunkSize, DEFAULT_LOD_CONFIG } from '@/engine/terrain/TerrainLOD';

describe('TerrainLOD', () => {
  describe('getLODLevel', () => {
    it('should return LOD 0 for close distances (0-200m)', () => {
      expect(getLODLevel(0)).toBe(0);
      expect(getLODLevel(100)).toBe(0);
      expect(getLODLevel(199)).toBe(0);
    });

    it('should return LOD 1 for medium distances (200-400m)', () => {
      expect(getLODLevel(200)).toBe(1);
      expect(getLODLevel(300)).toBe(1);
      expect(getLODLevel(399)).toBe(1);
    });

    it('should return LOD 2 for far distances (400-800m)', () => {
      expect(getLODLevel(400)).toBe(2);
      expect(getLODLevel(600)).toBe(2);
      expect(getLODLevel(799)).toBe(2);
    });

    it('should return LOD 3 for very far distances (800m+)', () => {
      expect(getLODLevel(800)).toBe(3);
      expect(getLODLevel(1000)).toBe(3);
      expect(getLODLevel(10000)).toBe(3);
    });

    it('should use custom LOD config', () => {
      const customConfig = {
        levels: [32, 16, 8, 4],
        distances: [100, 200, 300],
      };

      expect(getLODLevel(50, customConfig)).toBe(0);
      expect(getLODLevel(150, customConfig)).toBe(1);
      expect(getLODLevel(250, customConfig)).toBe(2);
      expect(getLODLevel(350, customConfig)).toBe(3);
    });
  });

  describe('getSubdivisions', () => {
    it('should return correct subdivisions for each LOD level', () => {
      expect(getSubdivisions(0)).toBe(64); // LOD 0
      expect(getSubdivisions(1)).toBe(32); // LOD 1
      expect(getSubdivisions(2)).toBe(16); // LOD 2
      expect(getSubdivisions(3)).toBe(8);  // LOD 3
    });

    it('should return last level subdivisions for out of bounds index', () => {
      expect(getSubdivisions(99)).toBe(8); // Fallback to LOD 3
    });

    it('should use custom LOD config', () => {
      const customConfig = {
        levels: [128, 64, 32, 16],
        distances: [100, 200, 300],
      };

      expect(getSubdivisions(0, customConfig)).toBe(128);
      expect(getSubdivisions(1, customConfig)).toBe(64);
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('should return 64 for 256x256 terrain', () => {
      const chunkSize = calculateOptimalChunkSize(256, 256);
      expect(chunkSize).toBe(64);
    });

    it('should return power of 2 chunk size', () => {
      const chunkSize = calculateOptimalChunkSize(300, 300);
      expect(Math.log2(chunkSize) % 1).toBe(0); // Power of 2
    });

    it('should handle large terrains', () => {
      const chunkSize = calculateOptimalChunkSize(1024, 1024);
      expect(chunkSize).toBeGreaterThan(0);
      expect(Math.log2(chunkSize) % 1).toBe(0); // Power of 2
    });

    it('should handle small terrains', () => {
      const chunkSize = calculateOptimalChunkSize(64, 64);
      expect(chunkSize).toBeGreaterThan(0);
      expect(Math.log2(chunkSize) % 1).toBe(0); // Power of 2
    });

    it('should handle rectangular terrains', () => {
      const chunkSize = calculateOptimalChunkSize(512, 256);
      expect(chunkSize).toBeGreaterThan(0);
      expect(Math.log2(chunkSize) % 1).toBe(0); // Power of 2
    });
  });

  describe('DEFAULT_LOD_CONFIG', () => {
    it('should have 4 LOD levels', () => {
      expect(DEFAULT_LOD_CONFIG.levels).toHaveLength(4);
      expect(DEFAULT_LOD_CONFIG.levels).toEqual([64, 32, 16, 8]);
    });

    it('should have 3 distance thresholds', () => {
      expect(DEFAULT_LOD_CONFIG.distances).toHaveLength(3);
      expect(DEFAULT_LOD_CONFIG.distances).toEqual([200, 400, 800]);
    });

    it('should have distances in ascending order', () => {
      for (let i = 1; i < DEFAULT_LOD_CONFIG.distances.length; i++) {
        const current = DEFAULT_LOD_CONFIG.distances[i];
        const previous = DEFAULT_LOD_CONFIG.distances[i - 1];
        expect(current).toBeDefined();
        expect(previous).toBeDefined();
        expect(current).toBeGreaterThan(previous!);
      }
    });

    it('should have subdivisions in descending order', () => {
      for (let i = 1; i < DEFAULT_LOD_CONFIG.levels.length; i++) {
        const current = DEFAULT_LOD_CONFIG.levels[i];
        const previous = DEFAULT_LOD_CONFIG.levels[i - 1];
        expect(current).toBeDefined();
        expect(previous).toBeDefined();
        expect(current).toBeLessThan(previous!);
      }
    });
  });
});
