/**
 * Comprehensive Test Suite 1: Per-Map Preview Validation
 *
 * Ensures every map in /maps folder (24 total) can extract or generate a valid preview.
 * Tests ALL maps across all formats: W3X (14), W3N (7), SC2Map (3)
 *
 * Run with: npm test tests/comprehensive/PerMapPreviewValidation.test.ts
 */

import { MapPreviewExtractor } from '../../src/engine/rendering/MapPreviewExtractor';
import {
  loadMapFile,
  getFormat,
  getLoaderForFormat,
  isValidDataURL,
  getImageDimensions,
  calculateAverageBrightness,
  MAP_INVENTORY,
  getTimeoutForMap,
} from './test-helpers';

// Skip tests if running in CI without WebGL support
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (isCI) {
  describe.skip('Per-Map Preview Validation - ALL 24 Maps (skipped in CI)', () => {
    it('requires WebGL support', () => {
      // Placeholder test
    });
  });
} else {
  describe('Per-Map Preview Validation - ALL 24 Maps', () => {
    let extractor: MapPreviewExtractor;

    beforeAll(() => {
      extractor = new MapPreviewExtractor();
    });

    afterAll(() => {
      if (extractor) {
        extractor.dispose();
      }
    });

  // ============================================================================
  // W3X MAPS (14 total)
  // ============================================================================

  describe('W3X Maps (14 total)', () => {
    it.each(MAP_INVENTORY.w3x)(
      'should extract or generate preview for $name',
      async ({ name, expectedSource }) => {
        // 1. Load map file
        const file = await loadMapFile(name);
        expect(file).toBeDefined();
        expect(file.name).toBe(name);

        // 2. Parse map data
        const format = getFormat(name);
        expect(format).toBe('w3x');

        const loader = getLoaderForFormat(format);
        const mapData = await loader.load(file);
        expect(mapData).toBeDefined();
        expect(mapData.format).toBe('w3x');

        // 3. Extract preview
        const result = await extractor.extract(file, mapData);

        // 4. Validate result
        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();
        expect(result.source).toBe(expectedSource);
        expect(result.extractTimeMs).toBeGreaterThan(0);

        // 5. Validate data URL format
        expect(isValidDataURL(result.dataUrl)).toBe(true);
        expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);

        // 6. Validate dimensions (should be 512×512 after conversion)
        const dimensions = await getImageDimensions(result.dataUrl!);
        expect(dimensions.width).toBe(512);
        expect(dimensions.height).toBe(512);

        // 7. Validate image is not blank (has content)
        const brightness = await calculateAverageBrightness(result.dataUrl!);
        expect(brightness).toBeGreaterThan(10); // Not completely black
        expect(brightness).toBeLessThan(245); // Not completely white

        console.log(
          `✅ ${name}: ${result.source} preview (${result.extractTimeMs.toFixed(0)}ms, brightness: ${brightness.toFixed(0)})`
        );
      },
      getTimeoutForMap('3P Sentinel 01 v3.06.w3x') // Use map-specific timeout
    );
  });

  // ============================================================================
  // W3N CAMPAIGNS (7 total)
  // ============================================================================

  describe('W3N Campaigns (7 total)', () => {
    it.each(MAP_INVENTORY.w3n)(
      'should extract or generate preview for $name',
      async ({ name, expectedSource }) => {
        // 1. Load campaign file
        const file = await loadMapFile(name);
        expect(file).toBeDefined();
        expect(file.name).toBe(name);

        // 2. Parse campaign data
        const format = getFormat(name);
        expect(format).toBe('w3n');

        const loader = getLoaderForFormat(format);
        const campaignData = await loader.load(file);
        expect(campaignData).toBeDefined();

        // W3N campaigns contain multiple maps - use first map for preview
        expect(campaignData.maps).toBeDefined();
        expect(campaignData.maps.length).toBeGreaterThan(0);

        const firstMap = campaignData.maps[0];
        expect(firstMap).toBeDefined();

        // 3. Extract preview
        const result = await extractor.extract(file, firstMap!);

        // 4. Validate result
        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();
        expect(result.source).toBe(expectedSource);
        expect(result.extractTimeMs).toBeGreaterThan(0);

        // 5. Validate data URL format
        expect(isValidDataURL(result.dataUrl)).toBe(true);
        expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);

        // 6. Validate dimensions (should be 512×512 after conversion)
        const dimensions = await getImageDimensions(result.dataUrl!);
        expect(dimensions.width).toBe(512);
        expect(dimensions.height).toBe(512);

        // 7. Validate image is not blank (has content)
        const brightness = await calculateAverageBrightness(result.dataUrl!);
        expect(brightness).toBeGreaterThan(10);
        expect(brightness).toBeLessThan(245);

        console.log(
          `✅ ${name}: ${result.source} preview (${result.extractTimeMs.toFixed(0)}ms, brightness: ${brightness.toFixed(0)})`
        );
      },
      getTimeoutForMap('BurdenOfUncrowned.w3n') // Use large timeout for campaigns
    );
  });

  // ============================================================================
  // SC2MAP MAPS (3 total)
  // ============================================================================

  describe('SC2Map Maps (3 total)', () => {
    it.each(MAP_INVENTORY.sc2map)(
      'should extract or generate preview for $name',
      async ({ name, expectedSource }) => {
        // 1. Load map file
        const file = await loadMapFile(name);
        expect(file).toBeDefined();
        expect(file.name).toBe(name);

        // 2. Parse map data
        const format = getFormat(name);
        expect(format).toBe('sc2map');

        const loader = getLoaderForFormat(format);
        const mapData = await loader.load(file);
        expect(mapData).toBeDefined();
        expect(mapData.format).toBe('sc2map');

        // 3. Extract preview
        const result = await extractor.extract(file, mapData);

        // 4. Validate result
        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();
        expect(result.source).toBe(expectedSource);
        expect(result.extractTimeMs).toBeGreaterThan(0);

        // 5. Validate data URL format
        expect(isValidDataURL(result.dataUrl)).toBe(true);
        expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);

        // 6. Validate dimensions (should be 512×512 after conversion)
        const dimensions = await getImageDimensions(result.dataUrl!);
        expect(dimensions.width).toBe(512);
        expect(dimensions.height).toBe(512);

        // 7. SC2 CRITICAL: Validate square aspect ratio
        expect(dimensions.width).toBe(dimensions.height);

        // 8. Validate image is not blank (has content)
        const brightness = await calculateAverageBrightness(result.dataUrl!);
        expect(brightness).toBeGreaterThan(10);
        expect(brightness).toBeLessThan(245);

        console.log(
          `✅ ${name}: ${result.source} preview (${result.extractTimeMs.toFixed(0)}ms, brightness: ${brightness.toFixed(0)}, square: ${dimensions.width === dimensions.height})`
        );
      },
      getTimeoutForMap('Aliens Binary Mothership.SC2Map')
    );
  });

  // ============================================================================
  // SUMMARY TESTS
  // ============================================================================

  describe('Summary Statistics', () => {
    it('should have validated all 24 maps', () => {
      const totalMaps =
        MAP_INVENTORY.w3x.length + MAP_INVENTORY.w3n.length + MAP_INVENTORY.sc2map.length;

      expect(totalMaps).toBe(24);
      expect(MAP_INVENTORY.w3x.length).toBe(14);
      expect(MAP_INVENTORY.w3n.length).toBe(7);
      expect(MAP_INVENTORY.sc2map.length).toBe(3);

      console.log(`\n📊 Total Maps Validated: ${totalMaps}`);
      console.log(`  - W3X: ${MAP_INVENTORY.w3x.length}`);
      console.log(`  - W3N: ${MAP_INVENTORY.w3n.length}`);
      console.log(`  - SC2Map: ${MAP_INVENTORY.sc2map.length}`);
    });

    it('should have expected source distribution', () => {
      const embeddedCount = [
        ...MAP_INVENTORY.w3x,
        ...MAP_INVENTORY.w3n,
        ...MAP_INVENTORY.sc2map,
      ].filter((m) => m.expectedSource === 'embedded').length;

      const generatedCount = [
        ...MAP_INVENTORY.w3x,
        ...MAP_INVENTORY.w3n,
        ...MAP_INVENTORY.sc2map,
      ].filter((m) => m.expectedSource === 'generated').length;

      expect(embeddedCount).toBe(20); // 13 W3X + 7 W3N
      expect(generatedCount).toBe(4); // 1 W3X + 3 SC2Map

      console.log(`\n📊 Preview Source Distribution:`);
      console.log(`  - Embedded TGA: ${embeddedCount}`);
      console.log(`  - Terrain Generated: ${generatedCount}`);
    });
  });
  });
}
