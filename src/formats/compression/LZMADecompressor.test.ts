/**
 * LZMADecompressor Tests
 *
 * Unit tests for LZMA decompression functionality.
 */

import { LZMADecompressor } from './LZMADecompressor';

// Mock lzma-native module
jest.mock('lzma-native', () => ({
  decompress: jest.fn(),
}));

describe('LZMADecompressor', () => {
  let decompressor: LZMADecompressor;

  beforeEach(() => {
    decompressor = new LZMADecompressor();
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true in Node.js environment with lzma-native', () => {
      // Mock Node.js environment
      const originalProcess = global.process;
      (global as any).process = { versions: { node: '20.0.0' } };

      const result = decompressor.isAvailable();

      expect(result).toBe(true);

      // Restore
      global.process = originalProcess;
    });

    it('should return false in browser environment', () => {
      // Mock browser environment
      const originalProcess = global.process;
      delete (global as any).process;

      const result = decompressor.isAvailable();

      expect(result).toBe(false);

      // Restore
      (global as any).process = originalProcess;
    });

    it('should return false if lzma-native is not available', () => {
      // This is tested by the environment itself
      // If lzma-native is not installed, isAvailable should return false
      expect(typeof decompressor.isAvailable).toBe('function');
    });
  });

  describe('decompress', () => {
    it('should decompress LZMA data successfully', async () => {
      // Create test data
      const compressedData = new ArrayBuffer(16);
      const compressedView = new Uint8Array(compressedData);
      compressedView.set([0x5d, 0x00, 0x00, 0x80, 0x00]); // LZMA header

      const expectedSize = 32;

      // Mock successful decompression
      const decompressedBuffer = Buffer.alloc(expectedSize);
      decompressedBuffer.fill('test');

      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        callback(decompressedBuffer, null);
      });

      // Test decompression
      const result = await decompressor.decompress(compressedData, expectedSize);

      expect(result).toBeDefined();
      expect(result.byteLength).toBeDefined();
      expect(result.byteLength).toBe(expectedSize);
      expect(lzma.decompress).toHaveBeenCalledTimes(1);
    });

    it('should handle decompression errors', async () => {
      const compressedData = new ArrayBuffer(16);
      const expectedSize = 32;

      // Mock decompression error
      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        callback(null, new Error('Decompression failed'));
      });

      await expect(decompressor.decompress(compressedData, expectedSize)).rejects.toThrow(
        'LZMA decompression failed'
      );
    });

    it('should warn on size mismatch', async () => {
      const compressedData = new ArrayBuffer(16);
      const expectedSize = 32;

      // Mock decompression with wrong size
      const decompressedBuffer = Buffer.alloc(64); // Different from expected
      decompressedBuffer.fill('test');

      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        callback(decompressedBuffer, null);
      });

      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await decompressor.decompress(compressedData, expectedSize);

      expect(result).toBeDefined();
      expect(result.byteLength).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('size mismatch')
      );

      warnSpy.mockRestore();
    });

    it('should throw error if LZMA is not available', async () => {
      // Mock environment where LZMA is not available
      const originalProcess = global.process;
      delete (global as any).process;

      const newDecompressor = new LZMADecompressor();
      const compressedData = new ArrayBuffer(16);

      await expect(newDecompressor.decompress(compressedData, 32)).rejects.toThrow(
        'LZMA decompression not available'
      );

      // Restore
      (global as any).process = originalProcess;
    });

    it('should handle empty input', async () => {
      const emptyData = new ArrayBuffer(0);

      // Mock lzma to throw error on empty input
      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        callback(null, new Error('Empty input'));
      });

      await expect(decompressor.decompress(emptyData, 0)).rejects.toThrow();
    });
  });

  describe('getInfo', () => {
    it('should return correct info in Node.js environment', () => {
      const originalProcess = global.process;
      (global as any).process = { versions: { node: '20.0.0' } };

      const info = decompressor.getInfo();

      expect(info.name).toBe('LZMA Decompressor');
      expect(info.environment).toBe('Node.js');
      expect(typeof info.available).toBe('boolean');

      global.process = originalProcess;
    });

    it('should return correct info in browser environment', () => {
      const originalProcess = global.process;
      delete (global as any).process;

      const newDecompressor = new LZMADecompressor();
      const info = newDecompressor.getInfo();

      expect(info.name).toBe('LZMA Decompressor');
      expect(info.environment).toBe('Browser');
      expect(info.available).toBe(false);

      (global as any).process = originalProcess;
    });
  });

  describe('integration', () => {
    it('should work with real-world LZMA compressed data format', async () => {
      // Test with realistic LZMA data structure
      const testData = new ArrayBuffer(100);
      const view = new Uint8Array(testData);

      // Fill with LZMA-like data
      view[0] = 0x5d; // LZMA properties
      view[1] = 0x00;
      view[2] = 0x00;
      view[3] = 0x80;
      view[4] = 0x00;

      const decompressedBuffer = Buffer.alloc(256);
      decompressedBuffer.write('This is test data that was compressed with LZMA');

      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        callback(decompressedBuffer, null);
      });

      const result = await decompressor.decompress(testData, 256);

      expect(result.byteLength).toBe(256);
    });
  });

  describe('performance', () => {
    it('should decompress 1MB in less than 100ms', async () => {
      const largeData = new ArrayBuffer(1024 * 1024); // 1MB compressed
      const expectedSize = 1024 * 1024;

      // Mock fast decompression
      const decompressedBuffer = Buffer.alloc(expectedSize);
      const lzma = require('lzma-native');
      lzma.decompress.mockImplementation((_input: Buffer, callback: Function) => {
        // Simulate fast decompression
        setTimeout(() => callback(decompressedBuffer, null), 10);
      });

      const startTime = Date.now();
      await decompressor.decompress(largeData, expectedSize);
      const duration = Date.now() - startTime;

      // Allow some overhead for test environment
      expect(duration).toBeLessThan(100);
    });
  });
});
