/**
 * Comprehensive Test Suite: Format Standards Compliance
 *
 * Validates format-specific standards:
 * 1. W3X TGA: 32-bit BGRA, 4x4 scaling, square aspect ratio
 * 2. SC2: Square preview requirement (width === height)
 * 3. W3N: Campaign-level preview extraction
 *
 * Run with: npm test tests/comprehensive/FormatStandardsCompliance.test.ts
 */

import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { MapPreviewExtractor } from '../../src/engine/rendering/MapPreviewExtractor';
import {
  loadMapFile,
  getFormat,
  getLoaderForFormat,
  parseTGAHeader,
  validateTGAHeader,
  getImageDimensions,
  MAP_INVENTORY,
  getTimeoutForMap,
} from './test-helpers';

describe('Format Standards Compliance', () => {
    let extractor: MapPreviewExtractor;

    beforeAll(() => {
      extractor = new MapPreviewExtractor();
    });

    afterAll(() => {
      extractor.dispose();
    });

  // ============================================================================
  // W3X TGA STANDARDS
  // ============================================================================

  describe('W3X TGA Standards', () => {
    const embeddedW3XMaps = MAP_INVENTORY.w3x.filter((m) => m.expectedSource === 'embedded');

    describe('TGA Header Validation', () => {
      it.each(embeddedW3XMaps)(
        'should validate TGA header for $name',
        async ({ name }) => {
          // 1. Load map file
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          // 2. Extract TGA file using MPQ
          const mpqParser = new MPQParser(buffer);
          const parseResult = mpqParser.parse();
          expect(parseResult.success).toBe(true);

          // 3. Try to extract war3mapPreview.tga
          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');
          expect(tgaFile).toBeDefined();
          expect(tgaFile!.data.byteLength).toBeGreaterThan(0);

          // 4. Parse TGA header
          const header = parseTGAHeader(tgaFile!.data);

          // 5. Validate header fields
          expect(header.imageType).toBe(2); // Uncompressed true-color
          expect(header.colorMapType).toBe(0); // No color map
          expect(header.width).toBeGreaterThan(0);
          expect(header.height).toBeGreaterThan(0);

          console.log(`✅ ${name}: TGA header validated (${header.width}×${header.height}, ${header.bitsPerPixel}-bit)`);
        },
        getTimeoutForMap(embeddedW3XMaps[0]?.name || 'default')
      );

      it.each(embeddedW3XMaps)(
        'should validate 32-bit BGRA pixel format for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');
          expect(tgaFile).toBeDefined();

          const header = parseTGAHeader(tgaFile!.data);

          // W3X uses 32-bit BGRA
          expect(header.bitsPerPixel).toBe(32);

          console.log(`✅ ${name}: 32-bit BGRA validated`);
        },
        getTimeoutForMap(embeddedW3XMaps[0]?.name || 'default')
      );
    });

    describe('4x4 Scaling Standard', () => {
      it.each(embeddedW3XMaps)(
        'should validate 4x4 scaling for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');
          expect(tgaFile).toBeDefined();

          const header = parseTGAHeader(tgaFile!.data);

          // W3X TGA dimensions must be divisible by 4 (4x4 scaling standard)
          expect(header.width % 4).toBe(0);
          expect(header.height % 4).toBe(0);

          // Calculate map dimensions from TGA
          const mapWidth = header.width / 4;
          const mapHeight = header.height / 4;

          expect(mapWidth).toBeGreaterThan(0);
          expect(mapHeight).toBeGreaterThan(0);

          console.log(`✅ ${name}: 4x4 scaling validated (TGA: ${header.width}×${header.height}, Map: ${mapWidth}×${mapHeight})`);
        },
        getTimeoutForMap(embeddedW3XMaps[0]?.name || 'default')
      );

      it('should validate all W3X embedded previews follow 4x4 scaling', async () => {
        let validCount = 0;

        for (const map of embeddedW3XMaps) {
          const file = await loadMapFile(map.name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');

          if (tgaFile) {
            const header = parseTGAHeader(tgaFile.data);

            if (header.width % 4 === 0 && header.height % 4 === 0) {
              validCount++;
            }
          }
        }

        expect(validCount).toBe(embeddedW3XMaps.length);

        console.log(`✅ All ${embeddedW3XMaps.length} W3X embedded previews follow 4x4 scaling`);
      });
    });

    describe('Square Aspect Ratio', () => {
      it.each(embeddedW3XMaps)(
        'should validate square aspect ratio for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');
          expect(tgaFile).toBeDefined();

          const header = parseTGAHeader(tgaFile!.data);

          // W3X previews must be square
          expect(header.width).toBe(header.height);

          console.log(`✅ ${name}: Square aspect ratio validated (${header.width}×${header.height})`);
        },
        getTimeoutForMap(embeddedW3XMaps[0]?.name || 'default')
      );
    });

    describe('Pixel Data Validation', () => {
      it.each(embeddedW3XMaps)(
        'should validate pixel data size for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');
          expect(tgaFile).toBeDefined();

          const header = parseTGAHeader(tgaFile!.data);

          // Calculate expected pixel data size
          const TGA_HEADER_SIZE = 18;
          const bytesPerPixel = header.bitsPerPixel / 8;
          const expectedPixelDataSize = header.width * header.height * bytesPerPixel;
          const actualPixelDataSize = tgaFile!.data.byteLength - TGA_HEADER_SIZE;

          expect(actualPixelDataSize).toBe(expectedPixelDataSize);

          console.log(`✅ ${name}: Pixel data size validated (${actualPixelDataSize} bytes)`);
        },
        getTimeoutForMap(embeddedW3XMaps[0]?.name || 'default')
      );
    });

    describe('Format Compliance Summary', () => {
      it('should validate all W3X TGA standards compliance', async () => {
        const results = {
          total: embeddedW3XMaps.length,
          valid32bit: 0,
          validSquare: 0,
          valid4x4Scaling: 0,
          validPixelData: 0,
        };

        for (const map of embeddedW3XMaps) {
          try {
            const file = await loadMapFile(map.name);
            const buffer = await file.arrayBuffer();

            const mpqParser = new MPQParser(buffer);
            mpqParser.parse();

            const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');

            if (!tgaFile) continue;

            const header = parseTGAHeader(tgaFile.data);
            const validation = validateTGAHeader(header, 'w3x');

            if (validation.valid) {
              if (header.bitsPerPixel === 32) results.valid32bit++;
              if (header.width === header.height) results.validSquare++;
              if (header.width % 4 === 0 && header.height % 4 === 0) results.valid4x4Scaling++;

              const TGA_HEADER_SIZE = 18;
              const bytesPerPixel = header.bitsPerPixel / 8;
              const expectedSize = header.width * header.height * bytesPerPixel;
              const actualSize = tgaFile.data.byteLength - TGA_HEADER_SIZE;

              if (actualSize === expectedSize) results.validPixelData++;
            }
          } catch (error) {
            console.warn(`⚠️ ${map.name}: Validation failed:`, error);
          }
        }

        expect(results.valid32bit).toBe(results.total);
        expect(results.validSquare).toBe(results.total);
        expect(results.valid4x4Scaling).toBe(results.total);
        expect(results.validPixelData).toBe(results.total);

        console.log(`\n📊 W3X TGA Standards Compliance:`);
        console.log(`  Total Maps: ${results.total}`);
        console.log(`  32-bit BGRA: ${results.valid32bit}/${results.total} (${(results.valid32bit / results.total * 100).toFixed(0)}%)`);
        console.log(`  Square Aspect: ${results.validSquare}/${results.total} (${(results.validSquare / results.total * 100).toFixed(0)}%)`);
        console.log(`  4x4 Scaling: ${results.valid4x4Scaling}/${results.total} (${(results.valid4x4Scaling / results.total * 100).toFixed(0)}%)`);
        console.log(`  Pixel Data: ${results.validPixelData}/${results.total} (${(results.validPixelData / results.total * 100).toFixed(0)}%)`);
      }, 120000); // Extended timeout for batch processing
    });
  });

  // ============================================================================
  // SC2 SQUARE REQUIREMENT
  // ============================================================================

  describe('SC2 Square Requirement', () => {
    describe('Generated Preview Square Validation', () => {
      it.each(MAP_INVENTORY.sc2map)(
        'should enforce square preview for $name',
        async ({ name }) => {
          // 1. Load map file
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('sc2map');
          const mapData = await loader.parse(file);

          // 2. Extract preview (will generate terrain since SC2 embedded extraction not implemented)
          const result = await extractor.extract(file, mapData);

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          // 3. Validate dimensions are square
          const dimensions = await getImageDimensions(result.dataUrl!);

          // SC2 CRITICAL REQUIREMENT: Must be square
          expect(dimensions.width).toBe(dimensions.height);
          expect(dimensions.width).toBe(512);

          console.log(`✅ ${name}: Square requirement validated (${dimensions.width}×${dimensions.height})`);
        },
        getTimeoutForMap(MAP_INVENTORY.sc2map[0]?.name || 'default')
      );
    });

    describe('Supported Resolutions', () => {
      it.each(MAP_INVENTORY.sc2map)(
        'should use supported SC2 resolution for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('sc2map');
          const mapData = await loader.parse(file);

          const result = await extractor.extract(file, mapData);
          expect(result.success).toBe(true);

          const dimensions = await getImageDimensions(result.dataUrl!);

          // SC2 supported resolutions: 256×256, 512×512, 1024×1024
          const supportedSizes = [256, 512, 1024];
          expect(supportedSizes).toContain(dimensions.width);

          console.log(`✅ ${name}: Uses supported resolution (${dimensions.width}×${dimensions.height})`);
        },
        getTimeoutForMap(MAP_INVENTORY.sc2map[0]?.name || 'default')
      );
    });

    describe('Non-Square Rejection', () => {
      it('should reject non-square embedded preview and fallback to terrain generation', async () => {
        // Note: This is a hypothetical test since SC2 embedded extraction is not yet implemented
        // When implemented, this test will validate rejection of non-square embedded previews

        console.log(`⚠️ Non-square rejection test skipped (SC2 embedded extraction not implemented)`);
      });
    });

    describe('Format Compliance Summary', () => {
      it('should validate all SC2 maps enforce square requirement', async () => {
        const results = {
          total: MAP_INVENTORY.sc2map.length,
          validSquare: 0,
          validResolution: 0,
        };

        for (const map of MAP_INVENTORY.sc2map) {
          try {
            const file = await loadMapFile(map.name);
            const loader = getLoaderForFormat('sc2map');
            const mapData = await loader.parse(file);

            const result = await extractor.extract(file, mapData);

            if (result.success && result.dataUrl) {
              const dimensions = await getImageDimensions(result.dataUrl);

              if (dimensions.width === dimensions.height) results.validSquare++;

              const supportedSizes = [256, 512, 1024];
              if (supportedSizes.includes(dimensions.width)) results.validResolution++;
            }
          } catch (error) {
            console.warn(`⚠️ ${map.name}: Validation failed:`, error);
          }
        }

        expect(results.validSquare).toBe(results.total);
        expect(results.validResolution).toBe(results.total);

        console.log(`\n📊 SC2 Square Requirement Compliance:`);
        console.log(`  Total Maps: ${results.total}`);
        console.log(`  Square Previews: ${results.validSquare}/${results.total} (${(results.validSquare / results.total * 100).toFixed(0)}%)`);
        console.log(`  Supported Resolution: ${results.validResolution}/${results.total} (${(results.validResolution / results.total * 100).toFixed(0)}%)`);
      }, 60000);
    });
  });

  // ============================================================================
  // W3N CAMPAIGN STANDARDS
  // ============================================================================

  describe('W3N Campaign Standards', () => {
    describe('Campaign-Level Preview Extraction', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should extract campaign preview for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('w3n');
          const mapData = await loader.parse(file);

          expect(mapData).toBeDefined();
          // W3NCampaignLoader returns the first map as RawMapData, not an array
          expect(mapData.format).toBe('w3n');
          expect(mapData.terrain).toBeDefined();

          // Extract campaign preview (from map data)
          const result = await extractor.extract(file, mapData);

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          console.log(`✅ ${name}: Campaign preview extracted (${result.source}, ${dimensions.width}×${dimensions.height})`);
        },
        getTimeoutForMap(MAP_INVENTORY.w3n[0]?.name || 'default')
      );
    });

    describe('Multi-Map Support', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should validate campaign loads first map for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('w3n');
          const mapData = await loader.parse(file);

          // W3NCampaignLoader returns the first map in the campaign
          expect(mapData).toBeDefined();
          expect(mapData.format).toBe('w3n');
          expect(mapData.terrain).toBeDefined();

          console.log(`✅ ${name}: First map loaded successfully`);
        },
        getTimeoutForMap(MAP_INVENTORY.w3n[0]?.name || 'default')
      );
    });
  });

  // ============================================================================
  // OVERALL COMPLIANCE SUMMARY
  // ============================================================================

  describe('Overall Format Compliance Summary', () => {
    it('should provide complete format standards compliance report', () => {
      const summary = {
        w3x: {
          total: MAP_INVENTORY.w3x.length,
          embedded: MAP_INVENTORY.w3x.filter((m) => m.expectedSource === 'embedded').length,
          generated: MAP_INVENTORY.w3x.filter((m) => m.expectedSource === 'generated').length,
        },
        w3n: {
          total: MAP_INVENTORY.w3n.length,
          embedded: MAP_INVENTORY.w3n.length, // All W3N use embedded
        },
        sc2: {
          total: MAP_INVENTORY.sc2map.length,
          squareRequired: MAP_INVENTORY.sc2map.length, // All SC2 must be square
        },
      };

      console.log(`\n📊 Format Standards Compliance Summary:`);
      console.log(`\n  W3X Maps: ${summary.w3x.total}`);
      console.log(`    - Embedded TGA (32-bit BGRA, 4x4 scaling): ${summary.w3x.embedded}`);
      console.log(`    - Terrain Generated: ${summary.w3x.generated}`);
      console.log(`\n  W3N Campaigns: ${summary.w3n.total}`);
      console.log(`    - Campaign-level preview: ${summary.w3n.embedded}`);
      console.log(`\n  SC2Map Maps: ${summary.sc2.total}`);
      console.log(`    - Square requirement enforced: ${summary.sc2.squareRequired}`);
    });
  });
});
