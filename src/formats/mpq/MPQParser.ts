/**
 * MPQ Archive Parser
 *
 * Parses MPQ archive files used by Blizzard games.
 * Based on StormLib specification.
 *
 * Note: This is a basic implementation supporting unencrypted,
 * uncompressed files. Full support for compression and encryption
 * will be added in Phase 2.
 */

import type {
  MPQArchive,
  MPQHeader,
  MPQHashEntry,
  MPQBlockEntry,
  MPQParseResult,
  MPQFile,
} from './types';
import { LZMADecompressor, CompressionAlgorithm } from '../compression';

/**
 * MPQ Archive parser
 *
 * @example
 * ```typescript
 * const parser = new MPQParser(arrayBuffer);
 * const result = await parser.parse();
 * if (result.success) {
 *   const file = await parser.extractFile('path/to/file.txt');
 * }
 * ```
 */
export class MPQParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private archive?: MPQArchive;
  private lzmaDecompressor: LZMADecompressor;

  // MPQ Magic number
  private static readonly MPQ_MAGIC = 0x1a51504d; // 'MPQ\x1A' in little-endian

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.lzmaDecompressor = new LZMADecompressor();
  }

  /**
   * Parse MPQ archive
   */
  public parse(): MPQParseResult {
    try {
      // Read and validate header
      const header = this.readHeader();
      if (!header) {
        return {
          success: false,
          error: 'Invalid MPQ header',
        };
      }

      // Read hash table
      const hashTable = this.readHashTable(header);

      // Read block table
      const blockTable = this.readBlockTable(header);

      // Create archive structure
      this.archive = {
        header,
        hashTable,
        blockTable,
        files: new Map(),
      };

      return {
        success: true,
        archive: this.archive,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read MPQ header
   */
  private readHeader(): MPQHeader | null {
    // Check magic number
    const magic = this.view.getUint32(0, true);
    if (magic !== MPQParser.MPQ_MAGIC) {
      return null;
    }

    return {
      archiveSize: this.view.getUint32(8, true),
      formatVersion: this.view.getUint16(12, true),
      blockSize: 512 * Math.pow(2, this.view.getUint16(14, true)),
      hashTablePos: this.view.getUint32(16, true),
      blockTablePos: this.view.getUint32(20, true),
      hashTableSize: this.view.getUint32(24, true),
      blockTableSize: this.view.getUint32(28, true),
    };
  }

  /**
   * Read hash table
   */
  private readHashTable(header: MPQHeader): MPQHashEntry[] {
    const hashTable: MPQHashEntry[] = [];
    let offset = header.hashTablePos;

    for (let i = 0; i < header.hashTableSize; i++) {
      hashTable.push({
        hashA: this.view.getUint32(offset, true),
        hashB: this.view.getUint32(offset + 4, true),
        locale: this.view.getUint16(offset + 8, true),
        platform: this.view.getUint16(offset + 10, true),
        blockIndex: this.view.getUint32(offset + 12, true),
      });
      offset += 16;
    }

    return hashTable;
  }

  /**
   * Read block table
   */
  private readBlockTable(header: MPQHeader): MPQBlockEntry[] {
    const blockTable: MPQBlockEntry[] = [];
    let offset = header.blockTablePos;

    for (let i = 0; i < header.blockTableSize; i++) {
      blockTable.push({
        filePos: this.view.getUint32(offset, true),
        compressedSize: this.view.getUint32(offset + 4, true),
        uncompressedSize: this.view.getUint32(offset + 8, true),
        flags: this.view.getUint32(offset + 12, true),
      });
      offset += 16;
    }

    return blockTable;
  }

  /**
   * Extract file from archive
   *
   * Supports both compressed (LZMA) and uncompressed files.
   * Note: Encrypted files are not yet supported.
   */
  public async extractFile(filename: string): Promise<MPQFile | null> {
    if (!this.archive) {
      throw new Error('Archive not parsed. Call parse() first.');
    }

    // Find file in hash table
    const hashEntry = this.findFile(filename);
    if (!hashEntry) {
      return null;
    }

    // Get block entry
    const blockEntry = this.archive.blockTable[hashEntry.blockIndex];
    if (!blockEntry) {
      return null;
    }

    // Check if file exists
    const exists = (blockEntry.flags & 0x80000000) !== 0;
    if (!exists) {
      return null;
    }

    // Extract file data
    const isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    const isEncrypted = (blockEntry.flags & 0x00010000) !== 0;

    // Encryption not yet supported
    if (isEncrypted) {
      throw new Error('Encrypted files not yet supported.');
    }

    // Read compressed or uncompressed file data
    const rawData = this.buffer.slice(
      blockEntry.filePos,
      blockEntry.filePos + blockEntry.compressedSize
    );

    let fileData: ArrayBuffer;

    if (isCompressed) {
      // Detect compression algorithm from first byte
      const compressionAlgorithm = this.detectCompressionAlgorithm(rawData);

      if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
        // Skip first byte (compression type indicator) and decompress
        const compressedData = rawData.slice(1);
        fileData = await this.lzmaDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.NONE) {
        // No compression indicator, use raw data
        fileData = rawData;
      } else {
        throw new Error(
          `Unsupported compression algorithm: 0x${compressionAlgorithm.toString(16)}`
        );
      }
    } else {
      // Uncompressed file
      fileData = rawData;
    }

    const file: MPQFile = {
      name: filename,
      data: fileData,
      compressedSize: blockEntry.compressedSize,
      uncompressedSize: blockEntry.uncompressedSize,
      isCompressed,
      isEncrypted,
    };

    // Cache file
    this.archive.files.set(filename, file);

    return file;
  }

  /**
   * Detect compression algorithm from compressed data
   *
   * In MPQ archives, the first byte of compressed data indicates
   * the compression algorithm used.
   */
  private detectCompressionAlgorithm(data: ArrayBuffer): CompressionAlgorithm {
    if (data.byteLength === 0) {
      return CompressionAlgorithm.NONE;
    }

    const view = new DataView(data);
    const firstByte = view.getUint8(0);

    // Check for known compression algorithms
    switch (firstByte) {
      case CompressionAlgorithm.LZMA:
        return CompressionAlgorithm.LZMA;
      case CompressionAlgorithm.PKZIP:
        return CompressionAlgorithm.PKZIP;
      case CompressionAlgorithm.ZLIB:
        return CompressionAlgorithm.ZLIB;
      case CompressionAlgorithm.BZIP2:
        return CompressionAlgorithm.BZIP2;
      default:
        // Unknown or no compression indicator
        return CompressionAlgorithm.NONE;
    }
  }

  /**
   * Find file in hash table
   */
  private findFile(filename: string): MPQHashEntry | null {
    if (!this.archive) return null;

    const hashA = this.hashString(filename, 0);
    const hashB = this.hashString(filename, 1);

    for (const entry of this.archive.hashTable) {
      if (entry.hashA === hashA && entry.hashB === hashB) {
        return entry;
      }
    }

    return null;
  }

  /**
   * Hash string for MPQ lookup
   *
   * Simplified version - full implementation would use MPQ's hash algorithm
   */
  private hashString(str: string, hashType: number): number {
    let hash = 0;
    const upperStr = str.toUpperCase();

    for (let i = 0; i < upperStr.length; i++) {
      const char = upperStr.charCodeAt(i);
      hash = (hash << 5) + hash + char + hashType;
      hash = hash & 0xffffffff; // Keep as 32-bit
    }

    return hash;
  }

  /**
   * List all files in archive
   */
  public listFiles(): string[] {
    if (!this.archive) return [];

    // In a real implementation, we would read the (listfile) from the archive
    // For now, return cached files
    return Array.from(this.archive.files.keys());
  }

  /**
   * Get archive info
   */
  public getInfo(): { fileCount: number; archiveSize: number } | null {
    if (!this.archive) return null;

    return {
      fileCount: this.archive.blockTable.filter((b) => (b.flags & 0x80000000) !== 0).length,
      archiveSize: this.archive.header.archiveSize,
    };
  }
}
