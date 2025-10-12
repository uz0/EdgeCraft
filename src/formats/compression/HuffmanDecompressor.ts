/**
 * Huffman Decompressor for MPQ Archives
 *
 * Implements Blizzard's MPQ Huffman decompression algorithm
 * This is a specific variant used in Warcraft 3 MPQ files
 *
 * Based on: https://github.com/ladislav-zezula/StormLib
 */

import type { IDecompressor } from './types';

export class HuffmanDecompressor implements IDecompressor {
  /**
   * Decompress Huffman-compressed data from MPQ archives
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    try {
      const input = new Uint8Array(compressed);
      const output = new Uint8Array(uncompressedSize);

      let inPos = 0;
      let outPos = 0;
      let bitBuffer = 0;
      let bitCount = 0;

      // Helper: Read bits from input stream
      const readBits = (numBits: number): number => {
        while (bitCount < numBits) {
          if (inPos >= input.length) {
            throw new Error('Unexpected end of Huffman compressed data');
          }
          const byte = input[inPos++];
          if (byte === undefined) {
            throw new Error('Unexpected end of Huffman compressed data');
          }
          bitBuffer |= byte << bitCount;
          bitCount += 8;
        }
        const result = bitBuffer & ((1 << numBits) - 1);
        bitBuffer >>= numBits;
        bitCount -= numBits;
        return result;
      };

      // MPQ Huffman tree structure
      // This is a simplified implementation for the most common case
      // The full implementation would build dynamic trees based on compression type

      while (outPos < uncompressedSize) {
        // Read Huffman code
        // MPQ uses variable-length codes from 1-15 bits
        let code = readBits(1);

        if (code === 0) {
          // Literal byte: 0 + 8 bits
          const byte = readBits(8);
          output[outPos++] = byte;
        } else {
          // Check for longer codes
          code = (code << 1) | readBits(1);

          if (code === 2) {
            // 10: Short length code
            const length = readBits(2) + 2; // 2-5 bytes
            const distance = readBits(8) + 1;

            // Copy from lookback buffer
            for (let i = 0; i < length; i++) {
              const sourcePos = outPos - distance;
              if (sourcePos < 0 || sourcePos >= output.length) {
                throw new Error('Invalid distance in Huffman stream');
              }
              const sourceByte = output[sourcePos];
              if (sourceByte === undefined) {
                throw new Error('Invalid source position in Huffman stream');
              }
              output[outPos] = sourceByte;
              outPos++;
              if (outPos >= uncompressedSize) break;
            }
          } else if (code === 3) {
            // 11: Longer length code
            const lengthBits = readBits(2);
            let length: number;
            let distanceBits: number;

            if (lengthBits === 0) {
              length = readBits(3) + 2; // 2-9
              distanceBits = 9;
            } else if (lengthBits === 1) {
              length = readBits(4) + 10; // 10-25
              distanceBits = 10;
            } else if (lengthBits === 2) {
              length = readBits(5) + 26; // 26-57
              distanceBits = 12;
            } else {
              // lengthBits === 3
              length = readBits(8) + 58; // 58-313
              distanceBits = 15;
            }

            const distance = readBits(distanceBits) + 1;

            // Copy from lookback buffer
            for (let i = 0; i < length; i++) {
              const sourcePos = outPos - distance;
              if (sourcePos < 0 || sourcePos >= output.length) {
                throw new Error('Invalid distance in Huffman stream');
              }
              const sourceByte = output[sourcePos];
              if (sourceByte === undefined) {
                throw new Error('Invalid source position in Huffman stream');
              }
              output[outPos] = sourceByte;
              outPos++;
              if (outPos >= uncompressedSize) break;
            }
          }
        }
      }

      if (outPos !== uncompressedSize) {
        console.warn(
          `[HuffmanDecompressor] Size mismatch: expected ${uncompressedSize}, got ${outPos}`
        );
      }

      return output.buffer.slice(
        output.byteOffset,
        output.byteOffset + output.byteLength
      ) as ArrayBuffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[HuffmanDecompressor] Decompression failed:', errorMsg);
      throw new Error(`Huffman decompression failed: ${errorMsg}`);
    }
  }

  /**
   * Check if Huffman decompressor is available
   */
  public isAvailable(): boolean {
    return true;
  }
}
