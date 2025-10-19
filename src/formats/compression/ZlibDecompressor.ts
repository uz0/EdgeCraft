/**
 * ZLIB/DEFLATE Decompressor
 *
 * Handles ZLIB and PKZIP/DEFLATE decompression for MPQ archives
 * Uses pako library for decompression
 */

import * as pako from 'pako';
import type { IDecompressor } from './types';
/* eslint-disable @typescript-eslint/no-unused-vars */

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

        // Log first 16 bytes for debugging
        const previewBytes = Array.from(
          compressedArray.slice(0, Math.min(16, compressedArray.length))
        )
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        // Detect ZLIB header (0x78 in first byte indicates ZLIB wrapper)
        const firstByte = compressedArray.length > 0 ? (compressedArray[0] ?? 0) : 0;
        const hasZlibWrapper = (firstByte & 0x0f) === 0x08 && (firstByte & 0xf0) !== 0;
        // Try multiple decompression strategies
        let decompressedArray: Uint8Array | null = null;
        let lastError: Error | null = null;

        // Strategy 1: Try raw deflate (PKZIP style - no zlib wrapper)
        try {
          decompressedArray = pako.inflateRaw(compressedArray);
        } catch (rawError) {
          lastError = rawError instanceof Error ? rawError : new Error(String(rawError));

          // Strategy 2: Try with zlib wrapper
          try {
            decompressedArray = pako.inflate(compressedArray);
          } catch (zlibError) {
            lastError = zlibError instanceof Error ? zlibError : new Error(String(zlibError));

            // Strategy 3: Try skipping potential header bytes
            if (compressedArray.length > 2) {
              try {
                decompressedArray = pako.inflateRaw(compressedArray.slice(2));
              } catch (headerError) {
                lastError =
                  headerError instanceof Error ? headerError : new Error(String(headerError));
              }
            }
          }
        }

        if (!decompressedArray) {
          throw lastError || new Error('All decompression strategies failed');
        }

        // Verify decompressed size
        if (decompressedArray.byteLength !== uncompressedSize) {
          console.warn(
            `[ZlibDecompressor] ⚠️ Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
          );
        }

        // Convert back to ArrayBuffer
        return decompressedArray.buffer.slice(
          decompressedArray.byteOffset,
          decompressedArray.byteOffset + decompressedArray.byteLength
        ) as ArrayBuffer;
      } catch (error) {
        // eslint-disable-line no-empty
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[ZlibDecompressor] ❌ Decompression failed: ${errorMsg}`);
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
