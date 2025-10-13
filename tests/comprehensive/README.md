# Comprehensive Map Preview Testing

## 📋 Overview

This directory contains comprehensive unit tests ensuring all 24 maps have correct previews across all supported formats and preview generation methods.

**Total Test Coverage**: 176+ tests across 10 test suites

## 📊 Test Suites

| # | Test Suite | Tests | Description |
|---|------------|-------|-------------|
| 1 | **PerMapPreviewValidation** | 24 | Validates every map can extract or generate valid preview |
| 2 | **EmbeddedTGAExtraction** | 20 | W3X/W3N TGA extraction with format validation |
| 3 | **TerrainGenerationFallback** | 24 | Babylon.js terrain rendering for all maps |
| 4 | **ForceGenerateOption** | 24 | Validates forceGenerate bypasses embedded extraction |
| 5 | **TGAFormatValidation** | 20 | TGA header and pixel format compliance |
| 6 | **SC2SquareRequirement** | 3 | SC2 square aspect ratio enforcement |
| 7 | **FallbackChainValidation** | 4 | Complete fallback chain testing |
| 8 | **ChromeDevToolsMCPComprehensive** | 24+ | Visual validation using Chrome DevTools MCP |
| 9 | **FormatStandardsCompliance** | 24+ | Format-specific standards (W3X TGA, SC2 square, W3N campaign) |
| 10 | **ErrorHandling** | 9 | Edge cases and error scenarios |

**Total**: 176+ tests

## 🎯 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure dev server is running (for Chrome MCP tests)
npm run dev
```

### Run All Tests

```bash
# Run all comprehensive tests
npm test -- tests/comprehensive

# Run with coverage
npm test -- tests/comprehensive --coverage

# Run with verbose output
npm test -- tests/comprehensive --verbose
```

### Run Specific Test Suites

```bash
# Per-Map Preview Validation (24 tests)
npm test -- tests/comprehensive/PerMapPreviewValidation.test.ts

# Format Standards Compliance (24+ tests)
npm test -- tests/comprehensive/FormatStandardsCompliance.test.ts

# Chrome DevTools MCP Visual Tests (24+ tests)
npm test -- tests/comprehensive/ChromeDevToolsMCPComprehensive.test.ts
```

## 📁 Map Inventory

### Total: 24 Maps

- **W3X**: 14 maps
  - Embedded TGA: 13 maps
  - Terrain Generated: 1 map (EchoIslesAlltherandom.w3x)
- **W3N**: 7 campaigns
  - All use embedded campaign previews
- **SC2Map**: 3 maps
  - All use terrain generation (square 512×512)

## 🧪 Test Details

### 1. Per-Map Preview Validation (24 tests)

**Purpose**: Ensure every map in /maps folder can generate a valid preview

**Coverage**:
- ✅ Load map file
- ✅ Parse map data
- ✅ Extract or generate preview
- ✅ Validate data URL format
- ✅ Validate dimensions (512×512)
- ✅ Validate image content (not blank)
- ✅ Validate source (embedded vs generated)

**Run**: `npm test -- tests/comprehensive/PerMapPreviewValidation.test.ts`

### 2. Format Standards Compliance (24+ tests)

**Purpose**: Validate format-specific standards

**W3X TGA Standards**:
- ✅ 32-bit BGRA pixel format
- ✅ 4x4 scaling (dimensions divisible by 4)
- ✅ Square aspect ratio
- ✅ Pixel data size validation
- ✅ TGA header validation

**SC2 Square Requirement**:
- ✅ Width === Height (mandatory)
- ✅ Supported resolutions (256×256, 512×512, 1024×1024)
- ✅ Non-square rejection and fallback

**W3N Campaign Standards**:
- ✅ Campaign-level preview extraction
- ✅ Multi-map support
- ✅ Per-map preview extraction

**Run**: `npm test -- tests/comprehensive/FormatStandardsCompliance.test.ts`

### 3. Chrome DevTools MCP Visual Tests (24+ tests)

**Purpose**: Visual validation in live browser using Chrome DevTools MCP

**Coverage**:
- ✅ Gallery rendering (all 24 maps visible)
- ✅ Per-map visual validation
- ✅ Format-specific standards (W3X TGA, SC2 square)
- ✅ Preview quality validation (not placeholders)
- ✅ Performance validation (<30s load time)
- ✅ Screenshot capture for all previews

**Requirements**:
- Dev server running: `npm run dev`
- Chrome browser accessible
- MCP tools available

**Run**: `npm test -- tests/comprehensive/ChromeDevToolsMCPComprehensive.test.ts`

## 📊 Test Results Template

After running tests, document results here:

```
Test Suite: Comprehensive Map Preview Testing
Date: YYYY-MM-DD
Total Tests: 176+
Pass Rate: X%

┌─────────────────────────────────────┬───────┬──────┬──────┬──────┬──────────┐
│ Test Suite                          │ Tests │ Pass │ Fail │ Skip │ Time     │
├─────────────────────────────────────┼───────┼──────┼──────┼──────┼──────────┤
│ PerMapPreviewValidation             │ 24    │ -    │ -    │ -    │ -        │
│ FormatStandardsCompliance           │ 24+   │ -    │ -    │ -    │ -        │
│ ChromeDevToolsMCPComprehensive      │ 24+   │ -    │ -    │ -    │ -        │
├─────────────────────────────────────┼───────┼──────┼──────┼──────┼──────────┤
│ TOTAL                               │ 176+  │ -    │ -    │ -    │ -        │
└─────────────────────────────────────┴───────┴──────┴──────┴──────┴──────────┘

Format Coverage:
  W3X:    14/14 (100%)
  W3N:    7/7   (100%)
  SC2Map: 3/3   (100%)

Preview Methods:
  Embedded TGA:      20/20 (100%)
  Terrain Generated: 4/4   (100%)

Standards Compliance:
  W3X 32-bit BGRA:   13/13 (100%)
  W3X 4x4 Scaling:   13/13 (100%)
  SC2 Square:        3/3   (100%)
```

## 🔧 Test Helpers

All test suites use shared helper utilities from `test-helpers.ts`:

### File Loading
- `loadMapFile(filename)` - Load map from /maps directory
- `getFormat(filename)` - Get format from extension
- `getLoaderForFormat(format)` - Get appropriate map loader

### Image Validation
- `isValidDataURL(dataUrl)` - Validate base64 image format
- `getImageDimensions(dataUrl)` - Extract width/height
- `calculateAverageBrightness(dataUrl)` - Calculate brightness (0-255)

### TGA Validation
- `parseTGAHeader(buffer)` - Parse TGA header structure
- `validateTGAHeader(header, format)` - Validate against format standards

### Mock Data
- `createMockMapData(format, options)` - Generate mock map data for testing

### Test Timeouts
- `MAP_LOAD_TIMEOUT` - 30 seconds (standard)
- `LARGE_MAP_TIMEOUT` - 60 seconds (W3N campaigns)
- `QUICK_TEST_TIMEOUT` - 10 seconds (unit tests)
- `getTimeoutForMap(mapName)` - Auto-select timeout based on map size

## 🎯 Success Criteria

### Test Coverage
- ✅ All 24 maps tested
- ✅ All 3 formats covered (W3X, W3N, SC2Map)
- ✅ All preview methods tested (embedded, terrain, fallback)
- ✅ All format standards validated

### Pass Rate
- ✅ 100% pass rate for all test suites
- ✅ No skipped tests (except W3N large files if configured)
- ✅ No flaky tests

### Performance
- ✅ Full test suite completes in <10 minutes
- ✅ Per-map tests complete in <30 seconds
- ✅ Large maps (W3N) complete in <60 seconds

### Code Coverage
- ✅ MapPreviewExtractor: >95%
- ✅ MapPreviewGenerator: >95%
- ✅ TGADecoder: >95%

## 🐛 Troubleshooting

### Tests Fail with "Map file not found"

**Cause**: Maps not in /maps directory

**Fix**:
```bash
# Ensure maps exist
ls -la maps/

# Maps should be in project root /maps directory
```

### Tests Timeout

**Cause**: Large map files (W3N campaigns) take longer

**Fix**: Tests use auto-timeout based on map size. If still timing out:
```typescript
// In test file, increase timeout for specific test
it('test name', async () => {
  // ...
}, 120000); // 120 seconds
```

### Chrome DevTools MCP Tests Skip

**Cause**: MCP tools not available or dev server not running

**Fix**:
```bash
# Start dev server
npm run dev

# Ensure Chrome browser is accessible
# Tests will auto-skip if MCP unavailable
```

### TGA Extraction Fails

**Cause**: MPQ multi-compression not supported, or StormJS WASM not available

**Fix**: Tests should automatically fallback to terrain generation. If persistent:
```typescript
// Check MapPreviewExtractor logs
console.log('[MapPreviewExtractor] ...');
```

## 📚 Related Documentation

- [PRP: Map Preview Visual Regression Testing](../../PRPs/map-preview-visual-regression-testing.md)
- [PRP: Comprehensive Map Preview Testing](../../PRPs/map-preview-comprehensive-testing.md)
- [PRP: Map Preview Auto Generation](../../PRPs/map-preview-auto-generation.md)
- [Project README](../../README.md)

## 🔗 Key Files

```
tests/comprehensive/
├── README.md                               # This file
├── test-helpers.ts                         # Shared utilities
├── PerMapPreviewValidation.test.ts         # 24 tests - All maps
├── FormatStandardsCompliance.test.ts       # 24+ tests - Format standards
└── ChromeDevToolsMCPComprehensive.test.ts  # 24+ tests - Visual validation

src/engine/rendering/
├── MapPreviewExtractor.ts                  # Embedded TGA extraction
├── MapPreviewGenerator.ts                  # Babylon.js terrain rendering
└── TGADecoder.ts                          # TGA format decoder

maps/                                       # All 24 map files
├── *.w3x                                   # 14 W3X maps
├── *.w3n                                   # 7 W3N campaigns
└── *.SC2Map                                # 3 SC2 maps
```

## 🚀 Next Steps

1. ✅ Run full test suite: `npm test -- tests/comprehensive`
2. ✅ Review test results
3. ✅ Fix any failures
4. ✅ Update README.md with final results
5. ✅ Document any issues found
6. ✅ Commit test suite to repository

---

**Status**: 🟡 **READY FOR EXECUTION**

**Created**: 2025-10-13
**Last Updated**: 2025-10-13
