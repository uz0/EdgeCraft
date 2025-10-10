# File Format Parsing Requirements - Phase 5 Technical Research

**Date:** 2025-10-10
**Status:** Research Complete - Ready for PRP Breakdown
**Target:** Meet DoD for 95% map loading success and 98% .edgestory conversion accuracy

---

## Executive Summary

This document provides comprehensive technical specifications for implementing file format parsers required for Phase 5 of Edge Craft. The implementation will enable:

- **StarCraft 1**: 95% of SCM/SCX maps loading via MPQ parser with CHK format support
- **StarCraft 2**: 95% of SC2Map files loading via CASC parser
- **Warcraft 3**: 95% of W3M/W3X maps loading via enhanced MPQ parser with war3map file support
- **Native Format**: .edgestory format based on glTF 2.0 for legal, copyright-free asset storage
- **Conversion Pipeline**: 98% accuracy conversion from proprietary formats to .edgestory

---

## 1. MPQ Archive Format - Complete Specification

### 1.1 Overview
MPQ (Mo'PaQ - Mike O'Brien Pack) is a proprietary archive format used by Blizzard Entertainment games. It supports compression, encryption, file segmentation, and cryptographic signatures.

**Source:** http://www.zezula.net/en/mpq/mpqformat.html

### 1.2 File Structure

```
MPQ Archive Structure:
┌─────────────────────────┐
│   MPQ Header (32-208 bytes) │
├─────────────────────────┤
│   User Data (optional)   │
├─────────────────────────┤
│   File Data Sectors      │
│   (compressed/encrypted) │
├─────────────────────────┤
│   Hash Table (encrypted) │
│   16 bytes per entry     │
├─────────────────────────┤
│   Block Table (encrypted)│
│   16 bytes per entry     │
├─────────────────────────┤
│   Extended Block Table   │
│   (MPQ v2+, optional)    │
└─────────────────────────┘
```

### 1.3 MPQ Header Specification

```typescript
interface MPQHeader {
  // Header v1 (32 bytes)
  magic: number;              // 0x1A51504D ('MPQ\x1A' in little-endian)
  headerSize: number;         // Size of header (32 for v1, varies for v2+)
  archiveSize: number;        // Size of archive (v1: 32-bit, v2: 64-bit)
  formatVersion: number;      // 0 = v1, 1 = v2, 2 = v3, 3 = v4
  blockSize: number;          // Size of file sector (512 * 2^n)
  hashTablePos: number;       // Position of hash table
  blockTablePos: number;      // Position of block table
  hashTableSize: number;      // Number of entries in hash table
  blockTableSize: number;     // Number of entries in block table

  // Header v2 additions (68 bytes total)
  hiBlockTablePos64?: bigint; // High 32 bits of 64-bit positions
  hashTablePosHi?: number;    // High 16 bits of hash table pos
  blockTablePosHi?: number;   // High 16 bits of block table pos

  // Header v3 additions (208 bytes total)
  archiveSize64?: bigint;     // 64-bit archive size
  betTablePos64?: bigint;     // Position of BET table
  hetTablePos64?: bigint;     // Position of HET table

  // Header v4 additions
  hashTableSize64?: bigint;   // 64-bit hash table size
  blockTableSize64?: bigint;  // 64-bit block table size
  hetTableSize64?: bigint;    // 64-bit HET table size
  betTableSize64?: bigint;    // 64-bit BET table size
  rawChunkSize?: number;      // Size of raw data chunk to calculate MD5
}
```

### 1.4 Hash Table Structure

The hash table is used for fast file lookup. Each entry is 16 bytes.

```typescript
interface MPQHashEntry {
  hashA: number;        // Hash of filename (Type 1)
  hashB: number;        // Hash of filename (Type 2)
  locale: number;       // Locale ID (0 = neutral)
  platform: number;     // Platform ID (0 = default)
  blockIndex: number;   // Index into block table
}

// Special values
const HASH_ENTRY_EMPTY = 0xFFFFFFFF;      // Empty hash entry
const HASH_ENTRY_DELETED = 0xFFFFFFFE;    // Deleted hash entry
```

### 1.5 Block Table Structure

The block table stores file location and compression information. Each entry is 16 bytes.

```typescript
interface MPQBlockEntry {
  filePos: number;          // File position in archive
  compressedSize: number;   // Compressed file size
  uncompressedSize: number; // Uncompressed file size
  flags: number;            // File flags
}

// File flags
enum MPQFileFlags {
  IMPLODE         = 0x00000100,  // PKWARE DCL compression
  COMPRESSED      = 0x00000200,  // Multi-compression
  ENCRYPTED       = 0x00010000,  // Encrypted
  FIX_KEY         = 0x00020000,  // Encryption key is adjusted
  PATCH_FILE      = 0x00100000,  // File is a patch
  SINGLE_UNIT     = 0x01000000,  // File is single unit
  DELETE_MARKER   = 0x02000000,  // File is delete marker
  SECTOR_CRC      = 0x04000000,  // File has CRC for each sector
  EXISTS          = 0x80000000,  // File exists
}
```

### 1.6 Compression Algorithms

MPQ supports multiple compression methods, identified by a compression flag byte:

```typescript
enum MPQCompression {
  HUFFMAN       = 0x01,  // Huffman encoding
  ZLIB          = 0x02,  // zlib (RFC 1950, RFC 1951)
  PKWARE        = 0x08,  // PKWARE Data Compression Library
  BZIP2         = 0x10,  // bzip2 compression
  SPARSE        = 0x20,  // Sparse compression (repeated 0 bytes)
  ADPCM_MONO    = 0x40,  // IMA ADPCM mono
  ADPCM_STEREO  = 0x80,  // IMA ADPCM stereo
  LZMA          = 0x12,  // LZMA compression (SC2)
}

// Compression can be combined (bitwise OR)
// Example: 0x02 | 0x10 = zlib + bzip2
```

### 1.7 Encryption System

MPQ uses a sophisticated encryption system based on a 1280-byte encryption table.

```typescript
/**
 * MPQ Hash Algorithm - Used for both filename hashing and encryption
 *
 * Creates a one-way hash that's virtually impossible to reverse
 */
class MPQCrypto {
  private cryptTable: Uint32Array;

  constructor() {
    this.cryptTable = this.prepareCryptTable();
  }

  /**
   * Prepare encryption table
   * This table is used for both hashing and encryption
   */
  private prepareCryptTable(): Uint32Array {
    const table = new Uint32Array(0x500);
    let seed = 0x00100001;

    for (let index1 = 0; index1 < 0x100; index1++) {
      let index2 = index1;
      for (let i = 0; i < 5; i++) {
        seed = (seed * 125 + 3) % 0x2AAAAB;
        const temp1 = (seed & 0xFFFF) << 0x10;
        seed = (seed * 125 + 3) % 0x2AAAAB;
        const temp2 = (seed & 0xFFFF);
        table[index2] = (temp1 | temp2);
        index2 += 0x100;
      }
    }

    return table;
  }

  /**
   * Hash a string for MPQ lookup
   * @param str - String to hash (filename)
   * @param hashType - Hash type (0=table offset, 1=hash A, 2=hash B)
   */
  hashString(str: string, hashType: number): number {
    let seed1 = 0x7FED7FED;
    let seed2 = 0xEEEEEEEE;
    const upperStr = str.toUpperCase().replace(/\//g, '\\');

    for (let i = 0; i < upperStr.length; i++) {
      const ch = upperStr.charCodeAt(i);
      const value = this.cryptTable[(hashType * 0x100) + ch];
      seed1 = (value ^ (seed1 + seed2)) >>> 0;
      seed2 = (ch + seed1 + seed2 + (seed2 << 5) + 3) >>> 0;
    }

    return seed1;
  }

  /**
   * Decrypt a block of data
   * @param data - Data to decrypt
   * @param key - Decryption key (from filename hash)
   */
  decryptBlock(data: Uint32Array, key: number): void {
    let seed = 0xEEEEEEEE;

    for (let i = 0; i < data.length; i++) {
      seed += this.cryptTable[0x400 + (key & 0xFF)];
      const ch = data[i] ^ (key + seed);

      key = ((~key << 0x15) + 0x11111111) | (key >>> 0x0B);
      seed = ch + seed + (seed << 5) + 3;

      data[i] = ch >>> 0;
    }
  }

  /**
   * Decrypt hash table
   * Hash table is encrypted with key derived from "(hash table)"
   */
  decryptHashTable(data: Uint32Array): void {
    const key = this.hashString('(hash table)', 0x300);
    this.decryptBlock(data, key);
  }

  /**
   * Decrypt block table
   * Block table is encrypted with key derived from "(block table)"
   */
  decryptBlockTable(data: Uint32Array): void {
    const key = this.hashString('(block table)', 0x300);
    this.decryptBlock(data, key);
  }

  /**
   * Calculate file encryption key
   * @param filename - File name in archive
   * @param blockOffset - Block table offset
   * @param fileSize - Uncompressed file size
   * @param flags - File flags
   */
  calculateFileKey(
    filename: string,
    blockOffset: number,
    fileSize: number,
    flags: number
  ): number {
    const pathSeparator = filename.lastIndexOf('\\');
    const name = pathSeparator >= 0 ? filename.substring(pathSeparator + 1) : filename;

    let key = this.hashString(name, 0x300);

    if (flags & MPQFileFlags.FIX_KEY) {
      key = (key + blockOffset) ^ fileSize;
    }

    return key >>> 0;
  }
}
```

### 1.8 File Extraction Algorithm

```typescript
class MPQFileExtractor {
  /**
   * Extract a file from MPQ archive
   * Handles compression and encryption
   */
  async extractFile(
    archive: MPQArchive,
    hashEntry: MPQHashEntry,
    filename: string
  ): Promise<ArrayBuffer> {
    const blockEntry = archive.blockTable[hashEntry.blockIndex];
    const blockSize = archive.header.blockSize;

    // Read file data
    let fileData = archive.buffer.slice(
      blockEntry.filePos,
      blockEntry.filePos + blockEntry.compressedSize
    );

    // Handle encryption
    if (blockEntry.flags & MPQFileFlags.ENCRYPTED) {
      fileData = this.decryptFile(
        fileData,
        filename,
        blockEntry,
        blockSize
      );
    }

    // Handle compression
    if (blockEntry.flags & MPQFileFlags.COMPRESSED) {
      fileData = await this.decompressFile(
        fileData,
        blockEntry,
        blockSize
      );
    } else if (blockEntry.flags & MPQFileFlags.IMPLODE) {
      fileData = await this.explodeFile(fileData, blockEntry);
    }

    return fileData;
  }

  /**
   * Decrypt file sectors
   */
  private decryptFile(
    data: ArrayBuffer,
    filename: string,
    blockEntry: MPQBlockEntry,
    blockSize: number
  ): ArrayBuffer {
    const crypto = new MPQCrypto();
    const key = crypto.calculateFileKey(
      filename,
      blockEntry.filePos,
      blockEntry.uncompressedSize,
      blockEntry.flags
    );

    // Single unit files are decrypted as one block
    if (blockEntry.flags & MPQFileFlags.SINGLE_UNIT) {
      const dataView = new Uint32Array(data);
      crypto.decryptBlock(dataView, key);
      return dataView.buffer;
    }

    // Multi-sector files need sector offset table
    const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize) + 1;
    const sectorOffsets = new Uint32Array(data, 0, sectorCount);
    crypto.decryptBlock(sectorOffsets, key - 1);

    // Decrypt each sector
    const result = new Uint8Array(data);
    for (let i = 0; i < sectorCount - 1; i++) {
      const sectorData = new Uint32Array(
        data,
        sectorOffsets[i],
        (sectorOffsets[i + 1] - sectorOffsets[i]) / 4
      );
      crypto.decryptBlock(sectorData, key + i);
      result.set(new Uint8Array(sectorData.buffer), sectorOffsets[i]);
    }

    return result.buffer;
  }

  /**
   * Decompress file using indicated compression method(s)
   */
  private async decompressFile(
    data: ArrayBuffer,
    blockEntry: MPQBlockEntry,
    blockSize: number
  ): Promise<ArrayBuffer> {
    // Check if single unit
    if (blockEntry.flags & MPQFileFlags.SINGLE_UNIT) {
      return this.decompressSector(
        data,
        blockEntry.uncompressedSize
      );
    }

    // Multi-sector decompression
    const sectorCount = Math.ceil(blockEntry.uncompressedSize / blockSize);
    const sectorOffsets = new Uint32Array(data, 0, sectorCount + 1);

    const result = new Uint8Array(blockEntry.uncompressedSize);
    let resultOffset = 0;

    for (let i = 0; i < sectorCount; i++) {
      const sectorSize = sectorOffsets[i + 1] - sectorOffsets[i];
      const sectorData = data.slice(
        sectorOffsets[i],
        sectorOffsets[i + 1]
      );

      const expectedSize = Math.min(
        blockSize,
        blockEntry.uncompressedSize - resultOffset
      );

      const decompressed = await this.decompressSector(
        sectorData,
        expectedSize
      );

      result.set(new Uint8Array(decompressed), resultOffset);
      resultOffset += decompressed.byteLength;
    }

    return result.buffer;
  }

  /**
   * Decompress a single sector
   * First byte indicates compression method(s)
   */
  private async decompressSector(
    data: ArrayBuffer,
    expectedSize: number
  ): Promise<ArrayBuffer> {
    const view = new Uint8Array(data);
    const compressionFlags = view[0];
    let sectorData = data.slice(1);

    // Apply decompression methods in sequence
    if (compressionFlags & MPQCompression.SPARSE) {
      sectorData = this.decompressSparse(sectorData);
    }
    if (compressionFlags & MPQCompression.BZIP2) {
      sectorData = await this.decompressBzip2(sectorData);
    }
    if (compressionFlags & MPQCompression.ZLIB) {
      sectorData = await this.decompressZlib(sectorData);
    }
    if (compressionFlags & MPQCompression.HUFFMAN) {
      sectorData = this.decompressHuffman(sectorData);
    }
    if (compressionFlags & MPQCompression.PKWARE) {
      sectorData = this.decompressPkware(sectorData);
    }
    if (compressionFlags & MPQCompression.ADPCM_MONO) {
      sectorData = this.decompressAdpcmMono(sectorData);
    }
    if (compressionFlags & MPQCompression.ADPCM_STEREO) {
      sectorData = this.decompressAdpcmStereo(sectorData);
    }
    if (compressionFlags & MPQCompression.LZMA) {
      sectorData = await this.decompressLzma(sectorData);
    }

    return sectorData;
  }
}
```

### 1.9 Implementation Dependencies

```json
{
  "dependencies": {
    "pako": "^2.1.0",           // zlib compression (RFC 1950/1951)
    "bzip2": "^0.1.0",          // bzip2 decompression
    "lzma": "^2.3.2",           // LZMA compression (SC2)
    "explode-js": "^1.0.0"      // PKWARE DCL decompression
  }
}
```

### 1.10 Performance Considerations

- **Streaming**: Implement streaming extraction for large files (>10MB)
- **Worker Threads**: Use Web Workers for decompression to avoid blocking UI
- **Caching**: Cache decompressed files in IndexedDB for repeat access
- **Lazy Loading**: Only extract files when needed, not entire archive
- **Memory Management**: Release buffers after extraction to prevent leaks

---

## 2. CASC Format - StarCraft 2 Specification

### 2.1 Overview

CASC (Content Addressable Storage Container) replaced MPQ in StarCraft II, Heroes of the Storm, and World of Warcraft. It's a more complex, CDN-optimized format.

**Key Differences from MPQ:**
- Files are content-addressed (identified by hash, not name)
- Designed for streaming from CDN
- No standalone archives - requires entire storage structure
- Supports patching and versioning

### 2.2 CASC Storage Structure

```
CASC Storage:
.
├── .build.info              # Build configuration
├── Data/
│   ├── data/                # Data files (by index)
│   │   ├── data.000
│   │   ├── data.001
│   │   └── ...
│   ├── indices/             # Index files
│   │   ├── index.000.idx
│   │   ├── index.001.idx
│   │   └── ...
│   └── config/              # Configuration files
│       ├── <hash>/          # Build configs
│       │   ├── <hash>       # CDN config
│       │   └── <hash>       # Build info
│       └── data/            # Archive groups
└── .ngdp/                   # Network game data protocol (optional)
```

### 2.3 Build Info Structure

The `.build.info` file is a pipe-delimited text file containing build metadata:

```typescript
interface BuildInfo {
  branch: string;              // Build branch (e.g., "Live")
  active: string;              // 1 if active
  buildConfig: string;         // Build config hash (16 bytes hex)
  cdnConfig: string;           // CDN config hash (16 bytes hex)
  keyRing: string;             // Encryption key ring (optional)
  buildId: string;             // Build number
  versionsName: string;        // Version string (e.g., "5.0.10.79700")
  productConfig: string;       // Product config hash
}

/**
 * Parse .build.info file
 */
function parseBuildInfo(content: string): BuildInfo[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split('|').map(h => h.trim());

  const builds: BuildInfo[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('|').map(v => v.trim());
    const build: any = {};
    for (let j = 0; j < headers.length; j++) {
      build[headers[j]] = values[j];
    }
    builds.push(build as BuildInfo);
  }

  return builds;
}
```

### 2.4 Index File Structure

Index files map content hashes to data file locations.

```typescript
interface CASCIndexHeader {
  headerHashSize: number;      // Size of hash in header (bytes)
  headerHash: Uint8Array;      // Hash of index file
  version: number;             // Index version (should be 7)
  bucket: number;              // Bucket index
  extraBytes: number;          // Extra bytes per entry
  spanSizeBytes: number;       // Size field byte count
  spanOffsBytes: number;       // Offset field byte count
  keyBytes: number;            // Key size in bytes
  segmentBits: number;         // Bits used for segments
  maxFileOffset: bigint;       // Maximum file offset
}

interface CASCIndexEntry {
  key: Uint8Array;             // Content hash key
  size: number;                // Uncompressed size
  offset: number;              // Offset in data file
  index: number;               // Data file index
}

/**
 * Parse CASC index file
 */
class CASCIndexParser {
  parseIndex(buffer: ArrayBuffer): CASCIndexEntry[] {
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const headerHashSize = view.getUint32(offset, true);
    offset += 4;

    const headerHash = new Uint8Array(buffer, offset, headerHashSize);
    offset += headerHashSize;

    const version = view.getUint16(offset, true);
    offset += 2;

    const bucket = view.getUint8(offset);
    offset += 1;

    const extraBytes = view.getUint8(offset);
    offset += 1;

    const spanSizeBytes = view.getUint8(offset);
    offset += 1;

    const spanOffsBytes = view.getUint8(offset);
    offset += 1;

    const keyBytes = view.getUint8(offset);
    offset += 1;

    const segmentBits = view.getUint8(offset);
    offset += 1;

    const maxFileOffset = view.getBigUint64(offset, true);
    offset += 8;

    // Calculate entry size
    const entrySize = keyBytes + spanSizeBytes + spanOffsBytes + extraBytes;
    const entryCount = (buffer.byteLength - offset) / entrySize;

    // Parse entries
    const entries: CASCIndexEntry[] = [];
    for (let i = 0; i < entryCount; i++) {
      const key = new Uint8Array(buffer, offset, keyBytes);
      offset += keyBytes;

      // Read variable-length size
      let size = 0;
      for (let j = 0; j < spanSizeBytes; j++) {
        size |= view.getUint8(offset++) << (j * 8);
      }

      // Read variable-length offset
      let fileOffset = 0;
      for (let j = 0; j < spanOffsBytes; j++) {
        fileOffset |= view.getUint8(offset++) << (j * 8);
      }

      // Skip extra bytes
      offset += extraBytes;

      // Determine data file index from offset
      const index = Math.floor(fileOffset / 0x40000000); // 1GB chunks

      entries.push({
        key,
        size,
        offset: fileOffset % 0x40000000,
        index
      });
    }

    return entries;
  }
}
```

### 2.5 Encoding File Structure

The encoding file maps content hashes to encoding keys (which are used in index files).

```typescript
interface EncodingHeader {
  magic: string;               // 'EN' (0x4E45)
  version: number;             // Encoding version (1)
  cKeyLength: number;          // Content key length (16 bytes)
  eKeyLength: number;          // Encoding key length (16 bytes)
  cKeyPageSize: number;        // Content key page size (KB)
  eKeyPageSize: number;        // Encoding key page size (KB)
  cKeyPageCount: number;       // Number of content key pages
  eKeyPageCount: number;       // Number of encoding key pages
  unk1: number;                // Unknown
  eSpecBlockSize: number;      // Encoding spec block size
}

interface EncodingEntry {
  contentKey: Uint8Array;      // Content hash (MD5)
  encodingKeys: Uint8Array[];  // Encoding keys (can be multiple)
  size: number;                // Uncompressed size
}

/**
 * Parse encoding file
 */
class EncodingFileParser {
  parseEncoding(buffer: ArrayBuffer): Map<string, EncodingEntry> {
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const magic = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1));
    if (magic !== 'EN') {
      throw new Error('Invalid encoding file magic');
    }
    offset += 2;

    const version = view.getUint8(offset);
    offset += 1;

    const cKeyLength = view.getUint8(offset);
    offset += 1;

    const eKeyLength = view.getUint8(offset);
    offset += 1;

    const cKeyPageSize = view.getUint16(offset, true) * 1024;
    offset += 2;

    const eKeyPageSize = view.getUint16(offset, true) * 1024;
    offset += 2;

    const cKeyPageCount = view.getUint32(offset, true);
    offset += 4;

    const eKeyPageCount = view.getUint32(offset, true);
    offset += 4;

    offset += 1; // unk1

    const eSpecBlockSize = view.getUint32(offset, true);
    offset += 4;

    // Skip to encoding spec block
    offset += eSpecBlockSize;

    // Read content key pages
    const entries = new Map<string, EncodingEntry>();

    for (let page = 0; page < cKeyPageCount; page++) {
      const pageStart = offset;
      const pageEnd = offset + cKeyPageSize;

      // First entry in page
      const firstKeyHash = new Uint8Array(buffer, offset, cKeyLength);
      offset += cKeyLength;

      // Read all entries in page
      while (offset < pageEnd) {
        // Check for padding
        if (view.getUint8(offset) === 0) break;

        const entrySize = view.getUint8(offset);
        offset += 1;

        // Read content key
        const contentKey = new Uint8Array(buffer, offset, cKeyLength);
        offset += cKeyLength;

        // Read size
        const size = view.getUint32(offset, true);
        offset += 4;

        // Read encoding key count
        const eKeyCount = view.getUint8(offset);
        offset += 1;

        // Read encoding keys
        const encodingKeys: Uint8Array[] = [];
        for (let i = 0; i < eKeyCount; i++) {
          const eKey = new Uint8Array(buffer, offset, eKeyLength);
          encodingKeys.push(eKey);
          offset += eKeyLength;
        }

        const keyHex = this.bytesToHex(contentKey);
        entries.set(keyHex, {
          contentKey,
          encodingKeys,
          size
        });
      }

      // Align to page size
      offset = pageStart + cKeyPageSize;
    }

    return entries;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

### 2.6 Root File Structure

The root file maps file paths to content keys.

```typescript
interface RootHeader {
  magic: number;               // Root file magic
  totalFiles: number;          // Total file count
  namedFiles: number;          // Named file count
}

interface RootEntry {
  path: string;                // File path
  contentKey: Uint8Array;      // Content hash
  localeFlags: number;         // Locale flags
  contentFlags: number;        // Content flags
}

/**
 * Parse root file for SC2
 */
class SC2RootParser {
  parseRoot(buffer: ArrayBuffer): Map<string, RootEntry> {
    const entries = new Map<string, RootEntry>();
    const view = new DataView(buffer);
    let offset = 0;

    // SC2 root file format is simpler than WoW
    while (offset < buffer.byteLength) {
      // Read block header
      const blockCount = view.getUint32(offset, true);
      offset += 4;

      const contentFlags = view.getUint32(offset, true);
      offset += 4;

      const localeFlags = view.getUint32(offset, true);
      offset += 4;

      // Read file blocks
      for (let i = 0; i < blockCount; i++) {
        // Read file count
        const fileCount = view.getUint32(offset, true);
        offset += 4;

        // Read content keys
        const contentKeys: Uint8Array[] = [];
        for (let j = 0; j < fileCount; j++) {
          const key = new Uint8Array(buffer, offset, 16);
          contentKeys.push(key);
          offset += 16;
        }

        // Read file paths
        for (let j = 0; j < fileCount; j++) {
          // Read null-terminated string
          const pathStart = offset;
          while (view.getUint8(offset) !== 0) offset++;

          const pathBytes = new Uint8Array(buffer, pathStart, offset - pathStart);
          const path = new TextDecoder().decode(pathBytes);
          offset++; // Skip null terminator

          entries.set(path, {
            path,
            contentKey: contentKeys[j],
            localeFlags,
            contentFlags
          });
        }
      }
    }

    return entries;
  }
}
```

### 2.7 CASC File Extraction Pipeline

```typescript
/**
 * Complete CASC extraction workflow
 */
class CASCExtractor {
  private buildInfo: BuildInfo;
  private encoding: Map<string, EncodingEntry>;
  private indices: CASCIndexEntry[];
  private root: Map<string, RootEntry>;

  async initialize(cascPath: string): Promise<void> {
    // 1. Read .build.info
    const buildInfoText = await readFile(`${cascPath}/.build.info`);
    const builds = parseBuildInfo(buildInfoText);
    this.buildInfo = builds.find(b => b.active === '1')!;

    // 2. Load encoding file
    const encodingKey = this.buildInfo.cdnConfig;
    const encodingPath = this.getConfigPath(cascPath, encodingKey);
    const encodingBuffer = await readFile(encodingPath);
    this.encoding = new EncodingFileParser().parseEncoding(encodingBuffer);

    // 3. Load all index files
    this.indices = [];
    const indexFiles = await listFiles(`${cascPath}/Data/indices`);
    for (const indexFile of indexFiles) {
      const indexBuffer = await readFile(indexFile);
      const entries = new CASCIndexParser().parseIndex(indexBuffer);
      this.indices.push(...entries);
    }

    // 4. Load root file
    const rootKey = await this.getRootKey(cascPath);
    const rootBuffer = await this.extractByContentKey(rootKey);
    this.root = new SC2RootParser().parseRoot(rootBuffer);
  }

  /**
   * Extract file by path
   */
  async extractFile(path: string): Promise<ArrayBuffer> {
    // 1. Look up in root
    const rootEntry = this.root.get(path);
    if (!rootEntry) {
      throw new Error(`File not found: ${path}`);
    }

    // 2. Get encoding keys
    const contentKeyHex = this.bytesToHex(rootEntry.contentKey);
    const encodingEntry = this.encoding.get(contentKeyHex);
    if (!encodingEntry) {
      throw new Error(`No encoding for content key: ${contentKeyHex}`);
    }

    // 3. Find in index
    const eKeyHex = this.bytesToHex(encodingEntry.encodingKeys[0]);
    const indexEntry = this.findIndexEntry(eKeyHex);
    if (!indexEntry) {
      throw new Error(`No index entry for encoding key: ${eKeyHex}`);
    }

    // 4. Read from data file
    const dataPath = `Data/data/data.${indexEntry.index.toString().padStart(3, '0')}`;
    const data = await this.readDataFile(dataPath, indexEntry.offset, indexEntry.size);

    return data;
  }

  /**
   * Extract by content key (for config files)
   */
  private async extractByContentKey(contentKey: Uint8Array): Promise<ArrayBuffer> {
    const contentKeyHex = this.bytesToHex(contentKey);
    const encodingEntry = this.encoding.get(contentKeyHex);
    if (!encodingEntry) {
      throw new Error(`No encoding for content key: ${contentKeyHex}`);
    }

    const eKeyHex = this.bytesToHex(encodingEntry.encodingKeys[0]);
    const indexEntry = this.findIndexEntry(eKeyHex);
    if (!indexEntry) {
      throw new Error(`No index entry for encoding key: ${eKeyHex}`);
    }

    const dataPath = `Data/data/data.${indexEntry.index.toString().padStart(3, '0')}`;
    return this.readDataFile(dataPath, indexEntry.offset, indexEntry.size);
  }

  private findIndexEntry(eKeyHex: string): CASCIndexEntry | null {
    // Compare first 9 bytes (18 hex chars) as per CASC spec
    const searchKey = eKeyHex.substring(0, 18);
    return this.indices.find(entry => {
      const entryKey = this.bytesToHex(entry.key);
      return entryKey.startsWith(searchKey);
    }) || null;
  }
}
```

### 2.8 Performance Optimizations

- **Index Caching**: Build hash maps for O(1) lookups
- **Parallel Loading**: Load index files in parallel using Promise.all()
- **Lazy Initialization**: Only load CASC structures when needed
- **CDN Support**: Implement HTTP range requests for remote CASC access
- **Chunk Streaming**: Stream large data files instead of loading entirely

---

## 3. W3X/W3M Map Format Specification

### 3.1 Overview

W3X (Warcraft III Frozen Throne) and W3M (Warcraft III Reign of Chaos) maps are MPQ archives with a specific file structure. The archive contains various war3map.* files.

### 3.2 W3X File Structure

```
W3X Archive (MPQ):
├── war3map.j                  # JASS script (main)
├── war3map.w3i                # Map info
├── war3map.w3e                # Environment (terrain)
├── war3map.doo                # Doodads (decorations)
├── war3map.w3u                # Custom units
├── war3map.w3t                # Custom items
├── war3map.w3b                # Custom destructables
├── war3map.w3d                # Custom doodads
├── war3map.w3a                # Custom abilities
├── war3map.w3h                # Custom buffs
├── war3map.w3q                # Custom upgrades
├── war3map.w3c                # Custom cameras
├── war3map.w3r                # Custom regions
├── war3map.w3s                # Custom sounds
├── war3map.mmp                # Menu minimap
├── war3map.shd                # Shadow map
├── war3map.wpm                # Pathing map
├── war3mapUnits.doo           # Unit placement
├── war3mapPath.tga            # Path texture
├── war3mapExtra.txt           # Extra data
├── war3mapMisc.txt            # Miscellaneous
├── war3mapSkin.txt            # UI skin
└── war3map.wtg                # Triggers (GUI)
```

### 3.3 war3map.w3i - Map Info Format

```typescript
interface W3IMapInfo {
  fileVersion: number;           // Format version
  mapVersion: number;            // Map save count
  editorVersion: number;         // Editor version
  name: string;                  // Map name
  author: string;                // Map author
  description: string;           // Map description
  recommendedPlayers: string;    // e.g., "1-8"
  cameraBounds: Float32Array;    // 8 floats (bounds)
  cameraComplements: number[];   // 4 ints (complements)
  playableWidth: number;         // Width of playable area
  playableHeight: number;        // Height of playable area
  flags: number;                 // Map flags
  mainTileType: string;          // Main tileset (4 chars)
  loadingScreenModel: number;    // Loading screen model
  loadingScreenText: string;     // Custom loading text
  loadingScreenTitle: string;    // Loading screen title
  loadingScreenSubtitle: string; // Loading screen subtitle
  loadingScreenNumber: number;   // Preset loading screen
  prologueScreenText: string;    // Prologue text
  prologueScreenTitle: string;   // Prologue title
  prologueScreenSubtitle: string;// Prologue subtitle
  terrainFog: TerrainFog;        // Fog settings
  fogZStart: number;             // Fog Z start
  fogZEnd: number;               // Fog Z end
  fogDensity: number;            // Fog density
  fogColor: RGBA;                // Fog color
  weatherID: number;             // Weather effect ID
  customSoundEnvironment: string;// Sound environment
  customLightEnvironment: string;// Light environment tileset
  waterTintingColor: RGBA;       // Water color
  players: W3IPlayer[];          // Player info
  forces: W3IForce[];            // Team info
  upgradeAvailability: W3IUpgrade[]; // Available upgrades
  techAvailability: W3ITech[];   // Available tech
  unitTable: W3IUnitTable;       // Random unit tables
  itemTable: W3IItemTable;       // Random item tables
}

interface W3IPlayer {
  playerNumber: number;          // 0-11
  type: number;                  // Human, Computer, etc.
  race: number;                  // Human, Orc, Undead, Night Elf
  fixedStartPosition: boolean;   // Fixed start location
  name: string;                  // Player name
  startX: number;                // Start X coordinate
  startY: number;                // Start Y coordinate
  allyLowPriorities: number;     // Ally flags (low)
  allyHighPriorities: number;    // Ally flags (high)
}

/**
 * Parse war3map.w3i file
 */
class W3IParser {
  parse(buffer: ArrayBuffer): W3IMapInfo {
    const view = new DataView(buffer);
    let offset = 0;

    const fileVersion = view.getUint32(offset, true);
    offset += 4;

    const mapVersion = view.getUint32(offset, true);
    offset += 4;

    const editorVersion = view.getUint32(offset, true);
    offset += 4;

    // Read strings (null-terminated)
    const name = this.readString(view, offset);
    offset += name.length + 1;

    const author = this.readString(view, offset);
    offset += author.length + 1;

    const description = this.readString(view, offset);
    offset += description.length + 1;

    const recommendedPlayers = this.readString(view, offset);
    offset += recommendedPlayers.length + 1;

    // Camera bounds (8 floats)
    const cameraBounds = new Float32Array(8);
    for (let i = 0; i < 8; i++) {
      cameraBounds[i] = view.getFloat32(offset, true);
      offset += 4;
    }

    // Camera complements (4 ints)
    const cameraComplements = [];
    for (let i = 0; i < 4; i++) {
      cameraComplements.push(view.getUint32(offset, true));
      offset += 4;
    }

    const playableWidth = view.getUint32(offset, true);
    offset += 4;

    const playableHeight = view.getUint32(offset, true);
    offset += 4;

    const flags = view.getUint32(offset, true);
    offset += 4;

    const mainTileType = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    offset += 4;

    // Continue parsing...
    // (Full implementation would parse all fields)

    return {
      fileVersion,
      mapVersion,
      editorVersion,
      name,
      author,
      description,
      recommendedPlayers,
      cameraBounds,
      cameraComplements,
      playableWidth,
      playableHeight,
      flags,
      mainTileType,
      // ... other fields
    } as W3IMapInfo;
  }

  private readString(view: DataView, offset: number): string {
    const bytes = [];
    while (view.getUint8(offset) !== 0) {
      bytes.push(view.getUint8(offset));
      offset++;
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}
```

### 3.4 war3map.w3e - Terrain Format

```typescript
interface W3ETerrain {
  version: number;               // Format version (11)
  tileset: string;               // Main tileset
  customTileset: boolean;        // Uses custom tileset
  groundTiles: W3EGroundTile[];  // Ground tile array
  cliffTiles: W3ECliffTile[];    // Cliff tile array
}

interface W3EGroundTile {
  groundHeight: number;          // -16384 to 16384 (float / 4)
  waterLevel: number;            // Water height (relative)
  flags: number;                 // Tile flags
  groundTexture: number;         // Ground texture index
  cliffLevel: number;            // Cliff level
  layerHeight: number;           // Detail texture height
}

/**
 * Parse war3map.w3e terrain file
 */
class W3EParser {
  parse(buffer: ArrayBuffer): W3ETerrain {
    const view = new DataView(buffer);
    let offset = 0;

    // Header
    const magic = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    if (magic !== 'W3E!') {
      throw new Error('Invalid W3E file');
    }
    offset += 4;

    const version = view.getUint32(offset, true);
    offset += 4;

    const tileset = String.fromCharCode(view.getUint8(offset));
    offset += 1;

    const customTileset = view.getUint32(offset, true) === 1;
    offset += 4;

    // Ground tile array
    const groundTileCount = view.getUint32(offset, true);
    offset += 4;

    const groundTiles: W3EGroundTile[] = [];
    for (let i = 0; i < groundTileCount; i++) {
      const groundHeight = view.getInt16(offset, true) / 4;
      offset += 2;

      const waterLevel = view.getInt16(offset, true) / 4;
      offset += 2;

      const flags = view.getUint8(offset);
      offset += 1;

      const groundTexture = view.getUint8(offset);
      offset += 1;

      const cliffLevel = view.getUint8(offset) & 0x0F;
      const layerHeight = (view.getUint8(offset) & 0xF0) >> 4;
      offset += 1;

      groundTiles.push({
        groundHeight,
        waterLevel,
        flags,
        groundTexture,
        cliffLevel,
        layerHeight
      });
    }

    // Cliff tile array
    const cliffTileCount = view.getUint32(offset, true);
    offset += 4;

    const cliffTiles: W3ECliffTile[] = [];
    for (let i = 0; i < cliffTileCount; i++) {
      const cliffType = view.getUint8(offset);
      offset += 1;

      const cliffLevel = view.getUint8(offset);
      offset += 1;

      const cliffTexture = view.getUint8(offset);
      offset += 1;

      cliffTiles.push({
        cliffType,
        cliffLevel,
        cliffTexture
      });
    }

    return {
      version,
      tileset,
      customTileset,
      groundTiles,
      cliffTiles
    };
  }
}
```

### 3.5 war3map.doo - Doodads Format

```typescript
interface W3ODoodads {
  version: number;               // Format version (8)
  subversion: number;            // Subversion
  doodads: W3ODoodad[];          // Doodad array
  specialDoodadVersion: number;  // Special doodad version
  specialDoodads: W3OSpecialDoodad[]; // Special doodads
}

interface W3ODoodad {
  typeId: string;                // Doodad type (4 chars)
  variation: number;             // Variation index
  position: Vector3;             // X, Y, Z position
  rotation: number;              // Rotation angle (radians)
  scale: Vector3;                // X, Y, Z scale
  flags: number;                 // Doodad flags
  life: number;                  // Life percentage (0-100)
  itemTable: number;             // Item table index (-1 = none)
  itemSets: W3OItemSet[];        // Dropped item sets
  editorId: number;              // Editor ID (unique)
}

/**
 * Parse war3map.doo doodads file
 */
class W3OParser {
  parse(buffer: ArrayBuffer): W3ODoodads {
    const view = new DataView(buffer);
    let offset = 0;

    // Header
    const magic = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    if (magic !== 'W3do') {
      throw new Error('Invalid doodad file');
    }
    offset += 4;

    const version = view.getUint32(offset, true);
    offset += 4;

    const subversion = view.getUint32(offset, true);
    offset += 4;

    // Doodads
    const doodadCount = view.getUint32(offset, true);
    offset += 4;

    const doodads: W3ODoodad[] = [];
    for (let i = 0; i < doodadCount; i++) {
      const typeId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      offset += 4;

      const variation = view.getUint32(offset, true);
      offset += 4;

      const position = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true)
      };
      offset += 12;

      const rotation = view.getFloat32(offset, true);
      offset += 4;

      const scale = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true)
      };
      offset += 12;

      const flags = view.getUint8(offset);
      offset += 1;

      const life = view.getUint8(offset);
      offset += 1;

      const itemTable = view.getInt32(offset, true);
      offset += 4;

      // Item sets
      const itemSetCount = view.getUint32(offset, true);
      offset += 4;

      const itemSets: W3OItemSet[] = [];
      for (let j = 0; j < itemSetCount; j++) {
        const items: W3ODroppedItem[] = [];
        const itemCount = view.getUint32(offset, true);
        offset += 4;

        for (let k = 0; k < itemCount; k++) {
          const itemId = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
          );
          offset += 4;

          const chance = view.getUint32(offset, true);
          offset += 4;

          items.push({ itemId, chance });
        }

        itemSets.push({ items });
      }

      const editorId = view.getUint32(offset, true);
      offset += 4;

      doodads.push({
        typeId,
        variation,
        position,
        rotation,
        scale,
        flags,
        life,
        itemTable,
        itemSets,
        editorId
      });
    }

    return {
      version,
      subversion,
      doodads,
      specialDoodadVersion: 0,
      specialDoodads: []
    };
  }
}
```

### 3.6 war3mapUnits.doo - Unit Placement

Same format as doodads but for units. Contains unit type, position, rotation, owner, and custom properties.

### 3.7 war3map.j - JASS Script

Text file containing JASS2 scripting language. This requires a lexer and parser (covered in separate PRP for JASS transpilation).

---

## 4. SCM/SCX - StarCraft 1 Map Format

### 4.1 Overview

SCM (StarCraft Map) and SCX (StarCraft Expansion Map) are MPQ archives containing a single file: `staredit\scenario.chk`

**Key Reference:** https://www.starcraftai.com/wiki/CHK_Format

### 4.2 CHK File Structure

CHK files are structured as chunks (similar to RIFF format):

```
CHK Structure:
┌─────────────────────┐
│ Chunk 1             │
│ ├─ Name (4 bytes)   │
│ ├─ Size (4 bytes)   │
│ └─ Data (n bytes)   │
├─────────────────────┤
│ Chunk 2             │
│ ...                 │
└─────────────────────┘
```

### 4.3 Essential CHK Chunks

```typescript
interface CHKMap {
  // Required chunks
  VER: CHKVersion;           // Version
  IVER: CHKIVersion;         // Internal version
  IVE2: CHKIVersion2;        // TFT version
  VCOD: CHKValidation;       // Validation code
  IOWN: CHKOwners;           // Player owner
  OWNR: CHKOwnerSlots;       // Owner slots
  ERA: CHKTileset;           // Tileset
  DIM: CHKDimensions;        // Map dimensions
  SIDE: CHKRaces;            // Player races
  MTXM: CHKTileMap;          // Tile map
  PUNI: CHKUnitSettings;     // Unit settings
  UPGR: CHKUpgradeSettings;  // Upgrade settings
  PTEC: CHKTechSettings;     // Tech settings
  UNIT: CHKUnits;            // Unit placement
  THG2: CHKTriggers;         // Triggers
  MBRF: CHKBriefing;         // Mission briefing
  SPRP: CHKScenario;         // Scenario properties
  FORC: CHKForces;           // Force settings
  WAV: CHKSounds;            // Sound files
  UNIS: CHKUnitStrings;      // Unit strings
  UPGS: CHKUpgradeStrings;   // Upgrade strings
  TECS: CHKTechStrings;      // Tech strings
  SWNM: CHKSwitchNames;      // Switch names
  COLR: CHKPlayerColors;     // Player colors
  PUPx: CHKCUWP;             // CUWP slots
  PTEx: CHKCUWPTech;         // CUWP tech
  UNIx: CHKCUWPUnits;        // CUWP units
  UPGx: CHKCUWPUpgrades;     // CUWP upgrades
  TECx: CHKCUWPTechs;        // CUWP tech
}

/**
 * Parse CHK file
 */
class CHKParser {
  parse(buffer: ArrayBuffer): CHKMap {
    const view = new DataView(buffer);
    let offset = 0;
    const chunks = new Map<string, ArrayBuffer>();

    // Read all chunks
    while (offset < buffer.byteLength) {
      // Read chunk name (4 bytes)
      const name = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      offset += 4;

      // Read chunk size (4 bytes, little-endian)
      const size = view.getUint32(offset, true);
      offset += 4;

      // Read chunk data
      const data = buffer.slice(offset, offset + size);
      chunks.set(name, data);
      offset += size;
    }

    // Parse individual chunks
    return {
      VER: this.parseVER(chunks.get('VER')!),
      DIM: this.parseDIM(chunks.get('DIM')!),
      ERA: this.parseERA(chunks.get('ERA ')!),
      MTXM: this.parseMTXM(chunks.get('MTXM')!),
      UNIT: this.parseUNIT(chunks.get('UNIT')!),
      // ... parse other chunks
    } as CHKMap;
  }

  private parseVER(buffer: ArrayBuffer): CHKVersion {
    const view = new DataView(buffer);
    return {
      version: view.getUint16(0, true)
    };
  }

  private parseDIM(buffer: ArrayBuffer): CHKDimensions {
    const view = new DataView(buffer);
    return {
      width: view.getUint16(0, true),
      height: view.getUint16(2, true)
    };
  }

  private parseERA(buffer: ArrayBuffer): CHKTileset {
    const view = new DataView(buffer);
    const tilesetId = view.getUint16(0, true);
    const tilesets = [
      'Badlands',
      'Space Platform',
      'Installation',
      'Ashworld',
      'Jungle',
      'Desert',
      'Ice',
      'Twilight'
    ];
    return {
      tileset: tilesets[tilesetId] || 'Unknown'
    };
  }

  private parseMTXM(buffer: ArrayBuffer): CHKTileMap {
    // Tile map is array of 16-bit tile indices
    const view = new DataView(buffer);
    const tileCount = buffer.byteLength / 2;
    const tiles = new Uint16Array(tileCount);

    for (let i = 0; i < tileCount; i++) {
      tiles[i] = view.getUint16(i * 2, true);
    }

    return { tiles };
  }

  private parseUNIT(buffer: ArrayBuffer): CHKUnits {
    const view = new DataView(buffer);
    const unitCount = buffer.byteLength / 36; // Each unit is 36 bytes
    const units: CHKUnit[] = [];

    for (let i = 0; i < unitCount; i++) {
      const offset = i * 36;

      units.push({
        classInstance: view.getUint32(offset, true),
        x: view.getUint16(offset + 4, true),
        y: view.getUint16(offset + 6, true),
        unitId: view.getUint16(offset + 8, true),
        relationToPlayer: view.getUint16(offset + 10, true),
        validStateFlags: view.getUint16(offset + 12, true),
        validProperties: view.getUint16(offset + 14, true),
        owner: view.getUint8(offset + 16),
        hitPoints: view.getUint8(offset + 17),
        shieldPoints: view.getUint8(offset + 18),
        energy: view.getUint8(offset + 19),
        resourceAmount: view.getUint32(offset + 20, true),
        hangarCount: view.getUint16(offset + 24, true),
        stateFlags: view.getUint16(offset + 26, true),
        unused: view.getUint32(offset + 28, true),
        relationClassInstance: view.getUint32(offset + 32, true)
      });
    }

    return { units };
  }
}
```

### 4.4 Key CHK Chunks Detail

**MTXM - Tile Map:**
- Array of 16-bit tile indices
- Width × Height tiles
- Each tile references CV5 (tileset) data

**UNIT - Units:**
- 36 bytes per unit
- Position in pixels (32 pixels = 1 tile)
- Unit ID references units.dat

**THG2 - Triggers:**
- Complex binary format
- Conditions and actions
- Requires separate parser

---

## 5. .edgestory Format Specification

### 5.1 Design Philosophy

The .edgestory format is designed as a **legal, copyright-free alternative** to proprietary game formats. It must:

1. **Use open standards** (glTF 2.0 base)
2. **Store only legal content** (no copyrighted assets)
3. **Support full game functionality** (units, terrain, scripts, triggers)
4. **Enable conversion** from W3X/SC2Map/SCM with asset replacement
5. **Be browser-compatible** (JSON + binary buffers)

### 5.2 Format Structure

```typescript
/**
 * .edgestory format - glTF 2.0 extension for RTS maps
 */
interface EdgeStoryMap {
  // glTF 2.0 base
  asset: {
    version: '2.0';
    generator: 'Edge Craft Map Converter';
    copyright?: string;
  };

  // glTF scene hierarchy
  scene: number;
  scenes: glTFScene[];
  nodes: glTFNode[];
  meshes: glTFMesh[];
  materials: glTFMaterial[];
  textures: glTFTexture[];
  images: glTFImage[];
  buffers: glTFBuffer[];
  bufferViews: glTFBufferView[];
  accessors: glTFAccessor[];

  // Edge Craft extensions
  extensions: {
    EDGE_map_info: EdgeMapInfo;
    EDGE_terrain: EdgeTerrain;
    EDGE_gameplay: EdgeGameplay;
    EDGE_scripting: EdgeScripting;
  };

  extensionsUsed: ['EDGE_map_info', 'EDGE_terrain', 'EDGE_gameplay', 'EDGE_scripting'];
}
```

### 5.3 EDGE_map_info Extension

```typescript
interface EdgeMapInfo {
  // Basic info
  name: string;
  author: string;
  description: string;
  version: string;
  created: string;               // ISO 8601 timestamp
  modified: string;              // ISO 8601 timestamp

  // Source info
  sourceFormat?: 'w3x' | 'w3m' | 'sc2map' | 'scm' | 'scx' | 'native';
  sourceVersion?: string;

  // Map properties
  dimensions: {
    width: number;               // In game units
    height: number;
    playableWidth: number;
    playableHeight: number;
  };

  // Player configuration
  maxPlayers: number;
  players: EdgePlayer[];
  forces: EdgeForce[];

  // Environment
  environment: {
    tileset: string;             // Edge Craft tileset ID
    lighting: string;            // Lighting preset
    weather?: string;            // Weather effect
    fog?: EdgeFog;
    skybox?: string;             // Skybox asset ID
  };

  // Loading screen
  loadingScreen: {
    image?: string;              // Asset ID
    title?: string;
    subtitle?: string;
    text?: string;
  };

  // Legal info
  legal: {
    license: string;             // e.g., "CC-BY-SA-4.0"
    assetSources: EdgeAssetSource[];
    copyrightCompliant: boolean;
    validation: {
      date: string;
      tool: string;
      version: string;
    };
  };
}

interface EdgePlayer {
  id: number;                    // 0-based player index
  name: string;
  type: 'human' | 'computer' | 'neutral';
  race: string;                  // Game-specific
  team: number;
  color: RGBA;
  startLocation: Vector3;
  resources: Record<string, number>;
}

interface EdgeForce {
  id: number;
  name: string;
  playerIds: number[];
  alliedVictory: boolean;
  alliedDefeat: boolean;
  sharedVision: boolean;
  sharedControl: boolean;
}

interface EdgeAssetSource {
  assetId: string;
  source: 'original' | 'cc0' | 'ccby' | 'ccbysa' | 'mit' | 'custom';
  license: string;
  author?: string;
  url?: string;
  notes?: string;
}
```

### 5.4 EDGE_terrain Extension

```typescript
interface EdgeTerrain {
  // Heightmap
  heightmap: {
    width: number;               // Resolution
    height: number;
    min: number;                 // Min height value
    max: number;                 // Max height value
    accessor: number;            // glTF accessor index
  };

  // Texture splatting
  textureLayers: EdgeTextureLayer[];

  // Cliffs
  cliffs?: EdgeCliff[];

  // Ramps
  ramps?: EdgeRamp[];

  // Water
  water?: EdgeWater;

  // Doodads (decorations)
  doodads: EdgeDoodad[];

  // Pathing
  pathingMap: {
    width: number;
    height: number;
    accessor: number;            // glTF accessor to uint8 array
    // Bitflags: walkable, buildable, flyable, etc.
  };
}

interface EdgeTextureLayer {
  texture: number;               // glTF texture index
  blendMap: number;              // glTF accessor for blend weights
  scale: Vector2;                // Texture tiling
}

interface EdgeDoodad {
  id: string;
  mesh: number;                  // glTF mesh index
  node: number;                  // glTF node index (for transform)
  variation?: number;
  properties?: Record<string, any>;
}

interface EdgeWater {
  level: number;
  color: RGBA;
  node: number;                  // glTF node with water plane mesh
  shader: {
    type: 'standard' | 'realistic';
    properties: Record<string, any>;
  };
}
```

### 5.5 EDGE_gameplay Extension

```typescript
interface EdgeGameplay {
  // Units
  units: EdgeUnit[];

  // Buildings
  buildings: EdgeBuilding[];

  // Resources
  resources: EdgeResource[];

  // Item drops
  items: EdgeItem[];

  // Triggers
  triggers: EdgeTrigger[];

  // Regions
  regions: EdgeRegion[];

  // Cameras
  cameras: EdgeCamera[];

  // Victory/defeat conditions
  conditions: EdgeCondition[];
}

interface EdgeUnit {
  id: string;                    // Unique instance ID
  typeId: string;                // Unit type from game data
  owner: number;                 // Player index
  position: Vector3;
  rotation: number;              // Radians

  // Custom properties
  customName?: string;
  customDescription?: string;
  level?: number;
  hero?: {
    properName: string;
    level: number;
    experience: number;
    abilities: string[];
    inventory: string[];
  };

  // State
  health?: number;               // 0-100 percentage
  mana?: number;                 // 0-100 percentage
  facing?: number;               // Degrees

  // AI
  aiScript?: string;
  waypoints?: Vector3[];
  guardPosition?: Vector3;

  // Visuals
  mesh: number;                  // glTF mesh index
  node: number;                  // glTF node index

  // Metadata
  editorId?: number;
  tags?: string[];
}

interface EdgeTrigger {
  id: string;
  name: string;
  enabled: boolean;
  runOnMapInit: boolean;

  // Conditions (AND logic)
  conditions: EdgeTriggerCondition[];

  // Actions (sequential execution)
  actions: EdgeTriggerAction[];

  // Advanced
  priority?: number;
  comment?: string;
}

interface EdgeTriggerCondition {
  type: string;                  // e.g., 'unit_enters_region'
  params: Record<string, any>;
  negate?: boolean;
}

interface EdgeTriggerAction {
  type: string;                  // e.g., 'create_unit'
  params: Record<string, any>;
  delay?: number;
}
```

### 5.6 EDGE_scripting Extension

```typescript
interface EdgeScripting {
  // Transpiled scripts
  scripts: EdgeScript[];

  // Global variables
  variables: EdgeVariable[];

  // Functions
  functions: EdgeFunction[];

  // Event handlers
  events: EdgeEventHandler[];
}

interface EdgeScript {
  id: string;
  name: string;
  language: 'typescript' | 'javascript';
  source: string;                // Transpiled code
  sourceMap?: string;            // Source map for debugging

  // Original source info
  original?: {
    language: 'jass' | 'galaxy' | 'native';
    source: string;
  };
}

interface EdgeVariable {
  name: string;
  type: string;                  // TypeScript type
  initialValue?: any;
  scope: 'global' | 'local';
  array?: boolean;
}

interface EdgeFunction {
  name: string;
  params: EdgeFunctionParam[];
  returnType: string;
  body: string;                  // Transpiled TypeScript
}

interface EdgeEventHandler {
  event: string;                 // Event type
  callback: string;              // Function name
  filter?: string;               // Optional filter function
}
```

### 5.7 Binary Data Layout

```typescript
/**
 * .edgestory file structure
 */
interface EdgeStoryFile {
  // JSON manifest
  manifest: EdgeStoryMap;        // JSON (gzipped)

  // Binary buffers (referenced by glTF)
  buffers: {
    'terrain.bin': ArrayBuffer;  // Heightmap, splatmaps
    'meshes.bin': ArrayBuffer;   // All mesh vertex data
    'animations.bin': ArrayBuffer; // Animation data
    'scripts.bin': ArrayBuffer;  // Compiled scripts
  };

  // Textures (separate for lazy loading)
  textures: {
    [key: string]: ArrayBuffer;  // PNG/JPEG/WebP/Basis
  };
}

/**
 * File packaging
 * .edgestory is a ZIP archive with specific structure
 */
const edgestoryStructure = {
  'manifest.json': 'EdgeStoryMap JSON (gzipped)',
  'buffers/': {
    'terrain.bin': 'Terrain binary data',
    'meshes.bin': 'Mesh vertex data',
    'animations.bin': 'Animation data',
    'scripts.bin': 'Compiled scripts'
  },
  'textures/': {
    'ground_01.basis': 'Ground texture (Basis)',
    'cliff_01.basis': 'Cliff texture',
    // ... all textures
  },
  'models/': {
    'unit_warrior.glb': 'Unit model (glTF binary)',
    'building_barracks.glb': 'Building model',
    // ... all models
  },
  'LICENSES.txt': 'Asset licenses and attribution'
};
```

### 5.8 Conversion Pipeline

```typescript
/**
 * Convert W3X to .edgestory
 */
class W3XToEdgeStoryConverter {
  async convert(w3xPath: string): Promise<EdgeStoryMap> {
    // 1. Parse W3X
    const mpq = await this.parseMPQ(w3xPath);
    const w3i = await this.parseW3I(mpq);
    const w3e = await this.parseW3E(mpq);
    const doo = await this.parseDOO(mpq);
    const units = await this.parseUnits(mpq);
    const jass = await this.parseJASS(mpq);

    // 2. Create base glTF structure
    const gltf = this.createBaseGLTF();

    // 3. Convert terrain
    const terrain = await this.convertTerrain(w3e);
    gltf.extensions.EDGE_terrain = terrain;

    // 4. Convert units with asset replacement
    const gameplay = await this.convertGameplay(units, doo);
    gltf.extensions.EDGE_gameplay = gameplay;

    // 5. Transpile JASS to TypeScript
    const scripting = await this.transpileJASS(jass);
    gltf.extensions.EDGE_scripting = scripting;

    // 6. Add map info
    const mapInfo = this.createMapInfo(w3i);
    gltf.extensions.EDGE_map_info = mapInfo;

    // 7. Validate copyright compliance
    await this.validateCopyright(gltf);

    return gltf;
  }

  /**
   * Asset replacement during conversion
   */
  private async convertGameplay(
    units: W3OUnits,
    doodads: W3ODoodads
  ): Promise<EdgeGameplay> {
    const assetMapper = new AssetReplacementSystem();
    const edgeUnits: EdgeUnit[] = [];

    for (const unit of units.units) {
      // Map W3 unit to Edge unit
      const typeMapping = assetMapper.mapUnitType(unit.typeId);

      // Load replacement model
      const mesh = await assetMapper.loadReplacementModel(typeMapping.modelId);

      edgeUnits.push({
        id: `unit_${unit.editorId}`,
        typeId: typeMapping.edgeTypeId,
        owner: unit.owner,
        position: unit.position,
        rotation: unit.rotation,
        health: unit.life,
        mesh: mesh.gltfIndex,
        node: mesh.nodeIndex,
        editorId: unit.editorId
      });
    }

    return {
      units: edgeUnits,
      buildings: [],
      resources: [],
      items: [],
      triggers: [],
      regions: [],
      cameras: [],
      conditions: []
    };
  }
}
```

### 5.9 Asset Replacement System

```typescript
/**
 * Maps proprietary assets to legal alternatives
 */
class AssetReplacementSystem {
  private mappings: Map<string, AssetMapping>;

  constructor() {
    this.mappings = new Map([
      // Warcraft 3 units
      ['hfoo', { // Footman
        edgeTypeId: 'edge_warrior_01',
        modelId: 'models/units/warrior_01.glb',
        source: 'original',
        license: 'CC0-1.0'
      }],
      ['hpea', { // Peasant
        edgeTypeId: 'edge_worker_01',
        modelId: 'models/units/worker_01.glb',
        source: 'original',
        license: 'CC0-1.0'
      }],
      // StarCraft units
      ['Terran Marine', {
        edgeTypeId: 'edge_marine_01',
        modelId: 'models/units/marine_01.glb',
        source: 'original',
        license: 'CC0-1.0'
      }],
      // ... hundreds of mappings
    ]);
  }

  mapUnitType(originalTypeId: string): AssetMapping {
    const mapping = this.mappings.get(originalTypeId);

    if (!mapping) {
      console.warn(`No mapping for unit type: ${originalTypeId}`);
      return this.getPlaceholderMapping('unit');
    }

    return mapping;
  }

  async loadReplacementModel(modelId: string): Promise<GLTFModel> {
    // Load from Edge Craft asset library
    const response = await fetch(`/assets/${modelId}`);
    const arrayBuffer = await response.arrayBuffer();

    // Parse glTF
    const gltf = await GLTFLoader.parse(arrayBuffer);

    // Validate copyright
    await this.validateModelCopyright(gltf);

    return gltf;
  }

  private getPlaceholderMapping(type: 'unit' | 'building' | 'doodad'): AssetMapping {
    return {
      edgeTypeId: `edge_placeholder_${type}`,
      modelId: `models/placeholders/${type}.glb`,
      source: 'original',
      license: 'CC0-1.0'
    };
  }
}

interface AssetMapping {
  edgeTypeId: string;
  modelId: string;
  source: string;
  license: string;
  author?: string;
  url?: string;
}
```

---

## 6. PRP Breakdown Recommendations

Based on the research, here's the suggested PRP structure for Phase 5:

### 6.1 Core Infrastructure (Parallel)

**PRP 5.1: Binary Parsing Utilities**
- BinaryReader class with type-safe reading
- Endianness handling
- String reading (null-terminated, length-prefixed)
- Compression detection
- DoD: All parsers use shared utilities

**PRP 5.2: Crypto/Hash Utilities**
- MPQ hash algorithm implementation
- MPQ encryption/decryption
- Hash table utilities
- Content hash functions (MD5, SHA256)
- DoD: Passes MPQ hash test vectors

### 6.2 MPQ Implementation (Sequential)

**PRP 5.3: MPQ Header Parser**
- Support v1, v2, v3, v4 headers
- Header validation
- Version detection
- DoD: Parses all MPQ header versions

**PRP 5.4: MPQ Hash/Block Tables**
- Hash table decryption
- Block table decryption
- File lookup algorithm
- DoD: Finds files in test MPQ

**PRP 5.5: MPQ Compression Support**
- zlib decompression
- bzip2 decompression
- LZMA decompression (SC2)
- PKWARE decompression
- Sparse decompression
- DoD: Extracts compressed files from test MPQ

**PRP 5.6: MPQ File Extraction**
- Sector-based extraction
- Encryption support
- Streaming for large files
- Web Worker integration
- DoD: Extracts 100% of files from test MPQ

### 6.3 CASC Implementation (Sequential)

**PRP 5.7: CASC Build Info Parser**
- .build.info parsing
- Build config selection
- Version detection
- DoD: Reads build info from SC2 installation

**PRP 5.8: CASC Index Parser**
- Index file parsing
- Hash map building
- Multi-index support
- DoD: Indexes 1000+ entries/second

**PRP 5.9: CASC Encoding File Parser**
- Encoding file parsing
- Content key → encoding key mapping
- Page-based reading
- DoD: Maps all content keys from test encoding file

**PRP 5.10: CASC Root File Parser**
- Root file parsing (SC2 format)
- Path → content key mapping
- Locale/content flags
- DoD: Resolves 100 test file paths

**PRP 5.11: CASC File Extractor**
- Complete extraction pipeline
- CDN support (HTTP range requests)
- Caching layer
- DoD: Extracts files from SC2Map

### 6.4 Map Format Parsers (Parallel)

**PRP 5.12: W3I Parser (Warcraft 3 Map Info)**
- war3map.w3i parsing
- Player configuration
- Map properties
- DoD: Parses 20 test W3X maps

**PRP 5.13: W3E Parser (Warcraft 3 Terrain)**
- war3map.w3e parsing
- Heightmap extraction
- Texture layer data
- Cliff data
- DoD: Extracts terrain from test maps

**PRP 5.14: W3O Parser (Warcraft 3 Doodads)**
- war3map.doo parsing
- Doodad placement
- Item drops
- DoD: Extracts all doodads from test map

**PRP 5.15: W3U Parser (Warcraft 3 Units)**
- war3mapUnits.doo parsing
- Unit placement
- Unit properties
- DoD: Extracts all units from test map

**PRP 5.16: CHK Parser (StarCraft 1 Maps)**
- Chunk-based parsing
- All essential chunks
- Tile map extraction
- Unit placement
- DoD: Parses 20 test SCM/SCX maps

**PRP 5.17: SC2Map Parser**
- SC2Map structure parsing
- Component file extraction
- Dependency resolution
- DoD: Loads SC2Map structure

### 6.5 .edgestory Format (Sequential Dependencies)

**PRP 5.18: EdgeStory Format Specification**
- glTF 2.0 extension definition
- JSON schema validation
- Format documentation
- DoD: Schema validates test .edgestory files

**PRP 5.19: EdgeStory Base Converter**
- Base glTF structure generation
- Buffer management
- Texture handling
- DoD: Creates valid glTF 2.0 base

**PRP 5.20: Asset Replacement System**
- Unit/building/doodad mapping database
- Replacement model loading
- Copyright validation
- Placeholder generation
- DoD: Maps 100+ unit types

**PRP 5.21: Terrain Converter**
- Heightmap → glTF accessor
- Texture splatmap generation
- Water plane creation
- Cliff mesh generation
- DoD: Converts terrain with 98% accuracy

**PRP 5.22: Gameplay Converter**
- Unit conversion with replacement
- Building conversion
- Trigger conversion
- Region/camera conversion
- DoD: Converts gameplay elements with 98% accuracy

**PRP 5.23: Script Transpiler**
- JASS → TypeScript (covered in separate PRP)
- Galaxy → TypeScript (future)
- Script validation
- DoD: Transpiles test JASS scripts

**PRP 5.24: W3X → EdgeStory Converter**
- Complete W3X conversion pipeline
- Integration of all parsers
- Validation
- DoD: Converts W3X to .edgestory with 98% accuracy

**PRP 5.25: SC2Map → EdgeStory Converter**
- Complete SC2Map conversion pipeline
- CASC integration
- Asset replacement
- DoD: Converts SC2Map to .edgestory with 98% accuracy

**PRP 5.26: SCM/SCX → EdgeStory Converter**
- Complete SC1 conversion pipeline
- Legacy format handling
- DoD: Converts SCM/SCX to .edgestory with 98% accuracy

### 6.6 Testing & Validation (Parallel with Implementation)

**PRP 5.27: Format Parser Test Suite**
- Unit tests for all parsers
- Test data generation
- Edge case coverage
- DoD: 95% code coverage

**PRP 5.28: Integration Test Suite**
- End-to-end conversion tests
- Performance benchmarks
- Memory leak detection
- DoD: All integration tests pass

**PRP 5.29: Copyright Validation System**
- Asset hash database
- Metadata scanning
- Automated copyright checks
- DoD: Catches 100% of test copyright violations

---

## 7. Performance Targets

### 7.1 Parsing Performance

- **MPQ Header**: <1ms
- **MPQ File Extraction**: <50ms for 1MB file
- **CASC Initialization**: <500ms
- **CASC File Extraction**: <100ms for 1MB file
- **W3X Full Parse**: <2 seconds for typical map
- **SC2Map Full Parse**: <3 seconds for typical map
- **SCM/SCX Parse**: <500ms for typical map

### 7.2 Conversion Performance

- **W3X → .edgestory**: <10 seconds for typical map
- **SC2Map → .edgestory**: <15 seconds for typical map
- **SCM/SCX → .edgestory**: <5 seconds for typical map
- **Memory Usage**: <512MB during conversion
- **Output Size**: .edgestory should be <150% of original size

### 7.3 Accuracy Targets

- **Terrain Accuracy**: 98% height/texture match
- **Unit Placement**: 100% position accuracy
- **Gameplay Logic**: 95% trigger conversion success
- **Script Conversion**: 90% JASS → TypeScript success
- **Asset Replacement**: 100% unit/building coverage

---

## 8. Dependencies

### 8.1 NPM Packages

```json
{
  "dependencies": {
    "pako": "^2.1.0",              // zlib compression
    "bzip2": "^0.1.0",             // bzip2 decompression
    "lzma": "^2.3.2",              // LZMA compression
    "explode-js": "^1.0.0",        // PKWARE DCL
    "jszip": "^3.10.1",            // ZIP handling for .edgestory
    "@gltf-transform/core": "^3.7.0",  // glTF manipulation
    "@gltf-transform/extensions": "^3.7.0",
    "basis-universal": "^1.16.4"   // Basis texture compression
  },
  "devDependencies": {
    "@types/pako": "^2.0.0",
    "jest": "^29.7.0",
    "benchmark": "^2.1.4"          // Performance testing
  }
}
```

### 8.2 External Resources

- **StormLib**: Reference implementation for MPQ
  - https://github.com/ladislav-zezula/StormLib

- **CascLib**: Reference implementation for CASC
  - https://github.com/ladislav-zezula/CascLib

- **WC3MapTranslator**: W3X format reference
  - https://github.com/ChiefOfGxBxL/WC3MapTranslator

- **glTF Specification**: glTF 2.0 format
  - https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

---

## 9. Success Metrics

### 9.1 Definition of Done - Phase 5

**Map Loading Success:**
- ✅ 95% of StarCraft 1 (SCM/SCX) maps load successfully
- ✅ 95% of StarCraft 2 (SC2Map) maps load successfully
- ✅ 95% of Warcraft 3 (W3M/W3X) maps load successfully

**Conversion Accuracy:**
- ✅ 98% accuracy in terrain conversion
- ✅ 100% accuracy in unit/building placement
- ✅ 95% accuracy in trigger/script conversion
- ✅ 100% asset replacement with legal alternatives

**Performance:**
- ✅ W3X map loads in <10 seconds
- ✅ SC2Map loads in <15 seconds
- ✅ SCM/SCX loads in <5 seconds
- ✅ Memory usage <512MB during conversion

**Legal Compliance:**
- ✅ Zero copyrighted assets in output
- ✅ All assets have license attribution
- ✅ Copyright validation system active
- ✅ Asset source documentation complete

### 9.2 Testing Strategy

**Unit Tests:**
- Test each parser with known-good files
- Test edge cases (empty maps, max size, corrupted data)
- Test compression/encryption combinations

**Integration Tests:**
- End-to-end conversion tests
- Cross-format compatibility
- Asset replacement verification

**Performance Tests:**
- Benchmark parsing speed
- Memory profiling
- Large map stress tests (500+ units)

**Legal Tests:**
- Copyright detection tests
- License validation
- Asset provenance tracking

---

## 10. Risk Mitigation

### 10.1 Technical Risks

**Risk**: MPQ encryption keys unknown for some files
**Mitigation**: Implement key bruteforce for common patterns; document unsupported files

**Risk**: CASC format changes in future SC2 patches
**Mitigation**: Version detection; fallback to older parser versions

**Risk**: JASS transpilation fails for complex scripts
**Mitigation**: Provide manual override; document unsupported JASS features

**Risk**: Asset replacement doesn't cover all units
**Mitigation**: Placeholder system; crowdsource asset creation

### 10.2 Legal Risks

**Risk**: Accidental inclusion of copyrighted assets
**Mitigation**: Automated hash-based detection; manual review process

**Risk**: Unclear licensing for replacement assets
**Mitigation**: Only use CC0/MIT assets; maintain attribution database

**Risk**: Blizzard IP in .edgestory format
**Mitigation**: Clean-room implementation; document non-infringement

---

## 11. Next Steps

1. **Review this research document** with the team
2. **Create individual PRPs** following the structure in Section 6
3. **Set up test data repository** with sample maps
4. **Implement binary parsing utilities** (PRP 5.1-5.2)
5. **Begin MPQ parser implementation** (PRP 5.3-5.6)
6. **Parallel track: Design .edgestory schema** (PRP 5.18)
7. **Build asset replacement database** (PRP 5.20)

---

## 12. References

### 12.1 Format Specifications

- **MPQ Format**: http://www.zezula.net/en/mpq/mpqformat.html
- **CASC Format**: https://wowdev.wiki/CASC
- **W3X Format**: https://github.com/ChiefOfGxBxL/WC3MapSpecification
- **CHK Format**: https://www.starcraftai.com/wiki/CHK_Format
- **glTF 2.0**: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

### 12.2 Reference Implementations

- **StormLib**: https://github.com/ladislav-zezula/StormLib
- **CascLib**: https://github.com/ladislav-zezula/CascLib
- **WC3MapTranslator**: https://github.com/ChiefOfGxBxL/WC3MapTranslator
- **RichChk**: https://github.com/sethmachine/richchk

### 12.3 Community Resources

- **Staredit Network**: https://staredit.net/
- **Hive Workshop**: https://www.hiveworkshop.com/
- **SC2Mapster**: https://www.sc2mapster.com/

---

**Document Status**: Complete - Ready for PRP Creation
**Last Updated**: 2025-10-10
**Next Review**: After PRP 5.1-5.6 completion
