/**
 * BZip2 Decompressor
 *
 * Handles BZip2 decompression for MPQ archives using seek-bzip library
 * BZip2 is used in multi-compression scenarios (e.g., Huffman+ZLIB+BZip2)
 */

// Polyfill Buffer for browser environment (seek-bzip requires it)
// seek-bzip calls 'new Buffer()' so we need a constructor-compatible polyfill
if (typeof Buffer === 'undefined') {
  // Create a function that can be called as a constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BufferPolyfill = function (arg: any): Uint8Array {
    // Handle constructor calls: new Buffer(size), new Buffer(array), etc.
    if (typeof arg === 'number') {
      return new Uint8Array(arg);
    }
    if (arg instanceof ArrayBuffer) {
      return new Uint8Array(arg);
    }
    if (arg instanceof Uint8Array) {
      return arg;
    }
    if (Array.isArray(arg)) {
      return new Uint8Array(arg);
    }
    return new Uint8Array(0);
  };

  // Add static methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BufferPolyfill.from = (data: any): Uint8Array => {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Array.isArray(data)) return new Uint8Array(data);
    return new Uint8Array(0);
  };

  BufferPolyfill.alloc = (size: number): Uint8Array => new Uint8Array(size);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BufferPolyfill.isBuffer = (obj: any): boolean => obj instanceof Uint8Array;

  // Install the polyfill globally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Buffer = BufferPolyfill;

  console.log(
    '[Bzip2Decompressor] Buffer polyfill installed for browser environment (with constructor support)'
  );
}

import Bunzip from 'seek-bzip';
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
    // Wrap synchronous decompression in Promise for consistent async interface
    return Promise.resolve().then(() => {
      try {
        // Convert ArrayBuffer to Uint8Array for seek-bzip
        const compressedArray = new Uint8Array(compressed);

        // Use seek-bzip to decode
        const decompressedArray = Bunzip.decode(compressedArray);

        // Verify decompressed size (warn on mismatch, don't throw)
        if (decompressedArray.byteLength !== uncompressedSize) {
          console.warn(
            `[Bzip2Decompressor] Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
          );
        }

        // Convert result back to ArrayBuffer
        return decompressedArray.buffer.slice(
          decompressedArray.byteOffset,
          decompressedArray.byteOffset + decompressedArray.byteLength
        ) as ArrayBuffer;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[Bzip2Decompressor] Decompression failed:', errorMsg);
        throw new Error(`BZip2 decompression failed: ${errorMsg}`);
      }
    });
  }

  /**
   * Check if BZip2 decompressor is available
   */
  public isAvailable(): boolean {
    return typeof Bunzip !== 'undefined';
  }
}
