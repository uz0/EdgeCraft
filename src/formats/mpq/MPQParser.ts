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
  MPQStreamParseResult,
  MPQStreamOptions,
} from './types';
import { StreamingFileReader } from '../../utils/StreamingFileReader';
import { LZMADecompressor, CompressionAlgorithm } from '../compression';
import * as pako from 'pako';
import { explode } from 'node-pkware/simple';

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
  private cryptTable: Uint32Array;

  // MPQ Magic numbers
  private static readonly MPQ_MAGIC_V1 = 0x1a51504d; // 'MPQ\x1A' in little-endian
  private static readonly MPQ_MAGIC_V2 = 0x1b51504d; // 'MPQ\x1B' in little-endian (SC2)

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.lzmaDecompressor = new LZMADecompressor();
    this.cryptTable = this.prepareCryptTable();
  }

  /**
   * Prepare the crypt table for MPQ hash algorithm
   */
  private prepareCryptTable(): Uint32Array {
    const table = new Uint32Array(0x500);
    let seed = 0x00100001;

    for (let index1 = 0; index1 < 0x100; index1++) {
      let index2 = index1;
      for (let i = 0; i < 5; i++) {
        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp1 = (seed & 0xffff) << 0x10;

        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp2 = seed & 0xffff;

        table[index2] = temp1 | temp2;
        index2 += 0x100;
      }
    }

    return table;
  }

  /**
   * Parse MPQ archive
   */
  public parse(): MPQParseResult {
    const startTime = performance.now();
    try {
      // Read and validate header
      const header = this.readHeader();
      if (!header) {
        return {
          success: false,
          error: 'Invalid MPQ header',
          parseTimeMs: performance.now() - startTime,
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

      // Debug: print ALL non-empty hash entries
      const validHashes = hashTable.filter(
        (h) => h.blockIndex !== 0xffffffff && h.blockIndex !== 0xfffffffe
      );
      console.log(
        `[MPQParser] Archive parsed: ${hashTable.length} hash entries, ${blockTable.length} blocks, ${validHashes.length} valid files`
      );
      validHashes.forEach((h, i) => {
        console.log(
          `[MPQParser]   File ${i}: hashA=${h.hashA.toString(16)}, hashB=${h.hashB.toString(16)}, block=${h.blockIndex}`
        );
      });

      return {
        success: true,
        archive: this.archive,
        parseTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        parseTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Parse MPQ archive from stream (for large files >100MB)
   *
   * This method reads the MPQ archive in chunks, only loading the parts
   * needed (header, hash table, block table, and specific files).
   * This prevents memory crashes with large files like 923MB campaigns.
   *
   * @param reader - StreamingFileReader instance
   * @param options - Streaming options (extractFiles, onProgress)
   * @returns MPQStreamParseResult with extracted files
   *
   * @example
   * ```typescript
   * const reader = new StreamingFileReader(file);
   * const parser = new MPQParser(new ArrayBuffer(0)); // Empty buffer
   * const result = await parser.parseStream(reader, {
   *   extractFiles: ['war3campaign.w3f', '*.w3x'],
   *   onProgress: (stage, progress) => console.log(`${stage}: ${progress}%`)
   * });
   * ```
   */
  public async parseStream(
    reader: StreamingFileReader,
    options?: MPQStreamOptions
  ): Promise<MPQStreamParseResult> {
    const startTime = performance.now();

    try {
      // Step 1: Read header (512 bytes)
      options?.onProgress?.('Reading header', 0);
      const headerData = await reader.readRange(0, 512);
      const header = this.parseHeaderFromBytes(headerData);

      if (!header) {
        return {
          success: false,
          files: [],
          fileList: [],
          error: 'Invalid MPQ header',
          parseTimeMs: performance.now() - startTime,
        };
      }

      // Step 2: Read hash table
      options?.onProgress?.('Reading hash table', 20);
      const hashTableSize = header.hashTableSize * 16; // 16 bytes per entry
      const hashTableData = await reader.readRange(header.hashTablePos, hashTableSize);
      const hashTable = this.parseHashTableFromBytes(hashTableData, header.hashTableSize);

      // Step 3: Read block table
      options?.onProgress?.('Reading block table', 40);
      const blockTableSize = header.blockTableSize * 16; // 16 bytes per entry
      const blockTableData = await reader.readRange(header.blockTablePos, blockTableSize);
      const blockTable = this.parseBlockTableFromBytes(blockTableData, header.blockTableSize);

      // Step 4: Build file list
      options?.onProgress?.('Building file list', 60);
      const fileList = await this.buildFileListStream(reader, hashTable, blockTable);

      // Step 5: Extract specific files (if requested)
      const files: MPQFile[] = [];
      if (options?.extractFiles && options.extractFiles.length > 0) {
        for (let i = 0; i < options.extractFiles.length; i++) {
          const filePattern = options.extractFiles[i];
          options?.onProgress?.(
            `Extracting ${filePattern}`,
            60 + (i / options.extractFiles.length) * 40
          );

          // Handle wildcards
          if (filePattern !== undefined && filePattern.includes('*')) {
            const matchingFiles = fileList.filter((f) => this.matchesPattern(f, filePattern));
            for (const fileName of matchingFiles) {
              const file = await this.extractFileStream(fileName, reader, hashTable, blockTable);
              if (file) {
                files.push(file);
              }
            }
          } else {
            const file = await this.extractFileStream(
              filePattern ?? '',
              reader,
              hashTable,
              blockTable
            );
            if (file) {
              files.push(file);
            }
          }
        }
      }

      options?.onProgress?.('Complete', 100);

      return {
        success: true,
        header,
        files,
        fileList,
        parseTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        fileList: [],
        error: error instanceof Error ? error.message : String(error),
        parseTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Read MPQ header
   */
  private readHeader(): MPQHeader | null {
    // VERSION MARKER: MPQ Header debugging v3.0 (2025-10-11)
    console.log('[MPQParser] 🔧 MPQ HEADER CHECK v3.0');

    // Check buffer size
    if (this.buffer.byteLength < 32) {
      console.error(
        `[MPQParser] ❌ Buffer too small for MPQ header: ${this.buffer.byteLength} bytes (need 32+)`
      );
      return null;
    }

    // Read first 16 bytes for debugging
    const bytes = new Uint8Array(this.buffer.slice(0, Math.min(16, this.buffer.byteLength)));
    console.log(
      `[MPQParser] First 16 bytes: ${Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')}`
    );

    // Check magic number (support both v1 and v2)
    const magic = this.view.getUint32(0, true);
    const magicBytes = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
    console.log(
      `[MPQParser] Magic: 0x${magic.toString(16)} ("${magicBytes}"), expected 0x${MPQParser.MPQ_MAGIC_V1.toString(16)} or 0x${MPQParser.MPQ_MAGIC_V2.toString(16)}`
    );

    if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
      console.error(
        `[MPQParser] ❌ Invalid MPQ magic number: 0x${magic.toString(16)} ("${magicBytes}")`
      );
      return null;
    }

    console.log('[MPQParser] ✅ Valid MPQ header detected');

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
    const offset = header.hashTablePos;

    // Decrypt hash table - key is hashString("(hash table)", 3)
    const key = 0xc3af3770; // Pre-computed hash of "(hash table)"
    const encryptedData = new Uint32Array(header.hashTableSize * 4);

    for (let i = 0; i < header.hashTableSize * 4; i++) {
      encryptedData[i] = this.view.getUint32(offset + i * 4, true);
    }

    const decryptedData = this.decryptBlock(encryptedData, key);

    for (let i = 0; i < header.hashTableSize; i++) {
      const idx = i * 4;
      hashTable.push({
        hashA: decryptedData[idx]!,
        hashB: decryptedData[idx + 1]!,
        locale: decryptedData[idx + 2]! & 0xffff,
        platform: (decryptedData[idx + 2]! >>> 16) & 0xffff,
        blockIndex: decryptedData[idx + 3]!,
      });
    }

    return hashTable;
  }

  /**
   * Read block table
   */
  private readBlockTable(header: MPQHeader): MPQBlockEntry[] {
    const blockTable: MPQBlockEntry[] = [];
    const offset = header.blockTablePos;

    // Decrypt block table - key is hashString("(block table)", 3)
    const key = this.hashString('(block table)', 3);
    const encryptedData = new Uint32Array(header.blockTableSize * 4);

    for (let i = 0; i < header.blockTableSize * 4; i++) {
      encryptedData[i] = this.view.getUint32(offset + i * 4, true);
    }

    const decryptedData = this.decryptBlock(encryptedData, key);

    for (let i = 0; i < header.blockTableSize; i++) {
      const idx = i * 4;
      blockTable.push({
        filePos: decryptedData[idx]!,
        compressedSize: decryptedData[idx + 1]!,
        uncompressedSize: decryptedData[idx + 2]!,
        flags: decryptedData[idx + 3]!,
      });
    }

    return blockTable;
  }

  /**
   * Decrypt a block of data using MPQ algorithm
   */
  private decryptBlock(data: Uint32Array, key: number): Uint32Array {
    let seed = 0xeeeeeeee;
    const result = new Uint32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      seed += this.cryptTable[0x400 + (key & 0xff)]!;
      const decrypted = data[i]! ^ (key + seed);

      key = ((~key << 0x15) + 0x11111111) | (key >>> 0x0b);
      seed = decrypted + seed + (seed << 5) + 3;

      result[i] = decrypted >>> 0;
    }

    return result;
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
    const fixKey = (blockEntry.flags & 0x00020000) !== 0;

    // Read file data (compressed or uncompressed)
    let rawData = this.buffer.slice(
      blockEntry.filePos,
      blockEntry.filePos + blockEntry.compressedSize
    );

    // Decrypt if encrypted
    if (isEncrypted) {
      // Calculate decryption key from filename
      const pathParts = filename.split('\\');
      const baseName = pathParts[pathParts.length - 1] ?? filename;
      let fileKey = this.hashString(baseName, 3);

      if (fixKey) {
        fileKey = ((fileKey + blockEntry.filePos) ^ blockEntry.uncompressedSize) >>> 0;
      }

      // Decrypt the file data
      const uint32View = new Uint32Array(rawData, 0, Math.floor(rawData.byteLength / 4));
      const decryptedUint32 = this.decryptBlock(uint32View, fileKey);

      // Handle any remaining bytes that don't fit in uint32
      const remainingBytes = rawData.byteLength % 4;
      const result = new Uint8Array(rawData.byteLength);
      result.set(new Uint8Array(decryptedUint32.buffer));

      if (remainingBytes > 0) {
        // Copy remaining bytes as-is
        const srcView = new Uint8Array(rawData);
        for (let i = 0; i < remainingBytes; i++) {
          result[decryptedUint32.byteLength + i] = srcView[decryptedUint32.byteLength + i]!;
        }
      }

      rawData = result.buffer;
    }

    let fileData: ArrayBuffer;

    if (isCompressed) {
      // Log file decompression attempt
      const firstBytes = Array.from(
        new Uint8Array(rawData.slice(0, Math.min(16, rawData.byteLength)))
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(
        `[MPQParser] Decompressing file "${filename}" (${rawData.byteLength} bytes compressed -> ${blockEntry.uncompressedSize} bytes expected)`
      );
      console.log(`[MPQParser] First 16 bytes: ${firstBytes}`);

      // Detect compression algorithm from first byte
      const compressionAlgorithm = this.detectCompressionAlgorithm(rawData);
      console.log(`[MPQParser] Detected compression: 0x${compressionAlgorithm.toString(16)}`);

      if (compressionAlgorithm === CompressionAlgorithm.NONE) {
        // First byte is 0x00 - could mean:
        // 1. File stored uncompressed despite compression flag
        // 2. File compressed with raw ZLIB (no type byte prefix)
        // Check if sizes match to determine which case
        if (rawData.byteLength === blockEntry.uncompressedSize) {
          // Sizes match - truly uncompressed
          fileData = rawData;
          console.log(`[MPQParser] No compression, using raw data: ${fileData.byteLength} bytes`);
        } else {
          // VERSION MARKER: Sector decompression fix v2.0 (2025-10-11)
          console.log('[MPQParser] 🔧 SECTOR FIX v2.0 ACTIVE');
          // Sizes don't match - could be sector-compressed or raw ZLIB
          // Only use sector decompression for files larger than sector size (4KB)
          const SECTOR_SIZE = 4096;
          if (blockEntry.uncompressedSize > SECTOR_SIZE) {
            console.log(
              `[MPQParser] Size mismatch (${rawData.byteLength} != ${blockEntry.uncompressedSize}), trying sector decompression...`
            );
            try {
              fileData = this.decompressSectors(
                rawData,
                blockEntry.uncompressedSize,
                CompressionAlgorithm.ZLIB
              );
              console.log(
                `[MPQParser] Sector decompression: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
              );
            } catch (sectorErr) {
              console.warn(`[MPQParser] Sector decompression failed, trying raw ZLIB:`, sectorErr);
              // Fallback to raw ZLIB
              try {
                const decompressed = pako.inflate(new Uint8Array(rawData));
                fileData = decompressed.buffer.slice(
                  decompressed.byteOffset,
                  decompressed.byteOffset + decompressed.byteLength
                );
                console.log(
                  `[MPQParser] Raw ZLIB: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
                );
              } catch (zlibErr) {
                console.error(`[MPQParser] Raw ZLIB also failed:`, zlibErr);
                // Last resort: use raw data
                fileData = rawData;
                console.log(`[MPQParser] Using raw data as fallback: ${fileData.byteLength} bytes`);
              }
            }
          } else {
            // Small file - use raw ZLIB decompression directly
            console.log(
              `[MPQParser] Small file size mismatch (${rawData.byteLength} != ${blockEntry.uncompressedSize}), using raw ZLIB...`
            );
            try {
              const decompressed = pako.inflate(new Uint8Array(rawData));
              fileData = decompressed.buffer.slice(
                decompressed.byteOffset,
                decompressed.byteOffset + decompressed.byteLength
              );
              console.log(
                `[MPQParser] Raw ZLIB: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
              );
            } catch (zlibErr) {
              console.error(`[MPQParser] Raw ZLIB failed:`, zlibErr);
              // Last resort: use raw data
              fileData = rawData;
              console.log(`[MPQParser] Using raw data as fallback: ${fileData.byteLength} bytes`);
            }
          }
        }
      } else if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
        // Skip first byte (compression type indicator) and decompress
        const compressedData = rawData.slice(1);
        fileData = await this.lzmaDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.PKZIP) {
        // PKZIP (0x08) can be either:
        // 1. Multi-compression format: [0x08] [header] [actual_type] [data]
        // 2. Actual PKWare Implode compression
        // Check byte 8 to determine actual compression type for multi-compression
        const view = new DataView(rawData);

        // Multi-compression format has data at offset 8+
        if (rawData.byteLength > 8) {
          const actualCompressionType = view.getUint8(8) as CompressionAlgorithm;

          console.log(
            `[MPQParser] Multi-compression detected: outer=0x08, inner=0x${actualCompressionType.toString(16)}`
          );

          if (actualCompressionType === CompressionAlgorithm.ZLIB) {
            // Multi-compression with ZLIB
            // Format: [0x08] [4 bytes unknown] [4 bytes size?] [0x02] [ZLib data]
            const compressedData = new Uint8Array(rawData.slice(9)); // Skip to ZLib data after type byte

            try {
              const decompressed = pako.inflate(compressedData);
              // Create proper ArrayBuffer copy (pako returns Uint8Array)
              fileData = decompressed.buffer.slice(
                decompressed.byteOffset,
                decompressed.byteOffset + decompressed.byteLength
              );
              console.log(
                `[MPQParser] Multi-compression ZLIB: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
              );
              console.log(
                `[MPQParser] Decompressed first 16 bytes: ${Array.from(
                  new Uint8Array(fileData.slice(0, Math.min(16, fileData.byteLength)))
                )
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join(' ')}`
              );
            } catch (err) {
              console.error(`[MPQParser] Multi-compression ZLIB decompression failed:`, err);
              throw new Error(
                `Failed to decompress file: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          } else if (actualCompressionType === CompressionAlgorithm.PKZIP) {
            // Actual PKWare Implode within multi-compression
            const compressedData = rawData.slice(9);
            try {
              const decompressed = explode(compressedData);
              fileData = decompressed as ArrayBuffer;
              console.log(
                `[MPQParser] Multi-compression PKWare: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
              );
            } catch (err) {
              console.error(`[MPQParser] Multi-compression PKWare decompression failed:`, err);
              throw new Error(
                `Failed to decompress file: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          } else {
            throw new Error(
              `Unsupported multi-compression algorithm: 0x${actualCompressionType.toString(16)}`
            );
          }
        } else {
          // Too short for multi-compression, try direct PKWare
          const compressedData = rawData.slice(1);
          try {
            const decompressed = explode(compressedData);
            fileData = decompressed as ArrayBuffer;
            console.log(
              `[MPQParser] Direct PKWare: ${rawData.byteLength} -> ${fileData.byteLength} bytes`
            );
          } catch (err) {
            console.error(`[MPQParser] Direct PKWare decompression failed:`, err);
            throw new Error(
              `Failed to decompress file: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      } else if (compressionAlgorithm === CompressionAlgorithm.ZLIB) {
        // ZLIB - use pako for decompression
        // Skip first byte (compression type indicator)
        const compressedData = new Uint8Array(rawData.slice(1));

        try {
          const decompressed = pako.inflate(compressedData);
          // Create proper ArrayBuffer copy (pako returns Uint8Array)
          fileData = decompressed.buffer.slice(
            decompressed.byteOffset,
            decompressed.byteOffset + decompressed.byteLength
          );
        } catch (err) {
          console.error(`[MPQParser] ZLIB decompression failed:`, err);
          throw new Error(
            `Failed to decompress file: ${err instanceof Error ? err.message : String(err)}`
          );
        }
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
    const firstByte = view.getUint8(0) as CompressionAlgorithm;

    // Check for known compression algorithms
    if (firstByte === CompressionAlgorithm.LZMA) {
      return CompressionAlgorithm.LZMA;
    } else if (firstByte === CompressionAlgorithm.PKZIP) {
      return CompressionAlgorithm.PKZIP;
    } else if (firstByte === CompressionAlgorithm.ZLIB) {
      return CompressionAlgorithm.ZLIB;
    } else if (firstByte === CompressionAlgorithm.BZIP2) {
      return CompressionAlgorithm.BZIP2;
    }

    // Unknown or no compression indicator
    return CompressionAlgorithm.NONE;
  }

  /**
   * Decompress sector-compressed data
   *
   * MPQ splits large files into sectors (typically 4KB each) and compresses each sector.
   * Format: [sector_offset_table] [compressed_sector_0] [compressed_sector_1] ...
   */
  private decompressSectors(
    compressedData: ArrayBuffer,
    uncompressedSize: number,
    _algorithm: CompressionAlgorithm
  ): ArrayBuffer {
    const view = new DataView(compressedData);
    const sectorSize = 4096; // Default MPQ sector size

    // Calculate number of sectors needed
    const numSectors = Math.ceil(uncompressedSize / sectorSize);

    // Read sector offset table (4 bytes per sector + 1 for end offset)
    const sectorOffsets: number[] = [];
    for (let i = 0; i <= numSectors; i++) {
      sectorOffsets.push(view.getUint32(i * 4, true)); // Little-endian
    }

    console.log(
      `[MPQParser] Sector decompression: ${numSectors} sectors, first offsets: ${sectorOffsets.slice(0, Math.min(5, sectorOffsets.length)).join(', ')}`
    );

    // Decompress each sector
    const decompressedSectors: Uint8Array[] = [];
    let totalDecompressed = 0;

    for (let i = 0; i < numSectors; i++) {
      const sectorStart = sectorOffsets[i];
      const sectorEnd = sectorOffsets[i + 1];

      if (sectorStart === undefined || sectorEnd === undefined) {
        throw new Error(`Invalid sector offset for sector ${i}`);
      }

      const sectorCompressedSize = sectorEnd - sectorStart;

      // Extract sector data
      const sectorData = compressedData.slice(sectorStart, sectorEnd);

      // Expected uncompressed size for this sector
      const isLastSector = i === numSectors - 1;
      const sectorUncompressedSize = isLastSector ? uncompressedSize - i * sectorSize : sectorSize;

      // Check if sector is actually compressed
      if (sectorCompressedSize === sectorUncompressedSize) {
        // Sector is stored uncompressed
        decompressedSectors.push(new Uint8Array(sectorData));
        totalDecompressed += sectorUncompressedSize;
      } else {
        // Sector is compressed - check for compression type indicator
        const sectorView = new DataView(sectorData);
        const compressionType = sectorView.getUint8(0);

        // Skip the compression type byte (typically 0x02 for ZLIB)
        const actualCompressedData =
          compressionType === 0x02 || compressionType === 0x08 ? sectorData.slice(1) : sectorData;

        try {
          const decompressed = pako.inflate(new Uint8Array(actualCompressedData));
          decompressedSectors.push(decompressed);
          totalDecompressed += decompressed.length;
        } catch (err) {
          throw new Error(
            `Failed to decompress sector ${i}/${numSectors} (compression type: 0x${compressionType.toString(16)}): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    console.log(`[MPQParser] Decompressed ${numSectors} sectors: ${totalDecompressed} bytes total`);

    // Concatenate all decompressed sectors
    const result = new Uint8Array(totalDecompressed);
    let offset = 0;
    for (const sector of decompressedSectors) {
      result.set(sector, offset);
      offset += sector.length;
    }

    return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
  }

  /**
   * Find file in hash table
   */
  private findFile(filename: string): MPQHashEntry | null {
    if (!this.archive) return null;

    const hashA = this.hashString(filename, 1); // HASH_A = type 1
    const hashB = this.hashString(filename, 2); // HASH_B = type 2

    console.log(
      `[MPQParser] Finding "${filename}": hashA=0x${hashA.toString(16)}, hashB=0x${hashB.toString(16)}`
    );

    // Show valid entries for comparison
    const validEntries = this.archive.hashTable.filter(
      (e) => e.blockIndex !== 0xffffffff && e.blockIndex !== 0xfffffffe
    );
    console.log(
      `[MPQParser] Hash table has ${validEntries.length} valid entries out of ${this.archive.hashTable.length} total`
    );

    // Show first 5 valid entries
    if (validEntries.length > 0) {
      console.log('[MPQParser] First 5 valid hash entries:');
      validEntries.slice(0, 5).forEach((e, i) => {
        console.log(
          `  [${i}] hashA=0x${e.hashA.toString(16)}, hashB=0x${e.hashB.toString(16)}, blockIndex=${e.blockIndex}`
        );
      });
    }

    for (const entry of this.archive.hashTable) {
      if (entry.hashA === hashA && entry.hashB === hashB) {
        console.log(`[MPQParser] Found "${filename}" at blockIndex ${entry.blockIndex}`);
        return entry;
      }
    }

    console.log(`[MPQParser] "${filename}" not found in hash table`);
    return null;
  }

  /**
   * Hash string for MPQ lookup using proper MPQ algorithm
   */
  private hashString(str: string, hashType: number): number {
    let seed1 = 0x7fed7fed;
    let seed2 = 0xeeeeeeee;
    const upperStr = str.toUpperCase().replace(/\//g, '\\'); // Normalize path separators

    for (let i = 0; i < upperStr.length; i++) {
      const ch = upperStr.charCodeAt(i);
      seed1 = this.cryptTable[(hashType << 8) + ch]! ^ (seed1 + seed2);
      seed2 = ch + seed1 + seed2 + (seed2 << 5) + 3;
    }

    return seed1 >>> 0; // Convert to unsigned 32-bit
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

  // ============ STREAMING HELPER METHODS ============

  /**
   * Parse header from byte array (for streaming)
   */
  private parseHeaderFromBytes(data: Uint8Array): MPQHeader | null {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Check magic number
    const magic = view.getUint32(0, true);
    if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
      return null;
    }

    return {
      archiveSize: view.getUint32(8, true),
      formatVersion: view.getUint16(12, true),
      blockSize: 512 * Math.pow(2, view.getUint16(14, true)),
      hashTablePos: view.getUint32(16, true),
      blockTablePos: view.getUint32(20, true),
      hashTableSize: view.getUint32(24, true),
      blockTableSize: view.getUint32(28, true),
    };
  }

  /**
   * Parse hash table from byte array (for streaming)
   */
  private parseHashTableFromBytes(data: Uint8Array, entryCount: number): MPQHashEntry[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const hashTable: MPQHashEntry[] = [];
    let offset = 0;

    for (let i = 0; i < entryCount; i++) {
      hashTable.push({
        hashA: view.getUint32(offset, true),
        hashB: view.getUint32(offset + 4, true),
        locale: view.getUint16(offset + 8, true),
        platform: view.getUint16(offset + 10, true),
        blockIndex: view.getUint32(offset + 12, true),
      });
      offset += 16;
    }

    return hashTable;
  }

  /**
   * Parse block table from byte array (for streaming)
   */
  private parseBlockTableFromBytes(data: Uint8Array, entryCount: number): MPQBlockEntry[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const blockTable: MPQBlockEntry[] = [];
    let offset = 0;

    for (let i = 0; i < entryCount; i++) {
      blockTable.push({
        filePos: view.getUint32(offset, true),
        compressedSize: view.getUint32(offset + 4, true),
        uncompressedSize: view.getUint32(offset + 8, true),
        flags: view.getUint32(offset + 12, true),
      });
      offset += 16;
    }

    return blockTable;
  }

  /**
   * Build file list from (listfile) in archive
   */
  private async buildFileListStream(
    reader: StreamingFileReader,
    hashTable: MPQHashEntry[],
    blockTable: MPQBlockEntry[]
  ): Promise<string[]> {
    try {
      // Try to extract (listfile)
      const listFile = await this.extractFileStream('(listfile)', reader, hashTable, blockTable);
      if (!listFile) {
        return [];
      }

      // Parse listfile (text file with one filename per line)
      const decoder = new TextDecoder('utf-8');
      const listContent = decoder.decode(listFile.data);
      const fileList = listContent
        .split(/[\r\n]+/)
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      return fileList;
    } catch (error) {
      // Listfile not found or error - return empty list
      return [];
    }
  }

  /**
   * Check if filename matches pattern (simple wildcard support)
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }

  /**
   * Extract single file from stream
   */
  private async extractFileStream(
    fileName: string,
    reader: StreamingFileReader,
    hashTable: MPQHashEntry[],
    blockTable: MPQBlockEntry[]
  ): Promise<MPQFile | null> {
    // Find file in hash table
    const hashA = this.hashString(fileName, 0);
    const hashB = this.hashString(fileName, 1);

    let hashEntry: MPQHashEntry | null = null;
    for (const entry of hashTable) {
      if (entry.hashA === hashA && entry.hashB === hashB) {
        hashEntry = entry;
        break;
      }
    }

    if (!hashEntry || hashEntry.blockIndex >= blockTable.length) {
      return null;
    }

    const blockEntry = blockTable[hashEntry.blockIndex];

    // Check if file exists
    const exists = (blockEntry?.flags ?? 0 & 0x80000000) !== 0;
    if (!exists || !blockEntry) {
      return null;
    }

    // Read file data from archive
    const fileData = await reader.readRange(blockEntry.filePos, blockEntry.uncompressedSize);

    // For now, only support uncompressed, unencrypted files
    const isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    const isEncrypted = (blockEntry.flags & 0x00010000) !== 0;

    if (isCompressed || isEncrypted) {
      console.warn(
        `File ${fileName} is compressed/encrypted - not yet supported in streaming mode`
      );
      return null;
    }

    return {
      name: fileName,
      data: fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ) as ArrayBuffer,
      compressedSize: blockEntry.compressedSize,
      uncompressedSize: blockEntry.uncompressedSize,
      isCompressed,
      isEncrypted,
    };
  }
}
