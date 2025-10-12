/**
 * ZLIB/DEFLATE Decompressor
 *
 * Handles ZLIB and PKZIP/DEFLATE decompression for MPQ archives
 * Uses pako library for decompression
 */

import * as pako from 'pako';
import type { IDecompressor } from './types';

export class ZlibDecompressor implements IDecompressor {
  /**
   * Decompress ZLIB/DEFLATE compressed data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    // Wrap synchronous decompression in Promise for consistent async interface
    return Promise.resolve().then(() => {
      try {
        // Convert ArrayBuffer to Uint8Array for pako
        const compressedArray = new Uint8Array(compressed);

        // Try raw deflate first (PKZIP style - no zlib wrapper)
        let decompressedArray: Uint8Array;
        try {
          decompressedArray = pako.inflateRaw(compressedArray);
        } catch (rawError) {
          // If raw deflate fails, try with zlib wrapper
          console.log('[ZlibDecompressor] Raw deflate failed, trying with zlib wrapper...');
          decompressedArray = pako.inflate(compressedArray);
        }

        // Verify decompressed size
        if (decompressedArray.byteLength !== uncompressedSize) {
          console.warn(
            `[ZlibDecompressor] Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
          );
        }

        // Convert back to ArrayBuffer
        return decompressedArray.buffer.slice(
          decompressedArray.byteOffset,
          decompressedArray.byteOffset + decompressedArray.byteLength
        ) as ArrayBuffer;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`ZLIB decompression failed: ${errorMsg}`);
      }
    });
  }

  /**
   * Check if ZLIB decompressor is available
   */
  public isAvailable(): boolean {
    return typeof pako !== 'undefined';
  }
}
