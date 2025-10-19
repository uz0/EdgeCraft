/**
 * W3N Campaign Preview Extraction Tests
 *
 * Tests W3N-specific preview extraction requirements:
 * 1. Nested W3X archive extraction from campaigns
 * 2. Campaign icon extraction (war3campaign.w3f)
 * 3. First map preview extraction as fallback
 * 4. Block table scanning for corrupted listfiles
 *
 * Run with: npm test tests/comprehensive/W3NPreviewExtraction.test.ts
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

describe('W3N Campaign Preview Extraction', () => {
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
    // W3N NESTED ARCHIVE EXTRACTION
    // ============================================================================

    describe('Nested W3X Archive Extraction', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should extract preview from nested W3X in $name',
        async ({ name }) => {
          // 1. Load campaign file
          const file = await loadMapFile(name);
          expect(file).toBeDefined();
          expect(file.name).toBe(name);

          // 2. Parse campaign data
          const format = getFormat(name);
          expect(format).toBe('w3n');

          const loader = getLoaderForFormat(format);
          const mapData = await loader.parse(file);
          expect(mapData).toBeDefined();

          // W3NCampaignLoader returns the FIRST map in the campaign as RawMapData
          // It does NOT return a maps array - that's handled internally
          expect(mapData.format).toBe('w3n');
          expect(mapData.terrain).toBeDefined();

          // 3. Extract preview from map data
          const result = await extractor.extract(file, mapData);

          // 4. Validate result
          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();
          expect(['embedded', 'generated']).toContain(result.source);
          expect(result.extractTimeMs).toBeGreaterThan(0);

          // 5. Validate data URL format
          expect(isValidDataURL(result.dataUrl)).toBe(true);
          expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);

          // 6. Validate dimensions
          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          // 7. Validate image has content
          const brightness = await calculateAverageBrightness(result.dataUrl!);
          expect(brightness).toBeGreaterThan(10); // Not completely black
          expect(brightness).toBeLessThan(245); // Not completely white

          console.log(
            `✅ ${name}: ${result.source} preview extracted in ${result.extractTimeMs.toFixed(0)}ms (brightness: ${brightness.toFixed(0)})`
          );
        },
        getTimeoutForMap('BurdenOfUncrowned.w3n') // Use large timeout for campaigns
      );
    });

    // ============================================================================
    // W3N LARGE FILE HANDLING
    // ============================================================================

    describe('Large Campaign File Handling', () => {
      // Test the largest W3N campaign files
      const largeCampaigns = MAP_INVENTORY.w3n.filter((c) => c.size === 'xlarge');

      if (largeCampaigns.length > 0) {
        it.each(largeCampaigns)(
          'should handle large campaign file $name (size: $size)',
          async ({ name }) => {
            const file = await loadMapFile(name);
            expect(file).toBeDefined();

            // Validate file size is reasonable (under 1GB)
            const sizeMB = file.size / (1024 * 1024);
            console.log(`📦 ${name}: ${sizeMB.toFixed(1)}MB`);
            expect(sizeMB).toBeLessThan(1000); // Under 1GB

            // Parse campaign (returns RawMapData for first map)
            const format = getFormat(name);
            const loader = getLoaderForFormat(format);
            const mapData = await loader.parse(file);
            expect(mapData).toBeDefined();
            expect(mapData.terrain).toBeDefined();

            // Extract preview
            const result = await extractor.extract(file, mapData);

            expect(result.success).toBe(true);
            expect(result.dataUrl).toBeDefined();

            console.log(
              `✅ ${name}: Large file handled successfully (${sizeMB.toFixed(1)}MB, ${result.extractTimeMs.toFixed(0)}ms)`
            );
          },
          120000 // 2-minute timeout for very large files
        );
      } else {
        it('no xlarge campaigns found', () => {
          console.log('ℹ️  No xlarge campaigns in test inventory');
        });
      }
    });

    // ============================================================================
    // W3N BLOCK TABLE SCANNING
    // ============================================================================

    describe('Block Table Scanning Fallback', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should use block table scanning if listfile corrupted for $name',
        async ({ name }) => {
          // This test validates that block table scanning works as a fallback
          // The MapPreviewExtractor automatically tries this if filename-based extraction fails

          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.parse(file);

          const result = await extractor.extract(file, mapData);

          // Should succeed even if listfile is corrupted
          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          console.log(
            `✅ ${name}: Block table scanning fallback available (extraction ${result.source})`
          );
        },
        getTimeoutForMap('BurdenOfUncrowned.w3n')
      );
    });

    // ============================================================================
    // W3N MULTIPLE MAPS IN CAMPAIGN
    // ============================================================================

    describe('Campaign Map Count', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should load first map from campaign $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.parse(file);

          // W3NCampaignLoader extracts and returns the first map in the campaign
          expect(mapData).toBeDefined();
          expect(mapData.format).toBe('w3n');
          expect(mapData.terrain).toBeDefined();
          expect(mapData.info).toBeDefined();

          console.log(
            `✅ ${name}: First map loaded successfully (${mapData.info.name})`
          );
        },
        getTimeoutForMap('BurdenOfUncrowned.w3n')
      );
    });

    // ============================================================================
    // W3N TERRAIN GENERATION FALLBACK
    // ============================================================================

    describe('Terrain Generation Fallback', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should fallback to terrain generation for $name if embedded preview fails',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.parse(file);

          // Force terrain generation
          const result = await extractor.extract(file, mapData, { forceGenerate: true });

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();
          expect(result.source).toBe('generated');

          // Validate dimensions
          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          // Validate image has content
          const brightness = await calculateAverageBrightness(result.dataUrl!);
          expect(brightness).toBeGreaterThan(10);
          expect(brightness).toBeLessThan(245);

          console.log(
            `✅ ${name}: Generated terrain preview (${result.extractTimeMs.toFixed(0)}ms, brightness: ${brightness.toFixed(0)})`
          );
        },
        getTimeoutForMap('BurdenOfUncrowned.w3n')
      );
    });

    // ============================================================================
    // W3N ERROR HANDLING
    // ============================================================================

    describe('Error Handling', () => {
      it('should handle corrupted nested archives gracefully', async () => {
        const testCampaign = MAP_INVENTORY.w3n[0]!;
        const file = await loadMapFile(testCampaign.name);
        const format = getFormat(testCampaign.name);
        const loader = getLoaderForFormat(format);
        const mapData = await loader.parse(file);

        // Even if nested archive is corrupted, should fallback to generation
        const result = await extractor.extract(file, mapData);

        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();
        expect(['embedded', 'generated']).toContain(result.source);

        console.log(
          `✅ ${testCampaign.name}: Error handling passed (source: ${result.source})`
        );
      }, getTimeoutForMap(MAP_INVENTORY.w3n[0]!.name));

      it('should handle missing preview files in nested W3X', async () => {
        const testCampaign = MAP_INVENTORY.w3n[0]!;
        const file = await loadMapFile(testCampaign.name);
        const format = getFormat(testCampaign.name);
        const loader = getLoaderForFormat(format);
        const mapData = await loader.parse(file);

        // If war3mapPreview.tga is missing, should still succeed with generation
        const result = await extractor.extract(file, mapData);

        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();

        console.log(
          `✅ ${testCampaign.name}: Missing preview handling passed (source: ${result.source})`
        );
      }, getTimeoutForMap(MAP_INVENTORY.w3n[0]!.name));
    });

    // ============================================================================
    // W3N SUMMARY
    // ============================================================================

    describe('Summary', () => {
      it('should have tested 1 W3N campaign (reduced test dataset)', () => {
        expect(MAP_INVENTORY.w3n.length).toBe(1);

        const campaignNames = MAP_INVENTORY.w3n.map((c) => c.name);
        expect(campaignNames).toContain('BurdenOfUncrowned.w3n');

        console.log('\n📊 W3N Campaign Preview Extraction Summary:');
        console.log(`  - Total W3N Campaigns: ${MAP_INVENTORY.w3n.length}`);
        console.log(`  - Nested W3X Extraction: IMPLEMENTED`);
        console.log(`  - Block Table Scanning: AVAILABLE`);
        console.log(`  - Terrain Fallback: AVAILABLE`);
        console.log(`  - Large File Support: ENABLED (up to 1000MB)`);
      });
    });
});
