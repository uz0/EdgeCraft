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
import {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  LZMADecompressor,
  ZlibDecompressor,
  Bzip2Decompressor,
  HuffmanDecompressor,
  ImplodeDecompressor,
  CompressionAlgorithm,
} from '../compression';

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
  private zlibDecompressor: ZlibDecompressor;
  private bzip2Decompressor: Bzip2Decompressor;
  private huffmanDecompressor: HuffmanDecompressor;
  private implodeDecompressor: ImplodeDecompressor;

  // MPQ Magic numbers
  private static readonly MPQ_MAGIC_V1 = 0x1a51504d; // 'MPQ\x1A' in little-endian
  private static readonly MPQ_MAGIC_V2 = 0x1b51504d; // 'MPQ\x1B' in little-endian (SC2)

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.lzmaDecompressor = new LZMADecompressor();
    this.zlibDecompressor = new ZlibDecompressor();
    this.bzip2Decompressor = new Bzip2Decompressor();
    this.huffmanDecompressor = new HuffmanDecompressor();
    this.implodeDecompressor = new ImplodeDecompressor();
  }

  /**
   * Get the parsed MPQ archive
   * @returns The parsed archive, or undefined if not yet parsed
   */
  public getArchive(): MPQArchive | undefined {
    return this.archive;
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
      let hashTable;
      try {
        hashTable = this.readHashTable(header);
      } catch (error) {
        // eslint-disable-line no-empty
        console.error('[MPQParser] Error reading hash table:', error);
        throw error;
      }

      // Read block table
      let blockTable;
      try {
        blockTable = this.readBlockTable(header);
      } catch (error) {
        // eslint-disable-line no-empty
        console.error('[MPQParser] Error reading block table:', error);
        throw error;
      }

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
        parseTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      // eslint-disable-line no-empty
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
        hashTable,
        blockTable,
        files,
        fileList,
        parseTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      // eslint-disable-line no-empty
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
   * Searches for valid MPQ header, skipping any fake/encrypted headers
   */
  private readHeader(): MPQHeader | null {
    // W3X maps often have user data (preview image) before the MPQ header
    // Some maps (like Legion TD) have fake/encrypted headers before the real one
    // Search for MPQ magic number in the first 4KB and validate each candidate
    const searchLimit = Math.min(4096, this.buffer.byteLength);
    // Try each potential header location
    for (let offset = 0; offset < searchLimit; offset += 512) {
      const magic = this.view.getUint32(offset, true);

      // Skip if not MPQ magic
      if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
        continue;
      }
      // Handle MPQ user data header (0x1b51504d)
      let headerOffset = offset;
      let headerMagic = magic;

      if (magic === MPQParser.MPQ_MAGIC_V2) {
        const realHeaderOffset = this.view.getUint32(offset + 8, true);
        headerOffset = realHeaderOffset;

        if (headerOffset >= this.buffer.byteLength - 32) {
          console.warn(`[MPQParser] Real header offset out of bounds, skipping...`);
          continue;
        }

        headerMagic = this.view.getUint32(headerOffset, true);

        if (headerMagic !== MPQParser.MPQ_MAGIC_V1) {
          console.warn(
            `[MPQParser] Invalid magic at real header offset ${headerOffset}: 0x${headerMagic.toString(16)}, skipping...`
          );
          continue;
        }
      }

      // Try to parse header at this offset
      const archiveSize = this.view.getUint32(headerOffset + 8, true);
      const formatVersion = this.view.getUint16(headerOffset + 12, true);
      const sectorSizeShift = this.view.getUint16(headerOffset + 14, true);
      const blockSize = 512 * Math.pow(2, sectorSizeShift);

      // Read table positions from header
      // Note: Table positions in MPQ headers are ALWAYS relative to the MPQ header start
      const hashTablePos = this.view.getUint32(headerOffset + 16, true) + headerOffset;
      const blockTablePos = this.view.getUint32(headerOffset + 20, true) + headerOffset;
      const hashTableSize = this.view.getUint32(headerOffset + 24, true);
      const blockTableSize = this.view.getUint32(headerOffset + 28, true);

      // Validate header values are reasonable
      const isValid =
        formatVersion <= 3 && // Format version should be 0-3
        sectorSizeShift <= 16 && // Sector size shift should be reasonable
        hashTableSize < 1000000 && // Hash table size should be reasonable
        blockTableSize < 1000000 && // Block table size should be reasonable
        hashTablePos >= 0 &&
        hashTablePos < this.buffer.byteLength &&
        blockTablePos >= 0 &&
        blockTablePos < this.buffer.byteLength &&
        hashTablePos + hashTableSize * 16 <= this.buffer.byteLength &&
        blockTablePos + blockTableSize * 16 <= this.buffer.byteLength;

      if (!isValid) {
        console.warn(
          `[MPQParser] Header at offset ${headerOffset} has invalid values (formatVersion=${formatVersion}, sectorSizeShift=${sectorSizeShift}, hashTableSize=${hashTableSize}, blockTableSize=${blockTableSize}), skipping...`
        );
        continue;
      }

      // Found valid header!
      return {
        archiveSize,
        formatVersion,
        blockSize,
        hashTablePos,
        blockTablePos,
        hashTableSize,
        blockTableSize,
      };
    }

    console.error(`[MPQParser] No valid MPQ header found in first ${searchLimit} bytes`);
    return null;
  }

  /**
   * Read hash table (with optional decryption)
   */
  private readHashTable(header: MPQHeader): MPQHashEntry[] {
    const hashTable: MPQHashEntry[] = [];
    const offset = header.hashTablePos;
    const size = header.hashTableSize * 16; // 16 bytes per entry

    // Handle empty hash table
    if (header.hashTableSize === 0) {
      return hashTable;
    }

    // Try WITHOUT decryption first (many maps don't encrypt tables)
    const rawView = new DataView(this.buffer, offset, size);

    // Check if raw blockIndex values are reasonable (should be < blockTableSize or 0xFFFFFFFF for empty)
    let hasValidBlockIndices = true;
    for (let i = 0; i < Math.min(header.hashTableSize, 10); i++) {
      const blockIndex = rawView.getUint32(i * 16 + 12, true);
      // Valid if empty (0xFFFFFFFF) or within block table range
      if (blockIndex !== 0xffffffff && blockIndex >= header.blockTableSize) {
        hasValidBlockIndices = false;
        break;
      }
    }
    let view = rawView;
    if (!hasValidBlockIndices) {
      // BlockIndex values out of range = table is encrypted
      const tableData = new Uint8Array(this.buffer, offset, size);
      const decryptedData = this.decryptTable(tableData, '(hash table)');
      view = new DataView(decryptedData.buffer as ArrayBuffer);
    } else {
    }

    // Parse entries
    for (let i = 0; i < header.hashTableSize; i++) {
      const entryOffset = i * 16;
      hashTable.push({
        hashA: view.getUint32(entryOffset, true),
        hashB: view.getUint32(entryOffset + 4, true),
        locale: view.getUint16(entryOffset + 8, true),
        platform: view.getUint16(entryOffset + 10, true),
        blockIndex: view.getUint32(entryOffset + 12, true),
      });
    }

    return hashTable;
  }

  /**
   * Read block table (with optional decryption)
   */
  private readBlockTable(header: MPQHeader): MPQBlockEntry[] {
    const blockTable: MPQBlockEntry[] = [];
    const offset = header.blockTablePos;
    const size = header.blockTableSize * 16; // 16 bytes per entry

    // Handle empty block table
    if (header.blockTableSize === 0) {
      return blockTable;
    }
    if (offset + size > this.buffer.byteLength) {
      throw new Error(
        `Block table out of bounds: offset=${offset}, size=${size}, bufferSize=${this.buffer.byteLength}`
      );
    }

    // Try WITHOUT decryption first
    const rawView = new DataView(this.buffer, offset, size);

    // Check if raw data looks valid (filePos should be within archive)
    const firstFilePosRaw = rawView.getUint32(0, true);
    // If raw values look reasonable, use them; otherwise decrypt
    let view = rawView;
    if (firstFilePosRaw > header.archiveSize * 2) {
      // File position way outside archive = encrypted
      const tableData = new Uint8Array(this.buffer, offset, size);
      const decryptedData = this.decryptTable(tableData, '(block table)');
      view = new DataView(decryptedData.buffer as ArrayBuffer);
    } else {
    }

    // Parse entries
    for (let i = 0; i < header.blockTableSize; i++) {
      const entryOffset = i * 16;
      blockTable.push({
        filePos: view.getUint32(entryOffset, true),
        compressedSize: view.getUint32(entryOffset + 4, true),
        uncompressedSize: view.getUint32(entryOffset + 8, true),
        flags: view.getUint32(entryOffset + 12, true),
      });
    }

    return blockTable;
  }

  /**
   * Decrypt MPQ table data
   * @param data - Encrypted table data
   * @param key - Encryption key string
   */
  private decryptTable(data: Uint8Array, key: string): Uint8Array {
    // Initialize crypt table if needed
    if (!MPQParser.cryptTable) {
      MPQParser.initCryptTable();
    }

    const cryptTable = MPQParser.cryptTable!;
    const decrypted = new Uint8Array(data.length);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const outView = new DataView(decrypted.buffer);

    // Generate encryption key from string (hash type 3 for decryption key)
    // Hash type 3 means offset 0x300 in the crypt table
    let seed1 = this.hashString(key, 3);
    let seed2 = 0xeeeeeeee;

    // Decrypt in 4-byte (DWORD) chunks
    for (let i = 0; i < data.length; i += 4) {
      seed2 = (seed2 + (cryptTable[0x400 + (seed1 & 0xff)] ?? 0)) >>> 0;

      const encrypted = view.getUint32(i, true);
      const decryptedValue = (encrypted ^ (seed1 + seed2)) >>> 0;

      outView.setUint32(i, decryptedValue, true);

      seed1 = (((~seed1 << 0x15) + 0x11111111) | (seed1 >>> 0x0b)) >>> 0;
      seed2 = (decryptedValue + seed2 + (seed2 << 5) + 3) >>> 0; // Use decrypted value!
    }

    return decrypted;
  }

  /**
   * Decrypt MPQ file data (same algorithm as table decryption)
   * @param data - Encrypted file data
   * @param key - File encryption key (hash of filename)
   */
  private decryptFile(data: Uint8Array, key: number): Uint8Array {
    // Initialize crypt table if needed
    if (!MPQParser.cryptTable) {
      MPQParser.initCryptTable();
    }

    const cryptTable = MPQParser.cryptTable!;
    const decrypted = new Uint8Array(data.length);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const outView = new DataView(decrypted.buffer);

    let seed1 = key;
    let seed2 = 0xeeeeeeee;

    // Decrypt in 4-byte chunks
    for (let i = 0; i < data.length; i += 4) {
      seed2 = (seed2 + (cryptTable[0x400 + (seed1 & 0xff)] ?? 0)) >>> 0;

      const encrypted = view.getUint32(i, true);
      const decryptedValue = (encrypted ^ (seed1 + seed2)) >>> 0;

      outView.setUint32(i, decryptedValue, true);

      seed1 = (((~seed1 << 0x15) + 0x11111111) | (seed1 >>> 0x0b)) >>> 0;
      seed2 = (decryptedValue + seed2 + (seed2 << 5) + 3) >>> 0;
    }

    return decrypted;
  }

  /**
   * Extract file from archive
   *
   * Supports compressed, uncompressed, and encrypted files.
   * Falls back to StormJS (WASM) for ADPCM/SPARSE compression.
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

    // Extract file with native decompressors
    // ADPCM/SPARSE compression is now handled (skipped) in decompressMultiAlgorithm
    return await this.extractFileInternal(filename, blockEntry);
  }

  /**
   * Check if file data contains MPQ magic header
   * Used to detect nested MPQ archives (like embedded W3X maps in W3N campaigns)
   */
  private isNestedMPQ(rawData: ArrayBuffer): boolean {
    if (rawData.byteLength < 4) return false;

    const view = new DataView(rawData);
    const magic = view.getUint32(0, true);

    // Check for MPQ magic: 0x1A51504D = "MPQ\x1a"
    return magic === 0x1a51504d;
  }

  /**
   * Internal file extraction (without StormJS fallback)
   */
  private async extractFileInternal(filename: string, blockEntry: MPQBlockEntry): Promise<MPQFile> {
    // Extract file data
    const isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    const isEncrypted = (blockEntry.flags & 0x00010000) !== 0;

    // Read file data
    const rawData = this.buffer.slice(
      blockEntry.filePos,
      blockEntry.filePos + blockEntry.compressedSize
    );

    let fileData: ArrayBuffer;

    if (isCompressed) {
      // Check if file uses multi-sector compression
      const isSingleUnit = (blockEntry.flags & 0x01000000) !== 0;

      if (isSingleUnit) {
        // Single-unit file - decrypt first if encrypted, then decompress
        let dataToDecompress = rawData;
        if (isEncrypted) {
          const fileKey = this.hashString(filename, 3);
          const encryptedData = new Uint8Array(rawData);
          const decryptedData = this.decryptFile(encryptedData, fileKey);
          dataToDecompress = decryptedData.buffer.slice(
            decryptedData.byteOffset,
            decryptedData.byteOffset + decryptedData.byteLength
          ) as ArrayBuffer;
        }

        fileData = await this.decompressSingleUnit(dataToDecompress, blockEntry.uncompressedSize);
      } else {
        // Multi-sector file - decompress sector by sector
        // For encrypted multi-sector files, decrypt within decompressMultiSector
        // decompressMultiSector will automatically retry without decryption if sector offsets are invalid
        fileData = await this.decompressMultiSector(
          rawData,
          blockEntry,
          isEncrypted ? filename : undefined
        );
      }
    } else {
      // Uncompressed file - decrypt if encrypted
      if (isEncrypted) {
        const fileKey = this.hashString(filename, 3);
        const encryptedData = new Uint8Array(rawData);
        const decryptedData = this.decryptFile(encryptedData, fileKey);
        fileData = decryptedData.buffer.slice(
          decryptedData.byteOffset,
          decryptedData.byteOffset + decryptedData.byteLength
        ) as ArrayBuffer;
      } else {
        fileData = rawData;
      }
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
    this.archive?.files.set(filename, file);

    return file;
  }

  /**
   * Decompress single-unit file (SINGLE_UNIT flag set)
   */
  private async decompressSingleUnit(
    rawData: ArrayBuffer,
    uncompressedSize: number
  ): Promise<ArrayBuffer> {
    const compressionAlgorithm = this.detectCompressionAlgorithm(rawData);
    const view = new DataView(rawData);
    const firstByte = view.getUint8(0);

    // Skip compression type byte
    const compressedData = rawData.slice(1);

    // Handle different compression algorithms
    if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
      return await this.lzmaDecompressor.decompress(compressedData, uncompressedSize);
    } else if (
      compressionAlgorithm === CompressionAlgorithm.ZLIB ||
      compressionAlgorithm === CompressionAlgorithm.PKZIP
    ) {
      return await this.zlibDecompressor.decompress(compressedData, uncompressedSize);
    } else if (compressionAlgorithm === CompressionAlgorithm.BZIP2) {
      return await this.bzip2Decompressor.decompress(compressedData, uncompressedSize);
    } else if (compressionAlgorithm === CompressionAlgorithm.NONE) {
      // Check for multi-algorithm compression (W3X style)
      if (firstByte !== 0 && rawData.byteLength < uncompressedSize) {
        return await this.decompressMultiAlgorithm(compressedData, uncompressedSize, firstByte);
      } else {
        return rawData;
      }
    } else {
      throw new Error(`Unsupported compression algorithm: 0x${compressionAlgorithm.toString(16)}`);
    }
  }

  /**
   * Decompress multi-sector file
   *
   * Multi-sector files are split into sectors (typically 4KB each) and each sector
   * is compressed independently. This allows partial file reading and random access.
   *
   * @param rawData - The raw compressed data (may be encrypted)
   * @param blockEntry - The MPQ block entry
   * @param filename - Optional filename for decryption key (if file is encrypted)
   */
  private async decompressMultiSector(
    rawData: ArrayBuffer,
    blockEntry: MPQBlockEntry,
    filename?: string
  ): Promise<ArrayBuffer> {
    const blockSize = this.archive?.header.blockSize ?? 4096;
    const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize);

    // Validate buffer size for sector offset table
    const sectorOffsetTableSize = (sectorCount + 1) * 4;
    if (rawData.byteLength < sectorOffsetTableSize) {
      throw new Error(
        `rawData too small for sector offset table: need ${sectorOffsetTableSize} bytes, have ${rawData.byteLength} bytes`
      );
    }

    // Decrypt sector offset table if file is encrypted
    const sectorTableData = rawData.slice(0, sectorOffsetTableSize);
    let shouldDecrypt = !!filename;
    let sectorOffsets: number[] = [];

    // Try with decryption first if filename is provided
    if (filename) {
      const fileKey = this.hashString(filename, 3);
      const sectorTableKey = fileKey - 1;
      const encryptedTable = new Uint8Array(sectorTableData);
      const decryptedTable = this.decryptFile(encryptedTable, sectorTableKey);
      const decryptedData = decryptedTable.buffer.slice(
        decryptedTable.byteOffset,
        decryptedTable.byteOffset + decryptedTable.byteLength
      ) as ArrayBuffer;

      const decryptedView = new DataView(decryptedData);

      // Read sector offset table with decryption
      const decryptedOffsets: number[] = [];
      for (let i = 0; i <= sectorCount; i++) {
        decryptedOffsets.push(decryptedView.getUint32(i * 4, true));
      }

      // Validate decrypted offsets
      const isInvalid = decryptedOffsets.some((offset, i) => {
        if (offset > rawData.byteLength) return true;
        if (i > 0 && offset < decryptedOffsets[i - 1]!) return true;
        return false;
      });

      if (isInvalid) {
        // Decrypted sector table is garbage - try without decryption
        console.warn(
          `[MPQParser] 🔄 Invalid sector offsets detected (likely nested MPQ) - trying unencrypted sector table`
        );
        shouldDecrypt = false;

        // Re-slice from original rawData to get FRESH sector table bytes
        // (The previous sectorTableData may have been modified by decryption)
        const freshSectorTableData = rawData.slice(0, sectorOffsetTableSize);
        const plainView = new DataView(freshSectorTableData);
        const plainOffsets: number[] = [];
        for (let i = 0; i <= sectorCount; i++) {
          plainOffsets.push(plainView.getUint32(i * 4, true));
        }

        console.log(`[MPQParser] 🔍 Sector table diagnostic:`);
        console.log(
          `[MPQParser]    sectorCount: ${sectorCount}, tableSize: ${sectorOffsetTableSize}, rawSize: ${rawData.byteLength}`
        );
        console.log(
          `[MPQParser]    First 12 bytes (hex):`,
          Array.from(new Uint8Array(freshSectorTableData.slice(0, 12)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ')
        );

        // Validate plain offsets
        const plainIsInvalid = plainOffsets.some((offset, i) => {
          if (offset > rawData.byteLength) return true;
          if (i > 0 && offset < plainOffsets[i - 1]!) return true;
          return false;
        });

        if (plainIsInvalid) {
          // Both decrypted AND plain are invalid - this is likely a single-unit file misidentified as multi-sector
          // Fall back to single-unit decompression
          // IMPORTANT: Skip the sector table bytes at the beginning (they're garbage)
          console.warn(
            `[MPQParser] ⚠️ Sector table invalid - treating as single-unit compressed file`
          );
          const actualCompressedData = rawData.slice(sectorOffsetTableSize);
          return await this.decompressSingleUnit(actualCompressedData, blockEntry.uncompressedSize);
        }

        // Plain offsets are valid
        sectorOffsets = plainOffsets;
        console.warn(`[MPQParser] ✅ Using unencrypted sector table successfully`);
      } else {
        // Decrypted offsets are valid
        sectorOffsets = decryptedOffsets;
      }
    } else {
      // No filename - read sector table without decryption
      const view = new DataView(sectorTableData);
      for (let i = 0; i <= sectorCount; i++) {
        sectorOffsets.push(view.getUint32(i * 4, true));
      }
    }

    // Decompress each sector
    const decompressedSectors: ArrayBuffer[] = [];
    let totalDecompressed = 0;

    for (let i = 0; i < sectorCount; i++) {
      const sectorStart = sectorOffsets[i]!;
      const sectorEnd = sectorOffsets[i + 1]!;
      const sectorCompressedSize = sectorEnd - sectorStart;

      // Calculate expected uncompressed size for this sector
      const isLastSector = i === sectorCount - 1;
      const sectorUncompressedSize = isLastSector
        ? blockEntry.uncompressedSize - i * blockSize
        : blockSize;

      // Validate sector offsets BEFORE slicing
      if (
        sectorStart < 0 ||
        sectorEnd < 0 ||
        sectorStart >= rawData.byteLength ||
        sectorEnd > rawData.byteLength ||
        sectorEnd <= sectorStart
      ) {
        console.warn(
          `[MPQParser] ⚠️ Invalid sector ${i + 1} offsets (start=${sectorStart}, end=${sectorEnd}, rawSize=${rawData.byteLength})`
        );
        console.warn(`[MPQParser] ⚠️ Falling back to single-unit decompression`);

        // Invalid sector table - fall back to single-unit decompression
        // Skip sector table at beginning
        const actualCompressedData = rawData.slice(sectorOffsetTableSize);
        return await this.decompressSingleUnit(actualCompressedData, blockEntry.uncompressedSize);
      }

      // Extract sector data
      let sectorData = rawData.slice(sectorStart, sectorEnd);

      // Double-check sector data size (should never happen after validation above)
      if (sectorData.byteLength === 0) {
        throw new Error(
          `Sector ${i + 1} zero size! start=${sectorStart}, end=${sectorEnd}, rawSize=${rawData.byteLength}`
        );
      }

      // Decrypt sector if file is encrypted AND we determined decryption should be used
      if (filename && shouldDecrypt) {
        const fileKey = this.hashString(filename, 3);
        const sectorKey = fileKey + i;
        const encryptedSector = new Uint8Array(sectorData);
        const decryptedSector = this.decryptFile(encryptedSector, sectorKey);
        sectorData = decryptedSector.buffer.slice(
          decryptedSector.byteOffset,
          decryptedSector.byteOffset + decryptedSector.byteLength
        ) as ArrayBuffer;
      }

      // Check if sector is compressed (first byte = compression type)
      const sectorView = new DataView(sectorData);
      const compressionType = sectorView.getUint8(0);

      let decompressedSector: ArrayBuffer;

      if (compressionType === 0) {
        decompressedSector = sectorData.slice(1);
      } else if (sectorCompressedSize === sectorUncompressedSize) {
        decompressedSector = sectorData;
      } else {
        const sectorCompressed = sectorData.slice(1);
        if (compressionType === 0x02 || compressionType === 0x08 || compressionType === 0x18) {
          decompressedSector = await this.zlibDecompressor.decompress(
            sectorCompressed,
            sectorUncompressedSize
          );
        } else if (compressionType === 0x10) {
          decompressedSector = await this.bzip2Decompressor.decompress(
            sectorCompressed,
            sectorUncompressedSize
          );
        } else if (compressionType === 0x12) {
          decompressedSector = await this.lzmaDecompressor.decompress(
            sectorCompressed,
            sectorUncompressedSize
          );
        } else if (compressionType === 0x01) {
          decompressedSector = await this.huffmanDecompressor.decompress(
            sectorCompressed,
            sectorUncompressedSize
          );
        } else if (compressionType === 0x04) {
          decompressedSector = await this.implodeDecompressor.decompress(
            sectorCompressed,
            sectorUncompressedSize
          );
        } else {
          decompressedSector = await this.decompressMultiAlgorithm(
            sectorCompressed,
            sectorUncompressedSize,
            compressionType
          );
        }
      }

      decompressedSectors.push(decompressedSector);
      totalDecompressed += decompressedSector.byteLength;
    }

    // Concatenate all decompressed sectors
    const result = new Uint8Array(totalDecompressed);
    let offset = 0;
    for (const sector of decompressedSectors) {
      const sectorArray = new Uint8Array(sector);
      result.set(sectorArray, offset);
      offset += sector.byteLength;
    }

    // CRITICAL: Return a properly sized ArrayBuffer slice, not the underlying buffer
    // which may be larger than the actual data
    return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
  }

  /**
   * Extract file from archive by block index
   *
   * This is useful for W3N campaigns where we don't know the filenames
   * of embedded W3X archives, but can identify them by size/position.
   */
  public async extractFileByIndex(blockIndex: number): Promise<MPQFile | null> {
    if (!this.archive) {
      throw new Error('Archive not parsed. Call parse() first.');
    }

    // Get block entry directly by index
    const blockEntry = this.archive.blockTable[blockIndex];
    if (!blockEntry) {
      return null;
    }

    // Check if file exists
    const exists = (blockEntry.flags & 0x80000000) !== 0;
    if (!exists) {
      return null;
    }

    // Extract file data (same logic as extractFile but without filename)
    let isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    let isEncrypted = (blockEntry.flags & 0x00010000) !== 0;
    // Read file data
    const rawData = this.buffer.slice(
      blockEntry.filePos,
      blockEntry.filePos + blockEntry.compressedSize
    );

    // CRITICAL FIX: Detect nested MPQ archives (like embedded W3X maps in W3N campaigns)
    // These files have the COMPRESSED and ENCRYPTED flags set at the outer archive level,
    // but they should be treated as raw uncompressed data. Check the first 4 bytes for MPQ magic.
    if (this.isNestedMPQ(rawData)) {
      isCompressed = false; // Override - this is a nested MPQ, not compressed
      isEncrypted = false; // Override - this is a nested MPQ, not encrypted
    }

    // Note: Encrypted files require filename for key generation
    // Since we don't have filename here, we can't decrypt
    if (isEncrypted) {
      console.warn(`[MPQParser] Block ${blockIndex} is encrypted, cannot decrypt without filename`);
      return null;
    }

    let fileData: ArrayBuffer;

    if (isCompressed) {
      // Detect compression algorithm from first byte
      const compressionAlgorithm = this.detectCompressionAlgorithm(rawData);
      // Calculate offset to actual compressed data
      // Multi-sector files have a sector offset table after the compression type byte
      const isSingleUnit = (blockEntry.flags & 0x01000000) !== 0; // SINGLE_UNIT flag
      let dataOffset = 1; // Skip compression type byte

      if (!isSingleUnit) {
        // Multi-sector file - has sector offset table
        const blockSize = this.archive?.header.blockSize ?? 4096; // Default to 4096 if archive not yet parsed
        const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize);
        const sectorTableSize = (sectorCount + 1) * 4; // Array of uint32 offsets
        dataOffset += sectorTableSize;
      }

      if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
        const compressedData = rawData.slice(dataOffset);
        fileData = await this.lzmaDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (
        compressionAlgorithm === CompressionAlgorithm.ZLIB ||
        compressionAlgorithm === CompressionAlgorithm.PKZIP
      ) {
        const compressedData = rawData.slice(dataOffset);
        fileData = await this.zlibDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.BZIP2) {
        const compressedData = rawData.slice(dataOffset);
        fileData = await this.bzip2Decompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.NONE) {
        // Check if this is multi-compression
        const firstByte = rawData.byteLength > 0 ? new DataView(rawData).getUint8(0) : 0;

        if (firstByte !== 0 && blockEntry.compressedSize < blockEntry.uncompressedSize) {
          fileData = await this.decompressMultiAlgorithm(
            rawData,
            blockEntry.uncompressedSize,
            firstByte
          );
        } else {
          fileData = rawData;
        }
      } else {
        throw new Error(
          `Unsupported compression algorithm: 0x${compressionAlgorithm.toString(16)}`
        );
      }
    } else {
      fileData = rawData;
    }

    const file: MPQFile = {
      name: `block_${blockIndex}`,
      data: fileData,
      compressedSize: blockEntry.compressedSize,
      uncompressedSize: blockEntry.uncompressedSize,
      isCompressed,
      isEncrypted,
    };

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
   * Decompress data using multiple chained algorithms (W3X style)
   *
   * W3X files use bit flags where multiple bits can be set simultaneously.
   * The flags indicate which compression algorithms should be applied in sequence.
   *
   * @param data - Raw compressed data with flags byte
   * @param uncompressedSize - Expected size after full decompression
   * @param compressionFlags - Bit flags indicating compression algorithms
   * @returns Fully decompressed data
   */
  private async decompressMultiAlgorithm(
    data: ArrayBuffer,
    uncompressedSize: number,
    compressionFlags: number
  ): Promise<ArrayBuffer> {
    // Log which algorithms are flagged
    const flaggedAlgos: string[] = [];
    if (compressionFlags & CompressionAlgorithm.HUFFMAN) flaggedAlgos.push('HUFFMAN(0x01)');
    if (compressionFlags & CompressionAlgorithm.ZLIB) flaggedAlgos.push('ZLIB(0x02)');
    if (compressionFlags & CompressionAlgorithm.IMPLODE) flaggedAlgos.push('IMPLODE(0x04)');
    if (compressionFlags & CompressionAlgorithm.PKZIP) flaggedAlgos.push('PKZIP(0x08)');
    if (compressionFlags & CompressionAlgorithm.BZIP2) flaggedAlgos.push('BZIP2(0x10)');
    if (compressionFlags & CompressionAlgorithm.LZMA) flaggedAlgos.push('LZMA(0x12)');
    if (compressionFlags & CompressionAlgorithm.SPARSE) flaggedAlgos.push('SPARSE(0x20)');
    if (compressionFlags & CompressionAlgorithm.ADPCM_MONO) flaggedAlgos.push('ADPCM_MONO(0x40)');
    if (compressionFlags & CompressionAlgorithm.ADPCM_STEREO)
      flaggedAlgos.push('ADPCM_STEREO(0x80)');
    // Read the first byte to check if it matches the flags
    const firstByte = new Uint8Array(data)[0];
    // Skip the first byte (compression flags)
    let currentData = data.slice(1);

    // CRITICAL FIX: The compression flags are NOT always a bitmask!
    // For values like 0x18, 0x15, etc., these are single compression IDs, not chained algorithms
    // Only certain combinations represent actual multi-compression:
    // - 0x01 = Huffman only
    // - 0x02 = ZLIB only
    // - 0x08 = PKZIP only
    // - 0x09 = Huffman + PKZIP (true multi-compression)
    // - 0x10 = BZip2 only
    // - Anything else with audio flags (0x40, 0x80) = unsupported

    // IMPLODE compression is now supported (as of this update)
    // PKWare DCL Implode is a legacy compression algorithm used in older W3 maps

    // Check for unsupported audio compression algorithms (ADPCM/SPARSE)
    // These are used for WAV files, not image files - if present, throw error
    if (
      compressionFlags &
      (CompressionAlgorithm.SPARSE |
        CompressionAlgorithm.ADPCM_MONO |
        CompressionAlgorithm.ADPCM_STEREO)
    ) {
      const audioTypes: string[] = [];
      if (compressionFlags & CompressionAlgorithm.SPARSE) audioTypes.push('SPARSE(0x20)');
      if (compressionFlags & CompressionAlgorithm.ADPCM_MONO) audioTypes.push('ADPCM_MONO(0x40)');
      if (compressionFlags & CompressionAlgorithm.ADPCM_STEREO)
        audioTypes.push('ADPCM_STEREO(0x80)');
      throw new Error(
        `Unsupported audio compression: ${audioTypes.join(', ')} - these files require StormJS (WASM) or can be skipped for preview generation`
      );
    }

    // Try decompression based on the PRIMARY algorithm (most common cases first)
    try {
      // Case 1: PKZIP only (0x08 or 0x18) - Most common in modern W3 maps
      // Note: 0x18 appears in some maps but is actually just PKZIP/ZLIB compressed
      if (compressionFlags === 0x08 || compressionFlags === 0x18) {
        currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
      }
      // Case 2: Huffman + PKZIP (0x09) - True multi-compression
      else if (compressionFlags === 0x09 || (compressionFlags & 0x09) === 0x09) {
        const huffmanOutput = await this.huffmanDecompressor.decompress(
          currentData,
          uncompressedSize * 2
        );
        currentData = await this.zlibDecompressor.decompress(huffmanOutput, uncompressedSize);
      }
      // Case 3: ZLIB only (0x02)
      else if (compressionFlags === 0x02) {
        currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
      }
      // Case 4: Huffman only (0x01)
      else if (compressionFlags === 0x01) {
        currentData = await this.huffmanDecompressor.decompress(currentData, uncompressedSize);
      }
      // Case 5: BZip2 only (0x10)
      else if (compressionFlags === 0x10) {
        currentData = await this.bzip2Decompressor.decompress(currentData, uncompressedSize);
      }
      // Case 6: IMPLODE only (0x04) - Legacy PKWare compression
      else if (compressionFlags === 0x04) {
        currentData = await this.implodeDecompressor.decompress(currentData, uncompressedSize);
      }
      // Case 7: Huffman + IMPLODE (0x05) - Legacy multi-compression
      else if (compressionFlags === 0x05) {
        const huffmanOutput = await this.huffmanDecompressor.decompress(
          currentData,
          uncompressedSize * 2
        );
        currentData = await this.implodeDecompressor.decompress(huffmanOutput, uncompressedSize);
      }
      // Case 8: IMPLODE + PKZIP (0x0c) - Legacy multi-compression
      else if (compressionFlags === 0x0c) {
        const implodeOutput = await this.implodeDecompressor.decompress(
          currentData,
          uncompressedSize * 2
        );
        currentData = await this.zlibDecompressor.decompress(implodeOutput, uncompressedSize);
      }
      // Case 9: Huffman + IMPLODE + BZip2 (0x15) - Triple compression
      else if (compressionFlags === 0x15) {
        const step1Output = await this.huffmanDecompressor.decompress(
          currentData,
          uncompressedSize * 4
        );
        const step2Output = await this.implodeDecompressor.decompress(
          step1Output,
          uncompressedSize * 2
        );
        currentData = await this.bzip2Decompressor.decompress(step2Output, uncompressedSize);
      }
      // Case 10: Unknown compression 0x1c - Try different decompression strategies
      else if (compressionFlags === 0x1c) {
        // 0x1c appears in W3N campaign files but behavior is unclear
        // Try multiple strategies in order of likelihood
        let decompressed = false;

        // Strategy 1: Try IMPLODE only (0x1c might be a variant flag)
        try {
          currentData = await this.implodeDecompressor.decompress(currentData, uncompressedSize);
          decompressed = true;
        } catch (implodeError) {
          console.warn(`[MPQParser] 0x1c: Implode-only failed, trying PKZIP...`);

          // Strategy 2: Try PKZIP/ZLIB only
          try {
            currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
            decompressed = true;
          } catch (zlibError) {
            console.warn(`[MPQParser] 0x1c: PKZIP failed, trying Implode->PKZIP chain...`);

            // Strategy 3: Try Implode then PKZIP
            try {
              const step1 = await this.implodeDecompressor.decompress(
                currentData,
                uncompressedSize * 2
              );
              currentData = await this.zlibDecompressor.decompress(step1, uncompressedSize);
              decompressed = true;
            } catch (chainError) {
              throw new Error(`All decompression strategies failed for 0x1c`);
            }
          }
        }

        if (!decompressed) {
          throw new Error(`Failed to decompress data with flags 0x1c`);
        }
      }
      // Case 11: Unknown/unsupported compression ID - try PKZIP as fallback
      else {
        console.warn(
          `[MPQParser] ⚠️ Unknown compression ID 0x${compressionFlags.toString(16)}, trying PKZIP as fallback...`
        );
        try {
          currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
        } catch (fallbackError) {
          console.error(
            `[MPQParser] ❌ PKZIP fallback failed for 0x${compressionFlags.toString(16)}`
          );
          throw new Error(`Unsupported compression type 0x${compressionFlags.toString(16)}`);
        }
      }
    } catch (error) {
      // eslint-disable-line no-empty
      console.error(
        `[MPQParser] ❌ Decompression failed for flags 0x${compressionFlags.toString(16)}:`,
        error
      );
      throw error;
    }

    // Verify final size
    if (currentData.byteLength !== uncompressedSize) {
      console.warn(
        `[MPQParser] Multi-algo: Size mismatch - expected ${uncompressedSize}, got ${currentData.byteLength}`
      );
    } else {
    }

    return currentData;
  }

  /**
   * Find file in hash table
   */
  private findFile(filename: string): MPQHashEntry | null {
    if (!this.archive) return null;

    // MPQ hash types: 0=table offset, 1=name hash A, 2=name hash B
    const hashA = this.hashString(filename, 1);
    const hashB = this.hashString(filename, 2);
    // Debug: Show all NON-EMPTY hash table entries (empty = 0xFFFFFFFF)
    const nonEmptyEntries = this.archive.hashTable.filter(
      (entry) => entry.hashA !== 0xffffffff && entry.hashB !== 0xffffffff
    );
    for (let i = 0; i < Math.min(10, nonEmptyEntries.length); i++) {
      const entry = nonEmptyEntries[i];
    }

    for (const entry of this.archive.hashTable) {
      if (entry.hashA === hashA && entry.hashB === hashB) {
        return entry;
      }
    }
    return null;
  }

  // MPQ hash encryption table (1280 entries)
  private static cryptTable: number[] | null = null;

  /**
   * Initialize MPQ encryption table
   */
  private static initCryptTable(): void {
    if (this.cryptTable) return;

    this.cryptTable = new Array(0x500);
    let seed = 0x00100001;

    for (let index1 = 0; index1 < 0x100; index1++) {
      let index2 = index1;
      for (let i = 0; i < 5; i++) {
        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp1 = (seed & 0xffff) << 0x10;

        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp2 = seed & 0xffff;

        this.cryptTable[index2] = temp1 | temp2;
        index2 += 0x100;
      }
    }
  }

  /**
   * Hash string for MPQ lookup using proper MPQ hash algorithm
   *
   * @param str - String to hash
   * @param hashType - Hash type (0 = hashA, 1 = hashB, 2 = table offset)
   */
  private hashString(str: string, hashType: number): number {
    // Initialize crypt table on first use
    if (!MPQParser.cryptTable) {
      MPQParser.initCryptTable();
    }

    const cryptTable = MPQParser.cryptTable!;
    const upperStr = str.toUpperCase().replace(/\//g, '\\'); // Normalize path separators
    let seed1 = 0x7fed7fed;
    let seed2 = 0xeeeeeeee;

    for (let i = 0; i < upperStr.length; i++) {
      const ch = upperStr.charCodeAt(i);
      const value = cryptTable[hashType * 0x100 + ch] ?? 0;
      seed1 = (value ^ (seed1 + seed2)) >>> 0;
      seed2 = (ch + seed1 + seed2 + (seed2 << 5) + 3) >>> 0;
    }

    return seed1;
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
   * Searches for valid MPQ header, skipping any fake/encrypted headers
   */
  private parseHeaderFromBytes(data: Uint8Array): MPQHeader | null {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const searchLimit = Math.min(4096, data.byteLength);
    // Try each potential header location
    for (let offset = 0; offset < searchLimit; offset += 512) {
      const magic = view.getUint32(offset, true);

      // Skip if not MPQ magic
      if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
        continue;
      }
      // Handle MPQ user data header
      let headerOffset = offset;
      if (magic === MPQParser.MPQ_MAGIC_V2) {
        const realHeaderOffset = view.getUint32(offset + 8, true);
        if (realHeaderOffset >= data.byteLength - 32) {
          console.warn(`[MPQParser Stream] Real header offset out of bounds, skipping...`);
          continue;
        }
        headerOffset = realHeaderOffset;
        const realMagic = view.getUint32(headerOffset, true);
        if (realMagic !== MPQParser.MPQ_MAGIC_V1) {
          console.warn(`[MPQParser Stream] Invalid magic at real offset, skipping...`);
          continue;
        }
      }

      // Parse header values
      const archiveSize = view.getUint32(headerOffset + 8, true);
      const formatVersion = view.getUint16(headerOffset + 12, true);
      const sectorSizeShift = view.getUint16(headerOffset + 14, true);
      const blockSize = 512 * Math.pow(2, sectorSizeShift);

      // Read table positions from header
      // Note: Table positions in MPQ headers are ALWAYS relative to the MPQ header start
      const hashTablePos = view.getUint32(headerOffset + 16, true) + headerOffset;
      const blockTablePos = view.getUint32(headerOffset + 20, true) + headerOffset;
      const hashTableSize = view.getUint32(headerOffset + 24, true);
      const blockTableSize = view.getUint32(headerOffset + 28, true);
      // Validate header values
      // Note: In streaming mode, we can't check if table positions are within data.byteLength
      // because we only have the first 4KB chunk. Just validate the values are reasonable.
      const isValid =
        formatVersion <= 3 &&
        sectorSizeShift <= 16 &&
        hashTableSize < 1000000 &&
        blockTableSize < 1000000 &&
        hashTablePos >= 0 &&
        blockTablePos >= 0;

      if (!isValid) {
        console.warn(
          `[MPQParser Stream] Invalid header values at offset ${headerOffset}, skipping...`
        );
        console.warn(
          `  formatVersion=${formatVersion}, sectorSizeShift=${sectorSizeShift}, hashTableSize=${hashTableSize}, blockTableSize=${blockTableSize}`
        );
        continue;
      }

      // Found valid header!
      return {
        archiveSize,
        formatVersion,
        blockSize,
        hashTablePos,
        blockTablePos,
        hashTableSize,
        blockTableSize,
      };
    }

    console.error(`[MPQParser Stream] No valid MPQ header found`);
    return null;
  }

  /**
   * Parse hash table from byte array (for streaming)
   */
  private parseHashTableFromBytes(data: Uint8Array, entryCount: number): MPQHashEntry[] {
    // Try WITHOUT decryption first (many maps don't encrypt tables)
    const rawView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Check if raw blockIndex values are reasonable (should be < blockTableSize or 0xFFFFFFFF for empty)
    let hasValidBlockIndices = true;
    for (let i = 0; i < Math.min(entryCount, 10); i++) {
      const blockIndex = rawView.getUint32(i * 16 + 12, true);
      // We don't have blockTableSize here, so just check if it's reasonable (< 10000 or empty)
      if (blockIndex !== 0xffffffff && blockIndex >= 10000) {
        hasValidBlockIndices = false;
        break;
      }
    }
    let view = rawView;
    if (!hasValidBlockIndices) {
      // BlockIndex values out of range = table is encrypted
      const decryptedData = this.decryptTable(data, '(hash table)');
      view = new DataView(decryptedData.buffer as ArrayBuffer);
    } else {
    }

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
    // Try WITHOUT decryption first
    const rawView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Check if raw data looks valid (filePos should be reasonable)
    const firstFilePosRaw = rawView.getUint32(0, true);
    // If raw values look unreasonable, decrypt
    let view = rawView;
    if (firstFilePosRaw > 1000000000) {
      // File position way too large = likely encrypted
      const decryptedData = this.decryptTable(data, '(block table)');
      view = new DataView(this.toArrayBuffer(decryptedData));
    } else {
    }

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

    // Log first few entries for debugging
    for (let i = 0; i < Math.min(5, blockTable.length); i++) {
      const entry = blockTable[i];
      const exists = (entry?.flags ?? 0 & 0x80000000) !== 0;
    }

    return blockTable;
  }

  /**
   * Build file list from (listfile) in archive
   * Falls back to trying common W3X/W3N filenames if (listfile) not found
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
        return this.generateCommonMapNamesForStreaming();
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
      // eslint-disable-line no-empty
      // Listfile not found or error - return common names as fallback
      return this.generateCommonMapNamesForStreaming();
    }
  }

  /**
   * Generate common campaign map naming patterns for fallback (streaming mode)
   * Similar to W3NCampaignLoader.generateCommonMapNames() but returns more patterns
   */
  private generateCommonMapNamesForStreaming(): string[] {
    const names: string[] = [];

    // Common W3N campaign patterns
    for (let i = 1; i <= 20; i++) {
      const num = i.toString().padStart(2, '0');
      names.push(`Chapter${num}.w3x`);
      names.push(`Chapter${num}.w3m`);
      names.push(`Map${num}.w3x`);
      names.push(`Map${num}.w3m`);
      names.push(`chapter${num}.w3x`);
      names.push(`chapter${num}.w3m`);
      names.push(`map${num}.w3x`);
      names.push(`map${num}.w3m`);
      names.push(`${i}.w3x`);
      names.push(`${i}.w3m`);
    }

    // Also try war3campaign.w3f
    names.push('war3campaign.w3f');
    names.push('war3campaign.w3u');
    names.push('war3campaign.w3t');
    names.push('war3campaign.w3a');
    names.push('war3campaign.w3b');
    names.push('war3campaign.w3d');
    names.push('war3campaign.w3q');

    return names;
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
   * Safely extract ArrayBuffer from Uint8Array (handles SharedArrayBuffer)
   */
  private toArrayBuffer(data: Uint8Array): ArrayBuffer {
    // If the underlying buffer is a SharedArrayBuffer, we need to copy it
    const slice = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    if (slice instanceof ArrayBuffer) {
      return slice;
    }
    // SharedArrayBuffer - copy to ArrayBuffer
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
  }

  /**
   * Extract file by block index from stream (for W3N nested archives)
   *
   * This reads and decompresses a file directly by its block table index,
   * useful when we don't know the filename but can identify files by size/position.
   */
  public async extractFileByIndexStream(
    blockIndex: number,
    reader: StreamingFileReader,
    blockTable: MPQBlockEntry[]
  ): Promise<MPQFile | null> {
    const blockEntry = blockTable[blockIndex];
    if (!blockEntry) {
      return null;
    }

    // Check if file exists
    const exists = (blockEntry.flags & 0x80000000) !== 0;
    if (!exists) {
      return null;
    }

    // Check if file is encrypted (we can't decrypt without filename)
    const isEncrypted = (blockEntry.flags & 0x00010000) !== 0;
    if (isEncrypted) {
      console.warn(
        `[MPQParser Stream] Block ${blockIndex} is encrypted, cannot decrypt without filename`
      );
      return null;
    }

    const isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    // Read file data from archive
    // Note: For W3N files, filePos is expected to be an absolute file position
    const rawData = await reader.readRange(blockEntry.filePos, blockEntry.compressedSize);

    // Decompress if compressed
    let fileData: ArrayBuffer;
    if (isCompressed) {
      const compressionAlgorithm = this.detectCompressionAlgorithm(this.toArrayBuffer(rawData));

      // Calculate offset to actual compressed data
      // Multi-sector files have a sector offset table after the compression type byte
      const isSingleUnit = (blockEntry.flags & 0x01000000) !== 0; // SINGLE_UNIT flag
      let dataOffset = 1; // Skip compression type byte

      if (!isSingleUnit) {
        // Multi-sector file - has sector offset table
        const blockSize = this.archive?.header.blockSize ?? 4096; // Default to 4096 for streaming
        const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize);
        const sectorTableSize = (sectorCount + 1) * 4; // Array of uint32 offsets
        dataOffset += sectorTableSize;
      }

      if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.lzmaDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (
        compressionAlgorithm === CompressionAlgorithm.ZLIB ||
        compressionAlgorithm === CompressionAlgorithm.PKZIP
      ) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.zlibDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.BZIP2) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.bzip2Decompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.NONE) {
        // Multi-algorithm compression (W3X style)
        const firstByte =
          rawData.length > 0 ? new DataView(rawData.buffer, rawData.byteOffset).getUint8(0) : 0;
        if (firstByte !== 0 && blockEntry.compressedSize < blockEntry.uncompressedSize) {
          fileData = await this.decompressMultiAlgorithm(
            this.toArrayBuffer(rawData),
            blockEntry.uncompressedSize,
            firstByte
          );
        } else {
          fileData = this.toArrayBuffer(rawData);
        }
      } else {
        throw new Error(
          `Unsupported compression algorithm: 0x${compressionAlgorithm.toString(16)}`
        );
      }
    } else {
      fileData = this.toArrayBuffer(rawData);
    }

    return {
      name: `block_${blockIndex}`,
      data: fileData,
      compressedSize: blockEntry.compressedSize,
      uncompressedSize: blockEntry.uncompressedSize,
      isCompressed,
      isEncrypted,
    };
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
    // Hash types: 0=table offset, 1=hashA, 2=hashB
    const hashA = this.hashString(fileName, 1);
    const hashB = this.hashString(fileName, 2);

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

    // Determine file flags
    const isCompressed = (blockEntry.flags & 0x00000200) !== 0;
    const isEncrypted = (blockEntry.flags & 0x00010000) !== 0;

    // Read file data from archive (read compressed size first)
    let rawData = await reader.readRange(blockEntry.filePos, blockEntry.compressedSize);

    // Decrypt if encrypted
    if (isEncrypted) {
      const fileKey = this.hashString(fileName, 3);
      const decryptedData = this.decryptFile(
        new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength),
        fileKey
      );
      rawData = new Uint8Array(decryptedData);
    }

    // Decompress if compressed
    let fileData: ArrayBuffer;
    if (isCompressed) {
      const compressionAlgorithm = this.detectCompressionAlgorithm(this.toArrayBuffer(rawData));

      // Calculate offset to actual compressed data
      // Multi-sector files have a sector offset table after the compression type byte
      const isSingleUnit = (blockEntry.flags & 0x01000000) !== 0; // SINGLE_UNIT flag
      let dataOffset = 1; // Skip compression type byte

      if (!isSingleUnit) {
        // Multi-sector file - has sector offset table
        const blockSize = this.archive?.header.blockSize ?? 4096; // Default to 4096 for streaming
        const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize);
        const sectorTableSize = (sectorCount + 1) * 4; // Array of uint32 offsets
        dataOffset += sectorTableSize;
      }

      if (compressionAlgorithm === CompressionAlgorithm.LZMA) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.lzmaDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (
        compressionAlgorithm === CompressionAlgorithm.ZLIB ||
        compressionAlgorithm === CompressionAlgorithm.PKZIP
      ) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.zlibDecompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.BZIP2) {
        const compressedData = this.toArrayBuffer(
          new Uint8Array(
            rawData.buffer,
            rawData.byteOffset + dataOffset,
            rawData.byteLength - dataOffset
          )
        );
        fileData = await this.bzip2Decompressor.decompress(
          compressedData,
          blockEntry.uncompressedSize
        );
      } else if (compressionAlgorithm === CompressionAlgorithm.NONE) {
        // Multi-algorithm compression (W3X style)
        const firstByte =
          rawData.length > 0 ? new DataView(rawData.buffer, rawData.byteOffset).getUint8(0) : 0;
        if (firstByte !== 0 && blockEntry.compressedSize < blockEntry.uncompressedSize) {
          fileData = await this.decompressMultiAlgorithm(
            this.toArrayBuffer(rawData),
            blockEntry.uncompressedSize,
            firstByte
          );
        } else {
          fileData = this.toArrayBuffer(rawData);
        }
      } else {
        throw new Error(
          `Unsupported compression algorithm: 0x${compressionAlgorithm.toString(16)}`
        );
      }
    } else {
      fileData = this.toArrayBuffer(rawData);
    }

    return {
      name: fileName,
      data: fileData,
      compressedSize: blockEntry.compressedSize,
      uncompressedSize: blockEntry.uncompressedSize,
      isCompressed,
      isEncrypted,
    };
  }
}
