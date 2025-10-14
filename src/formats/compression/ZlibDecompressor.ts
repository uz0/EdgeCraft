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

        // Log first 16 bytes for debugging
        const previewBytes = Array.from(
          compressedArray.slice(0, Math.min(16, compressedArray.length))
        )
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(
          `[ZlibDecompressor] 🔍 Input: ${compressedArray.length} bytes, first 16: ${previewBytes}`
        );
        console.log(`[ZlibDecompressor] Expected output: ${uncompressedSize} bytes`);

        // Detect ZLIB header (0x78 in first byte indicates ZLIB wrapper)
        const firstByte = compressedArray.length > 0 ? (compressedArray[0] ?? 0) : 0;
        const hasZlibWrapper = (firstByte & 0x0f) === 0x08 && (firstByte & 0xf0) !== 0;
        console.log(
          `[ZlibDecompressor] First byte: 0x${firstByte.toString(16)}, hasZlibWrapper: ${hasZlibWrapper}`
        );

        // Try raw deflate first (PKZIP style - no zlib wrapper)
        let decompressedArray: Uint8Array;
        try {
          console.log('[ZlibDecompressor] Trying inflateRaw (PKZIP/raw DEFLATE)...');
          decompressedArray = pako.inflateRaw(compressedArray);
          console.log(
            `[ZlibDecompressor] ✅ inflateRaw succeeded: ${decompressedArray.byteLength} bytes`
          );
        } catch (rawError) {
          // If raw deflate fails, try with zlib wrapper
          const rawErrorMsg = rawError instanceof Error ? rawError.message : String(rawError);
          console.log(`[ZlibDecompressor] ❌ inflateRaw failed: ${rawErrorMsg}`);
          console.log('[ZlibDecompressor] Trying inflate (with ZLIB wrapper)...');
          decompressedArray = pako.inflate(compressedArray);
          console.log(
            `[ZlibDecompressor] ✅ inflate succeeded: ${decompressedArray.byteLength} bytes`
          );
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
