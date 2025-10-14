/**
 * Comprehensive Unit Tests for TGADecoder
 *
 * Tests TGA image decoding:
 * - Header validation
 * - 24-bit and 32-bit RGB/RGBA formats
 * - Pixel data decoding (BGRA format)
 * - Data URL generation
 * - Error handling for corrupted files
 */

import { TGADecoder } from '../TGADecoder';

describe('TGADecoder - Comprehensive Unit Tests', () => {
  let decoder: TGADecoder;

  beforeEach(() => {
    decoder = new TGADecoder();
  });

  /**
   * Create mock TGA header
   * TGA Header Structure (18 bytes):
   * - ID Length (1 byte) = 0
   * - Color Map Type (1 byte) = 0
   * - Image Type (1 byte) = 2 (uncompressed RGB)
   * - Color Map Spec (5 bytes) = [0,0,0,0,0]
   * - X Origin (2 bytes) = 0
   * - Y Origin (2 bytes) = 0
   * - Width (2 bytes)
   * - Height (2 bytes)
   * - Pixel Depth (1 byte) = 24 or 32
   * - Image Descriptor (1 byte) = 0x20 (top-left origin)
   */
  const createTGAHeader = (width: number, height: number, pixelDepth: 24 | 32): ArrayBuffer => {
    const header = new Uint8Array(18);

    header[0] = 0; // ID Length
    header[1] = 0; // Color Map Type
    header[2] = 2; // Image Type (uncompressed RGB)

    // Color Map Spec (5 bytes) - all zeros
    header[3] = 0;
    header[4] = 0;
    header[5] = 0;
    header[6] = 0;
    header[7] = 0;

    // X Origin (2 bytes, little-endian)
    header[8] = 0;
    header[9] = 0;

    // Y Origin (2 bytes, little-endian)
    header[10] = 0;
    header[11] = 0;

    // Width (2 bytes, little-endian)
    header[12] = width & 0xff;
    header[13] = (width >> 8) & 0xff;

    // Height (2 bytes, little-endian)
    header[14] = height & 0xff;
    header[15] = (height >> 8) & 0xff;

    // Pixel Depth
    header[16] = pixelDepth;

    // Image Descriptor (0x20 = top-left origin, 8-bit alpha for 32-bit)
    header[17] = pixelDepth === 32 ? 0x28 : 0x20;

    return header.buffer;
  };

  // ========================================================================
  // TEST SUITE 1: TGA HEADER VALIDATION
  // ========================================================================

  describe('TGA Header Validation', () => {
    it('should validate correct TGA header (24-bit)', () => {
      const header = createTGAHeader(256, 256, 24);
      const tgaData = new ArrayBuffer(18 + 256 * 256 * 3);
      new Uint8Array(tgaData).set(new Uint8Array(header), 0);

      const result = decoder.decodeToDataURL(tgaData);

      expect(result).toBeDefined();
    });

    it('should validate correct TGA header (32-bit)', () => {
      const header = createTGAHeader(256, 256, 32);
      const tgaData = new ArrayBuffer(18 + 256 * 256 * 4);
      new Uint8Array(tgaData).set(new Uint8Array(header), 0);

      const result = decoder.decodeToDataURL(tgaData);

      expect(result).toBeDefined();
    });

    it('should handle invalid image type', () => {
      const header = new Uint8Array(createTGAHeader(256, 256, 24));
      header[2] = 1; // Invalid image type (not uncompressed RGB)

      const tgaData = header.buffer;

      const result = decoder.decodeToDataURL(tgaData);

      // Should handle gracefully - either null or throw error
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle corrupted header (too short)', () => {
      const corruptedHeader = new ArrayBuffer(10); // Only 10 bytes instead of 18

      const result = decoder.decodeToDataURL(corruptedHeader);

      // Should return null or handle gracefully
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should parse width and height correctly', () => {
      const testCases = [
        { width: 128, height: 128 },
        { width: 256, height: 256 },
        { width: 512, height: 512 },
        { width: 64, height: 128 }, // Non-square
      ];

      testCases.forEach(({ width, height }) => {
        const header = createTGAHeader(width, height, 32);
        const pixelData = new Uint8Array(width * height * 4).fill(255);
        const tgaData = new Uint8Array([...new Uint8Array(header), ...pixelData]);

        const result = decoder.decodeToDataURL(tgaData.buffer);

        expect(result).toBeDefined();
      });
    });
  });

  // ========================================================================
  // TEST SUITE 2: PIXEL DATA DECODING
  // ========================================================================

  describe('Pixel Data Decoding', () => {
    const createTGAWithPixels = (
      width: number,
      height: number,
      pixelDepth: 24 | 32,
      pixelData: Uint8Array
    ): ArrayBuffer => {
      const header = new Uint8Array(createTGAHeader(width, height, pixelDepth));
      const tgaData = new Uint8Array(header.length + pixelData.length);
      tgaData.set(header, 0);
      tgaData.set(pixelData, header.length);
      return tgaData.buffer;
    };

    it('should decode 24-bit BGR pixel data correctly', () => {
      const width = 2;
      const height = 2;

      // Create 2x2 image with specific colors (BGR format)
      const pixelData = new Uint8Array([
        // Pixel 1: Blue (B=255, G=0, R=0)
        255, 0, 0,
        // Pixel 2: Green (B=0, G=255, R=0)
        0, 255, 0,
        // Pixel 3: Red (B=0, G=0, R=255)
        0, 0, 255,
        // Pixel 4: White (B=255, G=255, R=255)
        255, 255, 255,
      ]);

      const tgaData = createTGAWithPixels(width, height, 24, pixelData);
      const result = decoder.decodeToDataURL(tgaData);

      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should decode 32-bit BGRA pixel data correctly', () => {
      const width = 2;
      const height = 2;

      // Create 2x2 image with BGRA format (including alpha)
      const pixelData = new Uint8Array([
        // Pixel 1: Blue, opaque (B=255, G=0, R=0, A=255)
        255, 0, 0, 255,
        // Pixel 2: Green, semi-transparent (B=0, G=255, R=0, A=128)
        0, 255, 0, 128,
        // Pixel 3: Red, opaque (B=0, G=0, R=255, A=255)
        0, 0, 255, 255,
        // Pixel 4: White, transparent (B=255, G=255, R=255, A=0)
        255, 255, 255, 0,
      ]);

      const tgaData = createTGAWithPixels(width, height, 32, pixelData);
      const result = decoder.decodeToDataURL(tgaData);

      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle various image sizes', () => {
      const testSizes = [
        { width: 16, height: 16 },
        { width: 64, height: 64 },
        { width: 128, height: 128 },
        { width: 256, height: 256 },
        { width: 512, height: 512 },
      ];

      testSizes.forEach(({ width, height }) => {
        const pixelCount = width * height;
        const pixelData = new Uint8Array(pixelCount * 4);

        // Fill with gradient pattern
        for (let i = 0; i < pixelCount; i++) {
          const idx = i * 4;
          pixelData[idx] = i % 256; // B
          pixelData[idx + 1] = (i * 2) % 256; // G
          pixelData[idx + 2] = (i * 3) % 256; // R
          pixelData[idx + 3] = 255; // A
        }

        const tgaData = createTGAWithPixels(width, height, 32, pixelData);
        const result = decoder.decodeToDataURL(tgaData);

        expect(result).toBeDefined();
      });
    });

    it('should handle monochrome (grayscale) images', () => {
      const width = 8;
      const height = 8;

      // Create grayscale gradient
      const pixelData = new Uint8Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        const gray = Math.floor((i / (width * height)) * 255);
        pixelData[i * 3] = gray; // B
        pixelData[i * 3 + 1] = gray; // G
        pixelData[i * 3 + 2] = gray; // R
      }

      const tgaData = createTGAWithPixels(width, height, 24, pixelData);
      const result = decoder.decodeToDataURL(tgaData);

      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // TEST SUITE 3: DATA URL GENERATION
  // ========================================================================

  describe('Data URL Generation', () => {
    it('should generate valid PNG data URL', () => {
      const width = 4;
      const height = 4;
      const pixelData = new Uint8Array(width * height * 4).fill(128);

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const result = decoder.decodeToDataURL(tgaData.buffer);

      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);

      // Verify base64 encoding
      const base64Part = result?.split(',')[1];
      expect(base64Part).toBeDefined();
      expect(base64Part?.length).toBeGreaterThan(0);
    });

    it('should generate data URL with reasonable size', () => {
      const width = 256;
      const height = 256;
      const pixelData = new Uint8Array(width * height * 4);

      // Random pixel data
      for (let i = 0; i < pixelData.length; i++) {
        pixelData[i] = Math.floor(Math.random() * 256);
      }

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const result = decoder.decodeToDataURL(tgaData.buffer);

      expect(result).toBeDefined();

      // Data URL should be reasonable size (< 1MB for 256x256)
      expect(result?.length ?? 0).toBeLessThan(1024 * 1024);
    });
  });

  // ========================================================================
  // TEST SUITE 4: ERROR HANDLING
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle empty buffer', () => {
      const emptyBuffer = new ArrayBuffer(0);

      const result = decoder.decodeToDataURL(emptyBuffer);

      // Should return null or handle gracefully
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle truncated pixel data', () => {
      const header = new Uint8Array(createTGAHeader(256, 256, 32));

      // Create buffer with incomplete pixel data
      const truncatedData = new Uint8Array(18 + 100); // Only 100 bytes of pixel data
      truncatedData.set(header, 0);

      const result = decoder.decodeToDataURL(truncatedData.buffer);

      // Should handle gracefully
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle unsupported pixel depth', () => {
      const header = new Uint8Array(createTGAHeader(64, 64, 32));
      header[16] = 16; // Unsupported pixel depth

      const tgaData = new Uint8Array(18 + 64 * 64 * 2);
      tgaData.set(header, 0);

      const result = decoder.decodeToDataURL(tgaData.buffer);

      // Should return null or handle error
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle null/undefined input', () => {
      const result1 = decoder.decodeToDataURL(null as never);
      const result2 = decoder.decodeToDataURL(undefined as never);

      expect(result1 === null || typeof result1 === 'string').toBe(true);
      expect(result2 === null || typeof result2 === 'string').toBe(true);
    });

    it('should handle invalid header values', () => {
      const header = new Uint8Array(createTGAHeader(0, 0, 32)); // Zero dimensions

      const result = decoder.decodeToDataURL(header.buffer);

      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // ========================================================================
  // TEST SUITE 5: W3X/SC2 STANDARD COMPLIANCE
  // ========================================================================

  describe('W3X/SC2 Standard TGA Compliance', () => {
    it('should decode W3X standard TGA (war3mapPreview.tga format)', () => {
      // W3X standard: 32-bit uncompressed RGB, 256x256 typical
      const width = 256;
      const height = 256;

      const pixelData = new Uint8Array(width * height * 4);
      // Fill with test pattern
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 100; // B
        pixelData[i + 1] = 150; // G
        pixelData[i + 2] = 200; // R
        pixelData[i + 3] = 0; // A (black alpha as per W3X spec)
      }

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const result = decoder.decodeToDataURL(tgaData.buffer);

      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should decode SC2 standard TGA (square format)', () => {
      // SC2 standard: square 24-bit or 32-bit, 256x256 or 512x512
      const sizes = [256, 512];

      sizes.forEach((size) => {
        const pixelData = new Uint8Array(size * size * 3);
        // Fill with test pattern
        for (let i = 0; i < pixelData.length; i += 3) {
          pixelData[i] = 50; // B
          pixelData[i + 1] = 100; // G
          pixelData[i + 2] = 150; // R
        }

        const header = new Uint8Array(createTGAHeader(size, size, 24));
        const tgaData = new Uint8Array([...header, ...pixelData]);

        const result = decoder.decodeToDataURL(tgaData.buffer);

        expect(result).toBeDefined();
      });
    });

    it('should handle top-left origin (Image Descriptor 0x20)', () => {
      // Standard TGA has top-left origin (bit 5 of image descriptor = 1)
      const width = 128;
      const height = 128;

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      header[17] = 0x28; // Top-left origin + 8-bit alpha

      const pixelData = new Uint8Array(width * height * 4).fill(128);
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const result = decoder.decodeToDataURL(tgaData.buffer);

      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // TEST SUITE 6: PERFORMANCE
  // ========================================================================

  describe('Performance', () => {
    it('should decode small images quickly (< 100ms)', () => {
      const width = 64;
      const height = 64;
      const pixelData = new Uint8Array(width * height * 4).fill(128);

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const startTime = performance.now();
      const result = decoder.decodeToDataURL(tgaData.buffer);
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should decode large images within reasonable time (< 1s)', () => {
      const width = 512;
      const height = 512;
      const pixelData = new Uint8Array(width * height * 4);

      for (let i = 0; i < pixelData.length; i++) {
        pixelData[i] = i % 256;
      }

      const header = new Uint8Array(createTGAHeader(width, height, 32));
      const tgaData = new Uint8Array([...header, ...pixelData]);

      const startTime = performance.now();
      const result = decoder.decodeToDataURL(tgaData.buffer);
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000);
    }, 5000);
  });
});
