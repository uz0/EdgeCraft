/**
 * BZip2 Decompressor (Stub Implementation)
 *
 * TODO: Implement browser-compatible BZip2 decompression
 * BZip2 compression is relatively rare in W3X maps (most use ZLIB/PKZIP)
 * For now, this is a stub that gracefully fails with an informative error
 */

import type { IDecompressor } from './types';

export class Bzip2Decompressor implements IDecompressor {
  /**
   * Decompress BZip2 compressed data
   *
   * @param _compressed - Compressed data buffer (unused in stub)
   * @param _uncompressedSize - Expected size after decompression (unused in stub)
   * @returns Decompressed data
   * @throws Error indicating BZip2 is not yet implemented
   */
  public async decompress(
    _compressed: ArrayBuffer,
    _uncompressedSize: number
  ): Promise<ArrayBuffer> {
    console.warn(
      '[Bzip2Decompressor] ⚠️ BZip2 decompression not yet implemented in browser'
    );
    console.warn('[Bzip2Decompressor] Most W3X maps use ZLIB/PKZIP which is supported');
    throw new Error(
      'BZip2 decompression not yet implemented. This file uses BZip2 compression which is rare in W3X maps.'
    );
  }

  /**
   * Check if BZip2 decompressor is available
   * Returns false as BZip2 is not yet implemented
   */
  public isAvailable(): boolean {
    return false;
  }
}
