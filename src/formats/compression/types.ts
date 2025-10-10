/**
 * Compression Types
 *
 * Type definitions for compression/decompression utilities.
 */

/**
 * Compression algorithms used in MPQ archives
 */
export enum CompressionAlgorithm {
  /** No compression */
  NONE = 0x00,
  /** PKZIP/Deflate compression */
  PKZIP = 0x08,
  /** Zlib compression */
  ZLIB = 0x02,
  /** LZMA compression (SC2 and later) */
  LZMA = 0x12,
  /** BZip2 compression */
  BZIP2 = 0x10,
}

/**
 * Result of a decompression operation
 */
export interface DecompressionResult {
  /** Whether decompression was successful */
  success: boolean;
  /** Decompressed data (if successful) */
  data?: ArrayBuffer;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Decompressor interface
 */
export interface IDecompressor {
  /**
   * Decompress data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer>;

  /**
   * Check if this decompressor is available in the current environment
   */
  isAvailable(): boolean;
}
