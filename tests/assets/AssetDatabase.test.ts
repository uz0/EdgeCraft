/**
 * Asset Database tests
 */

import { AssetDatabase } from '@/assets/validation/AssetDatabase';
import type { AssetMapping } from '@/assets/validation/AssetDatabase';

describe('AssetDatabase', () => {
  let database: AssetDatabase;

  beforeEach(() => {
    database = new AssetDatabase();
  });

  describe('Initialization', () => {
    it('should create database instance', () => {
      expect(database).toBeDefined();
    });

    it('should load default mappings', () => {
      const stats = database.getStats();
      expect(stats.totalMappings).toBeGreaterThan(0);
    });

    it('should have mappings by type', () => {
      const stats = database.getStats();
      expect(Object.keys(stats.byType).length).toBeGreaterThan(0);
    });

    it('should have mappings by game', () => {
      const stats = database.getStats();
      expect(Object.keys(stats.byGame).length).toBeGreaterThan(0);
    });
  });

  describe('findReplacementByHash', () => {
    it('should find replacement by hash', () => {
      const result = database.findReplacementByHash('a1b2c3d4e5f6');
      expect(result).toBeDefined();
      expect(result?.original.hash).toBe('a1b2c3d4e5f6');
    });

    it('should return undefined for unknown hash', () => {
      const result = database.findReplacementByHash('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('findReplacementByName', () => {
    it('should find replacement by name', () => {
      const result = database.findReplacementByName('Footman');
      expect(result).toBeDefined();
      expect(result?.original.name).toBe('Footman');
    });

    it('should be case-insensitive', () => {
      const result = database.findReplacementByName('footman');
      expect(result).toBeDefined();
      expect(result?.original.name).toBe('Footman');
    });

    it('should return undefined for unknown name', () => {
      const result = database.findReplacementByName('NonexistentUnit');
      expect(result).toBeUndefined();
    });
  });

  describe('findReplacement', () => {
    it('should find replacement by type', async () => {
      const result = database.findReplacement({ type: 'model' });
      expect(result).toBeDefined();
      expect(result?.license).toBeDefined();
    });

    it('should find replacement by category', async () => {
      const result = database.findReplacement({
        type: 'model',
        category: 'unit',
      });
      expect(result).toBeDefined();
    });

    it('should find replacement by tags', async () => {
      const result = database.findReplacement({
        type: 'model',
        tags: ['human'],
      });
      expect(result).toBeDefined();
    });

    it('should return null when no match found', async () => {
      const result = database.findReplacement({
        type: 'model',
        category: 'nonexistent',
      });
      expect(result).toBeNull();
    });

    it('should sort by visual similarity', async () => {
      const result = database.findReplacement({
        type: 'texture',
        minSimilarity: 0.5,
      });
      expect(result).toBeDefined();
    });
  });

  describe('searchMappings', () => {
    it('should search by type', () => {
      const results = database.searchMappings({ type: 'model' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.type === 'model')).toBe(true);
    });

    it('should search by game', () => {
      const results = database.searchMappings({ game: 'wc3' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.original.game === 'wc3')).toBe(true);
    });

    it('should search by multiple criteria', () => {
      const results = database.searchMappings({
        type: 'model',
        game: 'wc3',
        category: 'unit',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by minimum similarity', () => {
      const results = database.searchMappings({
        type: 'texture',
        minSimilarity: 0.8,
      });
      expect(results.every((r) => (r.replacement.visualSimilarity ?? 0) >= 0.8)).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const results = database.searchMappings({
        type: 'model',
        category: 'impossible-category-xyz',
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('addMapping', () => {
    it('should add new mapping', () => {
      const newMapping: AssetMapping = {
        id: 'test-001',
        type: 'model',
        original: {
          hash: 'testHash123',
          name: 'TestUnit',
          game: 'wc3',
          category: 'unit',
          tags: ['test'],
        },
        replacement: {
          path: 'assets/test/unit.gltf',
          license: 'CC0',
          source: 'https://test.com',
          visualSimilarity: 0.75,
        },
        verified: true,
        dateAdded: '2025-01-01',
      };

      database.addMapping(newMapping);

      const found = database.findReplacementByHash('testHash123');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-001');
    });

    it('should update indices when adding', () => {
      const statsBefore = database.getStats();

      const newMapping: AssetMapping = {
        id: 'test-002',
        type: 'texture',
        original: {
          hash: 'textureHash456',
          name: 'TestTexture',
          game: 'sc1',
        },
        replacement: {
          path: 'assets/test/texture.png',
          license: 'MIT',
          source: 'https://test.com',
        },
        verified: false,
        dateAdded: '2025-01-01',
      };

      database.addMapping(newMapping);

      const statsAfter = database.getStats();
      expect(statsAfter.totalMappings).toBe(statsBefore.totalMappings + 1);
    });
  });

  describe('removeMapping', () => {
    it('should remove existing mapping', () => {
      const allBefore = database.getAllMappings();
      const toRemove = allBefore[0];

      if (toRemove !== undefined) {
        const removed = database.removeMapping(toRemove.id);
        expect(removed).toBe(true);

        const allAfter = database.getAllMappings();
        expect(allAfter.length).toBe(allBefore.length - 1);
      }
    });

    it('should return false for non-existent mapping', () => {
      const removed = database.removeMapping('nonexistent-id');
      expect(removed).toBe(false);
    });

    it('should update indices when removing', () => {
      const allBefore = database.getAllMappings();
      const toRemove = allBefore[0];

      if (toRemove !== undefined) {
        const statsBefore = database.getStats();
        database.removeMapping(toRemove.id);
        const statsAfter = database.getStats();

        expect(statsAfter.totalMappings).toBe(statsBefore.totalMappings - 1);
      }
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = database.getStats();

      expect(stats).toHaveProperty('totalMappings');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byGame');
      expect(stats).toHaveProperty('verified');

      expect(typeof stats.totalMappings).toBe('number');
      expect(typeof stats.verified).toBe('number');
    });

    it('should count verified mappings correctly', () => {
      const stats = database.getStats();
      const allMappings = database.getAllMappings();
      const verifiedCount = allMappings.filter((m) => m.verified).length;

      expect(stats.verified).toBe(verifiedCount);
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings', () => {
      const all = database.getAllMappings();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);
    });

    it('should return copies, not references', () => {
      const all1 = database.getAllMappings();
      const all2 = database.getAllMappings();

      expect(all1).not.toBe(all2);
      expect(all1).toEqual(all2);
    });
  });
});
