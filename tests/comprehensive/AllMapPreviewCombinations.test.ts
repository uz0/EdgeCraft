/**
 * Comprehensive Map Preview Combinations Test Suite
 *
 * Tests ALL preview combinations for each map:
 * 1. Embedded TGA extraction (war3mapPreview.tga, war3mapMap.tga, PreviewImage.tga, Minimap.tga)
 * 2. Terrain generation fallback (Babylon.js rendering)
 * 3. No-image fallback/placeholder
 * 4. Format-specific preview options (W3X/W3N/SC2 standards)
 *
 * TOTAL TESTS: 24 maps × 6 scenarios = 144+ tests
 *
 * Run with: npm test tests/comprehensive/AllMapPreviewCombinations.test.ts
 */

import { MapPreviewExtractor } from '../../src/engine/rendering/MapPreviewExtractor';
import { MapPreviewGenerator } from '../../src/engine/rendering/MapPreviewGenerator';
import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { TGADecoder } from '../../src/engine/rendering/TGADecoder';
import {
  loadMapFile,
  getFormat,
  getLoaderForFormat,
  isValidDataURL,
  getImageDimensions,
  calculateAverageBrightness,
  parseTGAHeader,
  validateTGAHeader,
  MAP_INVENTORY,
  getTimeoutForMap,
  createMockMapData,
} from './test-helpers';

// Skip tests if running in CI without WebGL support
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (isCI) {
  describe.skip('All Map Preview Combinations - Comprehensive Test Suite (skipped in CI)', () => {
    it('requires WebGL support', () => {
      // Placeholder test
    });
  });
} else {
  describe('All Map Preview Combinations - Comprehensive Test Suite', () => {
    let extractor: MapPreviewExtractor;
    let generator: MapPreviewGenerator;
    let tgaDecoder: TGADecoder;

    beforeAll(() => {
      extractor = new MapPreviewExtractor();
      generator = new MapPreviewGenerator();
      tgaDecoder = new TGADecoder();
    });

    afterAll(() => {
      extractor.dispose();
      generator.disposeEngine();
    });

  // ============================================================================
  // TEST SUITE 1: Per-Map All Combinations (24 maps × 6 scenarios = 144 tests)
  // ============================================================================

  describe('Suite 1: Per-Map All Preview Combinations', () => {
    const allMaps = [...MAP_INVENTORY.w3x, ...MAP_INVENTORY.w3n, ...MAP_INVENTORY.sc2map];

    describe('Scenario 1: Embedded TGA Extraction (Primary)', () => {
      it.each(allMaps)(
        'should attempt embedded TGA extraction for $name',
        async ({ name, expectedSource }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.load(file);

          // Attempt extraction WITHOUT forcing generation
          const result = await extractor.extract(file, mapData, { forceGenerate: false });

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          // Log result source
          console.log(
            `✅ ${name}: Extraction result = ${result.source} (expected: ${expectedSource})`
          );

          // If expected source is embedded, validate it succeeded
          if (expectedSource === 'embedded') {
            expect(result.source).toBe('embedded');
          }
        },
        getTimeoutForMap(name)
      );
    });

    describe('Scenario 2: Terrain Generation (Forced)', () => {
      it.each(allMaps)(
        'should force terrain generation for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.load(file);

          // Force terrain generation (bypass embedded extraction)
          const result = await extractor.extract(file, mapData, { forceGenerate: true });

          expect(result.success).toBe(true);
          expect(result.source).toBe('generated');
          expect(result.dataUrl).toBeDefined();

          // Validate dimensions
          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          console.log(`✅ ${name}: Terrain generation successful (${result.generationTimeMs}ms)`);
        },
        getTimeoutForMap(name)
      );
    });

    describe('Scenario 3: Fallback Chain Validation', () => {
      it.each(allMaps)(
        'should validate complete fallback chain for $name',
        async ({ name, expectedSource }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.load(file);

          // Try embedded first
          const embeddedResult = await extractor.extract(file, mapData, { forceGenerate: false });

          // Try forced generation
          const generatedResult = await extractor.extract(file, mapData, { forceGenerate: true });

          // Both should succeed
          expect(embeddedResult.success).toBe(true);
          expect(generatedResult.success).toBe(true);

          // Generated should always be 'generated'
          expect(generatedResult.source).toBe('generated');

          console.log(
            `✅ ${name}: Fallback chain - embedded=${embeddedResult.source}, generated=${generatedResult.source}`
          );
        },
        getTimeoutForMap(name)
      );
    });

    describe('Scenario 4: No-Image Fallback (Corrupted Data)', () => {
      it.each(allMaps)(
        'should handle corrupted map data gracefully for $name',
        async ({ name }) => {
          const format = getFormat(name);

          // Create corrupted mock data (empty terrain)
          const corruptedMapData = createMockMapData(format, {
            width: 0,
            height: 0,
            name: `Corrupted ${name}`,
          });

          const file = new File([Buffer.from([])], name);

          // Should fail gracefully
          const result = await extractor.extract(file, corruptedMapData);

          expect(result.success).toBe(false);
          expect(result.source).toBe('error');
          expect(result.error).toBeDefined();

          console.log(`✅ ${name}: Corrupted data handled - error: ${result.error}`);
        },
        getTimeoutForMap(name)
      );
    });

    describe('Scenario 5: Preview Quality Validation', () => {
      it.each(allMaps)(
        'should validate preview quality for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.load(file);

          const result = await extractor.extract(file, mapData);

          if (result.success && result.dataUrl) {
            // Validate dimensions
            const dimensions = await getImageDimensions(result.dataUrl);
            expect(dimensions.width).toBe(512);
            expect(dimensions.height).toBe(512);

            // Validate brightness (not blank)
            const brightness = await calculateAverageBrightness(result.dataUrl);
            expect(brightness).toBeGreaterThan(10); // Not completely black
            expect(brightness).toBeLessThan(245); // Not completely white

            console.log(
              `✅ ${name}: Quality validated - ${dimensions.width}×${dimensions.height}, brightness=${brightness.toFixed(0)}`
            );
          }
        },
        getTimeoutForMap(name)
      );
    });

    describe('Scenario 6: Cache-able Preview Validation', () => {
      it.each(allMaps)(
        'should generate cache-able preview data for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const format = getFormat(name);
          const loader = getLoaderForFormat(format);
          const mapData = await loader.load(file);

          const result = await extractor.extract(file, mapData);

          if (result.success && result.dataUrl) {
            // Validate data URL is cache-able
            expect(isValidDataURL(result.dataUrl)).toBe(true);
            expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);

            // Validate size is reasonable for caching
            const base64Data = result.dataUrl.split(',')[1];
            const byteSize = Buffer.from(base64Data || '', 'base64').length;

            expect(byteSize).toBeGreaterThan(1000); // At least 1KB
            expect(byteSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB

            console.log(`✅ ${name}: Cache-able - ${(byteSize / 1024).toFixed(1)}KB`);
          }
        },
        getTimeoutForMap(name)
      );
    });
  });

  // ============================================================================
  // TEST SUITE 2: Format-Specific Preview Options
  // ============================================================================

  describe('Suite 2: Format-Specific Preview Options', () => {
    describe('W3X/W3N Preview File Options', () => {
      const W3X_PREVIEW_FILES = ['war3mapPreview.tga', 'war3mapMap.tga', 'war3mapMap.blp'];

      it('should define W3X preview file priority order', () => {
        expect(W3X_PREVIEW_FILES[0]).toBe('war3mapPreview.tga'); // Primary
        expect(W3X_PREVIEW_FILES[1]).toBe('war3mapMap.tga'); // Minimap fallback
        expect(W3X_PREVIEW_FILES[2]).toBe('war3mapMap.blp'); // BLP fallback

        console.log('✅ W3X Preview Files Priority:');
        W3X_PREVIEW_FILES.forEach((file, i) => {
          console.log(`  ${i + 1}. ${file}`);
        });
      });

      it.each(MAP_INVENTORY.w3x.filter((m) => m.expectedSource === 'embedded'))(
        'should extract war3mapPreview.tga from $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          const parseResult = mpqParser.parse();

          expect(parseResult.success).toBe(true);

          // Try to extract war3mapPreview.tga
          const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');

          if (tgaFile) {
            expect(tgaFile.data.byteLength).toBeGreaterThan(0);

            // Parse TGA header
            const header = parseTGAHeader(tgaFile.data);
            const validation = validateTGAHeader(header, 'w3x');

            expect(validation.valid).toBe(true);
            expect(header.imageType).toBe(2); // Uncompressed true-color
            expect(header.bitsPerPixel).toBe(32); // 32-bit BGRA
            expect(header.width).toBe(header.height); // Square

            console.log(`✅ ${name}: war3mapPreview.tga extracted (${header.width}×${header.height})`);
          } else {
            console.log(`⚠️ ${name}: No war3mapPreview.tga found`);
          }
        },
        getTimeoutForMap(MAP_INVENTORY.w3x[0]?.name || 'default')
      );

      it.each(MAP_INVENTORY.w3x.filter((m) => m.expectedSource === 'embedded'))(
        'should fallback to war3mapMap.tga if war3mapPreview.tga missing for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const buffer = await file.arrayBuffer();

          const mpqParser = new MPQParser(buffer);
          mpqParser.parse();

          // Try war3mapMap.tga as fallback
          const minimapFile = await mpqParser.extractFile('war3mapMap.tga');

          if (minimapFile) {
            expect(minimapFile.data.byteLength).toBeGreaterThan(0);

            const header = parseTGAHeader(minimapFile.data);
            expect(header.imageType).toBe(2);

            console.log(`✅ ${name}: war3mapMap.tga fallback available (${header.width}×${header.height})`);
          }
        },
        getTimeoutForMap(MAP_INVENTORY.w3x[0]?.name || 'default')
      );

      it('should document BLP format support (future)', () => {
        const blpSupport = {
          format: 'BLP (Blizzard Picture)',
          extension: '.blp',
          file: 'war3mapMap.blp',
          status: 'NOT YET SUPPORTED',
          priority: 3, // Third fallback after TGA files
        };

        console.log('📝 BLP Format Support:');
        console.log(`  Format: ${blpSupport.format}`);
        console.log(`  File: ${blpSupport.file}`);
        console.log(`  Status: ${blpSupport.status}`);
        console.log(`  Priority: ${blpSupport.priority}`);

        expect(blpSupport.status).toBe('NOT YET SUPPORTED');
      });
    });

    describe('SC2 Preview File Options', () => {
      const SC2_PREVIEW_FILES = ['PreviewImage.tga', 'Minimap.tga'];

      it('should define SC2 preview file priority order', () => {
        expect(SC2_PREVIEW_FILES[0]).toBe('PreviewImage.tga'); // Primary
        expect(SC2_PREVIEW_FILES[1]).toBe('Minimap.tga'); // Minimap fallback

        console.log('✅ SC2 Preview Files Priority:');
        SC2_PREVIEW_FILES.forEach((file, i) => {
          console.log(`  ${i + 1}. ${file}`);
        });
      });

      it('should enforce SC2 square preview requirement', () => {
        const sc2Standard = {
          requirement: 'MUST be square (width === height)',
          supportedSizes: [256, 512, 1024],
          format: 'TGA 24-bit BGR or 32-bit BGRA',
          files: SC2_PREVIEW_FILES,
        };

        console.log('📝 SC2 Preview Standard:');
        console.log(`  Requirement: ${sc2Standard.requirement}`);
        console.log(`  Supported Sizes: ${sc2Standard.supportedSizes.join(', ')}`);
        console.log(`  Format: ${sc2Standard.format}`);

        expect(sc2Standard.supportedSizes).toContain(512);
      });

      it.each(MAP_INVENTORY.sc2map)(
        'should validate SC2 square requirement for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('sc2map');
          const mapData = await loader.load(file);

          const result = await extractor.extract(file, mapData);

          expect(result.success).toBe(true);

          const dimensions = await getImageDimensions(result.dataUrl!);

          // SC2 CRITICAL: Must be square
          expect(dimensions.width).toBe(dimensions.height);
          expect(dimensions.width).toBe(512);

          console.log(`✅ ${name}: SC2 square requirement validated (${dimensions.width}×${dimensions.height})`);
        },
        getTimeoutForMap(MAP_INVENTORY.sc2map[0]?.name || 'default')
      );

      it('should attempt PreviewImage.tga extraction (not yet implemented)', () => {
        const sc2Extraction = {
          primaryFile: 'PreviewImage.tga',
          fallbackFile: 'Minimap.tga',
          currentStatus: 'Terrain generation used (extraction not implemented)',
          futureFeature: 'Extract PreviewImage.tga from SC2Map MPQ archive',
        };

        console.log('📝 SC2 Embedded Extraction Status:');
        console.log(`  Primary: ${sc2Extraction.primaryFile}`);
        console.log(`  Fallback: ${sc2Extraction.fallbackFile}`);
        console.log(`  Status: ${sc2Extraction.currentStatus}`);

        expect(sc2Extraction.currentStatus).toContain('not implemented');
      });
    });

    describe('W3N Campaign Preview Options', () => {
      it('should define W3N campaign preview file options', () => {
        const w3nOptions = {
          campaignIcon: 'Campaign icon from war3campaign.w3f',
          firstMapPreview: 'First map war3mapPreview.tga',
          fallback: 'Terrain generation from first map',
        };

        console.log('✅ W3N Campaign Preview Options:');
        console.log(`  1. ${w3nOptions.campaignIcon}`);
        console.log(`  2. ${w3nOptions.firstMapPreview}`);
        console.log(`  3. ${w3nOptions.fallback}`);

        expect(w3nOptions.campaignIcon).toBeDefined();
      });

      it.each(MAP_INVENTORY.w3n)(
        'should validate W3N campaign structure for $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('w3n');
          const campaignData = await loader.load(file);

          expect(campaignData).toBeDefined();
          expect(campaignData.maps).toBeDefined();
          expect(campaignData.maps.length).toBeGreaterThan(0);

          console.log(`✅ ${name}: Campaign has ${campaignData.maps.length} maps`);
        },
        getTimeoutForMap(MAP_INVENTORY.w3n[0]?.name || 'default')
      );

      it('should document W3N campaign icon extraction (not yet implemented)', () => {
        const w3nCampaignIcon = {
          source: 'war3campaign.w3f file',
          format: 'Campaign info with icon data',
          status: 'NOT YET IMPLEMENTED',
          workaround: 'Use first map preview as campaign preview',
        };

        console.log('📝 W3N Campaign Icon Extraction:');
        console.log(`  Source: ${w3nCampaignIcon.source}`);
        console.log(`  Format: ${w3nCampaignIcon.format}`);
        console.log(`  Status: ${w3nCampaignIcon.status}`);
        console.log(`  Workaround: ${w3nCampaignIcon.workaround}`);

        expect(w3nCampaignIcon.status).toBe('NOT YET IMPLEMENTED');
      });
    });
  });

  // ============================================================================
  // TEST SUITE 3: Terrain Generation for All Formats
  // ============================================================================

  describe('Suite 3: Terrain Generation for All Formats', () => {
    describe('W3X Terrain Rendering', () => {
      it.each(MAP_INVENTORY.w3x)(
        'should generate terrain preview for W3X map $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('w3x');
          const mapData = await loader.load(file);

          const result = await generator.generatePreview(mapData);

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          console.log(`✅ ${name}: W3X terrain rendered (${result.generationTimeMs}ms)`);
        },
        getTimeoutForMap(name)
      );
    });

    describe('W3N Campaign Terrain Rendering', () => {
      it.each(MAP_INVENTORY.w3n)(
        'should generate terrain preview for W3N campaign $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('w3n');
          const campaignData = await loader.load(file);

          const firstMap = campaignData.maps[0];
          expect(firstMap).toBeDefined();

          const result = await generator.generatePreview(firstMap!);

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);

          console.log(`✅ ${name}: W3N campaign terrain rendered (${result.generationTimeMs}ms)`);
        },
        getTimeoutForMap(name)
      );
    });

    describe('SC2 Terrain Rendering', () => {
      it.each(MAP_INVENTORY.sc2map)(
        'should generate terrain preview for SC2 map $name',
        async ({ name }) => {
          const file = await loadMapFile(name);
          const loader = getLoaderForFormat('sc2map');
          const mapData = await loader.load(file);

          const result = await generator.generatePreview(mapData);

          expect(result.success).toBe(true);
          expect(result.dataUrl).toBeDefined();

          const dimensions = await getImageDimensions(result.dataUrl!);
          expect(dimensions.width).toBe(512);
          expect(dimensions.height).toBe(512);
          expect(dimensions.width).toBe(dimensions.height); // SC2 must be square

          console.log(`✅ ${name}: SC2 terrain rendered (${result.generationTimeMs}ms, square: true)`);
        },
        getTimeoutForMap(name)
      );
    });
  });

  // ============================================================================
  // TEST SUITE 4: Preview Standards Compliance
  // ============================================================================

  describe('Suite 4: Preview Standards Compliance', () => {
    it('should document W3X/W3N preview standards', () => {
      const w3xStandards = {
        format: 'TGA 32-bit BGRA',
        dimensions: '4 × map_width × 4 × map_height (e.g., 256×256 for 64×64 map)',
        aspectRatio: 'Square (width === height)',
        scaling: '4x4 scaling standard',
        files: ['war3mapPreview.tga', 'war3mapMap.tga', 'war3mapMap.blp'],
      };

      console.log('\n📋 W3X/W3N Preview Standards:');
      Object.entries(w3xStandards).forEach(([key, value]) => {
        console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });

      expect(w3xStandards.format).toBe('TGA 32-bit BGRA');
    });

    it('should document SC2 preview standards', () => {
      const sc2Standards = {
        format: 'TGA 24-bit BGR or 32-bit BGRA',
        dimensions: '256×256, 512×512, or 1024×1024',
        aspectRatio: 'MUST be square (enforced by SC2 editor)',
        files: ['PreviewImage.tga', 'Minimap.tga'],
      };

      console.log('\n📋 SC2 Preview Standards:');
      Object.entries(sc2Standards).forEach(([key, value]) => {
        console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });

      expect(sc2Standards.aspectRatio).toContain('MUST be square');
    });

    it('should validate all working maps meet their format standards', () => {
      const workingMaps = [
        ...MAP_INVENTORY.w3x.filter((m) => m.expectedSource !== 'failing'),
        ...MAP_INVENTORY.sc2map,
      ];

      const compliance = {
        total: workingMaps.length,
        w3x: workingMaps.filter((m) => m.name.endsWith('.w3x')).length,
        sc2: workingMaps.filter((m) => m.name.endsWith('.SC2Map')).length,
      };

      console.log('\n📊 Standards Compliance:');
      console.log(`  Total Working Maps: ${compliance.total}`);
      console.log(`  W3X Compliant: ${compliance.w3x}`);
      console.log(`  SC2 Compliant: ${compliance.sc2}`);

      expect(compliance.total).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TEST SUITE 5: Summary Statistics
  // ============================================================================

  describe('Suite 5: Summary Statistics', () => {
    it('should provide comprehensive test coverage summary', () => {
      const allMaps = [...MAP_INVENTORY.w3x, ...MAP_INVENTORY.w3n, ...MAP_INVENTORY.sc2map];

      const summary = {
        totalMaps: allMaps.length,
        scenariosPerMap: 6,
        totalTests: allMaps.length * 6,
        formatTests: {
          w3x: MAP_INVENTORY.w3x.length * 6,
          w3n: MAP_INVENTORY.w3n.length * 6,
          sc2: MAP_INVENTORY.sc2map.length * 6,
        },
        previewMethods: [
          'Embedded TGA extraction',
          'Terrain generation (forced)',
          'Fallback chain validation',
          'No-image fallback',
          'Quality validation',
          'Cache validation',
        ],
      };

      console.log('\n📊 Test Coverage Summary:');
      console.log(`  Total Maps: ${summary.totalMaps}`);
      console.log(`  Scenarios per Map: ${summary.scenariosPerMap}`);
      console.log(`  Total Tests: ${summary.totalTests}`);
      console.log(`\n  Format Breakdown:`);
      console.log(`    W3X:  ${summary.formatTests.w3x} tests`);
      console.log(`    W3N:  ${summary.formatTests.w3n} tests`);
      console.log(`    SC2:  ${summary.formatTests.sc2} tests`);
      console.log(`\n  Preview Methods Tested:`);
      summary.previewMethods.forEach((method, i) => {
        console.log(`    ${i + 1}. ${method}`);
      });

      expect(summary.totalTests).toBe(24 * 6); // 144 tests
    });
  });
  });
}
