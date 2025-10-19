/**
 * LZMA Decompressor
 *
 * Provides LZMA decompression support for StarCraft 2 maps.
 * Uses lzma-native in Node.js environments.
 *
 * Note: Browser support requires a WASM-based LZMA implementation,
 * which is not yet implemented. For now, LZMA decompression
 * is only available in Node.js environments.
 */

import type { IDecompressor } from './types';

interface LZMAModule {
  decompress: (buffer: Buffer, callback: (result: Buffer, error?: Error) => void) => void;
}

export class LZMADecompressor implements IDecompressor {
  private lzmaModule: LZMAModule | null = null;

  /**
   * Check if LZMA decompression is available
   */
  public isAvailable(): boolean {
    // Check if we're in a Node.js environment
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        // Try to require lzma-native
        if (typeof require !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          this.lzmaModule = require('lzma-native') as LZMAModule;
          return true;
        }
      } catch (e) {
        console.warn('lzma-native module not available:', e);
        return false;
      }
    }

    // Browser environment - LZMA not natively supported
    // Future: Could use a WASM-based LZMA implementation
    return false;
  }

  /**
   * Decompress LZMA-compressed data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   * @throws Error if LZMA decompression is not available or fails
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    // Ensure LZMA is available
    if (!this.isAvailable()) {
      throw new Error('LZMA decompression not available in this environment');
    }

    // Try native LZMA (Node.js)
    if (this.lzmaModule) {
      return this.decompressNative(compressed, uncompressedSize);
    }

    // If we get here, something went wrong
    throw new Error('No LZMA decompression support available');
  }

  /**
   * Decompress using lzma-native (Node.js)
   */
  private async decompressNative(data: ArrayBuffer, expectedSize: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        const buffer = Buffer.from(data);

        // Use LZMA alone decompression (not LZMA2)
        if (!this.lzmaModule) {
          reject(new Error('LZMA module not initialized'));
          return;
        }

        this.lzmaModule.decompress(buffer, (result: Buffer, error?: Error) => {
          if (error) {
            reject(new Error(`LZMA decompression failed: ${error.message}`));
            return;
          }

          // Validate decompressed size
          if (result.length !== expectedSize) {
            console.warn(
              `LZMA decompression size mismatch: expected ${expectedSize}, got ${result.length}`
            );
          }

          // Convert Buffer to ArrayBuffer
          const arrayBuffer = result.buffer.slice(
            result.byteOffset,
            result.byteOffset + result.byteLength
          ) as ArrayBuffer;

          resolve(arrayBuffer);
        });
      } catch (error) {
        // eslint-disable-line no-empty
        reject(
          new Error(
            `LZMA decompression error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
      }
    });
  }

  /**
   * Get information about the decompressor
   */
  public getInfo(): { name: string; available: boolean; environment: string } {
    return {
      name: 'LZMA Decompressor',
      available: this.isAvailable(),
      environment: typeof process !== 'undefined' && process.versions?.node ? 'Node.js' : 'Browser',
    };
  }
}
