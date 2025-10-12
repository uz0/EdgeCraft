# PRP: Map Preview Visual Regression Testing

**Feature**: Visual regression testing for map preview rendering across all supported formats (SC2, W3X, W3N)

**Goal**: Implement pixel-by-pixel image comparison tests to detect visual regressions in preview generation, covering both embedded preview extraction and Babylon.js terrain rendering.

**Status**: 📋 Planned

---

## All Needed Context

### Documentation & References

**jest-image-snapshot** (Primary Testing Library)
- **URL**: https://github.com/americanexpress/jest-image-snapshot
- **Why**: Industry-standard visual regression library using pixelmatch for pixel-by-pixel comparison
- **Key Features**:
  - Auto-manages baseline images in `__image_snapshots__/` directory
  - Provides `toMatchImageSnapshot()` Jest matcher
  - Configurable pixel difference thresholds
  - Generates diff images on failure
- **Installation**: `npm install --save-dev jest-image-snapshot @types/jest-image-snapshot`
- **Usage Pattern**:
  ```typescript
  expect(imageBuffer).toMatchImageSnapshot({
    failureThreshold: 0.01, // 1% pixel difference tolerance
    failureThresholdType: 'percent',
  });
  ```

**Babylon.js Offscreen Rendering**
- **URL**: https://doc.babylonjs.com/features/featuresDeepDive/scene/fastBuildWorld#screenshot
- **Why**: MapPreviewGenerator uses Babylon.js to render terrain to 512x512 canvas
- **Key Requirement**: `preserveDrawingBuffer: true` in engine config for screenshots
- **Current Implementation**: Already configured correctly in MapPreviewGenerator.ts:40

### Codebase Patterns

**src/engine/rendering/MapPreviewGenerator.ts** (lines 1-100)
- **Pattern**: Babylon.js scene setup with offscreen canvas
- **Key Logic**:
  ```typescript
  const targetCanvas = canvas ?? document.createElement('canvas');
  targetCanvas.width = 512;
  targetCanvas.height = 512;

  this.engine = new BABYLON.Engine(targetCanvas, false, {
    preserveDrawingBuffer: true, // Required for screenshots
    powerPreference: 'high-performance',
  });
  ```
- **Output**: Returns base64 data URL: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...`

**src/engine/rendering/MapPreviewExtractor.ts** (lines 30-110)
- **Pattern**: Two-stage extraction (embedded → generated fallback)
- **Embedded Preview Files**:
  - SC2: `PreviewImage.tga`, `Minimap.tga`
  - W3X: `war3mapPreview.tga`, `war3mapMap.tga`, `war3mapMap.blp`
- **Key Logic**:
  ```typescript
  public async extract(file: File, mapData: RawMapData, options?: ExtractOptions): Promise<ExtractResult> {
    // Try embedded extraction first
    if (!options?.forceGenerate) {
      const embeddedResult = await this.extractEmbedded(file, mapData.format);
      if (embeddedResult.success && embeddedResult.dataUrl) {
        return { ...embeddedResult, source: 'embedded' };
      }
    }

    // Fallback to generation
    const generatedResult = await this.previewGenerator.generatePreview(mapData);
    return { ...generatedResult, source: 'generated' };
  }
  ```

**src/engine/rendering/__tests__/MapPreviewGenerator.test.ts** (Existing Test Patterns)
- **Pattern**: `describeIfWebGL` skip pattern for headless environments
- **Pattern**: Mock map data creation with heightmap
- **Pattern**: Test timeout 10000ms for rendering tests
- **Pattern**: Data URL validation: `expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/)`
- **Key Example**:
  ```typescript
  const describeIfWebGL =
    typeof window !== 'undefined' && window.WebGLRenderingContext != null
      ? describe
      : describe.skip;

  const createMockMapData = (width: number = 64, height: number = 64): RawMapData => {
    const size = width * height;
    const heightmap = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      heightmap[i] = Math.random() * 10;
    }
    return {
      format: 'w3x',
      info: { name: 'Test Map', /* ... */ },
      terrain: { width, height, heightmap, textures: [] },
      units: [],
      doodads: [],
    };
  };
  ```

**jest.config.js** (Test Configuration)
- **Pattern**: jsdom test environment
- **Pattern**: ts-jest preset
- **Pattern**: Transform Babylon.js modules
- **Pattern**: 10000ms default timeout
- **Current Config**:
  ```javascript
  export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transformIgnorePatterns: ['node_modules/(?!@babylonjs)'],
    testTimeout: 10000,
  };
  ```

### Available Test Maps

**maps/ directory** (Real test fixtures)
- **SC2 Maps** (fully supported, LZMA compression):
  - `Aliens Binary Mothership.SC2Map` (3.3M) - Has embedded PreviewImage.tga
  - `Ruined Citadel.SC2Map` (800K)
  - `TheUnitTester7.SC2Map` (879K)
- **W3X Maps** (multi-compression NOT supported):
  - `EchoIslesAlltherandom.w3x` (109K) - ✅ **BEST for automated tests** (small, fast)
  - `ragingstream.w3x` (200K)
  - `Footmen Frenzy 1.9f.w3x` (221K)
  - 11 larger maps (1.5M - 27M)
- **W3N Campaigns** (too large for automation):
  - 7 files ranging 320MB - 923MB
  - ⚠️ Skip in automated tests, document as manual test case

### Known Limitations

**W3X Multi-Compression Not Supported**
- **Issue**: W3X maps use compression format 0x15 (Huffman + BZip2 multi-stage)
- **Impact**: Cannot extract embedded previews from W3X maps
- **Workaround**: Test W3X generated previews only, skip embedded extraction tests
- **Future**: When multi-compression is implemented, add embedded W3X tests

**W3N File Size**
- **Issue**: Campaign files are 320MB - 923MB (too large for fast automated tests)
- **Impact**: Would significantly slow CI/CD pipeline
- **Workaround**: Document W3N test structure, but skip in automation
- **Future**: Add W3N tests when performance optimization is available

---

## Implementation Blueprint

### Task 1: Install Visual Regression Dependencies

**EXECUTE**:
```bash
npm install --save-dev jest-image-snapshot @types/jest-image-snapshot
```

**VERIFY**:
```bash
npm list jest-image-snapshot @types/jest-image-snapshot
```

**Expected Output**:
```
├── jest-image-snapshot@6.x.x
└── @types/jest-image-snapshot@6.x.x
```

---

### Task 2: Configure Jest for Image Snapshot Testing

**CREATE** `jest.setup.ts`:
```typescript
/**
 * Jest setup file for visual regression testing
 */
import { toMatchImageSnapshot } from 'jest-image-snapshot';

// Extend Jest matchers with image snapshot functionality
expect.extend({ toMatchImageSnapshot });

// Configure global image snapshot options
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(options?: {
        failureThreshold?: number;
        failureThresholdType?: 'pixel' | 'percent';
        customDiffDir?: string;
        customSnapshotsDir?: string;
        customSnapshotIdentifier?: string;
      }): R;
    }
  }
}
```

**MODIFY** `jest.config.js`:
```javascript
// FIND:
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['node_modules/(?!@babylonjs)'],
  testTimeout: 10000,
};

// REPLACE WITH:
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['node_modules/(?!@babylonjs)'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // ADD THIS LINE
};
```

**VERIFY**:
```bash
npm test -- --listTests | grep jest.setup.ts
```

---

### Task 3: Create Visual Regression Test Directory Structure

**CREATE** directory structure:
```bash
mkdir -p src/engine/rendering/__tests__/visual-regression/fixtures/{sc2,w3x,w3n}
```

**Expected Structure**:
```
src/engine/rendering/__tests__/
├── MapPreviewGenerator.test.ts           (existing unit tests)
├── visual-regression/
│   ├── sc2-previews.visual.test.ts       (NEW)
│   ├── w3x-previews.visual.test.ts       (NEW)
│   ├── w3n-previews.visual.test.ts       (NEW - placeholder)
│   ├── __image_snapshots__/              (auto-generated by jest-image-snapshot)
│   │   ├── sc2-previews-visual-test-ts-sc-2-previews-embedded-extraction-1-snap.png
│   │   ├── sc2-previews-visual-test-ts-sc-2-previews-generated-fallback-1-snap.png
│   │   └── w3x-previews-visual-test-ts-w3x-previews-generated-terrain-1-snap.png
│   └── fixtures/                         (symlinks to real map files)
│       ├── sc2/ → /maps/
│       └── w3x/ → /maps/
```

**CREATE** symlinks to test maps:
```bash
cd src/engine/rendering/__tests__/visual-regression/fixtures
ln -s ../../../../../../../maps sc2
ln -s ../../../../../../../maps w3x
ln -s ../../../../../../../maps w3n
```

---

### Task 4: Implement SC2 Visual Regression Tests

**CREATE** `src/engine/rendering/__tests__/visual-regression/sc2-previews.visual.test.ts`:

```typescript
/**
 * Visual regression tests for SC2 map preview rendering
 * Tests both embedded preview extraction and Babylon.js terrain generation
 */

import { MapPreviewExtractor } from '../../MapPreviewExtractor';
import type { RawMapData } from '../../../../formats/maps/types';

// Skip tests if WebGL is not available (headless CI)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null
    ? describe
    : describe.skip;

/**
 * Convert base64 data URL to image buffer for jest-image-snapshot
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Load real SC2 map file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/sc2/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
}

describeIfWebGL('SC2 Previews', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  describe('Embedded Preview Extraction', () => {
    it('should extract PreviewImage.tga from SC2 map', async () => {
      // Arrange
      const file = await loadTestMap('Aliens Binary Mothership.SC2Map');
      const mockMapData: RawMapData = {
        format: 'sc2',
        info: { name: 'Test Map', description: '', author: '', players: 2 },
        terrain: { width: 256, height: 256, heightmap: new Float32Array(256 * 256), textures: [] },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(result.dataUrl).toBeDefined();

      // Visual regression check
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01, // 1% pixel difference tolerance
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-embedded-preview',
      });
    }, 20000); // 20s timeout for file loading + extraction
  });

  describe('Generated Fallback', () => {
    it('should generate preview when forceGenerate is true', async () => {
      // Arrange
      const file = await loadTestMap('Aliens Binary Mothership.SC2Map');
      const mockMapData: RawMapData = {
        format: 'sc2',
        info: { name: 'Test Map', description: '', author: '', players: 2 },
        terrain: {
          width: 128,
          height: 128,
          heightmap: new Float32Array(128 * 128).map(() => Math.random() * 10),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(result.dataUrl).toBeDefined();

      // Visual regression check
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-generated-preview',
      });
    }, 20000);
  });

  describe('Terrain Rendering Variations', () => {
    it('should render consistent preview for 64x64 terrain', async () => {
      // Arrange
      const file = await loadTestMap('Ruined Citadel.SC2Map');
      const mockMapData: RawMapData = {
        format: 'sc2',
        info: { name: 'Small Map', description: '', author: '', players: 2 },
        terrain: {
          width: 64,
          height: 64,
          heightmap: new Float32Array(64 * 64).map((_, i) => Math.sin(i / 10) * 5),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-64x64-terrain',
      });
    }, 20000);

    it('should render consistent preview for 256x256 terrain', async () => {
      // Arrange
      const file = await loadTestMap('TheUnitTester7.SC2Map');
      const mockMapData: RawMapData = {
        format: 'sc2',
        info: { name: 'Large Map', description: '', author: '', players: 4 },
        terrain: {
          width: 256,
          height: 256,
          heightmap: new Float32Array(256 * 256).map((_, i) => Math.cos(i / 50) * 10),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-256x256-terrain',
      });
    }, 20000);
  });
});
```

---

### Task 5: Implement W3X Visual Regression Tests

**CREATE** `src/engine/rendering/__tests__/visual-regression/w3x-previews.visual.test.ts`:

```typescript
/**
 * Visual regression tests for W3X map preview rendering
 *
 * NOTE: W3X maps use multi-compression (0x15 = Huffman + BZip2) which is NOT yet supported.
 * These tests focus on GENERATED previews only (terrain rendering via Babylon.js).
 * When multi-compression is implemented, add embedded extraction tests.
 */

import { MapPreviewExtractor } from '../../MapPreviewExtractor';
import type { RawMapData } from '../../../../formats/maps/types';

// Skip tests if WebGL is not available (headless CI)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null
    ? describe
    : describe.skip;

/**
 * Convert base64 data URL to image buffer for jest-image-snapshot
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Load real W3X map file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/w3x/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
}

describeIfWebGL('W3X Previews', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  describe('Generated Terrain Previews', () => {
    it('should generate preview for small W3X map (EchoIsles)', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: { name: 'Echo Isles', description: '', author: 'Blizzard', players: 4 },
        terrain: {
          width: 128,
          height: 128,
          heightmap: new Float32Array(128 * 128).map(() => Math.random() * 15),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(result.dataUrl).toBeDefined();

      // Visual regression check
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-echo-isles-generated',
      });
    }, 20000);

    it('should generate preview for medium W3X map (Raging Stream)', async () => {
      // Arrange
      const file = await loadTestMap('ragingstream.w3x');
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: { name: 'Raging Stream', description: '', author: '', players: 2 },
        terrain: {
          width: 96,
          height: 96,
          heightmap: new Float32Array(96 * 96).map((_, i) => Math.sin(i / 20) * 8),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-raging-stream-generated',
      });
    }, 20000);
  });

  describe('Terrain Variations', () => {
    it('should render flat terrain consistently', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: { name: 'Flat Test', description: '', author: '', players: 2 },
        terrain: {
          width: 64,
          height: 64,
          heightmap: new Float32Array(64 * 64).fill(5.0), // Completely flat
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-flat-terrain',
      });
    }, 20000);

    it('should render hilly terrain consistently', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: { name: 'Hilly Test', description: '', author: '', players: 2 },
        terrain: {
          width: 64,
          height: 64,
          heightmap: new Float32Array(64 * 64).map((_, i) => {
            const x = i % 64;
            const y = Math.floor(i / 64);
            return Math.sin(x / 5) * 10 + Math.cos(y / 5) * 10;
          }),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-hilly-terrain',
      });
    }, 20000);
  });

  describe.skip('Embedded Preview Extraction (NOT IMPLEMENTED)', () => {
    it('should extract war3mapPreview.tga when multi-compression is supported', async () => {
      // TODO: Implement when W3X multi-compression (0x15) is supported
      // Expected to extract: war3mapPreview.tga, war3mapMap.tga, or war3mapMap.blp
      // Visual regression check against embedded preview baseline
    });
  });
});
```

---

### Task 6: Create W3N Placeholder Test (Manual Testing Only)

**CREATE** `src/engine/rendering/__tests__/visual-regression/w3n-previews.visual.test.ts`:

```typescript
/**
 * Visual regression tests for W3N campaign preview rendering
 *
 * ⚠️ SKIPPED IN AUTOMATED TESTS ⚠️
 * W3N files are 320MB-923MB, too large for fast CI/CD pipeline.
 *
 * For manual testing:
 * 1. Temporarily enable these tests by removing describe.skip
 * 2. Run: npm test -- w3n-previews.visual.test.ts --updateSnapshot
 * 3. Verify baselines manually
 * 4. Re-skip these tests
 */

import { MapPreviewExtractor } from '../../MapPreviewExtractor';
import type { RawMapData } from '../../../../formats/maps/types';

// Always skip W3N tests in automation
const describeSkip = describe.skip;

/**
 * Convert base64 data URL to image buffer for jest-image-snapshot
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Load real W3N campaign file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/w3n/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
}

describeSkip('W3N Previews (Manual Testing Only)', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  it('should generate preview for W3N campaign', async () => {
    // Arrange
    const file = await loadTestMap('SearchingForPower.w3n');
    const mockMapData: RawMapData = {
      format: 'w3n',
      info: { name: 'Searching For Power', description: '', author: '', players: 1 },
      terrain: {
        width: 256,
        height: 256,
        heightmap: new Float32Array(256 * 256).map(() => Math.random() * 20),
        textures: [],
      },
      units: [],
      doodads: [],
    };

    // Act
    const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

    // Assert
    expect(result.success).toBe(true);
    const imageBuffer = dataUrlToBuffer(result.dataUrl!);
    expect(imageBuffer).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
      customSnapshotIdentifier: 'w3n-campaign-preview',
    });
  }, 60000); // 60s timeout for large file
});
```

---

### Task 7: Generate Initial Baseline Snapshots

**EXECUTE** (first run to create baselines):
```bash
npm test -- visual-regression --updateSnapshot
```

**Expected Output**:
```
PASS src/engine/rendering/__tests__/visual-regression/sc2-previews.visual.test.ts
  SC2 Previews
    Embedded Preview Extraction
      ✓ should extract PreviewImage.tga from SC2 map (5234ms)
    Generated Fallback
      ✓ should generate preview when forceGenerate is true (3456ms)
    Terrain Rendering Variations
      ✓ should render consistent preview for 64x64 terrain (2345ms)
      ✓ should render consistent preview for 256x256 terrain (4567ms)

PASS src/engine/rendering/__tests__/visual-regression/w3x-previews.visual.test.ts
  W3X Previews
    Generated Terrain Previews
      ✓ should generate preview for small W3X map (EchoIsles) (3123ms)
      ✓ should generate preview for medium W3X map (Raging Stream) (3456ms)
    Terrain Variations
      ✓ should render flat terrain consistently (2234ms)
      ✓ should render hilly terrain consistently (2345ms)

Snapshot Summary
 › 8 snapshots written
```

**VERIFY** baselines created:
```bash
ls -la src/engine/rendering/__tests__/visual-regression/__image_snapshots__/
```

**Expected Files**:
```
sc2-previews-visual-test-ts-sc-2-previews-embedded-preview-extraction-should-extract-preview-image-tga-from-sc-2-map-1-snap.png
sc2-previews-visual-test-ts-sc-2-previews-generated-fallback-should-generate-preview-when-force-generate-is-true-1-snap.png
sc2-previews-visual-test-ts-sc-2-previews-terrain-rendering-variations-should-render-consistent-preview-for-64-x-64-terrain-1-snap.png
sc2-previews-visual-test-ts-sc-2-previews-terrain-rendering-variations-should-render-consistent-preview-for-256-x-256-terrain-1-snap.png
w3x-previews-visual-test-ts-w3x-previews-generated-terrain-previews-should-generate-preview-for-small-w3-x-map-echo-isles-1-snap.png
w3x-previews-visual-test-ts-w3x-previews-generated-terrain-previews-should-generate-preview-for-medium-w3-x-map-raging-stream-1-snap.png
w3x-previews-visual-test-ts-w3x-previews-terrain-variations-should-render-flat-terrain-consistently-1-snap.png
w3x-previews-visual-test-ts-w3x-previews-terrain-variations-should-render-hilly-terrain-consistently-1-snap.png
```

**COMMIT** baselines to git:
```bash
git add src/engine/rendering/__tests__/visual-regression/__image_snapshots__/
git commit -m "Add baseline snapshots for map preview visual regression tests"
```

---

### Task 8: Verify Visual Regression Detection

**TEST**: Intentionally introduce regression to verify detection works

**MODIFY** `src/engine/rendering/TerrainRenderer.ts` temporarily:
```typescript
// FIND (line 101):
this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);

// REPLACE WITH (intentional regression):
this.material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0); // RED instead of green
```

**EXECUTE** tests (should fail):
```bash
npm test -- visual-regression
```

**Expected Output**:
```
FAIL src/engine/rendering/__tests__/visual-regression/w3x-previews.visual.test.ts
  W3X Previews
    Terrain Variations
      ✕ should render flat terrain consistently (2234ms)

  ● W3X Previews › Terrain Variations › should render flat terrain consistently

    Expected image to match snapshot, but received 23.45% pixel difference.

    See diff for details:
      __image_snapshots__/__diff_output__/w3x-previews-visual-test-ts-w3x-previews-terrain-variations-should-render-flat-terrain-consistently-1-diff.png
```

**REVERT** change:
```typescript
// RESTORE (line 101):
this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
```

**EXECUTE** tests (should pass):
```bash
npm test -- visual-regression
```

**Expected Output**:
```
PASS src/engine/rendering/__tests__/visual-regression/w3x-previews.visual.test.ts
  ✓ All snapshots match baselines
```

---

## Validation Loop

### Level 1: Dependencies Installed

**CHECK**:
```bash
npm list jest-image-snapshot @types/jest-image-snapshot
```

**Expected Output**:
```
edgecraft@1.0.0 /path/to/edgecraft
├── jest-image-snapshot@6.x.x
└── @types/jest-image-snapshot@6.x.x
```

**FAIL Condition**: Missing packages
**FIX**: Re-run `npm install --save-dev jest-image-snapshot @types/jest-image-snapshot`

---

### Level 2: Jest Configuration Valid

**CHECK**:
```bash
cat jest.config.js | grep setupFilesAfterEnv
cat jest.setup.ts | grep toMatchImageSnapshot
```

**Expected Output**:
```
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
expect.extend({ toMatchImageSnapshot });
```

**FAIL Condition**: Configuration missing
**FIX**: Add `setupFilesAfterEnv` to jest.config.js and verify jest.setup.ts exists

---

### Level 3: Baseline Snapshots Generated

**CHECK**:
```bash
ls -la src/engine/rendering/__tests__/visual-regression/__image_snapshots__/ | wc -l
```

**Expected Output**: `8` (or more) PNG files

**FAIL Condition**: No snapshot files
**FIX**: Run `npm test -- visual-regression --updateSnapshot`

---

### Level 4: Visual Tests Pass

**EXECUTE**:
```bash
npm test -- visual-regression
```

**Expected Output**:
```
Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Snapshots:   8 passed, 8 total
Time:        ~30s
```

**FAIL Condition**: Any test fails or snapshot mismatch
**FIX**:
1. Review diff images in `__diff_output__/`
2. If regression is intentional: `npm test -- visual-regression --updateSnapshot`
3. If regression is unintentional: Fix the code causing the visual change

---

### Level 5: Regression Detection Works

**EXECUTE**:
```bash
# Intentionally modify terrain color
sed -i '' 's/Color3(0.3, 0.6, 0.3)/Color3(1.0, 0.0, 0.0)/' src/engine/rendering/TerrainRenderer.ts

# Run tests (should fail)
npm test -- visual-regression 2>&1 | grep "pixel difference"

# Revert change
git checkout src/engine/rendering/TerrainRenderer.ts

# Run tests (should pass)
npm test -- visual-regression
```

**Expected Output**:
```
# First run: Error message with pixel difference %
# Second run: All tests pass
```

**FAIL Condition**: Tests pass when they should fail, or vice versa
**FIX**: Check `failureThreshold` configuration in test files

---

## Success Metrics

### ✅ Automated Test Coverage

- **SC2 Format**:
  - [x] Embedded preview extraction (PreviewImage.tga)
  - [x] Generated terrain preview (forceGenerate: true)
  - [x] 64x64 terrain rendering
  - [x] 256x256 terrain rendering
  - **Total**: 4 visual regression tests

- **W3X Format**:
  - [x] Small map generated preview (EchoIsles)
  - [x] Medium map generated preview (Raging Stream)
  - [x] Flat terrain rendering
  - [x] Hilly terrain rendering
  - **Total**: 4 visual regression tests

- **W3N Format**:
  - [ ] Manual testing only (skipped in automation)
  - **Total**: 0 automated tests (1 placeholder for manual testing)

### ✅ Performance Targets

- **Test Execution Time**: < 60 seconds for all visual tests
- **Individual Test Timeout**: 20 seconds per test
- **Pixel Difference Threshold**: < 1% variance allowed
- **Baseline File Size**: < 100KB per snapshot PNG

### ✅ Quality Gates

- **Baseline Snapshots Committed**: All 8 PNG files in git
- **Diff Images Generated**: On failure, `__diff_output__/` contains visual diffs
- **CI/CD Integration**: Tests run on every PR, block merge on failure
- **Regression Detection**: Intentional color change detected and failed

### ✅ Documentation

- **Test Structure**: Clear organization by format (SC2, W3X, W3N)
- **Known Limitations**: W3X multi-compression, W3N file size documented
- **Manual Testing Guide**: W3N placeholder test includes instructions
- **Troubleshooting**: Validation loop includes failure conditions and fixes

---

## Known Limitations & Future Work

### Current Limitations

1. **W3X Multi-Compression Not Supported**
   - **Issue**: W3X maps use compression format 0x15 (Huffman + BZip2 multi-stage)
   - **Impact**: Cannot extract embedded previews from W3X maps
   - **Workaround**: Test generated previews only
   - **Future**: Add embedded W3X tests when compression is implemented

2. **W3N Files Too Large for Automation**
   - **Issue**: Campaign files are 320MB-923MB
   - **Impact**: Would significantly slow CI/CD pipeline
   - **Workaround**: Manual testing only, placeholder test skipped
   - **Future**: Add W3N tests when performance optimization is available

3. **Headless CI Without GPU**
   - **Issue**: Babylon.js requires WebGL context
   - **Impact**: Tests may fail on headless CI without GPU support
   - **Workaround**: `describeIfWebGL` skip pattern
   - **Future**: Investigate software rendering options (e.g., SwiftShader)

4. **Rendering Non-Determinism**
   - **Issue**: Babylon.js rendering may vary slightly between runs
   - **Impact**: False positives in visual regression tests
   - **Workaround**: 1% pixel difference threshold
   - **Future**: Freeze random seeds, ensure deterministic rendering

### Future Enhancements

- **Texture Testing**: Add tests for terrain with multiple textures
- **Lighting Variations**: Test different lighting configurations
- **Camera Angles**: Test different preview camera positions
- **Embedded Preview Formats**: Test BLP, JPEG embedded formats
- **Performance Profiling**: Measure rendering time per map size
- **Parallel Test Execution**: Speed up test suite with worker threads

---

## Troubleshooting

### Problem: Tests fail with "Cannot find module 'jest-image-snapshot'"

**Cause**: Dependencies not installed
**Fix**:
```bash
npm install --save-dev jest-image-snapshot @types/jest-image-snapshot
```

---

### Problem: Tests fail with "toMatchImageSnapshot is not a function"

**Cause**: Jest setup file not loaded
**Fix**:
1. Verify `jest.config.js` includes `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`
2. Verify `jest.setup.ts` includes `expect.extend({ toMatchImageSnapshot })`
3. Run `npm test -- --clearCache` to clear Jest cache

---

### Problem: All tests fail with "WebGL context not available"

**Cause**: Running in headless environment without GPU
**Fix**: Tests automatically skip via `describeIfWebGL` pattern. This is expected behavior.

---

### Problem: Tests fail with "X% pixel difference"

**Cause**: Visual regression detected (or intentional change)
**Fix**:
1. Review diff images in `__diff_output__/`
2. If change is intentional: `npm test -- visual-regression --updateSnapshot`
3. If change is unintentional: Fix the code causing the visual change

---

### Problem: Baseline snapshots not in git

**Cause**: Forgot to commit snapshots after first run
**Fix**:
```bash
git add src/engine/rendering/__tests__/visual-regression/__image_snapshots__/
git commit -m "Add baseline snapshots for map preview visual regression tests"
```

---

## One-Pass Implementation Confidence

**Score**: 8/10

**Reasoning**:
- ✅ **Library well-documented**: jest-image-snapshot has excellent docs and TypeScript support
- ✅ **Existing patterns to follow**: MapPreviewGenerator.test.ts provides test structure
- ✅ **Clear test strategy**: Organized by format, covers both embedded + generated
- ✅ **Executable validation gates**: Each level has clear pass/fail conditions
- ⚠️ **W3X compression limitation**: Need to document workaround clearly (done)
- ⚠️ **Babylon.js headless rendering**: Can be flaky without GPU (mitigated with skip pattern)
- ⚠️ **First-time baseline generation**: Requires manual verification (included in validation loop)

**Risk Mitigation**:
- All limitations documented with workarounds
- `describeIfWebGL` skip pattern handles headless environments
- Validation loop includes baseline verification step
- Troubleshooting section covers common issues
- 1% pixel threshold allows for rendering variations

**Expected Success Rate**: 8/10 implementations will pass all validation gates on first try.

---

## Summary

This PRP provides a complete blueprint for implementing visual regression testing for map preview rendering. It covers all supported formats (SC2, W3X), documents known limitations (W3X compression, W3N file size), and provides executable validation gates for AI-driven implementation.

**Key Features**:
- ✅ Pixel-by-pixel image comparison using jest-image-snapshot
- ✅ Baseline snapshot management (auto-generated, git-tracked)
- ✅ Tests for both embedded extraction and generated previews
- ✅ Organized by format (SC2, W3X, W3N)
- ✅ Handles headless CI environments (skip pattern)
- ✅ Includes regression detection verification
- ✅ Clear troubleshooting guide

**Next Steps**:
1. Implement Task 1-8 in order
2. Verify each validation level passes
3. Commit baseline snapshots to git
4. Integrate into CI/CD pipeline
