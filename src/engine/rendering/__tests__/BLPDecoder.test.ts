/**
 * Tests for BLPDecoder
 */

import { BLPDecoder } from '../BLPDecoder';

describe('BLPDecoder', () => {
  let decoder: BLPDecoder;

  beforeEach(() => {
    decoder = new BLPDecoder();
  });

  describe('Header Parsing', () => {
    it('should detect invalid BLP magic', () => {
      // Create a buffer with invalid magic
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);
      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4d); // 'M' (BMP magic, not BLP)
      view.setUint8(2, 0x50);
      view.setUint8(3, 0x31);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should detect BLP1 magic', () => {
      // Create a minimal BLP1 header
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      // BLP1 magic
      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x31); // '1'

      // Compression: 1 = palette
      view.setUint32(4, 1, true);

      // Alpha bits: 0
      view.setUint32(8, 0, true);

      // Dimensions: 64x64
      view.setUint32(12, 64, true); // width
      view.setUint32(16, 64, true); // height

      // Has mipmaps: 0
      view.setUint32(20, 0, true);

      // Mipmap offsets (set first one to 1180 - after palette)
      view.setUint32(24, 1180, true);

      // Mipmap lengths (64x64 = 4096 bytes)
      view.setUint32(88, 4096, true);

      const result = decoder.decode(buffer);

      // Will fail because we don't have actual palette/pixel data
      // But it should get past header validation
      expect(result.success).toBe(false);
      // Error should be about missing data, not invalid header
      expect(result.error).not.toContain('Invalid BLP header');
    });

    it('should detect BLP2 magic', () => {
      // Create a minimal BLP2 header
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      // BLP2 magic
      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x32); // '2'

      // Version: 1
      view.setUint32(4, 1, true);

      // Compression: 3 = raw BGRA
      view.setUint8(8, 3);

      // Alpha bits: 8
      view.setUint8(9, 8);

      // Has mipmaps: 0
      view.setUint8(11, 0);

      // Dimensions: 64x64
      view.setUint32(12, 64, true); // width
      view.setUint32(16, 64, true); // height

      // Mipmap offsets (set first one to 148 - after header)
      view.setUint32(20, 148, true);

      // Mipmap lengths (64x64x4 = 16384 bytes)
      view.setUint32(84, 16384, true);

      const result = decoder.decode(buffer);

      // Will fail because we don't have actual pixel data
      // But it should get past header validation
      expect(result.success).toBe(false);
      // Error should be about missing data, not invalid header
      expect(result.error).not.toContain('Invalid BLP header');
    });
  });

  describe('Format Support', () => {
    it('should report JPEG compression as unsupported', () => {
      // Create BLP1 with JPEG compression
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x31); // '1'
      view.setUint32(4, 0, true); // 0 = JPEG
      view.setUint32(12, 64, true); // width
      view.setUint32(16, 64, true); // height

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JPEG compression not yet supported');
    });

    it('should report DXT compression as unsupported', () => {
      // Create BLP2 with DXT compression
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x32); // '2'
      view.setUint32(4, 1, true); // version
      view.setUint8(8, 2); // 2 = DXTC
      view.setUint32(12, 64, true); // width
      view.setUint32(16, 64, true); // height

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DXT compression not yet supported');
    });
  });

  describe('decodeToDataURL', () => {
    it('should return null for invalid data', () => {
      const buffer = new ArrayBuffer(10); // Too small

      const result = decoder.decodeToDataURL(buffer);

      expect(result).toBeNull();
    });

    it('should return null for unsupported format', () => {
      // Create BLP1 with JPEG compression (unsupported)
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x31); // '1'
      view.setUint32(4, 0, true); // 0 = JPEG (unsupported)
      view.setUint32(12, 64, true); // width
      view.setUint32(16, 64, true); // height

      const result = decoder.decodeToDataURL(buffer);

      expect(result).toBeNull();
    });
  });

  describe('Dimension Validation', () => {
    it('should reject zero dimensions', () => {
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x31); // '1'
      view.setUint32(12, 0, true); // width = 0
      view.setUint32(16, 0, true); // height = 0

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid BLP header');
    });

    it('should reject oversized dimensions', () => {
      const buffer = new ArrayBuffer(200);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x31); // '1'
      view.setUint32(12, 8192, true); // width = 8192 (too large)
      view.setUint32(16, 8192, true); // height = 8192

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid BLP header');
    });

    it('should accept valid dimensions', () => {
      const buffer = new ArrayBuffer(5000);
      const view = new DataView(buffer);

      view.setUint8(0, 0x42); // 'B'
      view.setUint8(1, 0x4c); // 'L'
      view.setUint8(2, 0x50); // 'P'
      view.setUint8(3, 0x32); // '2'
      view.setUint32(4, 1, true); // version
      view.setUint8(8, 3); // 3 = raw BGRA
      view.setUint32(12, 256, true); // width = 256 (valid)
      view.setUint32(16, 256, true); // height = 256

      // Set mipmap info
      view.setUint32(20, 148, true); // offset
      view.setUint32(84, 256 * 256 * 4, true); // length

      const result = decoder.decode(buffer);

      // Will still fail because we don't have pixel data in this test buffer
      // But should pass dimension validation
      expect(result.error).not.toBe('Invalid BLP header');
    });
  });
});
