/**
 * Tests for TGADecoder
 */

import { TGADecoder } from './TGADecoder';

describe('TGADecoder', () => {
  let decoder: TGADecoder;

  beforeEach(() => {
    decoder = new TGADecoder();
  });

  describe('decode', () => {
    it('should decode 24-bit uncompressed TGA', () => {
      // Create a simple 2x2 24-bit TGA (type 2 = uncompressed RGB)
      const width = 2;
      const height = 2;
      const buffer = createTGABuffer(width, height, 24, 2, [
        [255, 0, 0], // Red (stored as BGR)
        [0, 255, 0], // Green
        [0, 0, 255], // Blue
        [255, 255, 255], // White
      ]);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(true);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(16); // 2x2 * 4 (RGBA)

      // Check first pixel (Red)
      expect(result.data?.[0]).toBe(255); // R
      expect(result.data?.[1]).toBe(0); // G
      expect(result.data?.[2]).toBe(0); // B
      expect(result.data?.[3]).toBe(255); // A (default)
    });

    it('should decode 32-bit uncompressed TGA', () => {
      // Create a simple 2x2 32-bit TGA with alpha
      const width = 2;
      const height = 2;
      const buffer = createTGABuffer(width, height, 32, 2, [
        [255, 0, 0, 128], // Red with 50% alpha
        [0, 255, 0, 255], // Green opaque
        [0, 0, 255, 0], // Blue transparent
        [255, 255, 255, 255], // White opaque
      ]);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(true);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);

      // Check first pixel alpha
      expect(result.data?.[3]).toBe(128); // Alpha
    });

    it('should decode RLE compressed TGA', () => {
      // Create a simple RLE compressed TGA (type 10)
      const width = 4;
      const height = 1;

      // RLE packet: repeat same color 4 times
      const buffer = createRLETGABuffer(width, height, 24);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(true);
      expect(result.width).toBe(4);
      expect(result.height).toBe(1);
      expect(result.data?.length).toBe(16); // 4x1 * 4 (RGBA)
    });

    it('should reject invalid TGA header', () => {
      // Create buffer with invalid header
      const buffer = new ArrayBuffer(18);
      const view = new DataView(buffer);
      view.setUint8(2, 99); // Invalid image type

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid TGA header');
    });

    it('should reject unsupported bit depths', () => {
      // 16-bit TGA (not supported)
      const buffer = createTGABuffer(2, 2, 16, 2, []);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid TGA header');
    });

    it('should reject grayscale TGA (type 3)', () => {
      // Grayscale TGA not supported
      const buffer = createTGABuffer(2, 2, 8, 3, []);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid TGA header');
    });

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle corrupted data', () => {
      // Buffer too small for header
      const buffer = new ArrayBuffer(10);

      const result = decoder.decode(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('decodeToDataURL', () => {
    it.skip('should convert TGA to data URL', () => {
      // Skip this test in Node environment (requires browser canvas)
      const buffer = createTGABuffer(2, 2, 24, 2, [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 255],
      ]);

      const dataUrl = decoder.decodeToDataURL(buffer);

      expect(dataUrl).toBeDefined();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should return null for invalid TGA', () => {
      const buffer = new ArrayBuffer(18);
      const view = new DataView(buffer);
      view.setUint8(2, 99); // Invalid image type

      const dataUrl = decoder.decodeToDataURL(buffer);

      expect(dataUrl).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const buffer = new ArrayBuffer(0);

      const dataUrl = decoder.decodeToDataURL(buffer);

      expect(dataUrl).toBeNull();
    });
  });
});

/**
 * Helper function to create a TGA buffer for testing
 */
function createTGABuffer(
  width: number,
  height: number,
  bitDepth: number,
  imageType: number,
  pixels: number[][]
): ArrayBuffer {
  const bytesPerPixel = bitDepth / 8;
  const headerSize = 18;
  const idLength = 0;
  const dataSize = width * height * bytesPerPixel;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // Write TGA header
  view.setUint8(0, idLength); // ID length
  view.setUint8(1, 0); // Color map type (0 = no color map)
  view.setUint8(2, imageType); // Image type
  view.setUint16(12, width, true); // Width (little-endian)
  view.setUint16(14, height, true); // Height (little-endian)
  view.setUint8(16, bitDepth); // Pixel depth
  view.setUint8(17, 0); // Image descriptor

  // Write pixel data (BGR or BGRA)
  let offset = headerSize;
  for (const pixel of pixels) {
    if (pixel != null) {
      // TGA stores as BGR(A), so reverse RGB order
      view.setUint8(offset, pixel[2] ?? 0); // B
      view.setUint8(offset + 1, pixel[1] ?? 0); // G
      view.setUint8(offset + 2, pixel[0] ?? 0); // R
      if (bytesPerPixel === 4) {
        view.setUint8(offset + 3, pixel[3] ?? 255); // A
      }
      offset += bytesPerPixel;
    }
  }

  return buffer;
}

/**
 * Helper function to create an RLE compressed TGA buffer for testing
 */
function createRLETGABuffer(width: number, height: number, bitDepth: number): ArrayBuffer {
  const bytesPerPixel = bitDepth / 8;
  const headerSize = 18;

  // RLE packet: 1 byte header + 1 pixel data
  // Packet header: 0x83 = RLE run of 4 pixels (0x80 | 3)
  const rleDataSize = 1 + bytesPerPixel;
  const buffer = new ArrayBuffer(headerSize + rleDataSize);
  const view = new DataView(buffer);

  // Write TGA header (type 10 = RLE RGB)
  view.setUint8(0, 0); // ID length
  view.setUint8(1, 0); // Color map type
  view.setUint8(2, 10); // Image type (RLE)
  view.setUint16(12, width, true); // Width
  view.setUint16(14, height, true); // Height
  view.setUint8(16, bitDepth); // Pixel depth
  view.setUint8(17, 0); // Image descriptor

  // Write RLE data
  let offset = headerSize;

  // RLE packet header: repeat 4 times (0x80 | 3)
  view.setUint8(offset++, 0x83);

  // Pixel data (BGR)
  view.setUint8(offset++, 255); // B
  view.setUint8(offset++, 0); // G
  view.setUint8(offset++, 0); // R

  return buffer;
}
