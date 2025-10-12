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

  // MPQ Magic numbers
  private static readonly MPQ_MAGIC_V1 = 0x1a51504d; // 'MPQ\x1A' in little-endian
  private static readonly MPQ_MAGIC_V2 = 0x1b51504d; // 'MPQ\x1B' in little-endian (SC2)

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.lzmaDecompressor = new LZMADecompressor();
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
    // W3X maps often have user data (preview image) before the MPQ header
    // Search for MPQ magic number in the first 4KB
    let headerOffset = 0;
    const searchLimit = Math.min(4096, this.buffer.byteLength);

    console.log(
      `[MPQParser] Searching for MPQ header in ${this.buffer.byteLength} byte buffer (limit: ${searchLimit})`
    );

    for (let offset = 0; offset < searchLimit; offset += 512) {
      const magic = this.view.getUint32(offset, true);
      if (magic === MPQParser.MPQ_MAGIC_V1 || magic === MPQParser.MPQ_MAGIC_V2) {
        headerOffset = offset;
        console.log(`[MPQParser] Found MPQ magic at offset ${offset}: 0x${magic.toString(16)}`);
        break;
      }
    }

    // Check magic number at found offset (support both v1 and v2)
    const magic = this.view.getUint32(headerOffset, true);
    if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
      console.error(
        `[MPQParser] Invalid magic at offset ${headerOffset}: 0x${magic.toString(16)}, expected 0x${MPQParser.MPQ_MAGIC_V1.toString(16)} or 0x${MPQParser.MPQ_MAGIC_V2.toString(16)}`
      );
      return null;
    }

    return {
      archiveSize: this.view.getUint32(headerOffset + 8, true),
      formatVersion: this.view.getUint16(headerOffset + 12, true),
      blockSize: 512 * Math.pow(2, this.view.getUint16(headerOffset + 14, true)),
      hashTablePos: this.view.getUint32(headerOffset + 16, true) + headerOffset,
      blockTablePos: this.view.getUint32(headerOffset + 20, true) + headerOffset,
      hashTableSize: this.view.getUint32(headerOffset + 24, true),
      blockTableSize: this.view.getUint32(headerOffset + 28, true),
    };
  }

  /**
   * Read hash table (with optional decryption)
   */
  private readHashTable(header: MPQHeader): MPQHashEntry[] {
    const hashTable: MPQHashEntry[] = [];
    const offset = header.hashTablePos;
    const size = header.hashTableSize * 16; // 16 bytes per entry

    // Try WITHOUT decryption first (many W3X maps don't encrypt tables)
    const rawView = new DataView(this.buffer, offset, size);

    // Check if raw data looks valid
    const firstBlockIndexRaw = rawView.getUint32(12, true);
    const secondBlockIndexRaw = size >= 32 ? rawView.getUint32(12 + 16, true) : 0xffffffff;

    console.log(`[MPQParser] Raw hash table check: first blockIndex=${firstBlockIndexRaw}, second=${secondBlockIndexRaw}`);

    // Check if table needs decryption by looking for empty slots (0xFFFFFFFF)
    let hasEmptySlots = false;
    for (let i = 0; i < Math.min(header.hashTableSize, 10); i++) {
      const hashA = rawView.getUint32(i * 16, true);
      if (hashA === 0xffffffff) {
        hasEmptySlots = true;
        break;
      }
    }

    let view = rawView;
    if (!hasEmptySlots) {
      // No empty slots found in raw data = table is likely encrypted
      console.log('[MPQParser] Hash table appears encrypted (no 0xFFFFFFFF slots), attempting decryption...');
      const tableData = new Uint8Array(this.buffer, offset, size);
      const decryptedData = this.decryptTable(tableData, '(hash table)');
      view = new DataView(decryptedData.buffer);
      console.log(`[MPQParser] Decrypted first blockIndex: ${view.getUint32(12, true)}`);
    } else {
      console.log('[MPQParser] Using raw (unencrypted) hash table');
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

    // Try WITHOUT decryption first
    const rawView = new DataView(this.buffer, offset, size);

    // Check if raw data looks valid (filePos should be within archive)
    const firstFilePosRaw = rawView.getUint32(0, true);

    console.log(`[MPQParser] Raw block table check: first filePos=${firstFilePosRaw}, archiveSize=${header.archiveSize}`);

    // If raw values look reasonable, use them; otherwise decrypt
    let view = rawView;
    if (firstFilePosRaw > header.archiveSize * 2) {
      // File position way outside archive = encrypted
      console.log('[MPQParser] Block table appears encrypted, attempting decryption...');
      const tableData = new Uint8Array(this.buffer, offset, size);
      const decryptedData = this.decryptTable(tableData, '(block table)');
      view = new DataView(decryptedData.buffer);
      console.log(`[MPQParser] Decrypted first filePos: ${view.getUint32(0, true)}`);
    } else {
      console.log('[MPQParser] Using raw (unencrypted) block table');
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

    // Generate encryption key from string (hash type 0x300 for decrypt)
    let seed1 = this.hashString(key, 0x300);
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
      console.log(`[MPQParser] File not found in hash table: ${filename}`);
      console.log(
        `[MPQParser] Hash values: hashA=${this.hashString(filename, 0)}, hashB=${this.hashString(filename, 1)}`
      );
      console.log(`[MPQParser] Hash table entries: ${this.archive.hashTable.length}`);
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
   * Find file in hash table
   */
  private findFile(filename: string): MPQHashEntry | null {
    if (!this.archive) return null;

    const hashA = this.hashString(filename, 0);
    const hashB = this.hashString(filename, 1);

    console.log(`[MPQParser findFile] Looking for: ${filename}`);
    console.log(`[MPQParser findFile] Computed hashes: hashA=${hashA}, hashB=${hashB}`);

    // Debug: Show all NON-EMPTY hash table entries (empty = 0xFFFFFFFF)
    const nonEmptyEntries = this.archive.hashTable.filter(
      (entry) => entry.hashA !== 0xffffffff && entry.hashB !== 0xffffffff
    );
    console.log(
      `[MPQParser findFile] Non-empty entries: ${nonEmptyEntries.length}/${this.archive.hashTable.length}`
    );
    for (let i = 0; i < Math.min(10, nonEmptyEntries.length); i++) {
      const entry = nonEmptyEntries[i];
      console.log(
        `  [${i}] hashA=${entry?.hashA}, hashB=${entry?.hashB}, blockIndex=${entry?.blockIndex}`
      );
    }

    for (const entry of this.archive.hashTable) {
      if (entry.hashA === hashA && entry.hashB === hashB) {
        console.log(`[MPQParser findFile] ✅ FOUND at blockIndex=${entry.blockIndex}`);
        return entry;
      }
    }

    console.log('[MPQParser findFile] ❌ NOT FOUND');
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
   */
  private parseHeaderFromBytes(data: Uint8Array): MPQHeader | null {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // W3X maps often have user data before the MPQ header - search for it
    let headerOffset = 0;
    const searchLimit = Math.min(4096, data.byteLength);

    for (let offset = 0; offset < searchLimit; offset += 512) {
      const magic = view.getUint32(offset, true);
      if (magic === MPQParser.MPQ_MAGIC_V1 || magic === MPQParser.MPQ_MAGIC_V2) {
        headerOffset = offset;
        break;
      }
    }

    // Check magic number at found offset
    const magic = view.getUint32(headerOffset, true);
    if (magic !== MPQParser.MPQ_MAGIC_V1 && magic !== MPQParser.MPQ_MAGIC_V2) {
      return null;
    }

    return {
      archiveSize: view.getUint32(headerOffset + 8, true),
      formatVersion: view.getUint16(headerOffset + 12, true),
      blockSize: 512 * Math.pow(2, view.getUint16(headerOffset + 14, true)),
      hashTablePos: view.getUint32(headerOffset + 16, true) + headerOffset,
      blockTablePos: view.getUint32(headerOffset + 20, true) + headerOffset,
      hashTableSize: view.getUint32(headerOffset + 24, true),
      blockTableSize: view.getUint32(headerOffset + 28, true),
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
