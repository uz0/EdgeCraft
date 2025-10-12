/**
 * BZip2 Decompressor
 *
 * Handles BZip2 decompression for MPQ archives using compressjs library
 * BZip2 is used in multi-compression scenarios (e.g., Huffman+ZLIB+BZip2)
 */

import * as compressjs from 'compressjs';
import type { IDecompressor } from './types';

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
      // Convert ArrayBuffer to Uint8Array for compressjs
      const compressedArray = new Uint8Array(compressed);

      // Use compressjs Bzip2 algorithm
      const Bzip2 = compressjs.Bzip2;
      const decompressedArray = Bzip2.decompressFile(compressedArray);

      // Verify decompressed size (warn on mismatch, don't throw)
      if (decompressedArray.byteLength !== uncompressedSize) {
        console.warn(
          `[Bzip2Decompressor] Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
        );
      }

      // Convert Uint8Array back to ArrayBuffer
      return decompressedArray.buffer.slice(
        decompressedArray.byteOffset,
        decompressedArray.byteOffset + decompressedArray.byteLength
      ) as ArrayBuffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Bzip2Decompressor] Decompression failed:', errorMsg);
      throw new Error(`BZip2 decompression failed: ${errorMsg}`);
    }
  }

  /**
   * Check if BZip2 decompressor is available
   */
  public isAvailable(): boolean {
    return typeof compressjs !== 'undefined';
  }
}
