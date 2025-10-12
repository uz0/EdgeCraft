/**
 * Type declarations for compressjs library
 * https://github.com/cscott/compressjs
 */

declare module 'compressjs' {
  export namespace Bzip2 {
    /**
     * Decompress BZip2 compressed data
     * @param data - Compressed data as Uint8Array
     * @returns Decompressed data as Uint8Array
     */
    function decompressFile(data: Uint8Array): Uint8Array;

    /**
     * Compress data using BZip2
     * @param data - Uncompressed data as Uint8Array
     * @param blockSize - Block size (1-9, default 9)
     * @returns Compressed data as Uint8Array
     */
    function compressFile(data: Uint8Array, blockSize?: number): Uint8Array;
  }

  export namespace LZMA {
    function decompressFile(data: Uint8Array): Uint8Array;
    function compressFile(data: Uint8Array): Uint8Array;
  }
}
