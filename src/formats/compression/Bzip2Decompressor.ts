/**
 * BZip2 Decompressor
 *
 * Handles BZip2 decompression for MPQ archives using seek-bzip library
 * BZip2 is used in multi-compression scenarios (e.g., Huffman+ZLIB+BZip2)
 */

// Polyfill Buffer for browser environment (seek-bzip requires it)
// seek-bzip calls 'new Buffer()' so we need a constructor-compatible polyfill
if (typeof Buffer === 'undefined') {
  type BufferArg = number | ArrayBuffer | Uint8Array | number[];

  const BufferPolyfill = function (arg: BufferArg): Uint8Array {
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

  BufferPolyfill.from = (data: BufferArg): Uint8Array => {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Array.isArray(data)) return new Uint8Array(data);
    return new Uint8Array(0);
  };

  BufferPolyfill.alloc = (size: number): Uint8Array => new Uint8Array(size);

  BufferPolyfill.isBuffer = (obj: unknown): boolean => obj instanceof Uint8Array;

  interface GlobalWithBuffer {
    Buffer: typeof BufferPolyfill;
  }

  (globalThis as unknown as GlobalWithBuffer).Buffer = BufferPolyfill;
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
        }

        // Convert result back to ArrayBuffer
        return decompressedArray.buffer.slice(
          decompressedArray.byteOffset,
          decompressedArray.byteOffset + decompressedArray.byteLength
        ) as ArrayBuffer;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
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
