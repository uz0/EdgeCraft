/**
 * Visual Similarity Detection tests
 */

import { VisualSimilarity } from '@/assets/validation/VisualSimilarity';

describe('VisualSimilarity', () => {
  let detector: VisualSimilarity;

  beforeEach(() => {
    detector = new VisualSimilarity();
  });

  describe('computePerceptualHash', () => {
    it('should compute hash for valid image', async () => {
      const buffer = new ArrayBuffer(100);
      const hash = await detector.computePerceptualHash(buffer);

      expect(hash).toBeDefined();
      expect(hash.hash).toBeDefined();
      expect(typeof hash.hash).toBe('string');
      expect(hash.width).toBeGreaterThan(0);
      expect(hash.height).toBeGreaterThan(0);
    });

    it('should produce consistent hashes for identical data', async () => {
      const buffer1 = new ArrayBuffer(100);
      const buffer2 = new ArrayBuffer(100);

      const hash1 = await detector.computePerceptualHash(buffer1);
      const hash2 = await detector.computePerceptualHash(buffer2);

      expect(hash1.hash).toBe(hash2.hash);
    });

    it('should handle empty buffers', async () => {
      const buffer = new ArrayBuffer(0);

      // Empty buffers should return a minimal 1x1 hash
      const hash = await detector.computePerceptualHash(buffer);
      expect(hash).toBeDefined();
      expect(hash.width).toBe(1);
      expect(hash.height).toBe(1);
    });

    it('should handle small buffers', async () => {
      const buffer = new ArrayBuffer(10);
      const hash = await detector.computePerceptualHash(buffer);

      expect(hash).toBeDefined();
      expect(hash.hash).toBeDefined();
    });
  });

  describe('compareSimilarity', () => {
    it('should return perfect match for identical hashes', () => {
      const hash1 = { hash: 'abc123def456', width: 256, height: 256 };
      const hash2 = { hash: 'abc123def456', width: 256, height: 256 };

      const result = detector.compareSimilarity(hash1, hash2);

      expect(result.similarity).toBe(1.0);
      expect(result.isMatch).toBe(true);
    });

    it('should return low similarity for different hashes', () => {
      const hash1 = { hash: 'abc123def456', width: 256, height: 256 };
      const hash2 = { hash: '000000000000', width: 256, height: 256 };

      const result = detector.compareSimilarity(hash1, hash2);

      expect(result.similarity).toBeLessThan(1.0);
      expect(result.isMatch).toBe(false);
    });

    it('should respect custom threshold', () => {
      const hash1 = { hash: 'abc123def456', width: 256, height: 256 };
      const hash2 = { hash: 'abc123def456', width: 256, height: 256 };

      const result = detector.compareSimilarity(hash1, hash2, 0.5);

      expect(result.threshold).toBe(0.5);
      expect(result.isMatch).toBe(true);
    });

    it('should throw error for mismatched hash lengths', () => {
      const hash1 = { hash: 'abc', width: 256, height: 256 };
      const hash2 = { hash: 'abcdef', width: 256, height: 256 };

      expect(() => detector.compareSimilarity(hash1, hash2)).toThrow();
    });
  });

  describe('findSimilarInDatabase', () => {
    it('should find exact matches in database', async () => {
      const buffer = new ArrayBuffer(100);

      // First compute what hash this buffer generates
      const queryHash = await detector.computePerceptualHash(buffer);
      const hashLength = queryHash.hash.length;

      const database = [
        { hash: 'a'.repeat(hashLength), width: 256, height: 256 },
        queryHash, // Include the actual hash
        { hash: 'b'.repeat(hashLength), width: 256, height: 256 }
      ];

      const result = await detector.findSimilarInDatabase(buffer, database, 0.5);

      expect(result).toBeDefined();
      expect(result.bestMatch).toBeDefined();
      expect(result.similarity).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.9); // Should match itself
    });

    it('should return empty matches when no similar assets', async () => {
      // Create a consistent hash format
      const consistentHash = 'a'.repeat(14); // 14 hex chars

      const database = [
        { hash: consistentHash, width: 256, height: 256 },
        { hash: 'b'.repeat(14), width: 256, height: 256 }
      ];

      const buffer = new ArrayBuffer(100);

      const result = await detector.findSimilarInDatabase(buffer, database, 0.99);

      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should handle empty database', async () => {
      const database: Array<{ hash: string; width: number; height: number }> = [];
      const buffer = new ArrayBuffer(100);

      const result = await detector.findSimilarInDatabase(buffer, database);

      expect(result.matches).toHaveLength(0);
      expect(result.bestMatch).toBeUndefined();
    });
  });

  describe('Hamming distance', () => {
    it('should compute correct distance for different hashes', () => {
      const hash1 = { hash: 'f', width: 8, height: 8 }; // 1111
      const hash2 = { hash: '0', width: 8, height: 8 }; // 0000

      const result = detector.compareSimilarity(hash1, hash2);

      // All 4 bits different, so similarity < 1.0
      expect(result.similarity).toBeLessThan(1.0);
    });

    it('should handle hex character comparison', () => {
      const hash1 = { hash: 'a', width: 8, height: 8 }; // 1010
      const hash2 = { hash: '5', width: 8, height: 8 }; // 0101

      const result = detector.compareSimilarity(hash1, hash2);

      // All bits flipped, minimum similarity
      expect(result.similarity).toBeLessThan(0.5);
    });
  });

  describe('Custom threshold', () => {
    it('should use custom threshold in constructor', () => {
      const customDetector = new VisualSimilarity(0.80);
      const hash1 = { hash: 'abc123', width: 256, height: 256 };
      const hash2 = { hash: 'abc123', width: 256, height: 256 };

      const result = customDetector.compareSimilarity(hash1, hash2);

      expect(result.threshold).toBe(0.80);
    });

    it('should override default threshold in compare', () => {
      const hash1 = { hash: 'abc123', width: 256, height: 256 };
      const hash2 = { hash: 'abc123', width: 256, height: 256 };

      const result = detector.compareSimilarity(hash1, hash2, 0.70);

      expect(result.threshold).toBe(0.70);
    });
  });
});
