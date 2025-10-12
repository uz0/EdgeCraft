/**
 * Type declarations for seek-bzip library
 * https://github.com/cscott/seek-bzip
 */

declare module 'seek-bzip' {
  /**
   * Bunzip object containing static methods for bzip2 decompression
   */
  interface Bunzip {
    /**
     * Decompress BZip2 compressed data
     * @param input - Compressed data as Uint8Array or Buffer
     * @param output - Optional output buffer
     * @returns Decompressed data as Uint8Array
     */
    decode(input: Uint8Array | Buffer, output?: Uint8Array): Uint8Array;

    /**
     * Decompress a single block from BZip2 compressed data
     * @param input - Compressed data
     * @param blockStartBits - Start bit position of the block
     * @param output - Optional output buffer
     * @returns Decompressed block data
     */
    decodeBlock(
      input: Uint8Array | Buffer,
      blockStartBits: number,
      output?: Uint8Array
    ): Uint8Array;

    /**
     * Get information about blocks in the BZip2 file
     * @param input - Compressed data
     * @param multistream - Whether to handle multistream files
     * @returns Array of block information
     */
    table(
      input: Uint8Array | Buffer,
      multistream?: boolean
    ): Array<{ bits: number; size: number }>;
  }

  const bunzip: Bunzip;
  export default bunzip;
}
