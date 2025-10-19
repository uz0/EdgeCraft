/**
 * MPQ Archive format type definitions
 *
 * Based on StormLib specification:
 * https://github.com/ladislav-zezula/StormLib/wiki/MPQ-Introduction
 */

/**
 * MPQ Archive header
 */
export interface MPQHeader {
  /** Archive size in bytes */
  archiveSize: number;
  /** Format version (1 or 2) */
  formatVersion: number;
  /** Block size (file sector size) */
  blockSize: number;
  /** Hash table position */
  hashTablePos: number;
  /** Block table position */
  blockTablePos: number;
  /** Number of entries in hash table */
  hashTableSize: number;
  /** Number of entries in block table */
  blockTableSize: number;
  /** Offset where MPQ header starts in the file (0, 512, or 1024) */
  headerOffset: number;
}

/**
 * MPQ Hash table entry
 */
export interface MPQHashEntry {
  /** Hash A of file path */
  hashA: number;
  /** Hash B of file path */
  hashB: number;
  /** Language */
  locale: number;
  /** Platform */
  platform: number;
  /** Block table index */
  blockIndex: number;
}

/**
 * MPQ Block table entry
 */
export interface MPQBlockEntry {
  /** File position in archive */
  filePos: number;
  /** Compressed file size */
  compressedSize: number;
  /** Uncompressed file size */
  uncompressedSize: number;
  /** File flags */
  flags: number;
}

/**
 * MPQ File entry
 */
export interface MPQFile {
  /** File name */
  name: string;
  /** File data */
  data: ArrayBuffer;
  /** Compressed size */
  compressedSize: number;
  /** Uncompressed size */
  uncompressedSize: number;
  /** Is compressed */
  isCompressed: boolean;
  /** Is encrypted */
  isEncrypted: boolean;
}

/**
 * Complete MPQ Archive structure
 */
export interface MPQArchive {
  /** Archive header */
  header: MPQHeader;
  /** Hash table */
  hashTable: MPQHashEntry[];
  /** Block table */
  blockTable: MPQBlockEntry[];
  /** Extracted files */
  files: Map<string, MPQFile>;
}

/**
 * MPQ file flags
 */
export enum MPQFileFlags {
  COMPRESSED = 0x00000200,
  ENCRYPTED = 0x00010000,
  FIX_KEY = 0x00020000,
  SINGLE_UNIT = 0x01000000,
  DELETE_MARKER = 0x02000000,
  SECTOR_CRC = 0x04000000,
  EXISTS = 0x80000000,
}

/**
 * MPQ compression types
 */
export enum MPQCompression {
  NONE = 0x00,
  HUFFMAN = 0x01,
  ZLIB = 0x02,
  PKWARE = 0x08,
  BZIP2 = 0x10,
  SPARSE = 0x20,
  ADPCM_MONO = 0x40,
  ADPCM_STEREO = 0x80,
  LZMA = 0x12,
}

/**
 * Parse result
 */
export interface MPQParseResult {
  success: boolean;
  archive?: MPQArchive;
  error?: string;
  parseTimeMs?: number;
}

/**
 * Streaming parse result (for large files)
 */
export interface MPQStreamParseResult {
  success: boolean;
  header?: MPQHeader;
  hashTable?: MPQHashEntry[];
  blockTable?: MPQBlockEntry[];
  files: MPQFile[];
  fileList: string[];
  error?: string;
  parseTimeMs?: number;
}

/**
 * Streaming parse options
 */
export interface MPQStreamOptions {
  /** Only extract specific files (optional - for performance) */
  extractFiles?: string[];
  /** Progress callback (stage name, progress 0-100) */
  onProgress?: (stage: string, progress: number) => void;
}
