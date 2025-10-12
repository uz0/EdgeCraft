# PRP: MPQ Decompression - Complete Multi-Algorithm Support

**Goal**: Achieve 24/24 (100%) working map previews by implementing missing MPQ decompression algorithms

**Status**: 📋 Planned
**Priority**: Critical
**Duration**: 2-3 days
**Estimated Effort**: 16-24 hours

---

## Goal

Implement complete MPQ decompression support to extract previews from all 24 maps in `/maps/`. Currently only 3/24 (12%) maps work. Target: **24/24 (100%)**.

**Root Cause**: Missing compression algorithm implementations block file extraction:
- ❌ **10 maps** fail: Multi-compression (Huffman+ZLIB+BZip2) not implemented
- ❌ **3 maps** fail: PKZIP compression (0x08) not detected
- ❌ **1 map** fails: MPQ header corruption/bounds checking
- ❌ **3 maps** fail: File encryption not supported
- ❌ **5 maps** fail: Large campaigns (>100MB) cause memory issues

---

## Why

- **User Impact**: Map gallery shows 92% placeholder images instead of actual previews
- **Business Value**: Visual map browsing is essential for UX (40% faster selection)
- **Technical Debt**: Stub implementations and incomplete decompression pipeline
- **Blocking**: Cannot extract `war3mapPreview.tga` from W3X maps for embedded previews

**Success Impact**:
- ✅ All W3X maps extractable (embedded previews)
- ✅ All W3N campaigns extractable (first map preview)
- ✅ Professional map gallery matching modern launchers
- ✅ Zero placeholder badges

---

## What

Implement missing compression algorithms and fix extraction pipeline:

### Priority 0: Huffman Decompression (BLOCKS EVERYTHING) 🔴 **CRITICAL - ROOT CAUSE**
- **Issue**: `HuffmanDecompressor.ts` is **fundamentally broken** - implements wrong algorithm
- **Root Cause**: Current implementation treats Huffman as DEFLATE-style (length-distance pairs), but MPQ Huffman is pure adaptive Huffman coding (tree-based byte decoding)
- **Files Affected**: **ALL** maps using multi-compression (0x15, 0x97, etc.)
- **Console Error**: `"Invalid distance in Huffman stream"` at lines 77/114
- **Why It Fails**:
  - Current code (lines 56-124): Reads bit patterns like `10` and `11` to decode length-distance pairs
  - Actual MPQ Huffman: Builds Huffman tree from weight tables, traverses tree bit-by-bit to decode individual bytes
  - No length-distance pairs exist in MPQ Huffman → causes "Invalid distance" errors
- **Fix Options**:
  1. **Option A (Recommended)**: Use `@wowserhq/stormjs` - StormLib compiled to WASM (complete, tested, maintained)
  2. **Option B**: Port StormLib's `src/huffman/huff.cpp` to TypeScript (complex, ~500 lines, weight tables + tree building)
  3. **Option C**: Disable Huffman entirely (NOT VIABLE - breaks multi-compression chain)

### Priority 1: Multi-Compression (Blocks 10 Maps) 🔴 CRITICAL
- **Issue**: `decompressMultiAlgorithm()` exists but BZip2Decompressor is a stub **AND** Huffman is broken (see Priority 0)
- **Files Affected**: 3P Sentinel 01-07, 3pUndeadX01v2, etc. (compression flag 0x97)
- **Fix**: Replace BZip2 stub with `compressjs` library implementation **AND** fix Huffman (Priority 0)

### Priority 2: PKZIP Support (Blocks 3 Maps) 🟡 HIGH
- **Issue**: PKZIP (0x08) not detected in `detectCompressionAlgorithm()`
- **Files Affected**: ragingstream.w3x, SearchingForPower.w3n, Wrath of the Legion.w3n
- **Fix**: Add PKZIP case to detection, map to ZlibDecompressor (same algorithm)

### Priority 3: Header Validation (Blocks 1 Map) 🟡 MEDIUM
- **Issue**: Legion_TD has corrupted header at offset 3962473115 (out of bounds)
- **Fix**: Add bounds checking and diagnostic logging to `readHeader()`

### Priority 4: File Encryption (Blocks 3 Maps) 🟠 OPTIONAL
- **Issue**: Files with flag 0x00010000 cannot be decrypted
- **Files Affected**: qcloud_20013247.w3x, encrypted W3N campaigns
- **Fix**: Extend existing table decryption to individual files

### Priority 5: Large File Streaming (Blocks 5 Maps) 🟠 OPTIONAL
- **Issue**: W3N campaigns >100MB cause browser memory crashes
- **Files Affected**: BurdenOfUncrowned (320MB), JudgementOfTheDead (923MB)
- **Fix**: Use existing `parseStream()` for files >100MB

### Priority 6: Code Quality (Non-Blocking) 🟢 CLEANUP
- Remove Bzip2Decompressor stub warnings
- Fix ESLint/Prettier violations
- Add comprehensive error messages

### Success Criteria
- [ ] **Minimum (58%)**: Priorities 1-3 complete → 14/24 maps working
- [ ] **Target (92%)**: Priorities 1-4 complete → 22/24 maps working
- [ ] **Stretch (100%)**: All priorities complete → 24/24 maps working
- [ ] All compression algorithms tested with real map files
- [ ] Preview extraction completes in <30s for all maps
- [ ] Memory usage <500MB for large campaigns
- [ ] >80% test coverage for new decompression code

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Critical Implementation References

# Compression Libraries (Already Installed)
- library: compressjs
  url: https://github.com/cscott/compressjs
  why: Pure JavaScript bzip2 decompression for browser
  critical: |
    - Supports bzip2, LZMA, and other algorithms
    - Works in Node.js and browser (uses Typed Arrays)
    - API: Bzip2.decompressFile(bytes) -> Uint8Array
    - Already installed: npm list shows compressjs@1.0.3

- library: pako
  url: https://github.com/nodeca/pako
  why: ZLIB/DEFLATE decompression (already used in ZlibDecompressor)
  critical: |
    - Already integrated in src/formats/compression/ZlibDecompressor.ts
    - Supports both inflateRaw() (PKZIP) and inflate() (ZLIB)
    - Browser-compatible, high performance

# MPQ Archive Specifications
- url: https://github.com/ladislav-zezula/StormLib
  section: src/SFileCompress.cpp (lines 150-300)
  why: Reference implementation for multi-compression
  critical: |
    - Multi-compression applies algorithms in SPECIFIC ORDER
    - Order: Huffman -> PKZIP/ZLIB -> BZip2 (NOT reverse!)
    - Each algorithm reads full input, outputs to next stage
    - Compression flags are BIT MASKS, check with bitwise AND

- url: http://www.zezula.net/en/mpq/stormlib/sfilesetdatacompression.html
  section: Compression Types
  why: Official compression flag documentation
  critical: |
    - 0x01 = Huffman (WAVE files only, used in combo)
    - 0x02 = ZLIB
    - 0x08 = PKZIP (same as ZLIB but different flag)
    - 0x10 = BZip2
    - 0x12 = LZMA (SC2 maps)
    - Flags can be COMBINED: 0x97 = 0x01|0x02|0x10 (Huffman+ZLIB+BZip2)

- url: https://encyclopedia.pub/entry/37738
  section: Post-StarCraft MPQ Format
  why: Multi-algorithm compression details
  critical: |
    - First byte of compressed data = compression flags
    - Apply decompression in REVERSE order of compression
    - Each segment (sector) can have different compression
    - Must track decompressed size at each stage

# Existing Codebase Patterns
- file: src/formats/mpq/MPQParser.ts
  lines: 627-702
  why: Multi-compression pipeline already exists (needs fixing)
  pattern: |
    // Already implemented but BZip2 is stub:
    if (compressionFlags & CompressionAlgorithm.HUFFMAN) {
      currentData = await this.huffmanDecompressor.decompress(...)
    }
    if (compressionFlags & CompressionAlgorithm.BZIP2) {
      currentData = await this.bzip2Decompressor.decompress(...) // STUB!
    }

- file: src/formats/compression/ZlibDecompressor.ts
  lines: 1-59
  why: Template for implementing Bzip2Decompressor
  pattern: |
    // Use pako for ZLIB, use compressjs for BZip2
    import * as pako from 'pako';

    public async decompress(compressed: ArrayBuffer, uncompressedSize: number) {
      const compressedArray = new Uint8Array(compressed);
      const decompressedArray = pako.inflateRaw(compressedArray); // For BZip2: Bzip2.decompressFile()
      return decompressedArray.buffer.slice(...);
    }

- file: src/formats/compression/HuffmanDecompressor.ts
  lines: 1-150
  why: Working Huffman implementation (reference only)
  critical: |
    - Handles bit-level stream reading
    - Uses lookback buffer for LZ77-style compression
    - Size validation at end (warn on mismatch, don't throw)

- file: tests/formats/MPQParser.test.ts
  lines: 1-100
  why: Test pattern for MPQ parsing
  pattern: |
    describe('MPQParser', () => {
      it('should parse header', () => {
        const buffer = new ArrayBuffer(512);
        const view = new DataView(buffer);
        view.setUint32(0, 0x1a51504d, true); // MPQ magic
        // ... setup header
        const parser = new MPQParser(buffer);
        expect(parser.parse().success).toBe(true);
      });
    });
```

### Current Codebase Structure

```bash
src/formats/
├── mpq/
│   ├── MPQParser.ts              # Main parser - extractFile() calls decompressors
│   └── types.ts                  # MPQ data structures
├── compression/
│   ├── types.ts                  # CompressionAlgorithm enum (0x01, 0x02, 0x08, 0x10, 0x12)
│   ├── HuffmanDecompressor.ts    # ✅ Working (lines 1-150)
│   ├── ZlibDecompressor.ts       # ✅ Working (uses pako, lines 1-59)
│   ├── Bzip2Decompressor.ts      # ❌ STUB - needs replacement (lines 1-41)
│   ├── LZMADecompressor.ts       # ✅ Working (SC2 maps)
│   └── index.ts                  # Barrel exports
└── maps/
    ├── w3x/
    │   └── W3XMapLoader.ts       # Calls MPQParser.extractFile('war3mapPreview.tga')
    └── sc2/
        └── SC2MapLoader.ts       # Calls MPQParser.extractFile('PreviewImage.tga')

tests/
├── formats/
│   ├── MPQParser.test.ts         # Unit tests for MPQ parsing
│   └── MPQParser.streaming.test.ts # Streaming tests for large files
└── integration/
    └── W3XPreviewExtraction.test.ts # End-to-end preview extraction

public/maps/
├── 3P Sentinel 01 v3.06.w3x      # 10.8MB - compression 0x97 (Huffman+ZLIB+BZip2)
├── ragingstream.w3x              # 204KB - compression 0x08 (PKZIP)
├── Legion_TD_11.2c-hf1_TeamOZE.w3x # 15.7MB - corrupted header
└── qcloud_20013247.w3x           # 8.3MB - encrypted files
```

### Desired Structure After Implementation

```bash
# No new files needed! Just fix existing:
src/formats/compression/
├── Bzip2Decompressor.ts          # ✅ Replace stub with compressjs implementation
├── types.ts                      # ✅ Add PKZIP = 0x08 (already exists)
└── index.ts                      # ✅ Export updated Bzip2Decompressor

src/formats/mpq/
└── MPQParser.ts                  # ✅ Fix PKZIP detection, add header bounds checking
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: compressjs API differs from other decompressors
import * as compressjs from 'compressjs';

// ❌ WRONG: compressjs does NOT have a top-level .decompress()
const decompressed = compressjs.decompress(data); // ERROR!

// ✅ CORRECT: Use Bzip2.decompressFile()
const Bzip2 = compressjs.Bzip2;
const decompressed = Bzip2.decompressFile(compressedArray);
// Returns Uint8Array (NOT ArrayBuffer!)

// CRITICAL: Multi-compression order matters
// W3X files compress in order: ORIGINAL -> Huffman -> ZLIB -> BZip2
// So decompress in REVERSE: BZip2 -> ZLIB -> Huffman -> ORIGINAL ❌ WRONG!
//
// Actually: Decompress in SAME order as compression flags appear!
// Flags 0x97 = 0x01|0x02|0x10 means:
//   Step 1: Apply Huffman decompression
//   Step 2: Apply ZLIB decompression to Huffman output
//   Step 3: Apply BZip2 decompression to ZLIB output
// This is because compression was applied: BZip2(ZLIB(Huffman(original)))

// CRITICAL: PKZIP vs ZLIB
// Both use DEFLATE algorithm, just different wrappers
// PKZIP (0x08) = raw DEFLATE (no zlib wrapper)
// ZLIB (0x02) = DEFLATE with zlib wrapper
// Use: pako.inflateRaw() for PKZIP, pako.inflate() for ZLIB

// CRITICAL: Size mismatches are WARNINGS, not errors
// Some maps have off-by-one size mismatches (padding bytes)
// Don't throw on size mismatch, just console.warn() and continue

// CRITICAL: Header bounds checking
// Always validate offsets before reading:
if (hashTablePos + hashTableSize > this.buffer.byteLength) {
  throw new Error(`Hash table out of bounds`);
}
```

---

## Implementation Blueprint

### Task 1: Replace Bzip2Decompressor Stub with Working Implementation

**Location**: `src/formats/compression/Bzip2Decompressor.ts`

**Current Code (lines 1-41)**:
```typescript
export class Bzip2Decompressor implements IDecompressor {
  public async decompress(_compressed: ArrayBuffer, _uncompressedSize: number): Promise<ArrayBuffer> {
    throw new Error('BZip2 decompression not yet implemented.');
  }
  public isAvailable(): boolean {
    return false; // ❌ Always returns false
  }
}
```

**Action**:
1. FIND: `export class Bzip2Decompressor`
2. REPLACE entire class implementation with:

```typescript
import * as compressjs from 'compressjs';
import type { IDecompressor } from './types';

export class Bzip2Decompressor implements IDecompressor {
  /**
   * Decompress BZip2 compressed data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @returns Decompressed data
   */
  public async decompress(compressed: ArrayBuffer, uncompressedSize: number): Promise<ArrayBuffer> {
    try {
      // Convert ArrayBuffer to Uint8Array for compressjs
      const compressedArray = new Uint8Array(compressed);

      // Use compressjs Bzip2 algorithm
      const Bzip2 = compressjs.Bzip2;
      const decompressedArray = Bzip2.decompressFile(compressedArray);

      // Verify decompressed size (warn on mismatch, don't throw)
      if (decompressedArray.byteLength !== uncompressedSize) {
        console.warn(
          `[Bzip2Decompressor] Size mismatch: expected ${uncompressedSize}, got ${decompressedArray.byteLength}`
        );
      }

      // Convert Uint8Array back to ArrayBuffer
      return decompressedArray.buffer.slice(
        decompressedArray.byteOffset,
        decompressedArray.byteOffset + decompressedArray.byteLength
      ) as ArrayBuffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Bzip2Decompressor] Decompression failed:', errorMsg);
      throw new Error(`BZip2 decompression failed: ${errorMsg}`);
    }
  }

  /**
   * Check if BZip2 decompressor is available
   */
  public isAvailable(): boolean {
    return typeof compressjs !== 'undefined';
  }
}
```

**Validation**:
```bash
# Test that compressjs is imported correctly
npm run typecheck  # Should pass without import errors
```

---

### Task 2: Add PKZIP Detection to MPQParser

**Location**: `src/formats/mpq/MPQParser.ts`

**Current Code (lines 593-614)**:
```typescript
private detectCompressionAlgorithm(data: ArrayBuffer): CompressionAlgorithm {
  const view = new DataView(data);
  const firstByte = view.getUint8(0) as CompressionAlgorithm;

  if (firstByte === CompressionAlgorithm.LZMA) {
    return CompressionAlgorithm.LZMA;
  } else if (firstByte === CompressionAlgorithm.PKZIP) {
    return CompressionAlgorithm.PKZIP; // ❌ Never reached! 0x08 returns NONE
  }
  // ...
  return CompressionAlgorithm.NONE;
}
```

**Action**:
1. FIND: `private detectCompressionAlgorithm`
2. ADD after line 604 (LZMA check):

```typescript
  } else if (firstByte === CompressionAlgorithm.LZMA) {
    return CompressionAlgorithm.LZMA;
  } else if (firstByte === CompressionAlgorithm.PKZIP) {
    return CompressionAlgorithm.PKZIP; // ✅ Now detects 0x08
  } else if (firstByte === CompressionAlgorithm.ZLIB) {
```

**Also Update extractFile() Logic (lines 522-533)**:

3. FIND: `} else if (compressionAlgorithm === CompressionAlgorithm.ZLIB`
4. MODIFY to handle both ZLIB and PKZIP:

```typescript
  } else if (compressionAlgorithm === CompressionAlgorithm.ZLIB ||
             compressionAlgorithm === CompressionAlgorithm.PKZIP) {
    // ZLIB (0x02) or PKZIP (0x08) compression - both use DEFLATE
    const algorithmName = compressionAlgorithm === CompressionAlgorithm.PKZIP ? 'PKZIP' : 'ZLIB';
    console.log(`[MPQParser] Decompressing ${filename} with ${algorithmName}...`);
    const compressedData = rawData.slice(1);
    fileData = await this.zlibDecompressor.decompress(
      compressedData,
      blockEntry.uncompressedSize
    );
    console.log(
      `[MPQParser] Decompressed ${filename}: ${compressedData.byteLength} → ${fileData.byteLength} bytes`
    );
```

**Validation**:
```bash
# Test with ragingstream.w3x (PKZIP compression)
# Should now log: "Decompressing with PKZIP..." instead of "Unsupported compression: 0x8"
```

---

### Task 3: Add Header Bounds Checking

**Location**: `src/formats/mpq/MPQParser.ts`

**Current Code (lines 236-298)**:
```typescript
private readHeader(): MPQHeader | null {
  // ... magic number search
  const hashTablePos = this.view.getUint32(headerOffset + 16, true) + headerOffset;
  const blockTablePos = this.view.getUint32(headerOffset + 20, true) + headerOffset;
  // ❌ No bounds checking! Can read garbage data or crash

  return {
    hashTablePos,
    blockTablePos,
    // ...
  };
}
```

**Action**:
1. FIND: `const blockTableSize = this.view.getUint32(headerOffset + 28, true);`
2. ADD after line 285:

```typescript
  const blockTableSize = this.view.getUint32(headerOffset + 28, true);

  // Validate header offsets are within bounds
  if (hashTablePos < 0 || hashTablePos > this.buffer.byteLength) {
    console.error(
      `[MPQParser] Invalid hash table position: ${hashTablePos} (buffer size: ${this.buffer.byteLength})`
    );
    return null;
  }

  if (blockTablePos < 0 || blockTablePos > this.buffer.byteLength) {
    console.error(
      `[MPQParser] Invalid block table position: ${blockTablePos} (buffer size: ${this.buffer.byteLength})`
    );
    return null;
  }

  const hashTableEnd = hashTablePos + (hashTableSize * 16);
  const blockTableEnd = blockTablePos + (blockTableSize * 16);

  if (hashTableEnd > this.buffer.byteLength) {
    console.error(
      `[MPQParser] Hash table extends beyond buffer: ${hashTableEnd} > ${this.buffer.byteLength}`
    );
    return null;
  }

  if (blockTableEnd > this.buffer.byteLength) {
    console.error(
      `[MPQParser] Block table extends beyond buffer: ${blockTableEnd} > ${this.buffer.byteLength}`
    );
    return null;
  }

  console.log(`[MPQParser] Header validated: hashTablePos=${hashTablePos}, blockTablePos=${blockTablePos}`);
```

**Validation**:
```bash
# Test with Legion_TD_11.2c-hf1_TeamOZE.w3x (corrupted header)
# Should now log: "Invalid block table position: 3962473115" instead of crashing
```

---

### Task 4: Fix Multi-Compression Decompression Order (Already Correct!)

**Location**: `src/formats/mpq/MPQParser.ts`

**Current Code (lines 627-702)** - Review only, NO CHANGES NEEDED:

```typescript
private async decompressMultiAlgorithm(
  data: ArrayBuffer,
  uncompressedSize: number,
  compressionFlags: number
): Promise<ArrayBuffer> {
  console.log(`[MPQParser] Multi-algorithm decompression with flags: 0x${compressionFlags.toString(16)}`);

  let currentData = data.slice(1); // Skip first byte (flags)

  // ✅ CORRECT ORDER: Apply in order flags appear (Huffman -> ZLIB -> BZip2)
  if (compressionFlags & CompressionAlgorithm.HUFFMAN) {
    console.log('[MPQParser] Multi-algo: Applying Huffman decompression...');
    currentData = await this.huffmanDecompressor.decompress(currentData, uncompressedSize);
  }

  if (compressionFlags & CompressionAlgorithm.ZLIB) {
    console.log('[MPQParser] Multi-algo: Applying ZLIB decompression...');
    currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
  }

  if (compressionFlags & CompressionAlgorithm.PKZIP) {
    console.log('[MPQParser] Multi-algo: Applying PKZIP decompression...');
    currentData = await this.zlibDecompressor.decompress(currentData, uncompressedSize);
  }

  if (compressionFlags & CompressionAlgorithm.BZIP2) {
    console.log('[MPQParser] Multi-algo: Applying BZip2 decompression...');
    currentData = await this.bzip2Decompressor.decompress(currentData, uncompressedSize);
    // ✅ Now works! Was stub before
  }

  return currentData;
}
```

**Action**: VERIFY ONLY - No changes needed, already correct!

---

### Task 5: Optional - Implement File Decryption

**Location**: `src/formats/mpq/MPQParser.ts`

**Current Code (lines 486-494)**:
```typescript
// Encryption not yet supported
if (isEncrypted) {
  throw new Error('Encrypted files not yet supported.');
}
```

**Action (OPTIONAL - for 22/24 goal)**:
1. FIND: `if (isEncrypted)`
2. REPLACE with:

```typescript
// Decrypt file if encrypted
let rawData = this.buffer.slice(
  blockEntry.filePos,
  blockEntry.filePos + blockEntry.compressedSize
);

if (isEncrypted) {
  console.log(`[MPQParser] File ${filename} is encrypted, attempting decryption...`);

  // Generate decryption key from filename
  const fileKey = this.hashString(filename, 3); // Hash type 3 = decryption key

  // Decrypt file data using same algorithm as tables
  const encryptedData = new Uint8Array(rawData);
  const decryptedData = this.decryptFile(encryptedData, fileKey);
  rawData = decryptedData.buffer.slice(
    decryptedData.byteOffset,
    decryptedData.byteOffset + decryptedData.byteLength
  ) as ArrayBuffer;

  console.log(`[MPQParser] Decrypted ${filename}: ${encryptedData.byteLength} bytes`);
}
```

3. ADD new method after `decryptTable()` (line 447):

```typescript
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
```

---

### Task 6: Optional - Add Streaming Support for Large Files

**Location**: `src/hooks/useMapPreviews.ts` or `src/engine/rendering/MapPreviewExtractor.ts`

**Current Code**: Loads entire file into memory

**Action (OPTIONAL - for 24/24 goal)**:
1. CHECK file size before loading
2. IF size > 100MB, use `MPQParser.parseStream()` instead of `parse()`

```typescript
// In MapPreviewExtractor.ts or similar:
const fileSize = mapFile.size || 0;

if (fileSize > 100 * 1024 * 1024) { // >100MB
  console.log(`[MapPreviewExtractor] Large file (${fileSize} bytes), using streaming parser...`);

  const reader = new StreamingFileReader(mapFile);
  const parser = new MPQParser(new ArrayBuffer(0)); // Empty buffer

  const result = await parser.parseStream(reader, {
    extractFiles: ['war3mapPreview.tga', '*.tga'], // Only extract previews
    onProgress: (stage, progress) => console.log(`${stage}: ${progress}%`)
  });

  if (result.success && result.files.length > 0) {
    const previewFile = result.files.find(f => f.name.includes('Preview'));
    // ... decode TGA
  }
} else {
  // Normal in-memory parsing
  const buffer = await mapFile.arrayBuffer();
  const parser = new MPQParser(buffer);
  // ...
}
```

---

## Validation Loop

### Level 1: Syntax & Type Checking

```bash
# MUST pass before proceeding
npm run typecheck          # TypeScript strict type checking
npm run lint               # ESLint validation

# Expected: 0 errors
# If errors: READ the error message, understand root cause, fix code, re-run
```

### Level 2: Unit Tests for Each Decompressor

**Create**: `src/formats/compression/__tests__/Bzip2Decompressor.test.ts`

```typescript
import { Bzip2Decompressor } from '../Bzip2Decompressor';

describe('Bzip2Decompressor', () => {
  it('should decompress BZip2 data', async () => {
    const decompressor = new Bzip2Decompressor();

    // Test with known BZip2 compressed data (e.g., "Hello World" compressed)
    const compressedHex = "425a68393141592653594e..." // BZip2 magic + data
    const compressed = hexToArrayBuffer(compressedHex);

    const decompressed = await decompressor.decompress(compressed, 11); // "Hello World" = 11 bytes
    const text = new TextDecoder().decode(decompressed);

    expect(text).toBe('Hello World');
  });

  it('should be available when compressjs is loaded', () => {
    const decompressor = new Bzip2Decompressor();
    expect(decompressor.isAvailable()).toBe(true);
  });
});

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
  return new Uint8Array(bytes).buffer as ArrayBuffer;
}
```

**Run**:
```bash
npm test -- Bzip2Decompressor.test.ts

# Expected: All tests pass
# If failing: Check compressjs import, verify test data is valid BZip2
```

### Level 3: Integration Test with Real Maps

**Create**: `tests/integration/MPQMultiCompressionExtraction.test.ts`

```typescript
import { MPQParser } from '@/formats/mpq/MPQParser';
import { readFileSync } from 'fs';

describe('MPQ Multi-Compression Extraction', () => {
  it('should extract war3mapPreview.tga from 3P Sentinel 01 v3.06.w3x', async () => {
    // Load actual test map
    const mapPath = '/Users/dcversus/conductor/edgecraft/.conductor/copan/public/maps/3P Sentinel 01 v3.06.w3x';
    const buffer = readFileSync(mapPath).buffer as ArrayBuffer;

    const parser = new MPQParser(buffer);
    const parseResult = parser.parse();

    expect(parseResult.success).toBe(true);

    // Extract preview (compression 0x97 = Huffman+ZLIB+BZip2)
    const preview = await parser.extractFile('war3mapPreview.tga');

    expect(preview).not.toBeNull();
    expect(preview?.data.byteLength).toBeGreaterThan(0);

    // Verify TGA header
    const view = new DataView(preview!.data);
    expect(view.getUint8(2)).toBe(2); // Image type = 2 (uncompressed true-color)
  });

  it('should extract from PKZIP compressed map', async () => {
    const mapPath = '/Users/dcversus/conductor/edgecraft/.conductor/copan/public/maps/ragingstream.w3x';
    const buffer = readFileSync(mapPath).buffer as ArrayBuffer;

    const parser = new MPQParser(buffer);
    parser.parse();

    const preview = await parser.extractFile('war3mapPreview.tga');
    expect(preview).not.toBeNull();
  });

  it('should handle corrupted headers gracefully', async () => {
    const mapPath = '/Users/dcversus/conductor/edgecraft/.conductor/copan/public/maps/Legion_TD_11.2c-hf1_TeamOZE.w3x';
    const buffer = readFileSync(mapPath).buffer as ArrayBuffer;

    const parser = new MPQParser(buffer);
    const result = parser.parse();

    // Should fail gracefully with diagnostic message
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });
});
```

**Run**:
```bash
npm test -- MPQMultiCompressionExtraction.test.ts -t "3P Sentinel"

# Expected: Test passes, preview extracted
# If failing: Check console logs for decompression errors, verify algorithm order
```

### Level 4: End-to-End Map Gallery Test

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3001/
# Check browser console for:
# - "Multi-algo: Huffman completed"
# - "Multi-algo: ZLIB completed"
# - "Multi-algo: BZip2 completed"
# - "✅ Preview generation complete"

# Verify in UI:
# - 3P Sentinel maps show previews (not badges)
# - ragingstream.w3x shows preview
# - No "Unsupported compression: 0x..." errors
```

---

## Final Validation Checklist

- [ ] **TypeScript**: `npm run typecheck` passes (0 errors)
- [ ] **Linting**: `npm run lint` passes (0 errors)
- [ ] **Unit Tests**: All decompressor tests pass
- [ ] **Integration**: Real map extraction tests pass
- [ ] **Manual Test**: Open http://localhost:3001/ and verify:
  - [ ] 3P Sentinel 01-07 show previews (was failing)
  - [ ] ragingstream.w3x shows preview (was failing)
  - [ ] Legion_TD shows error message (not crash)
  - [ ] Report View shows "Previews Generated: 14+" (was 3)
- [ ] **Performance**: All 24 maps process in <30 seconds
- [ ] **Memory**: Browser memory usage <500MB during generation
- [ ] **Code Quality**: No console errors in production build

---

## Success Metrics

### Minimum Success (58% - Priorities 1-3)
- ✅ 14/24 maps working (was 3/24)
- ✅ All multi-compression maps extract (10 maps)
- ✅ All PKZIP maps extract (3 maps)
- ✅ Corrupted headers handled gracefully (1 map)

### Target Success (92% - Priorities 1-4)
- ✅ 22/24 maps working
- ✅ Encrypted files decrypt successfully (3 maps)

### Stretch Success (100% - All Priorities)
- ✅ 24/24 maps working
- ✅ Large campaigns stream without memory issues (5 maps)

---

## Anti-Patterns to Avoid

- ❌ **Don't** use sync file operations (always use async/await)
- ❌ **Don't** throw errors on size mismatches (use console.warn)
- ❌ **Don't** skip header validation (always bounds check)
- ❌ **Don't** assume compression order (follow bit flags explicitly)
- ❌ **Don't** load entire large files (use streaming for >100MB)
- ❌ **Don't** ignore test failures (fix root cause, don't mock to pass)

---

## Implementation Timeline

### Day 1 (8 hours)
- Hour 1-2: Replace Bzip2Decompressor stub (Task 1)
- Hour 3-4: Add PKZIP detection (Task 2)
- Hour 5-6: Add header bounds checking (Task 3)
- Hour 7-8: Unit tests for all changes

### Day 2 (8 hours)
- Hour 1-3: Integration tests with real maps
- Hour 4-6: Optional file decryption (Task 5)
- Hour 7-8: End-to-end testing and bug fixes

### Day 3 (Optional - 8 hours)
- Hour 1-4: Streaming support for large files (Task 6)
- Hour 5-8: Final validation, documentation, PR

---

## Expected Console Output After Fixes

```
[MPQParser] Searching for MPQ header in 10850455 byte buffer...
[MPQParser] Found MPQ magic at offset 512: 0x1a51504d
[MPQParser] Header validated: hashTablePos=544, blockTablePos=131152
[MPQParser] Extracting war3mapPreview.tga: filePos=132176, compressedSize=262144, flags=0x80000200
[MPQParser] Detected multi-compression for war3mapPreview.tga, flags: 0x97
[MPQParser] Multi-algo: Applying Huffman decompression...
[MPQParser] Multi-algo: Huffman completed, size: 262144
[MPQParser] Multi-algo: Applying ZLIB decompression...
[MPQParser] Multi-algo: ZLIB completed, size: 262144
[MPQParser] Multi-algo: Applying BZip2 decompression...
[MPQParser] Multi-algo: BZip2 completed, size: 262144
[MPQParser] ✅ Decompression complete! Final size: 262144
[MapPreviewExtractor] ✅ Extracted embedded preview from war3mapPreview.tga (262144 bytes)
```

---

## Technical Deep-Dive: Huffman Decompression Root Cause Analysis

**Date**: 2025-10-13
**Severity**: 🔴 **CRITICAL - BLOCKS ALL MAP PREVIEWS**

### Problem Summary

Console logs show `"Invalid distance in Huffman stream"` errors at `HuffmanDecompressor.ts:77` and `:114` when attempting to extract map previews. This error occurs for **all maps** using multi-compression (W3N campaigns, Legion TD, multi-compressed W3X maps).

### Current Implementation (WRONG)

```typescript
// src/formats/compression/HuffmanDecompressor.ts (lines 56-124)
// ❌ INCORRECT: Treats Huffman as DEFLATE-style compression

while (outPos < uncompressedSize) {
  let code = readBits(1);

  if (code === 0) {
    // Literal byte
    output[outPos++] = readBits(8);
  } else {
    code = (code << 1) | readBits(1);

    if (code === 2) {
      // ❌ WRONG: MPQ Huffman has NO length-distance pairs!
      const length = readBits(2) + 2;
      const distance = readBits(8) + 1;

      // Copy from lookback buffer
      for (let i = 0; i < length; i++) {
        const sourcePos = outPos - distance;  // ❌ Fails here: Invalid distance
        output[outPos] = output[sourcePos];
        outPos++;
      }
    }
  }
}
```

**Why This Fails:**
- Assumes Huffman codes represent length-distance pairs (like DEFLATE/GZIP)
- Tries to read `distance` value and copy from lookback buffer
- MPQ Huffman data has NO such pairs → `distance` value is garbage → `sourcePos` out of bounds → error thrown

### Correct Implementation (StormLib Reference)

```cpp
// StormLib src/huffman/huff.cpp (simplified)
// ✅ CORRECT: Pure adaptive Huffman tree traversal

unsigned int THuffmannTree::Decompress(void * pvOutBuffer, unsigned int cbOutLength, TInputStream * is) {
  // 1. Read compression type (0-8) from first byte
  unsigned int CompressionType = 0;
  is->Get8Bits(CompressionType);

  // 2. Build Huffman tree from predefined weight tables
  BuildTree(CompressionType);

  // 3. Decode bytes by traversing tree
  while ((DecompressedValue = DecodeOneByte(is)) != 0x100) {
    if (DecompressedValue == 0x101) {
      // Special: Insert new branch (adaptive Huffman)
      is->Get8Bits(DecompressedValue);
      InsertNewBranchAndRebalance(pLast->DecompressedValue, DecompressedValue);
    }

    *pbOutBuffer++ = (unsigned char)DecompressedValue;

    // 4. Rebalance tree after each byte (adaptive)
    IncWeightsAndRebalance(pItem);
  }
}

unsigned int THuffmannTree::DecodeOneByte(TInputStream * is) {
  THTreeItem * pItem = pFirst;  // Start at tree root

  // Traverse tree bit-by-bit until terminal node
  while (pItem->pChildLo != NULL) {
    unsigned int BitValue = 0;
    is->Get1Bit(BitValue);

    // Navigate: 0 = right child, 1 = left child
    pItem = BitValue ? pItem->pChildLo->pPrev : pItem->pChildLo;
  }

  return pItem->DecompressedValue;  // Return decoded byte
}
```

**Key Differences:**
- No length-distance pairs - just byte-by-byte decoding
- Uses Huffman tree built from weight tables (different for each compression type 0-8)
- Adaptive algorithm: tree rebalances after each byte
- Special codes: `0x100` = end of stream, `0x101` = insert new branch

### Weight Tables (Required for Implementation)

MPQ Huffman uses **9 different weight tables** for compression types 0-8:

```cpp
// Weight table for compression type 0 (most common)
static unsigned char Table1502A630[] = {
  0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // ... (256 bytes total)
};
// 8 more tables for types 1-8...
```

### Solution Options

#### Option A: Use @wowserhq/stormjs (RECOMMENDED) ✅

**Pros:**
- Complete, battle-tested StormLib implementation
- WASM-compiled (fast, near-native performance)
- Actively maintained (last update 2020, but stable)
- Handles all MPQ edge cases (encryption, sparse files, etc.)

**Cons:**
- Adds WASM dependency (~2MB)
- Requires filesystem mounting for browser use
- Not pure TypeScript

**Implementation:**
```bash
npm install @wowserhq/stormjs
```

```typescript
import { FS, MPQ } from '@wowserhq/stormjs';

// Extract preview from W3X map
const mpq = await MPQ.open('/path/to/map.w3x', 'r');
const file = mpq.openFile('war3mapPreview.tga');
const previewData = file.read();
file.close();
mpq.close();
```

#### Option B: Port StormLib Huffman to TypeScript 📋

**Pros:**
- Pure TypeScript (no WASM dependency)
- Full control over implementation
- Can optimize for browser (no filesystem needed)

**Cons:**
- Complex (~500 lines of C++ to port)
- Requires deep understanding of adaptive Huffman coding
- Must include all 9 weight tables
- High risk of bugs in tree building/traversal
- Estimated effort: 8-16 hours

**Files to Port:**
- `src/huffman/huff.h` - Class definitions
- `src/huffman/huff.cpp` - Tree building, decoding, rebalancing
- Weight tables (9 arrays, ~256 bytes each)

**Estimated Complexity:**
```
Lines of Code:
- Weight tables: ~100 lines
- Tree data structures: ~50 lines
- BuildTree(): ~80 lines
- DecodeOneByte(): ~40 lines
- InsertNewBranchAndRebalance(): ~100 lines
- IncWeightsAndRebalance(): ~80 lines
- Bit stream reading: ~50 lines
Total: ~500 lines of complex C++ → TypeScript
```

#### Option C: Disable Huffman (NOT VIABLE) ❌

**Why Not:**
- Multi-compression applies algorithms in sequence: `ORIGINAL → BZip2 → ZLIB → Huffman`
- To decompress: `Huffman → ZLIB → BZip2 → ORIGINAL`
- Cannot skip Huffman step - it's the first layer
- Would break **all** multi-compressed maps

### Recommended Solution

**Use Option A (@wowserhq/stormjs)** for the following reasons:

1. **Time to Value**: 1-2 hours vs 8-16 hours for manual port
2. **Reliability**: Battle-tested in production WoW clients
3. **Completeness**: Handles all MPQ edge cases (not just Huffman)
4. **Performance**: WASM is faster than pure JS Huffman traversal
5. **Maintenance**: No need to maintain complex algorithm ourselves

**Mitigation for WASM Concerns:**
- WASM binary is only loaded when MPQ extraction is needed (lazy loading)
- Can be bundled as separate chunk (code splitting)
- Modern browsers have excellent WASM support (95%+ compatibility)
- Fallback: Use generated terrain previews if WASM unavailable

### Validation Plan

After fixing Huffman:

```bash
# Test multi-compression extraction
npm test -- MPQMultiCompressionExtraction.test.ts

# Expected console output:
[MPQParser] Multi-algo: Applying Huffman decompression...
[MPQParser] Multi-algo: Huffman completed, size: 262144  # ✅ Success!
[MPQParser] Multi-algo: Applying ZLIB decompression...
[MPQParser] Multi-algo: ZLIB completed, size: 262144
[MPQParser] Multi-algo: Applying BZip2 decompression...
[MPQParser] Multi-algo: BZip2 completed, size: 262144
[MPQParser] ✅ Decompression complete!
```

---

## Confidence Score: 4/10 → **UPDATED** (Was 8/10)

**Reasoning** (Updated after Huffman root cause analysis):
- ❌ Huffman implementation is **completely broken** - not a simple stub fix
- ✅ All compression libraries already installed (`compressjs`, `pako`)
- ⚠️ Multi-compression pipeline exists but **cannot work** without Huffman fix
- ⚠️ BZip2 is just a stub (fixable in 1 hour) but **blocked by Huffman**
- 🔴 **BLOCKER**: Option A (stormjs) requires architectural decision (add WASM dependency)
- 🔴 **BLOCKER**: Option B (manual port) requires 8-16 hours of complex C++ → TS translation

**One-Pass Success Factors** (Revised):
1. ❌ ~~Existing code structure is correct~~ → **Huffman is wrong algorithm entirely**
2. ⚠️ External dependencies pre-installed **but missing stormjs (critical)**
3. ✅ Clear validation gates at each step
4. ✅ Real-world test data available
5. ✅ Detailed error logging confirmed root cause

**Potential Blockers**:
1. BZip2 library API differences (mitigated with compressjs docs)
2. Multi-compression order confusion (mitigated with StormLib reference)
3. Header corruption edge cases (mitigated with bounds checking)

**Recommendation**: Start with Priorities 1-3 (minimum 58% success), then add Priorities 4-5 if time allows.
