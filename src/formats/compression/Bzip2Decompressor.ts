/**
 * BZip2 Decompressor
 *
 * Handles BZip2 decompression for MPQ archives
 * Uses compressjs library
 */

import type { IDecompressor } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Bzip2 = require('compressjs').Bzip2;

export class Bzip2Decompressor implements IDecompressor {
  /**
   * Decompress BZip2 compressed data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    try {
      // Convert ArrayBuffer to Uint8Array
      const compressedArray = new Uint8Array(compressed);

      // Decompress using compressjs
      const decompressedArray = Bzip2.decompressFile(compressedArray);

      // Verify decompressed size
      if (decompressedArray.byteLength !== uncompressedSize) {
        console.warn(
          `[Bzip2Decompressor] Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
        );
      }

      // Convert back to ArrayBuffer
      return decompressedArray.buffer.slice(
        decompressedArray.byteOffset,
        decompressedArray.byteOffset + decompressedArray.byteLength
      ) as ArrayBuffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`BZip2 decompression failed: ${errorMsg}`);
    }
  }

  /**
   * Check if BZip2 decompressor is available
   */
  public isAvailable(): boolean {
    return typeof Bzip2 !== 'undefined';
  }
}
