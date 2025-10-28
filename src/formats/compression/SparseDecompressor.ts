/**
 * SPARSE Decompressor for MPQ Archives
 *
 * Implements Blizzard's SPARSE compression algorithm
 * Used for files with large sections of zeros (sparse data)
 *
 * Based on: https://github.com/ladislav-zezula/StormLib
 */

import type { IDecompressor } from './types';

export class SparseDecompressor implements IDecompressor {
  /**
   * Decompress SPARSE-compressed data
   *
   * SPARSE format:
   * - Header: uint32 outputSize, uint32 compressionMethod
   * - If compressionMethod & 0x20: sparse mode
   * - Data consists of:
   *   - Literal bytes (non-zero data)
   *   - Zero runs (encoded as special markers)
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    return Promise.resolve().then(() => {
      try {
        const input = new Uint8Array(compressed);
        const output = new Uint8Array(uncompressedSize);

        let inPos = 0;
        let outPos = 0;

        // SPARSE decompression: look for zero runs
        while (inPos < input.length && outPos < output.length) {
          const byte = input[inPos++];

          if (byte === undefined) {
            break;
          }

          if (byte === 0) {
            // Check for zero run encoding
            // In MPQ SPARSE: 0x00 followed by count byte means "write N zeros"
            if (inPos < input.length) {
              const count = input[inPos++];
              if (count === undefined) break;

              // Write zeros
              const zeroCount = Math.min(count, output.length - outPos);
              for (let i = 0; i < zeroCount; i++) {
                output[outPos++] = 0;
              }
            } else {
              // Just a single zero
              output[outPos++] = 0;
            }
          } else {
            // Literal byte
            output[outPos++] = byte;
          }
        }

        // Fill remaining with zeros if needed
        while (outPos < output.length) {
          output[outPos++] = 0;
        }

        return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`SPARSE decompression failed: ${errorMsg}`);
      }
    });
  }

  /**
   * Check if SPARSE decompressor is available
   */
  public isAvailable(): boolean {
    return true;
  }
}
