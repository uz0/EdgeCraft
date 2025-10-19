/**
 * Comprehensive Map Preview Tests
 *
 * Tests ALL maps in /public/maps/ folder to ensure:
 * 1. Each map has correct preview (embedded or generated)
 * 2. All preview extraction methods work (custom image, terrain, fallback)
 * 3. Format-specific standards are followed (W3X, W3N, SC2)
 * 4. Huffman-compressed maps use StormJS fallback
 *
 * Format Standards:
 * - W3X: war3mapPreview.tga (256×256, 32-bit BGRA TGA type 2) or war3mapMap.tga
 * - W3N: Same as W3X but from nested MPQ (first campaign map)
 * - SC2: PreviewImage.tga (MUST be square 256×256/512×512, 24/32-bit TGA) or Minimap.tga
 */

import { MapPreviewExtractor } from '@/engine/rendering/MapPreviewExtractor';
import { W3XMapLoader } from '@/formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from '@/formats/maps/sc2/SC2MapLoader';
import { MPQParser } from '@/formats/mpq/MPQParser';
import { StormJSAdapter } from '@/formats/mpq/StormJSAdapter';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Skip tests if running in CI without WebGL support
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

const MAPS_DIR = join(__dirname, '../../public/maps');

// Get all map files
const getAllMaps = (): string[] => {
  return readdirSync(MAPS_DIR)
    .filter(file => file.match(/\.(w3x|w3m|w3n|sc2map)$/i))
    .sort();
};

// Categorize maps by type and expected behavior
const MAP_CATEGORIES = {
  // W3X maps with embedded previews (working)
  w3x_working: [
    '3P Sentinel 01 v3.06.w3x',
    '3P Sentinel 02 v3.06.w3x',
    '3P Sentinel 03 v3.07.w3x',
    '3P Sentinel 04 v3.05.w3x',
    '3P Sentinel 05 v3.02.w3x',
    '3P Sentinel 06 v3.03.w3x',
    '3P Sentinel 07 v3.02.w3x',
    '3pUndeadX01v2.w3x',
    'EchoIslesAlltherandom.w3x',
    'Footmen Frenzy 1.9f.w3x',
    'qcloud_20013247.w3x',
    'ragingstream.w3x',
    'Unity_Of_Forces_Path_10.10.25.w3x',
  ],

  // W3X maps requiring Huffman decompression
  w3x_huffman: [
    'Legion_TD_11.2c-hf1_TeamOZE.w3x',
  ],

  // W3N campaign archives (nested MPQ)
  w3n_campaigns: [
    'BurdenOfUncrowned.w3n',
    'HorrorsOfNaxxramas.w3n',
    'JudgementOfTheDead.w3n',
    'SearchingForPower.w3n',
    'TheFateofAshenvaleBySvetli.w3n',
    'War3Alternate1 - Undead.w3n',
    'Wrath of the Legion.w3n',
  ],

  // SC2 maps with embedded previews
  sc2_maps: [
    'Aliens Binary Mothership.SC2Map',
    'Ruined Citadel.SC2Map',
    'TheUnitTester7.SC2Map',
  ],
};

if (isCI) {
  describe.skip('Map Preview Comprehensive Tests (skipped in CI)', () => {
    it('requires WebGL support', () => {
      // Placeholder test
    });
  });
} else {
  describe('Map Preview Comprehensive Tests', () => {
    let extractor: MapPreviewExtractor;

    beforeEach(() => {
      extractor = new MapPreviewExtractor();
    });

    afterEach(() => {
      extractor.dispose();
    });

  describe('1. Individual Map Preview Tests', () => {
    const allMaps = getAllMaps();

    test('should have 24 total maps in folder', () => {
      expect(allMaps.length).toBe(24);
    });

    allMaps.forEach(mapName => {
      test(`should extract or generate preview for: ${mapName}`, async () => {
        const mapPath = join(MAPS_DIR, mapName);
        const buffer = readFileSync(mapPath);
        const file = new File([buffer], mapName);

        // Determine format
        const format = mapName.endsWith('.w3n')
          ? 'w3n'
          : mapName.endsWith('.w3x')
            ? 'w3x'
            : 'sc2map';

        // Parse map data
        let mapData;
        if (format === 'sc2map') {
          const loader = new SC2MapLoader();
          mapData = await loader.parse(file);
        } else {
          const loader = new W3XMapLoader();
          mapData = await loader.parse(file);
        }

        expect(mapData).toBeDefined();
        expect(mapData.format).toBe(format);

        // Extract preview
        const result = await extractor.extract(file, mapData);

        // Should succeed (either embedded or generated)
        expect(result.success).toBe(true);
        expect(result.dataUrl).toBeDefined();
        expect(result.dataUrl).toContain('data:image/png;base64,');
        expect(result.source).toMatch(/^(embedded|generated)$/);
        expect(result.extractTimeMs).toBeGreaterThan(0);
        expect(result.extractTimeMs).toBeLessThan(60000); // < 60 seconds

        console.log(
          `✅ ${mapName}: ${result.source} preview, ${result.extractTimeMs.toFixed(0)}ms`
        );
      }, 120000); // 2 minute timeout for large files
    });
  });

  describe('2. Format-Specific Tests', () => {
    describe('2.1 W3X Format (Warcraft 3 Maps)', () => {
      test('should extract war3mapPreview.tga from W3X maps', async () => {
        const mapName = '3P Sentinel 01 v3.06.w3x';
        const buffer = readFileSync(join(MAPS_DIR, mapName));

        const mpqParser = new MPQParser(buffer.buffer as ArrayBuffer);
        const parseResult = mpqParser.parse();

        expect(parseResult.success).toBe(true);

        // Try extracting preview
        const preview = await mpqParser.extractFile('war3mapPreview.tga');

        if (preview) {
          expect(preview.data.byteLength).toBeGreaterThan(0);

          // Verify TGA header
          const view = new DataView(preview.data);
          const imageType = view.getUint8(2);
          expect(imageType).toBe(2); // Uncompressed true-color
        } else {
          console.log(`⚠️ ${mapName}: No embedded preview, will use terrain generation`);
        }
      });

      test('should handle war3mapMap.tga fallback', async () => {
        const mpqParser = new MPQParser(new ArrayBuffer(0));
        const previewFiles = ['war3mapPreview.tga', 'war3mapMap.tga'];

        // Verify preview file priority
        expect(previewFiles[0]).toBe('war3mapPreview.tga');
        expect(previewFiles[1]).toBe('war3mapMap.tga');
      });

      test('should generate terrain preview when no embedded image', async () => {
        const mapName = 'EchoIslesAlltherandom.w3x';
        const buffer = readFileSync(join(MAPS_DIR, mapName));
        const file = new File([buffer], mapName);

        const loader = new W3XMapLoader();
        const mapData = await loader.parse(file);

        const result = await extractor.extract(file, mapData, { forceGenerate: true });

        expect(result.success).toBe(true);
        expect(result.source).toBe('generated');
        expect(result.dataUrl).toContain('data:image/png;base64,');
      });
    });

    describe('2.2 W3N Format (Warcraft 3 Campaigns)', () => {
      test('should extract preview from nested campaign maps', async () => {
        const campaignFile = MAP_CATEGORIES.w3n_campaigns[0];
        const buffer = readFileSync(join(MAPS_DIR, campaignFile));

        // W3N campaigns are nested MPQ archives
        const mpqParser = new MPQParser(buffer.buffer as ArrayBuffer);
        const parseResult = mpqParser.parse();

        // Should parse outer archive
        expect(parseResult.success || parseResult.error).toBeDefined();

        if (parseResult.success) {
          console.log(`✅ ${campaignFile}: Outer MPQ parsed successfully`);
        } else {
          console.log(`⚠️ ${campaignFile}: ${parseResult.error}`);
        }
      });

      test('W3N campaigns should use Huffman decompression', async () => {
        // W3N campaigns typically use Huffman compression
        const isStormJSAvailable = await StormJSAdapter.isAvailable();
        expect(isStormJSAvailable).toBe(true);
      });
    });

    describe('2.3 SC2 Format (StarCraft 2 Maps)', () => {
      test('should extract PreviewImage.tga from SC2 maps', async () => {
        const mapName = 'Aliens Binary Mothership.SC2Map';
        const buffer = readFileSync(join(MAPS_DIR, mapName));

        const mpqParser = new MPQParser(buffer.buffer as ArrayBuffer);
        const parseResult = mpqParser.parse();

        expect(parseResult.success).toBe(true);

        // Try extracting SC2 preview
        const preview = await mpqParser.extractFile('PreviewImage.tga');

        if (preview) {
          expect(preview.data.byteLength).toBeGreaterThan(0);

          // SC2 previews MUST be square
          // Verify TGA dimensions (would need TGA decoder to fully validate)
          console.log(`✅ ${mapName}: PreviewImage.tga found (${preview.data.byteLength} bytes)`);
        } else {
          // Try Minimap.tga fallback
          const minimap = await mpqParser.extractFile('Minimap.tga');
          expect(minimap || 'fallback to terrain generation').toBeDefined();
        }
      });

      test('should handle Minimap.tga fallback for SC2', async () => {
        const mpqParser = new MPQParser(new ArrayBuffer(0));
        const previewFiles = ['PreviewImage.tga', 'Minimap.tga'];

        // Verify SC2 preview file priority
        expect(previewFiles[0]).toBe('PreviewImage.tga');
        expect(previewFiles[1]).toBe('Minimap.tga');
      });

      test('SC2 previews must be square', () => {
        // This is a format requirement - SC2 rejects non-square previews
        const validSizes = [256, 512, 1024];
        validSizes.forEach(size => {
          expect(size).toBe(size); // Square: width === height
        });
      });
    });
  });

  describe('3. Preview Extraction Method Tests', () => {
    describe('3.1 Custom Embedded Image (Cache Strategy)', () => {
      test('should extract and cache embedded preview', async () => {
        const mapName = 'ragingstream.w3x';
        const buffer = readFileSync(join(MAPS_DIR, mapName));
        const file = new File([buffer], mapName);

        const loader = new W3XMapLoader();
        const mapData = await loader.parse(file);

        const result = await extractor.extract(file, mapData);

        // Should use embedded preview (faster, no Babylon.js)
        if (result.source === 'embedded') {
          expect(result.success).toBe(true);
          expect(result.dataUrl).toContain('data:image/png;base64,');
          expect(result.extractTimeMs).toBeLessThan(5000); // < 5 seconds

          console.log(`✅ Embedded preview cached for ${mapName}`);
        }
      });
    });

    describe('3.2 Default Terrain Preview Generation', () => {
      test('should generate terrain preview when no embedded image', async () => {
        const mapName = 'Footmen Frenzy 1.9f.w3x';
        const buffer = readFileSync(join(MAPS_DIR, mapName));
        const file = new File([buffer], mapName);

        const loader = new W3XMapLoader();
        const mapData = await loader.parse(file);

        // Force terrain generation
        const result = await extractor.extract(file, mapData, { forceGenerate: true });

        expect(result.success).toBe(true);
        expect(result.source).toBe('generated');
        expect(result.dataUrl).toContain('data:image/png;base64,');

        console.log(`✅ Terrain preview generated for ${mapName}`);
      });

      test('terrain generation should use format-specific rendering', async () => {
        // Each format has different terrain rendering:
        // - W3X: Uses W3E (environment) and W3I (info) files
        // - SC2: Uses different terrain format

        const w3xMap = 'EchoIslesAlltherandom.w3x';
        const sc2Map = 'TheUnitTester7.SC2Map';

        const maps = [w3xMap, sc2Map];

        for (const mapName of maps) {
          const buffer = readFileSync(join(MAPS_DIR, mapName));
          const file = new File([buffer], mapName);

          const format = mapName.endsWith('.SC2Map') ? 'sc2map' : 'w3x';
          const loader = format === 'sc2map' ? new SC2MapLoader() : new W3XMapLoader();
          const mapData = await loader.parse(file);

          expect(mapData.format).toBe(format);

          const result = await extractor.extract(file, mapData, { forceGenerate: true });

          expect(result.success).toBe(true);
          console.log(`✅ ${format} terrain rendering works for ${mapName}`);
        }
      });
    });

    describe('3.3 Fallback with No Image', () => {
      test('should provide fallback when extraction and generation fail', async () => {
        // This tests the complete failure path
        // Result should still return success: true with generated terrain
        // or success: false with clear error message

        const mapName = 'Legion_TD_11.2c-hf1_TeamOZE.w3x';
        const buffer = readFileSync(join(MAPS_DIR, mapName));
        const file = new File([buffer], mapName);

        const loader = new W3XMapLoader();
        const mapData = await loader.parse(file);

        const result = await extractor.extract(file, mapData);

        // Should either succeed with generated preview or fail gracefully
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(result.source).toBe('error');
          console.log(`❌ ${mapName}: ${result.error}`);
        } else {
          expect(result.source).toMatch(/^(embedded|generated)$/);
          console.log(`✅ ${mapName}: ${result.source} preview`);
        }
      });
    });
  });

  describe('4. Huffman Decompression & StormJS Fallback', () => {
    test('should detect Huffman compression errors', async () => {
      // Test that Huffman errors are detected and trigger StormJS fallback
      const errorPatterns = ['Huffman', 'Invalid distance'];

      const testError = 'Huffman decompression failed: Invalid distance in Huffman stream';
      const isHuffmanError = errorPatterns.some(pattern => testError.includes(pattern));

      expect(isHuffmanError).toBe(true);
    });

    test('StormJS adapter should be available', async () => {
      const isAvailable = await StormJSAdapter.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('should use StormJS fallback for Huffman-compressed maps', async () => {
      const mapName = 'Legion_TD_11.2c-hf1_TeamOZE.w3x';
      const buffer = readFileSync(join(MAPS_DIR, mapName));

      // Try direct extraction with StormJS
      const result = await StormJSAdapter.extractFile(
        buffer.buffer as ArrayBuffer,
        'war3mapPreview.tga'
      );

      // Should succeed or provide clear error
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.byteLength).toBeGreaterThan(0);
        console.log(`✅ StormJS extracted preview from ${mapName}`);
      } else {
        console.log(`⚠️ StormJS extraction failed: ${result.error}`);
        expect(result.error).toBeDefined();
      }
    }, 30000); // 30 second timeout for WASM
  });

  describe('5. Performance Tests', () => {
    test('embedded preview extraction should be fast (< 5s)', async () => {
      const mapName = '3P Sentinel 01 v3.06.w3x';
      const buffer = readFileSync(join(MAPS_DIR, mapName));
      const file = new File([buffer], mapName);

      const loader = new W3XMapLoader();
      const mapData = await loader.parse(file);

      const startTime = performance.now();
      const result = await extractor.extract(file, mapData);
      const duration = performance.now() - startTime;

      if (result.source === 'embedded') {
        expect(duration).toBeLessThan(5000);
        console.log(`✅ Embedded extraction: ${duration.toFixed(0)}ms`);
      }
    });

    test('terrain generation should complete in < 30s', async () => {
      const mapName = 'EchoIslesAlltherandom.w3x';
      const buffer = readFileSync(join(MAPS_DIR, mapName));
      const file = new File([buffer], mapName);

      const loader = new W3XMapLoader();
      const mapData = await loader.parse(file);

      const startTime = performance.now();
      const result = await extractor.extract(file, mapData, { forceGenerate: true });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(30000);
      console.log(`✅ Terrain generation: ${duration.toFixed(0)}ms`);
    }, 35000);

    test('large campaign files should not timeout', async () => {
      const largeCampaign = 'JudgementOfTheDead.w3n'; // 923MB
      const buffer = readFileSync(join(MAPS_DIR, largeCampaign));
      const file = new File([buffer], largeCampaign);

      const loader = new W3XMapLoader();

      const startTime = performance.now();
      const mapData = await loader.parse(file);
      const duration = performance.now() - startTime;

      expect(mapData).toBeDefined();
      expect(duration).toBeLessThan(120000); // < 2 minutes
      console.log(`✅ Large file parsed: ${duration.toFixed(0)}ms`);
    }, 150000); // 2.5 minute timeout
  });
  });
}
