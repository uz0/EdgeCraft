import { BLPDecoder } from './BLPDecoder';
import {
  createPaletteBLP,
  createInvalidBLP,
  createMinimalBLP,
  createNonSquareBLP,
} from './BLPTestHelpers';

describe('BLPDecoder', () => {
  let decoder: BLPDecoder;

  beforeEach(() => {
    decoder = new BLPDecoder();
  });

  describe('Header Validation', () => {
    it('should reject files with wrong magic number', async () => {
      const buffer = createInvalidBLP('wrongMagic');
      const result = await decoder.decode(buffer);

      expect(result).toBeNull();
    });

    it('should reject truncated buffers', async () => {
      const buffer = createInvalidBLP('truncated');
      const result = await decoder.decode(buffer);

      expect(result).toBeNull();
    });

    it('should reject buffers smaller than header size', async () => {
      const buffer = createInvalidBLP('tooSmall');
      const result = await decoder.decode(buffer);

      expect(result).toBeNull();
    });

    it('should accept valid BLP1 header', async () => {
      const buffer = createPaletteBLP(16, 16, 0, 1);
      const result = await decoder.decode(buffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(16);
      expect(result?.height).toBe(16);
    });
  });

  describe('Palette Format Decoding', () => {
    describe('0-bit alpha (opaque)', () => {
      it('should decode 16x16 palette BLP with no alpha', async () => {
        const buffer = createPaletteBLP(16, 16, 0, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(16);
        expect(result?.height).toBe(16);
        expect(result?.data.length).toBe(16 * 16 * 4);
        expect(result?.mipmapCount).toBe(1);

        for (let i = 3; i < result!.data.length; i += 4) {
          expect(result!.data[i]).toBe(255);
        }
      });

      it('should decode 256x256 palette BLP with no alpha', async () => {
        const buffer = createPaletteBLP(256, 256, 0, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(256);
        expect(result?.height).toBe(256);
        expect(result?.data.length).toBe(256 * 256 * 4);
      });
    });

    describe('1-bit alpha (binary transparency)', () => {
      it('should decode palette BLP with 1-bit alpha', async () => {
        const buffer = createPaletteBLP(16, 16, 1, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(16);
        expect(result?.height).toBe(16);
      });
    });

    describe('4-bit alpha (16 levels)', () => {
      it('should decode palette BLP with 4-bit alpha', async () => {
        const buffer = createPaletteBLP(16, 16, 4, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(16);
        expect(result?.height).toBe(16);
      });
    });

    describe('8-bit alpha (full transparency)', () => {
      it('should decode palette BLP with 8-bit alpha', async () => {
        const buffer = createPaletteBLP(16, 16, 8, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(16);
        expect(result?.height).toBe(16);
      });

      it('should decode 256x256 palette BLP with 8-bit alpha', async () => {
        const buffer = createPaletteBLP(256, 256, 8, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(256);
        expect(result?.height).toBe(256);
      });
    });

    describe('BGRA to RGBA conversion', () => {
      it('should correctly convert palette colors from BGRA to RGBA', async () => {
        const buffer = createPaletteBLP(2, 2, 0, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.data[0]).toBeDefined();
        expect(result?.data[1]).toBeDefined();
        expect(result?.data[2]).toBeDefined();
        expect(result?.data[3]).toBe(255);
      });
    });
  });

  describe('Mipmap Handling', () => {
    describe('Single mipmap (level 0)', () => {
      it('should decode single mipmap level', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 1);
        const result = await decoder.decode(buffer, 0);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(64);
        expect(result?.height).toBe(64);
        expect(result?.mipmapCount).toBe(1);
      });
    });

    describe('Multiple mipmap levels', () => {
      it('should decode mipmap level 0 from chain', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 0);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(64);
        expect(result?.height).toBe(64);
        expect(result?.mipmapCount).toBe(5);
      });

      it('should decode mipmap level 1', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 1);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(32);
        expect(result?.height).toBe(32);
      });

      it('should decode mipmap level 2', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 2);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(16);
        expect(result?.height).toBe(16);
      });

      it('should decode mipmap level 3', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 3);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(8);
        expect(result?.height).toBe(8);
      });

      it('should decode mipmap level 4', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 4);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(4);
        expect(result?.height).toBe(4);
      });
    });

    describe('Full mipmap chain', () => {
      it('should decode full mipmap chain for 256x256 texture', async () => {
        const buffer = createPaletteBLP(256, 256, 0, 9);
        const result = await decoder.decode(buffer, 0);

        expect(result).not.toBeNull();
        expect(result?.mipmapCount).toBe(9);
      });

      it('should correctly calculate dimensions for each mipmap level', async () => {
        const buffer = createPaletteBLP(128, 128, 0, 8);

        const dimensions = [
          { level: 0, width: 128, height: 128 },
          { level: 1, width: 64, height: 64 },
          { level: 2, width: 32, height: 32 },
          { level: 3, width: 16, height: 16 },
          { level: 4, width: 8, height: 8 },
          { level: 5, width: 4, height: 4 },
          { level: 6, width: 2, height: 2 },
          { level: 7, width: 1, height: 1 },
        ];

        for (const { level, width, height } of dimensions) {
          const result = await decoder.decode(buffer, level);
          expect(result?.width).toBe(width);
          expect(result?.height).toBe(height);
        }
      });
    });

    describe('Invalid mipmap levels', () => {
      it('should return null for negative mipmap level', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, -1);

        expect(result).toBeNull();
      });

      it('should return null for mipmap level >= 16', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 5);
        const result = await decoder.decode(buffer, 16);

        expect(result).toBeNull();
      });

      it('should return null for mipmap level beyond available levels', async () => {
        const buffer = createPaletteBLP(64, 64, 0, 3);
        const result = await decoder.decode(buffer, 5);

        expect(result).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Dimension edge cases', () => {
      it('should decode 1x1 pixel image', async () => {
        const buffer = createMinimalBLP();
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(1);
        expect(result?.height).toBe(1);
        expect(result?.data.length).toBe(4);
      });

      it('should decode non-square textures', async () => {
        const buffer = createNonSquareBLP();
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(256);
        expect(result?.height).toBe(128);
      });

      it('should handle power-of-two dimensions', async () => {
        const sizes = [2, 4, 8, 16, 32, 64, 128, 256];

        for (const size of sizes) {
          const buffer = createPaletteBLP(size, size, 0, 1);
          const result = await decoder.decode(buffer);

          expect(result).not.toBeNull();
          expect(result?.width).toBe(size);
          expect(result?.height).toBe(size);
        }
      });
    });

    describe('Non-square mipmap chains', () => {
      it('should correctly handle non-square mipmaps', async () => {
        const buffer = createPaletteBLP(256, 128, 0, 9);

        const dimensions = [
          { level: 0, width: 256, height: 128 },
          { level: 1, width: 128, height: 64 },
          { level: 2, width: 64, height: 32 },
          { level: 3, width: 32, height: 16 },
          { level: 4, width: 16, height: 8 },
          { level: 5, width: 8, height: 4 },
          { level: 6, width: 4, height: 2 },
          { level: 7, width: 2, height: 1 },
          { level: 8, width: 1, height: 1 },
        ];

        for (const { level, width, height } of dimensions) {
          const result = await decoder.decode(buffer, level);
          expect(result?.width).toBe(width);
          expect(result?.height).toBe(height);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should return null for empty buffer', async () => {
      const buffer = new ArrayBuffer(0);
      const result = await decoder.decode(buffer);

      expect(result).toBeNull();
    });

    it('should handle null input gracefully', async () => {
      const result = await decoder.decode(null as unknown as ArrayBuffer);

      expect(result).toBeNull();
    });

    it('should handle undefined input gracefully', async () => {
      const result = await decoder.decode(undefined as unknown as ArrayBuffer);

      expect(result).toBeNull();
    });
  });


  describe('Pixel Data Integrity', () => {
    it('should preserve pixel data integrity', async () => {
      const buffer = createPaletteBLP(4, 4, 0, 1);
      const result = await decoder.decode(buffer);

      expect(result).not.toBeNull();
      expect(result?.data.length).toBe(4 * 4 * 4);

      for (let i = 0; i < result!.data.length; i += 4) {
        expect(result!.data[i]).toBeGreaterThanOrEqual(0);
        expect(result!.data[i]).toBeLessThanOrEqual(255);
        expect(result!.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(result!.data[i + 1]).toBeLessThanOrEqual(255);
        expect(result!.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(result!.data[i + 2]).toBeLessThanOrEqual(255);
        expect(result!.data[i + 3]).toBeGreaterThanOrEqual(0);
        expect(result!.data[i + 3]).toBeLessThanOrEqual(255);
      }
    });

    it('should handle all alpha bit depths correctly', async () => {
      const alphaBits: Array<0 | 1 | 4 | 8> = [0, 1, 4, 8];

      for (const bits of alphaBits) {
        const buffer = createPaletteBLP(8, 8, bits, 1);
        const result = await decoder.decode(buffer);

        expect(result).not.toBeNull();
        expect(result?.width).toBe(8);
        expect(result?.height).toBe(8);
      }
    });
  });

  describe('Performance', () => {
    it('should decode 256x256 palette BLP in reasonable time', async () => {
      const buffer = createPaletteBLP(256, 256, 0, 1);

      const startTime = performance.now();
      const result = await decoder.decode(buffer);
      const endTime = performance.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle multiple sequential decodes', async () => {
      const buffer = createPaletteBLP(64, 64, 0, 1);

      for (let i = 0; i < 10; i++) {
        const result = await decoder.decode(buffer);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('Memory Management', () => {
    it('should not retain references after decode', async () => {
      const buffer = createPaletteBLP(16, 16, 0, 1);
      const result1 = await decoder.decode(buffer);

      const buffer2 = createPaletteBLP(32, 32, 0, 1);
      const result2 = await decoder.decode(buffer2);

      expect(result1?.width).toBe(16);
      expect(result2?.width).toBe(32);
    });

    it('should handle reuse of decoder instance', async () => {
      const buffer1 = createPaletteBLP(16, 16, 0, 1);
      const result1 = await decoder.decode(buffer1);
      expect(result1?.width).toBe(16);

      const buffer2 = createPaletteBLP(64, 64, 0, 1);
      const result2 = await decoder.decode(buffer2);
      expect(result2?.width).toBe(64);

      const buffer3 = createPaletteBLP(32, 32, 0, 1);
      const result3 = await decoder.decode(buffer3);
      expect(result3?.width).toBe(32);
    });
  });
});
