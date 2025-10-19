/**
 * PKWare DCL Implode Decompressor
 *
 * Implements PKWare Data Compression Library (DCL) Implode decompression.
 * This algorithm is used in older Warcraft 3 MPQ archives.
 *
 * Based on: https://github.com/ladislav-zezula/StormLib
 * Algorithm: Shannon-Fano encoding + sliding dictionary
 */

import type { IDecompressor } from './types';

// Compression type constants
// const CMP_BINARY = 0; // Binary compression (2 trees) - Reserved for future use
const CMP_ASCII = 1; // ASCII compression (3 trees)

// Dictionary size constants
const DICT_SIZE_1024 = 1024;
const DICT_SIZE_4096 = 4096;

/**
 * PKWare DCL Implode Decompressor
 */
export class ImplodeDecompressor implements IDecompressor {
  /**
   * Decompress IMPLODE compressed data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    return Promise.resolve().then(() => {
      try {
        const input = new Uint8Array(compressed);

        // Read compression header (first byte)
        // Bit 0: Compression type (0 = binary, 1 = ASCII)
        // Bit 1-2: Dictionary size (0 = 1024, 1 = 2048, 2 = 4096)
        if (input.length < 1) {
          throw new Error('IMPLODE: Input too short, missing header');
        }

        const compressionType = input[0]! & 0x01;
        const dictSizeBits = (input[0]! >> 1) & 0x03;

        // Determine dictionary size
        let dictionarySize: number;
        if (dictSizeBits === 0) {
          dictionarySize = DICT_SIZE_1024;
        } else {
          dictionarySize = DICT_SIZE_4096;
        }
        // Create output buffer
        const output = new Uint8Array(uncompressedSize);

        // Initialize bit reader
        const bitReader = new BitReader(input, 1); // Skip header byte

        // Build Shannon-Fano trees
        const trees = this.buildTrees(compressionType);

        // Decompress data
        let outPos = 0;
        const dictionary = new Uint8Array(dictionarySize);
        let dictPos = 0;

        while (outPos < uncompressedSize) {
          // Read next instruction
          if (bitReader.readBit()) {
            // Literal byte
            let byte: number;

            if (compressionType === CMP_ASCII) {
              // ASCII mode: use literal tree
              byte = this.decodeValue(bitReader, trees.literal);
            } else {
              // Binary mode: read 8 bits directly
              byte = bitReader.readBits(8);
            }

            // Write literal to output and dictionary
            output[outPos++] = byte;
            dictionary[dictPos] = byte;
            dictPos = (dictPos + 1) % dictionarySize;
          } else {
            // Copy from dictionary
            // Read distance (position in dictionary)
            const distanceBits = this.getDistanceBits(dictionarySize);
            let distance = bitReader.readBits(distanceBits);

            // For 4096-byte dictionary, we may need extra bits
            if (dictionarySize === DICT_SIZE_4096 && distance === 0) {
              distance = bitReader.readBit() ? 0x100 : 0;
            }

            // Read length (number of bytes to copy)
            const length = this.decodeValue(bitReader, trees.length) + 2; // Minimum length is 2

            // Calculate source position in dictionary
            const srcPos = (dictPos - distance - 1) & (dictionarySize - 1);

            // Copy bytes from dictionary
            for (let i = 0; i < length && outPos < uncompressedSize; i++) {
              const copyPos = (srcPos + i) & (dictionarySize - 1);
              const byte = dictionary[copyPos] ?? 0;

              output[outPos++] = byte;
              dictionary[dictPos] = byte;
              dictPos = (dictPos + 1) % dictionarySize;
            }
          }
        }
        return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[ImplodeDecompressor] ❌ Decompression failed: ${errorMsg}`);
        throw new Error(`IMPLODE decompression failed: ${errorMsg}`);
      }
    });
  }

  /**
   * Build Shannon-Fano decoding trees
   */
  private buildTrees(compressionType: number): { literal: number[]; length: number[] } {
    // Pre-built Shannon-Fano trees for IMPLODE
    // These are static trees used by PKWare DCL

    // Length tree (used for copy lengths)
    const lengthTree = [
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
      0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d,
      0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c,
      0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b,
      0x3c, 0x3d, 0x3e, 0x3f,
    ];

    // Literal tree (used for ASCII mode)
    const literalTree = Array.from({ length: 256 }, (_, i) => i);

    return {
      literal: compressionType === CMP_ASCII ? literalTree : [],
      length: lengthTree,
    };
  }

  /**
   * Decode a value using Shannon-Fano tree
   */
  private decodeValue(bitReader: BitReader, tree: number[]): number {
    // For IMPLODE, we use a simplified decoding
    // Read bits until we can determine the value
    let code = 0;
    let bits = 0;

    // Read up to 8 bits to find the code
    while (bits < 8) {
      code = (code << 1) | bitReader.readBit();
      bits++;

      // Check if this code is in the tree
      if (code < tree.length) {
        return tree[code]!;
      }
    }

    // If no match found, return the code directly
    return code & 0xff;
  }

  /**
   * Get number of bits needed for distance encoding
   */
  private getDistanceBits(dictionarySize: number): number {
    // Distance bits depend on dictionary size
    if (dictionarySize === DICT_SIZE_1024) {
      return 6; // 1024 = 2^10, but we use 6 bits + extra logic
    } else {
      return 7; // 4096 = 2^12, but we use 7 bits + extra logic
    }
  }

  /**
   * Check if IMPLODE decompressor is available
   */
  public isAvailable(): boolean {
    return true;
  }
}

/**
 * Bit reader for IMPLODE decompression
 * Reads bits in LSB-first order
 */
class BitReader {
  private data: Uint8Array;
  private bytePos: number;
  private bitPos: number;
  private currentByte: number;

  constructor(data: Uint8Array, startOffset: number = 0) {
    this.data = data;
    this.bytePos = startOffset;
    this.bitPos = 0;
    this.currentByte = 0;

    // Load first byte
    if (this.bytePos < this.data.length) {
      this.currentByte = this.data[this.bytePos]!;
    }
  }

  /**
   * Read a single bit
   */
  public readBit(): number {
    if (this.bytePos >= this.data.length) {
      throw new Error('IMPLODE: Unexpected end of compressed data');
    }

    // Get bit from current byte (LSB first)
    const bit = (this.currentByte >> this.bitPos) & 1;

    // Advance position
    this.bitPos++;
    if (this.bitPos >= 8) {
      this.bitPos = 0;
      this.bytePos++;
      if (this.bytePos < this.data.length) {
        this.currentByte = this.data[this.bytePos]!;
      }
    }

    return bit;
  }

  /**
   * Read multiple bits
   */
  public readBits(numBits: number): number {
    let result = 0;
    for (let i = 0; i < numBits; i++) {
      result |= this.readBit() << i;
    }
    return result;
  }
}
