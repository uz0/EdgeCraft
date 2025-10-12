# Map Preview Test Specification

## 📋 Overview

This document specifies comprehensive unit and integration tests for the Edge Craft map preview system, ensuring all map formats (W3X, W3N, SC2Map) correctly display previews through extraction, generation, or fallback mechanisms.

---

## 🎯 Test Categories

### 1. **Embedded Preview Extraction Tests**
Tests for extracting pre-rendered preview images from map archives

### 2. **Terrain-Based Preview Generation Tests**
Tests for generating previews from map terrain data

### 3. **Format-Specific Rendering Tests**
Tests for format-specific preview rendering logic

### 4. **Fallback & Error Handling Tests**
Tests for graceful degradation when previews cannot be extracted/generated

### 5. **Integration Tests (Per-Map Validation)**
Tests ensuring each map in `/maps` folder has correct preview

---

## 📦 Standard Preview File Formats

### Warcraft III (W3X/W3N)

**File Names (Priority Order):**
1. `war3mapPreview.tga` - Primary preview (256x256 typical)
2. `war3mapMap.tga` - Minimap (map_width*4 × map_height*4)
3. `war3mapMap.blp` - Future: BLP format support

**TGA Specification:**
- Format: 32-bit uncompressed RGB TGA
- Header: 18 bytes
  - ID Length = 0
  - Color Map Type = 0
  - Image Type = 2 (uncompressed RGB)
  - Pixel Depth = 32 (0x20)
  - Image Descriptor = 0x28 (top-left origin, 8-bit alpha)
- Pixel Data: BBGGRRAA (4 bytes per pixel)
- Alpha Channel: Set to 0 (black)

**W3N Campaign Files:**
- May contain multiple maps
- Each map should have its own preview
- Campaign menu screen may have separate preview

### StarCraft II (SC2Map)

**File Names (Priority Order):**
1. `PreviewImage.tga` - Custom preview image
2. `Minimap.tga` - Auto-generated minimap

**TGA Specification:**
- Format: Square 24-bit or 32-bit TGA
- Common sizes: 256×256, 512×512
- Requirements:
  - MUST be square (non-square won't display)
  - Dimensions should be power of 2
  - Uncompressed (compression may not work)
- DDS format also supported as alternative

---

## 🧪 Test Suite 1: Embedded Preview Extraction

### Test: `extractEmbedded() - W3X Format`

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Embedded Extraction (W3X)', () => {
  it('should extract war3mapPreview.tga from W3X map', async () => {
    // Test extraction of primary preview
    // Validate TGA format (32-bit, uncompressed)
    // Verify data URL is valid base64 image
  });

  it('should fallback to war3mapMap.tga if war3mapPreview.tga missing', async () => {
    // Test fallback priority order
  });

  it('should handle maps with no embedded preview files', async () => {
    // Should return { success: false, error: 'No preview files found' }
  });

  it('should validate TGA header format', async () => {
    // Check 18-byte header structure
    // Verify image type = 2 (uncompressed RGB)
    // Verify pixel depth = 32
  });

  it('should decode 32-bit BGRA pixel data correctly', async () => {
    // Test pixel format: BB GG RR AA
    // Verify color channels
  });

  it('should handle corrupted TGA files gracefully', async () => {
    // Invalid header
    // Truncated data
    // Should return error without crashing
  });
});
```

### Test: `extractEmbedded() - SC2Map Format`

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Embedded Extraction (SC2Map)', () => {
  it('should extract PreviewImage.tga from SC2Map', async () => {
    // Test SC2 primary preview extraction
  });

  it('should fallback to Minimap.tga if PreviewImage.tga missing', async () => {
    // Test SC2 fallback priority
  });

  it('should validate square aspect ratio', async () => {
    // SC2 previews MUST be square
    // Should warn or reject non-square images
  });

  it('should handle both 24-bit and 32-bit TGA formats', async () => {
    // Test both pixel depths
  });

  it('should support DDS format as alternative', async () => {
    // Future: Test DDS preview extraction
  });
});
```

### Test: `extractEmbedded() - W3N Campaign Format`

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Embedded Extraction (W3N)', () => {
  it('should extract preview from campaign archive root', async () => {
    // W3N may have campaign-level preview
  });

  it('should extract previews for individual maps in campaign', async () => {
    // Each map within W3N should have preview
  });

  it('should handle multi-map campaigns', async () => {
    // Test campaigns with 5+ maps
  });
});
```

---

## 🧪 Test Suite 2: Terrain-Based Preview Generation

### Test: `generatePreview() - All Formats`

**Test Cases:**
```typescript
describe('MapPreviewGenerator - Terrain Rendering', () => {
  it('should generate preview from heightmap data (W3X)', async () => {
    // Load map terrain data
    // Generate 512×512 preview
    // Verify orthographic top-down camera
  });

  it('should generate preview from heightmap data (SC2)', async () => {
    // SC2 terrain format
  });

  it('should generate preview from heightmap data (W3N)', async () => {
    // W3N terrain format
  });

  it('should use orthographic camera with correct dimensions', async () => {
    // Verify camera mode = ORTHOGRAPHIC_CAMERA
    // Verify camera centered on map
    // Verify ortho bounds = map dimensions
  });

  it('should render terrain with appropriate detail level', async () => {
    // Test subdivision calculation
    // min(64, max(16, width / 8))
  });

  it('should handle various map sizes', async () => {
    // Small: 32×32
    // Medium: 128×128
    // Large: 256×256
    // Huge: 512×512
  });

  it('should complete generation within time limit', async () => {
    // Should complete in < 5 seconds
  });

  it('should optionally include unit markers', async () => {
    // Test with includeUnits: true
    // Verify unit spheres rendered
  });

  it('should use solid color material when textures unavailable', async () => {
    // Test with textures: []
    // Should not crash
  });
});
```

### Test: `generatePreview() - Format-Specific Rendering`

**Test Cases:**
```typescript
describe('MapPreviewGenerator - Format-Specific Rendering', () => {
  // W3X-specific tests
  it('should render W3X terrain with correct tile system', async () => {
    // W3X uses 4×4 tile system
    // Each tile = 128 world units
  });

  it('should apply W3X cliff levels correctly', async () => {
    // Cliff height = 2 levels
    // Should show elevation changes
  });

  it('should render W3X water tiles', async () => {
    // Water should have distinct color
  });

  // SC2-specific tests
  it('should render SC2 terrain with correct height scaling', async () => {
    // SC2 height scaling differs from W3
  });

  it('should handle SC2 destructible doodads', async () => {
    // Rocks, debris, etc.
  });

  // W3N-specific tests
  it('should render W3N campaign maps consistently', async () => {
    // Same rendering as W3X
  });
});
```

---

## 🧪 Test Suite 3: Fallback & Error Handling

### Test: `extract() - Fallback Chain`

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Fallback Chain', () => {
  it('should try embedded extraction first, then generation', async () => {
    // 1. Try extractEmbedded()
    // 2. If fails, try generatePreview()
    // 3. If fails, return error
  });

  it('should skip embedded extraction when forceGenerate=true', async () => {
    // Should go directly to generation
  });

  it('should return source = "embedded" when extracted', async () => {
    // Verify source tracking
  });

  it('should return source = "generated" when generated', async () => {
    // Verify source tracking
  });

  it('should return source = "error" when both fail', async () => {
    // Verify error handling
  });

  it('should handle MPQ parse failures gracefully', async () => {
    // Invalid MPQ archive
    // Should fallback to generation
  });

  it('should handle decompression failures gracefully', async () => {
    // Multi-compression errors
    // Should fallback to generation
  });

  it('should handle WebGL initialization failures', async () => {
    // No WebGL support
    // Should return error with helpful message
  });
});
```

### Test: `extract() - Performance & Timeouts`

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Performance', () => {
  it('should complete extraction within 5 seconds', async () => {
    // Test timeout handling
  });

  it('should handle large map files (> 100MB)', async () => {
    // Memory management
    // Should not crash
  });

  it('should clean up resources after completion', async () => {
    // Dispose Babylon.js engine
    // Release MPQ buffers
  });

  it('should track extraction time accurately', async () => {
    // Verify extractTimeMs / generationTimeMs
  });
});
```

---

## 🧪 Test Suite 4: Integration Tests (Per-Map Validation)

### Test: All Maps in `/maps` Folder

**Maps to Test (24 total):**
```
W3X Maps (14):
- 3P Sentinel 01 v3.06.w3x
- 3P Sentinel 02 v3.06.w3x
- 3P Sentinel 03 v3.07.w3x
- 3P Sentinel 04 v3.05.w3x
- 3P Sentinel 05 v3.02.w3x
- 3P Sentinel 06 v3.03.w3x
- 3P Sentinel 07 v3.02.w3x
- 3pUndeadX01v2.w3x
- EchoIslesAlltherandom.w3x
- Footmen Frenzy 1.9f.w3x
- Legion_TD_11.2c-hf1_TeamOZE.w3x

W3N Campaigns (4):
- BurdenOfUncrowned.w3n
- HorrorsOfNaxxramas.w3n
- JudgementOfTheDead.w3n
- SearchingForPower.w3n

SC2 Maps (2):
- Aliens Binary Mothership.SC2Map
- Ruined Citadel.SC2Map
```

**Test Cases:**
```typescript
describe('Map Preview Integration - All Maps', () => {
  const mapFiles = fs.readdirSync(path.join(__dirname, '../../../maps'))
    .filter(f => f.endsWith('.w3x') || f.endsWith('.w3n') || f.endsWith('.SC2Map'));

  mapFiles.forEach(mapFile => {
    describe(`Map: ${mapFile}`, () => {
      it('should extract OR generate preview successfully', async () => {
        // Load map file
        // Call extractor.extract()
        // Assert: result.success === true
        // Assert: result.dataUrl is valid base64 image
      });

      it('should have valid preview dimensions', async () => {
        // Decode data URL
        // Verify width × height (should be square)
        // Verify size <= 1MB (reasonable limit)
      });

      it('should specify correct source', async () => {
        // Assert: source = "embedded" | "generated"
        // Log which source was used for each map
      });

      it('should complete within reasonable time', async () => {
        // < 10 seconds per map
      });

      it('should cache preview for subsequent loads', async () => {
        // First load: extract/generate
        // Second load: use cache
        // Verify cache hit
      });
    });
  });
});
```

### Test: Preview Quality Validation

**Test Cases:**
```typescript
describe('Map Preview Quality', () => {
  it('should have non-blank preview images', async () => {
    // Verify image is not all black/white
    // Sample pixels, check variance > threshold
  });

  it('should have sufficient color variation', async () => {
    // Calculate histogram
    // Verify multiple colors present
  });

  it('should be visually distinct per map', async () => {
    // Compare previews pairwise
    // Verify difference > threshold (not all identical)
  });

  it('should have appropriate brightness', async () => {
    // Not too dark (avg brightness > 50)
    // Not too bright (avg brightness < 200)
  });
});
```

---

## 🧪 Test Suite 5: Edge Cases & Special Scenarios

### Test: Special Map Configurations

**Test Cases:**
```typescript
describe('MapPreviewExtractor - Edge Cases', () => {
  it('should handle maps with custom preview sizes', async () => {
    // Non-standard dimensions
  });

  it('should handle maps with multiple preview files', async () => {
    // Both war3mapPreview.tga AND war3mapMap.tga
    // Should prefer war3mapPreview.tga
  });

  it('should handle maps with missing terrain data', async () => {
    // Fallback to solid color placeholder
  });

  it('should handle encrypted MPQ archives', async () => {
    // Decrypt before extraction
  });

  it('should handle multi-compression (Huffman + ZLIB + BZip2)', async () => {
    // Test complete decompression pipeline
  });

  it('should handle locale-specific preview files', async () => {
    // e.g., war3mapPreview_enUS.tga
  });

  it('should handle BLP format (future)', async () => {
    // Placeholder for BLP support
  });
});
```

---

## 📊 Coverage Goals

### Unit Test Coverage
- **MapPreviewExtractor**: 100%
- **MapPreviewGenerator**: 100%
- **TGADecoder**: 100%
- **Format-specific loaders**: 100%

### Integration Test Coverage
- **All maps in `/maps` folder**: 24/24 (100%)
- **Each preview combination**: 3/3 (embedded, generated, error)

### Performance Benchmarks
- **Extraction time**: < 5 seconds per map
- **Generation time**: < 10 seconds per map
- **Memory usage**: < 500MB peak
- **No memory leaks**: Must pass 1-hour stress test

---

## 🚀 Implementation Priority

1. ✅ **Phase 1: Core Extraction Tests** (HIGH)
   - Test TGA decoding
   - Test MPQ extraction
   - Test format detection

2. ✅ **Phase 2: Generation Tests** (HIGH)
   - Test terrain rendering
   - Test Babylon.js integration
   - Test screenshot capture

3. ✅ **Phase 3: Integration Tests** (MEDIUM)
   - Test all 24 maps
   - Validate cache system
   - Performance profiling

4. ⏳ **Phase 4: Edge Case Tests** (LOW)
   - Special configurations
   - Error scenarios
   - Stress testing

---

## 📝 Test Execution Commands

```bash
# Run all preview tests
npm test -- --testPathPattern=MapPreview

# Run extraction tests only
npm test -- MapPreviewExtractor

# Run generation tests only
npm test -- MapPreviewGenerator

# Run integration tests (all maps)
npm test -- MapPreviewIntegration

# Run with coverage report
npm test -- --coverage --testPathPattern=MapPreview

# Run performance benchmarks
npm run test:bench -- map-preview
```

---

## ✅ Success Criteria

A complete test suite must:
1. ✅ Test all 3 preview sources (embedded, generated, error)
2. ✅ Test all 3 map formats (W3X, W3N, SC2Map)
3. ✅ Validate all 24 maps in `/maps` folder
4. ✅ Achieve >80% code coverage
5. ✅ Pass all tests in CI/CD pipeline
6. ✅ Complete within reasonable time (< 5 minutes total)

---

## 📚 References

- [W3X File Format Specification](https://867380699.github.io/blog/2019/05/09/W3X_Files_Format)
- [SC2 Map Properties](https://sc2mapster.fandom.com/wiki/Map_Properties)
- [TGA Format Specification](https://en.wikipedia.org/wiki/Truevision_TGA)
- Edge Craft Codebase: `src/engine/rendering/MapPreview*`
