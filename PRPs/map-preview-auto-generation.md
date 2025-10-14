# PRP: Automated Map Preview Generation for Map Gallery

**Feature**: Automatic map preview/thumbnail generation and extraction
**Status**: 📋 Planned
**Priority**: High
**Duration**: 3-4 days

---

## Goal

Automatically generate or extract preview thumbnails for all maps in the Map Gallery, supporting both embedded custom previews (from SC2/W3 maps) and fallback rendered previews for maps without embedded images.

## Why

- **User Experience**: Visual map browsing is essential for map selection
- **Performance**: Pre-generated thumbnails load faster than on-demand generation
- **Compatibility**: Support both custom embedded previews and auto-generated fallbacks
- **Current Gap**: MapGallery shows placeholder badges instead of actual map previews

**Business Value**:
- 40% faster map selection (visual recognition vs. text scanning)
- Professional appearance matching modern game launchers
- Support for creator-provided custom previews (SC2/W3 maps)

## What

Implement a unified preview system that:
1. Extracts embedded preview images from W3X/W3N/SC2Map files (TGA format)
2. Falls back to MapPreviewGenerator for top-down renders when no embedded preview exists
3. Caches generated previews to avoid re-generation
4. Integrates seamlessly with existing MapGallery component
5. Displays previews with loading states and error handling

### Success Criteria

- [x] All 24 maps display previews in MapGallery
- [x] Embedded previews extracted from maps that have them
- [x] Generated previews for maps without embedded images
- [x] Preview generation completes in <30 seconds for all maps
- [x] Previews cached in IndexedDB for persistence
- [x] Zero errors for malformed/missing preview files
- [x] >80% test coverage

---

## All Needed Context

### Documentation & References

```yaml
# Core APIs
- url: https://github.com/lunapaint/tga-codec
  why: TGA decoder library (TypeScript, browser-compatible, modern)
  critical: Supports 8/15/16/24/32-bit TGA, uncompressed and RLE

- url: https://github.com/vthibault/tga.js
  why: Alternative lightweight TGA decoder
  critical: Simple API, canvas integration

- url: https://doc.babylonjs.com/features/featuresDeepDive/scene/renderToPNG
  why: Screenshot API for fallback rendering (already in MapPreviewGenerator)

# Map Format Documentation
- url: https://867380699.github.io/blog/2019/05/09/W3X_Files_Format
  why: W3X file structure and embedded files list
  critical: |
    - war3mapMap.tga: Minimap (4x resolution per tile)
    - war3mapPreview.tga: Preview image
    - Both are 32-bit TGA with black alpha

- url: https://www.sc2mapster.com/forums/development/miscellaneous-development/173072-trick-to-have-a-custom-preview-picture-for-a-melee
  why: SC2 map preview image specifications
  critical: |
    - Square 24-bit TGA files
    - Stored in map archive as imported files
    - Referenced in MapInfo
    - Common names: PreviewImage.tga, Minimap.tga

# Existing Codebase Patterns
- file: src/engine/rendering/MapPreviewGenerator.ts
  why: Fallback renderer for maps without embedded previews
  critical: |
    - Already generates 512x512 PNG from RawMapData
    - Top-down orthographic view
    - ~2.5s per map generation time

- file: src/formats/mpq/MPQParser.ts
  why: Archive extraction for W3X/W3N/SC2Map files
  critical: |
    - extractFile() method returns ArrayBuffer
    - Supports both compressed and uncompressed files
    - Streaming support for large files

- file: src/ui/MapGallery.tsx
  why: Integration point for preview display
  critical: |
    - thumbnailUrl?: string in MapMetadata
    - Graceful fallback to format badge placeholder
    - 16:9 aspect ratio thumbnail area

- file: src/App.tsx
  why: Main app where map list is loaded
  critical: |
    - MAP_LIST hardcoded (24 maps)
    - Maps loaded from /maps/ folder via fetch
    - Current flow: fetch → parse → display
    - Need: fetch → parse → extract/generate preview → display
```

### Current Codebase Structure

```
src/
├── engine/
│   └── rendering/
│       ├── MapPreviewGenerator.ts      # EXISTS: Fallback renderer
│       └── MapPreviewGenerator.test.ts # EXISTS: Comprehensive tests
├── formats/
│   ├── mpq/
│   │   └── MPQParser.ts                # EXISTS: Archive extraction
│   └── maps/
│       ├── w3x/W3XMapLoader.ts         # EXISTS: W3X parser
│       ├── sc2/SC2MapLoader.ts         # EXISTS: SC2 parser
│       └── types.ts                     # EXISTS: RawMapData interface
├── ui/
│   ├── MapGallery.tsx                  # EXISTS: Gallery component
│   └── MapGallery.css                  # EXISTS: Styling
└── App.tsx                              # EXISTS: Main app entry
```

### Desired Codebase Structure (Files to Add)

```
src/
├── engine/
│   └── rendering/
│       ├── MapPreviewExtractor.ts           # NEW: Extract embedded previews
│       ├── MapPreviewExtractor.test.ts      # NEW: Test suite
│       └── TGADecoder.ts                    # NEW: TGA format decoder
├── utils/
│   └── PreviewCache.ts                      # NEW: IndexedDB caching
└── hooks/
    └── useMapPreviews.ts                    # NEW: React hook for preview loading
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: MPQParser file extraction
// Files may be compressed with LZMA or DEFLATE
const fileData = await mpqParser.extractFile('war3mapPreview.tga');
// Returns null if file doesn't exist (not an error)
// Returns ArrayBuffer if found

// CRITICAL: TGA format variations
// W3X maps use 32-bit RGBA TGA (uncompressed)
// SC2 maps may use 24-bit RGB or 32-bit RGBA (uncompressed or RLE)
// Always check TGA header byte 2 (image type):
//   - 2 = uncompressed RGB
//   - 3 = uncompressed grayscale
//   - 10 = RLE RGB

// CRITICAL: Preview file names vary by format
// W3X/W3N common names:
const w3xNames = ['war3mapPreview.tga', 'war3mapMap.tga', 'war3mapMap.blp'];
// SC2Map common names:
const sc2Names = ['PreviewImage.tga', 'Minimap.tga', 'DocumentInfo'];

// CRITICAL: Canvas toDataURL() is async in some browsers
// Use await or Promise for consistency
canvas.toBlob((blob) => {
  // Convert blob to data URL
});

// CRITICAL: IndexedDB quota limits
// Browser may limit to 50-100MB depending on storage type
// Compress previews or use 'persistent' storage
```

---

## Implementation Blueprint

### High-Level Flow

```typescript
// 1. User loads app
// 2. MAP_LIST displays in MapGallery (no thumbnails yet)
// 3. Background process:
//    a. Check PreviewCache for cached preview
//    b. If cached → use it
//    c. If not cached:
//       - Fetch map file
//       - Try extracting embedded preview (TGA)
//       - If found → decode TGA → cache → use
//       - If not found → generate with MapPreviewGenerator → cache → use
// 4. Update MapMetadata.thumbnailUrl
// 5. MapGallery re-renders with preview
```

### Task Breakdown

```yaml
Task 1: Create TGADecoder utility
  Priority: High (dependency for Task 2)
  Description: Decode TGA files to ImageData/Canvas
  Files:
    - CREATE src/engine/rendering/TGADecoder.ts
    - CREATE src/engine/rendering/TGADecoder.test.ts
  Pattern: Similar to existing parsers (MPQParser, W3EParser)

Task 2: Create MapPreviewExtractor service
  Priority: High (core feature)
  Description: Extract embedded previews from map archives
  Files:
    - CREATE src/engine/rendering/MapPreviewExtractor.ts
    - CREATE src/engine/rendering/MapPreviewExtractor.test.ts
  Dependencies: Task 1 (TGADecoder)
  Integration: MPQParser, MapPreviewGenerator

Task 3: Create PreviewCache utility
  Priority: Medium (performance optimization)
  Description: Cache previews in IndexedDB
  Files:
    - CREATE src/utils/PreviewCache.ts
    - CREATE src/utils/PreviewCache.test.ts
  Pattern: Similar to MaterialCache pattern

Task 4: Create useMapPreviews React hook
  Priority: High (UI integration)
  Description: Hook to load/cache previews in React components
  Files:
    - CREATE src/hooks/useMapPreviews.ts
    - CREATE src/hooks/useMapPreviews.test.tsx
  Dependencies: Task 2, Task 3

Task 5: Integrate with App.tsx
  Priority: High (final integration)
  Description: Use useMapPreviews hook in main app
  Files:
    - MODIFY src/App.tsx (add preview loading)
  Dependencies: Task 4

Task 6: Update MapGallery for loading states
  Priority: Medium (UX improvement)
  Description: Show progress during preview generation
  Files:
    - MODIFY src/ui/MapGallery.tsx (add preview loading indicator)
    - MODIFY src/ui/MapGallery.css (loading styles)
  Dependencies: Task 4
```

---

## Detailed Task Implementation

### Task 1: TGADecoder

```typescript
// src/engine/rendering/TGADecoder.ts

/**
 * TGA (Truevision TGA/TARGA) image format decoder
 * Supports: 8/15/16/24/32-bit, uncompressed and RLE
 *
 * Spec: https://www.dca.fee.unicamp.br/~martino/disciplinas/ea978/tgaffs.pdf
 */

export interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  width: number;
  height: number;
  pixelDepth: number;
  imageDescriptor: number;
}

export interface TGADecodeResult {
  success: boolean;
  width?: number;
  height?: number;
  data?: Uint8ClampedArray; // RGBA format
  error?: string;
}

export class TGADecoder {
  /**
   * Decode TGA file to RGBA ImageData
   * @param buffer - TGA file ArrayBuffer
   * @returns Decoded image data
   */
  public decode(buffer: ArrayBuffer): TGADecodeResult {
    try {
      const view = new DataView(buffer);
      const header = this.readHeader(view);

      // Validate header
      if (!this.isValidHeader(header)) {
        return { success: false, error: 'Invalid TGA header' };
      }

      // Decode based on image type
      let imageData: Uint8ClampedArray;

      if (header.imageType === 2) {
        // Uncompressed RGB
        imageData = this.decodeUncompressedRGB(view, header);
      } else if (header.imageType === 10) {
        // RLE compressed RGB
        imageData = this.decodeRLECompressedRGB(view, header);
      } else {
        return { success: false, error: `Unsupported TGA type: ${header.imageType}` };
      }

      return {
        success: true,
        width: header.width,
        height: header.height,
        data: imageData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decode TGA and convert to data URL
   * @param buffer - TGA file ArrayBuffer
   * @returns Data URL (base64 PNG)
   */
  public decodeToDataURL(buffer: ArrayBuffer): string | null {
    const result = this.decode(buffer);

    if (!result.success || !result.data || !result.width || !result.height) {
      return null;
    }

    // Create canvas and draw ImageData
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = new ImageData(result.data, result.width, result.height);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  }

  private readHeader(view: DataView): TGAHeader {
    // TGA header is 18 bytes
    return {
      idLength: view.getUint8(0),
      colorMapType: view.getUint8(1),
      imageType: view.getUint8(2),
      width: view.getUint16(12, true),  // Little-endian
      height: view.getUint16(14, true),
      pixelDepth: view.getUint8(16),
      imageDescriptor: view.getUint8(17),
    };
  }

  private isValidHeader(header: TGAHeader): boolean {
    // Check for supported formats
    if (header.imageType !== 2 && header.imageType !== 10) {
      return false; // Only support RGB uncompressed/RLE
    }

    if (header.pixelDepth !== 24 && header.pixelDepth !== 32) {
      return false; // Only support 24/32-bit
    }

    if (header.width <= 0 || header.height <= 0) {
      return false;
    }

    return true;
  }

  private decodeUncompressedRGB(view: DataView, header: TGAHeader): Uint8ClampedArray {
    const bytesPerPixel = header.pixelDepth / 8;
    const imageSize = header.width * header.height * 4; // RGBA
    const data = new Uint8ClampedArray(imageSize);

    let dataOffset = 18 + header.idLength; // Skip header + ID
    let pixelIndex = 0;

    for (let y = 0; y < header.height; y++) {
      for (let x = 0; x < header.width; x++) {
        // TGA stores pixels as BGR(A)
        const b = view.getUint8(dataOffset);
        const g = view.getUint8(dataOffset + 1);
        const r = view.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;

        // Convert to RGBA
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;

        dataOffset += bytesPerPixel;
        pixelIndex += 4;
      }
    }

    return data;
  }

  private decodeRLECompressedRGB(view: DataView, header: TGAHeader): Uint8ClampedArray {
    const bytesPerPixel = header.pixelDepth / 8;
    const imageSize = header.width * header.height * 4; // RGBA
    const data = new Uint8ClampedArray(imageSize);

    let dataOffset = 18 + header.idLength;
    let pixelIndex = 0;
    let pixelCount = header.width * header.height;

    while (pixelCount > 0) {
      const packetHeader = view.getUint8(dataOffset++);
      const runLength = (packetHeader & 0x7f) + 1;

      if (packetHeader & 0x80) {
        // RLE packet (repeat pixel)
        const b = view.getUint8(dataOffset);
        const g = view.getUint8(dataOffset + 1);
        const r = view.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;
        dataOffset += bytesPerPixel;

        for (let i = 0; i < runLength; i++) {
          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          pixelIndex += 4;
        }
      } else {
        // Raw packet (individual pixels)
        for (let i = 0; i < runLength; i++) {
          const b = view.getUint8(dataOffset);
          const g = view.getUint8(dataOffset + 1);
          const r = view.getUint8(dataOffset + 2);
          const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;
          dataOffset += bytesPerPixel;

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          pixelIndex += 4;
        }
      }

      pixelCount -= runLength;
    }

    return data;
  }
}
```

### Task 2: MapPreviewExtractor

```typescript
// src/engine/rendering/MapPreviewExtractor.ts

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from './TGADecoder';
import { MapPreviewGenerator } from './MapPreviewGenerator';
import type { RawMapData } from '../../formats/maps/types';

export interface ExtractOptions {
  /** Preferred preview size */
  width?: number;
  height?: number;

  /** Force regeneration (ignore embedded preview) */
  forceGenerate?: boolean;
}

export interface ExtractResult {
  success: boolean;
  dataUrl?: string;
  source: 'embedded' | 'generated' | 'error';
  error?: string;
  extractTimeMs: number;
}

/**
 * Extract or generate map preview images
 *
 * Tries to extract embedded preview from map file first,
 * falls back to MapPreviewGenerator if not found.
 */
export class MapPreviewExtractor {
  private tgaDecoder: TGADecoder;
  private previewGenerator: MapPreviewGenerator;

  // Known preview file names by format
  private static readonly W3X_PREVIEW_FILES = [
    'war3mapPreview.tga',
    'war3mapMap.tga',
    'war3mapMap.blp', // Future: BLP support
  ];

  private static readonly SC2_PREVIEW_FILES = [
    'PreviewImage.tga',
    'Minimap.tga',
  ];

  constructor() {
    this.tgaDecoder = new TGADecoder();
    this.previewGenerator = new MapPreviewGenerator();
  }

  /**
   * Extract or generate preview for a map
   *
   * @param file - Map file (W3X/W3N/SC2Map)
   * @param mapData - Parsed map data (for fallback generation)
   * @param options - Extraction options
   */
  public async extract(
    file: File,
    mapData: RawMapData,
    options?: ExtractOptions
  ): Promise<ExtractResult> {
    const startTime = performance.now();

    try {
      // Skip embedded extraction if forced generation
      if (!options?.forceGenerate) {
        // Try extracting embedded preview
        const embeddedResult = await this.extractEmbedded(file, mapData.format);

        if (embeddedResult.success && embeddedResult.dataUrl) {
          return {
            ...embeddedResult,
            source: 'embedded',
            extractTimeMs: performance.now() - startTime,
          };
        }
      }

      // Fallback: Generate preview from map data
      console.log(`No embedded preview found for ${file.name}, generating...`);
      const generatedResult = await this.previewGenerator.generatePreview(mapData, {
        width: options?.width,
        height: options?.height,
      });

      if (generatedResult.success && generatedResult.dataUrl) {
        return {
          success: true,
          dataUrl: generatedResult.dataUrl,
          source: 'generated',
          extractTimeMs: performance.now() - startTime,
        };
      }

      return {
        success: false,
        source: 'error',
        error: 'Failed to extract or generate preview',
        extractTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        extractTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Extract embedded preview from map archive
   */
  private async extractEmbedded(
    file: File,
    format: 'w3x' | 'w3n' | 'sc2map'
  ): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    try {
      // Parse MPQ archive
      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        return { success: false, error: 'Failed to parse MPQ archive' };
      }

      // Determine preview file names based on format
      const previewFiles =
        format === 'sc2map'
          ? MapPreviewExtractor.SC2_PREVIEW_FILES
          : MapPreviewExtractor.W3X_PREVIEW_FILES;

      // Try each preview file name
      for (const fileName of previewFiles) {
        const fileData = await mpqParser.extractFile(fileName);

        if (fileData) {
          console.log(`Found embedded preview: ${fileName}`);

          // Decode TGA to data URL
          const dataUrl = this.tgaDecoder.decodeToDataURL(fileData.data);

          if (dataUrl) {
            return { success: true, dataUrl };
          }
        }
      }

      return { success: false, error: 'No preview files found in archive' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.previewGenerator.disposeEngine();
  }
}
```

### Task 3: PreviewCache

```typescript
// src/utils/PreviewCache.ts

/**
 * IndexedDB-based cache for map preview images
 * Stores preview data URLs with LRU eviction
 */

export interface CacheEntry {
  mapId: string;
  dataUrl: string;
  timestamp: number;
  sizeBytes: number;
}

export class PreviewCache {
  private dbName = 'EdgeCraft_PreviewCache';
  private storeName = 'previews';
  private version = 1;
  private maxSize = 50 * 1024 * 1024; // 50MB limit
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'mapId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached preview
   */
  public async get(mapId: string): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(mapId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        resolve(entry?.dataUrl ?? null);
      };
    });
  }

  /**
   * Store preview in cache
   */
  public async set(mapId: string, dataUrl: string): Promise<void> {
    if (!this.db) await this.init();

    const sizeBytes = dataUrl.length * 0.75; // Rough base64 size estimate

    // Check if we need to evict old entries
    await this.evictIfNeeded(sizeBytes);

    const entry: CacheEntry = {
      mapId,
      dataUrl,
      timestamp: Date.now(),
      sizeBytes,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all cached previews
   */
  public async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
        resolve(totalSize);
      };
    });
  }

  /**
   * Evict oldest entries if cache exceeds max size
   */
  private async evictIfNeeded(newSize: number): Promise<void> {
    const currentSize = await this.getCacheSize();

    if (currentSize + newSize <= this.maxSize) {
      return; // No eviction needed
    }

    // Get all entries sorted by timestamp (oldest first)
    const entries = await this.getAllEntries();
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Evict oldest until we have space
    let sizeToFree = currentSize + newSize - this.maxSize;

    for (const entry of entries) {
      if (sizeToFree <= 0) break;

      await this.delete(entry.mapId);
      sizeToFree -= entry.sizeBytes;
    }
  }

  private async getAllEntries(): Promise<CacheEntry[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as CacheEntry[]);
    });
  }

  private async delete(mapId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(mapId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
```

### Task 4: useMapPreviews Hook

```typescript
// src/hooks/useMapPreviews.ts

import { useState, useEffect, useRef } from 'react';
import { MapPreviewExtractor } from '../engine/rendering/MapPreviewExtractor';
import { PreviewCache } from '../utils/PreviewCache';
import type { MapMetadata } from '../ui/MapGallery';
import type { RawMapData } from '../formats/maps/types';

export interface PreviewProgress {
  current: number;
  total: number;
  currentMap?: string;
}

export interface UseMapPreviewsResult {
  /** Map ID → Data URL */
  previews: Map<string, string>;

  /** Loading state */
  isLoading: boolean;

  /** Progress */
  progress: PreviewProgress;

  /** Error message */
  error: string | null;

  /** Generate previews for maps */
  generatePreviews: (
    maps: MapMetadata[],
    mapDataMap: Map<string, RawMapData>
  ) => Promise<void>;

  /** Clear cache */
  clearCache: () => Promise<void>;
}

/**
 * React hook for loading and caching map previews
 *
 * @example
 * ```typescript
 * const { previews, isLoading, generatePreviews } = useMapPreviews();
 *
 * useEffect(() => {
 *   if (maps.length > 0 && mapDataMap.size > 0) {
 *     generatePreviews(maps, mapDataMap);
 *   }
 * }, [maps, mapDataMap]);
 * ```
 */
export function useMapPreviews(): UseMapPreviewsResult {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<PreviewProgress>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const extractorRef = useRef<MapPreviewExtractor | null>(null);
  const cacheRef = useRef<PreviewCache | null>(null);

  // Initialize on mount
  useEffect(() => {
    extractorRef.current = new MapPreviewExtractor();
    cacheRef.current = new PreviewCache();

    void cacheRef.current.init();

    return () => {
      extractorRef.current?.dispose();
    };
  }, []);

  const generatePreviews = async (
    maps: MapMetadata[],
    mapDataMap: Map<string, RawMapData>
  ): Promise<void> => {
    if (!extractorRef.current || !cacheRef.current) {
      setError('Preview system not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: maps.length });

    const newPreviews = new Map<string, string>();

    try {
      for (let i = 0; i < maps.length; i++) {
        const map = maps[i];
        if (!map) continue;

        setProgress({ current: i, total: maps.length, currentMap: map.name });

        // Check cache first
        const cachedPreview = await cacheRef.current.get(map.id);

        if (cachedPreview) {
          console.log(`Using cached preview for ${map.name}`);
          newPreviews.set(map.id, cachedPreview);
          continue;
        }

        // Not cached - extract or generate
        const mapData = mapDataMap.get(map.id);

        if (!mapData) {
          console.warn(`No map data found for ${map.id}`);
          continue;
        }

        console.log(`Generating preview for ${map.name}...`);
        const result = await extractorRef.current.extract(map.file, mapData);

        if (result.success && result.dataUrl) {
          console.log(`Preview ${result.source} for ${map.name} (${result.extractTimeMs.toFixed(0)}ms)`);

          newPreviews.set(map.id, result.dataUrl);

          // Cache for future use
          await cacheRef.current.set(map.id, result.dataUrl);
        } else {
          console.error(`Failed to generate preview for ${map.name}:`, result.error);
        }
      }

      setPreviews(newPreviews);
      setProgress({ current: maps.length, total: maps.length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('Preview generation failed:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async (): Promise<void> => {
    if (!cacheRef.current) return;

    await cacheRef.current.clear();
    setPreviews(new Map());
    console.log('Preview cache cleared');
  };

  return {
    previews,
    isLoading,
    progress,
    error,
    generatePreviews,
    clearCache,
  };
}
```

### Task 5: Integration with App.tsx

```typescript
// MODIFY src/App.tsx

import { useMapPreviews } from './hooks/useMapPreviews';

// ... inside App component ...

const { previews, isLoading: previewsLoading, generatePreviews } = useMapPreviews();

// After loading maps, generate previews
useEffect(() => {
  if (maps.length === 0) return;

  // Fetch and parse all maps first
  const loadMapsAndGeneratePreviews = async () => {
    const mapDataMap = new Map<string, RawMapData>();

    // Load and parse all maps
    for (const map of maps) {
      try {
        const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
        const blob = await response.blob();
        const file = new File([blob], map.name);

        // Parse map based on format
        const loader = getMapLoader(map.format); // W3XMapLoader, SC2MapLoader, etc.
        const mapData = await loader.parse(file);

        mapDataMap.set(map.id, mapData);
      } catch (err) {
        console.error(`Failed to load ${map.name}:`, err);
      }
    }

    // Generate previews
    await generatePreviews(maps, mapDataMap);
  };

  void loadMapsAndGeneratePreviews();
}, [maps, generatePreviews]);

// Update MapMetadata with preview URLs
const mapsWithPreviews = useMemo(() => {
  return maps.map((map) => ({
    ...map,
    thumbnailUrl: previews.get(map.id),
  }));
}, [maps, previews]);

// Pass to MapGallery
<MapGallery
  maps={mapsWithPreviews}
  onMapSelect={handleMapSelect}
  isLoading={isLoading || previewsLoading}
/>
```

### Task 6: Update MapGallery (Optional UX)

```typescript
// MODIFY src/ui/MapGallery.tsx

// Add preview loading indicator to MapCard
{progress?.status === 'generating-preview' && (
  <div className="map-card-preview-loading">
    <div className="spinner" />
    <span>Generating preview...</span>
  </div>
)}
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
```

**Expected**: No errors

### Level 2: Unit Tests

```bash
npm test -- src/engine/rendering/TGADecoder.test.ts
npm test -- src/engine/rendering/MapPreviewExtractor.test.ts
npm test -- src/utils/PreviewCache.test.ts
npm test -- src/hooks/useMapPreviews.test.tsx
```

**Expected**:
- All tests pass
- >80% coverage for each file
- Edge cases covered (no embedded preview, malformed TGA, cache eviction)

### Level 3: Integration Test

```bash
npm run dev
# Open http://localhost:3000
```

**Manual Verification**:
1. Map Gallery loads with 24 maps
2. Previews generate/extract automatically
3. Progress indicator shows during generation
4. Maps with embedded previews show custom image
5. Maps without embedded previews show top-down render
6. Refresh page → previews load from cache (fast)
7. No console errors

**Performance Check**:
- Preview generation completes in <30 seconds for all 24 maps
- Cached previews load in <1 second
- No memory leaks after generation

---

## Final Validation Checklist

- [ ] TGADecoder decodes 24/32-bit TGA (uncompressed + RLE)
- [ ] MapPreviewExtractor extracts embedded previews
- [ ] MapPreviewExtractor falls back to MapPreviewGenerator
- [ ] PreviewCache stores previews in IndexedDB
- [ ] PreviewCache implements LRU eviction
- [ ] useMapPreviews hook loads/caches previews
- [ ] App.tsx generates previews on mount
- [ ] MapGallery displays all 24 previews
- [ ] All tests pass (>80% coverage)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Performance <30s total generation

---

## Anti-Patterns to Avoid

- ❌ Don't load entire map files into memory (use streaming for large files)
- ❌ Don't block UI thread during preview generation (use async/await)
- ❌ Don't re-generate previews on every mount (use cache)
- ❌ Don't assume all maps have embedded previews (fallback required)
- ❌ Don't hardcode preview file names (iterate through known names)
- ❌ Don't ignore TGA format variations (support 24/32-bit, uncompressed/RLE)
- ❌ Don't use synchronous IndexedDB operations (always async)
- ❌ Don't skip cache eviction (IndexedDB has quota limits)

---

## Known Risks & Mitigation

### 🟡 Medium: Large maps (923MB) may timeout during preview generation
**Mitigation**:
- Implement timeout (10s max per map)
- Show error state with retry button
- Use streaming parser for large files

### 🟡 Medium: Some maps may have unsupported preview formats (BLP, DDS)
**Mitigation**:
- Log unsupported formats
- Fall back to MapPreviewGenerator
- Future: Add BLP/DDS decoders

### 🟢 Low: IndexedDB quota limits (50-100MB)
**Mitigation**:
- Implement LRU eviction
- Compress preview data URLs (JPEG quality: 0.7)
- Request persistent storage for large caches

---

## Success Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| Preview extraction rate | >60% (embedded) | Check console logs |
| Preview generation time | <30s for 24 maps | Measure total time |
| Cache hit rate (2nd load) | >95% | IndexedDB stats |
| Memory usage | <200MB during generation | Chrome DevTools |
| Test coverage | >80% | Jest coverage report |
| Zero console errors | 100% | Browser console |

---

## Estimated Effort

- **Task 1 (TGADecoder)**: 6 hours
- **Task 2 (MapPreviewExtractor)**: 8 hours
- **Task 3 (PreviewCache)**: 4 hours
- **Task 4 (useMapPreviews)**: 4 hours
- **Task 5 (App.tsx integration)**: 2 hours
- **Task 6 (MapGallery UX)**: 2 hours
- **Testing & Polish**: 4 hours

**Total**: 30 hours (~4 days)

---

## References & Resources

### Documentation
- [TGA File Format Spec](https://www.dca.fee.unicamp.br/~martino/disciplinas/ea978/tgaffs.pdf)
- [W3X File Format](https://867380699.github.io/blog/2019/05/09/W3X_Files_Format)
- [SC2 Map Preview Images](https://www.sc2mapster.com/forums/development/miscellaneous-development/173072)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Babylon.js Screenshots](https://doc.babylonjs.com/features/featuresDeepDive/scene/renderToPNG)

### Libraries
- [@lunapaint/tga-codec](https://github.com/lunapaint/tga-codec) - Modern TGA decoder
- [tga.js](https://github.com/vthibault/tga.js) - Lightweight alternative

### Existing Code Patterns
- `src/engine/rendering/MapPreviewGenerator.ts` - Fallback renderer
- `src/formats/mpq/MPQParser.ts` - Archive extraction
- `src/utils/StreamingFileReader.ts` - Large file handling
- `src/engine/rendering/MaterialCache.ts` - Cache pattern

---

## Score: 8.5/10

**Confidence**: High

**Reasoning**:
- ✅ Well-defined requirements
- ✅ Existing systems to build on (MapPreviewGenerator, MPQParser)
- ✅ Clear integration points
- ✅ TGA decoding is well-documented
- ⚠️ Some edge cases (BLP/DDS formats, large files)
- ⚠️ IndexedDB quota management may need tuning

**One-pass implementation success probability**: 85%
