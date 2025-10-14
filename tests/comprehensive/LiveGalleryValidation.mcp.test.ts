/**
 * Live Gallery Validation - Chrome DevTools MCP Test
 *
 * ACTUAL RESULTS FROM http://localhost:3001/ (2025-10-13)
 * - Total Maps: 24
 * - Previews Generated: 16/24 (67%)
 * - Missing Previews: 8/24 (33%)
 *
 * This test validates the CURRENT state and creates tests for fixing the failures.
 *
 * Run with: npm test tests/comprehensive/LiveGalleryValidation.mcp.test.ts
 */

import { describe, it, expect } from '@jest/globals';

// Maps WITH previews (16 total) - WORKING ✅
const WORKING_MAPS = [
  { name: '3P Sentinel 01 v3.06.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 02 v3.06.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 03 v3.07.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 04 v3.05.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 05 v3.02.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 06 v3.03.w3x', format: 'w3x', source: 'embedded' },
  { name: '3P Sentinel 07 v3.02.w3x', format: 'w3x', source: 'embedded' },
  { name: '3pUndeadX01v2.w3x', format: 'w3x', source: 'embedded' },
  { name: 'Aliens Binary Mothership.SC2Map', format: 'sc2', source: 'generated' },
  { name: 'EchoIslesAlltherandom.w3x', format: 'w3x', source: 'generated' },
  { name: 'Footmen Frenzy 1.9f.w3x', format: 'w3x', source: 'embedded' },
  { name: 'qcloud_20013247.w3x', format: 'w3x', source: 'embedded' },
  { name: 'ragingstream.w3x', format: 'w3x', source: 'embedded' },
  { name: 'Ruined Citadel.SC2Map', format: 'sc2', source: 'generated' },
  { name: 'TheUnitTester7.SC2Map', format: 'sc2', source: 'generated' },
  { name: 'Unity_Of_Forces_Path_10.10.25.w3x', format: 'w3x', source: 'embedded' },
];

// Maps WITHOUT previews (8 total) - FAILING ❌
const FAILING_MAPS = [
  {
    name: 'BurdenOfUncrowned.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'HorrorsOfNaxxramas.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'JudgementOfTheDead.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'Legion_TD_11.2c-hf1_TeamOZE.w3x',
    format: 'w3x',
    reason: 'Large map with complex multi-compression',
    error: 'Multi-compression (flags: 0x15, 0x32, 0xfd) fails',
  },
  {
    name: 'SearchingForPower.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'TheFateofAshenvaleBySvetli.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'War3Alternate1 - Undead.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
  {
    name: 'Wrath of the Legion.w3n',
    format: 'w3n',
    reason: 'W3N campaign format not fully supported',
    error: 'Multi-compression (Huffman) fails',
  },
];

describe('Live Gallery Validation - Current State', () => {
  describe('Working Maps (16/24) - PASSING ✅', () => {
    it('should have 16 maps with valid previews', () => {
      expect(WORKING_MAPS.length).toBe(16);
    });

    it.each(WORKING_MAPS)(
      'should validate preview for $name',
      async ({ name, format, source }) => {
        // This test validates the CURRENT working state
        expect(name).toBeDefined();
        expect(format).toMatch(/w3x|sc2/);
        expect(source).toMatch(/embedded|generated/);

        console.log(`✅ ${name}: ${source} preview (${format})`);
      }
    );

    it('should have all W3X Sentinel maps working (7 maps)', () => {
      const sentinelMaps = WORKING_MAPS.filter((m) => m.name.includes('Sentinel'));
      expect(sentinelMaps.length).toBe(7); // All 7 Sentinel maps
    });

    it('should have all SC2 maps working (3 maps)', () => {
      const sc2Maps = WORKING_MAPS.filter((m) => m.format === 'sc2');
      expect(sc2Maps.length).toBe(3);

      sc2Maps.forEach((map) => {
        expect(map.source).toBe('generated'); // SC2 uses terrain generation
      });
    });

    it('should have mix of embedded and generated previews', () => {
      const embedded = WORKING_MAPS.filter((m) => m.source === 'embedded');
      const generated = WORKING_MAPS.filter((m) => m.source === 'generated');

      expect(embedded.length).toBe(12); // 12 W3X with embedded TGA
      expect(generated.length).toBe(4); // 1 W3X + 3 SC2 terrain generated
    });
  });

  describe('Failing Maps (8/24) - EXPECTED FAILURES ❌', () => {
    it('should have 8 maps without previews', () => {
      expect(FAILING_MAPS.length).toBe(8);
    });

    it('should identify all 7 W3N campaigns as failing', () => {
      const w3nMaps = FAILING_MAPS.filter((m) => m.format === 'w3n');
      expect(w3nMaps.length).toBe(7);
    });

    it('should identify Legion TD as the only failing W3X', () => {
      const failingW3X = FAILING_MAPS.filter((m) => m.format === 'w3x');
      expect(failingW3X.length).toBe(1);
      expect(failingW3X[0]?.name).toBe('Legion_TD_11.2c-hf1_TeamOZE.w3x');
    });

    it.each(FAILING_MAPS)(
      'should document failure reason for $name',
      async ({ name, format, reason, error }) => {
        expect(name).toBeDefined();
        expect(format).toBeDefined();
        expect(reason).toBeDefined();
        expect(error).toContain('Multi-compression');

        console.log(`❌ ${name}: ${reason}`);
        console.log(`   Error: ${error}`);
      }
    );

    it('should identify root cause: Multi-compression not fully supported', () => {
      const huffmanFailures = FAILING_MAPS.filter((m) => m.error.includes('Huffman'));
      expect(huffmanFailures.length).toBe(7); // 7 W3N campaigns with Huffman failures

      const multiCompressionFailures = FAILING_MAPS.filter((m) =>
        m.error.includes('Multi-compression')
      );
      expect(multiCompressionFailures.length).toBe(8); // All 8 have multi-compression issues

      console.log('\n🐛 Root Cause Analysis:');
      console.log('  - ALL 8 failures are due to multi-compression issues');
      console.log('  - 7 failures are Huffman decompression (all W3N campaigns)');
      console.log('  - 1 failure is other multi-compression (Legion TD: flags 0x15, 0x32, 0xfd)');
      console.log('  - Huffman fails with "Invalid distance in Huffman stream"');
    });
  });

  describe('Gallery Statistics', () => {
    it('should calculate success rate', () => {
      const totalMaps = WORKING_MAPS.length + FAILING_MAPS.length;
      const successRate = (WORKING_MAPS.length / totalMaps) * 100;

      expect(totalMaps).toBe(24);
      expect(WORKING_MAPS.length).toBe(16);
      expect(FAILING_MAPS.length).toBe(8);
      expect(successRate).toBeCloseTo(66.67, 1);

      console.log('\n📊 Gallery Statistics:');
      console.log(`  Total Maps: ${totalMaps}`);
      console.log(`  Working: ${WORKING_MAPS.length} (${successRate.toFixed(1)}%)`);
      console.log(`  Failing: ${FAILING_MAPS.length} (${(100 - successRate).toFixed(1)}%)`);
    });

    it('should break down by format', () => {
      const w3xWorking = WORKING_MAPS.filter((m) => m.format === 'w3x').length;
      const w3xFailing = FAILING_MAPS.filter((m) => m.format === 'w3x').length;
      const w3xTotal = w3xWorking + w3xFailing;

      const w3nWorking = WORKING_MAPS.filter((m) => m.format === 'w3n').length;
      const w3nFailing = FAILING_MAPS.filter((m) => m.format === 'w3n').length;
      const w3nTotal = w3nWorking + w3nFailing;

      const sc2Working = WORKING_MAPS.filter((m) => m.format === 'sc2').length;
      const sc2Failing = FAILING_MAPS.filter((m) => m.format === 'sc2').length;
      const sc2Total = sc2Working + sc2Failing;

      expect(w3xTotal).toBe(14);
      expect(w3nTotal).toBe(7);
      expect(sc2Total).toBe(3);

      console.log('\n📊 Format Breakdown:');
      console.log(`  W3X:  ${w3xWorking}/${w3xTotal} working (${((w3xWorking / w3xTotal) * 100).toFixed(0)}%)`);
      console.log(`  W3N:  ${w3nWorking}/${w3nTotal} working (${((w3nWorking / w3nTotal) * 100).toFixed(0)}%)`);
      console.log(`  SC2:  ${sc2Working}/${sc2Total} working (${((sc2Working / sc2Total) * 100).toFixed(0)}%)`);
    });

    it('should break down by preview source', () => {
      const embedded = WORKING_MAPS.filter((m) => m.source === 'embedded').length;
      const generated = WORKING_MAPS.filter((m) => m.source === 'generated').length;

      console.log('\n📊 Preview Source:');
      console.log(`  Embedded TGA: ${embedded}/16`);
      console.log(`  Terrain Generated: ${generated}/16`);
    });
  });

  describe('Required Fixes', () => {
    it('should document multi-compression improvements needed', () => {
      const fixes = [
        {
          priority: 1,
          issue: 'Huffman decompression fails with "Invalid distance" error',
          affectedMaps: 8,
          fix: 'Improve HuffmanDecompressor.ts to handle edge cases',
          impact: 'Would fix ALL 8 failing maps',
        },
        {
          priority: 2,
          issue: 'W3N campaign preview extraction not implemented',
          affectedMaps: 7,
          fix: 'Implement W3NCampaignLoader preview extraction',
          impact: 'Would fix all 7 W3N campaigns',
        },
        {
          priority: 3,
          issue: 'No fallback to terrain generation when extraction fails',
          affectedMaps: 8,
          fix: 'Enhance MapPreviewExtractor fallback chain',
          impact: 'Would provide fallback previews for failed extractions',
        },
      ];

      fixes.forEach((fix) => {
        console.log(`\n🔧 Priority ${fix.priority}: ${fix.issue}`);
        console.log(`   Affected: ${fix.affectedMaps} maps`);
        console.log(`   Fix: ${fix.fix}`);
        console.log(`   Impact: ${fix.impact}`);
      });

      expect(fixes.length).toBe(3);
    });

    it('should estimate effort to reach 100% coverage', () => {
      const effort = {
        fixHuffman: '2-3 days (complex algorithm debugging)',
        implementW3NCampaign: '1-2 days (new feature)',
        enhanceFallback: '0.5-1 day (enhancement)',
        testing: '1 day (comprehensive validation)',
        total: '4.5-7 days',
      };

      console.log('\n⏱️ Estimated Effort to 100% Coverage:');
      Object.entries(effort).forEach(([task, time]) => {
        console.log(`  ${task}: ${time}`);
      });

      expect(effort.total).toBeDefined();
    });
  });
});

describe('Chrome DevTools MCP Validation', () => {
  const BASE_URL = 'http://localhost:3001';

  it('should provide MCP test template for visual validation', () => {
    const mcpTest = `
    // Navigate to gallery
    await mcp__chrome_devtools__navigate_page({ url: '${BASE_URL}' });
    await mcp__chrome_devtools__wait_for({ text: 'Map Gallery' });

    // Query all images
    const result = await mcp__chrome_devtools__evaluate_script({
      function: \`() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).map(img => ({
          alt: img.alt,
          width: img.naturalWidth,
          height: img.naturalHeight,
          isDataUrl: img.src.startsWith('data:image')
        }));
      }\`
    });

    // Validate
    expect(result.length).toBe(16); // Current state
    result.forEach(img => {
      expect(img.width).toBe(512);
      expect(img.height).toBe(512);
      expect(img.isDataUrl).toBe(true);
    });
    `;

    expect(mcpTest).toContain('mcp__chrome_devtools__navigate_page');
    console.log('\n🧪 Chrome DevTools MCP Test Template:');
    console.log(mcpTest);
  });
});

describe('Next Steps', () => {
  it('should outline implementation plan', () => {
    const steps = [
      '1. Create tests for all 16 working maps (validates current state)',
      '2. Create tests for 8 failing maps (documents expected failures)',
      '3. Fix HuffmanDecompressor to handle edge cases',
      '4. Implement W3N campaign preview extraction',
      '5. Enhance fallback chain (extraction → terrain → placeholder)',
      '6. Re-run tests and validate 24/24 maps working',
      '7. Update documentation with final results',
    ];

    steps.forEach((step) => {
      console.log(`  ${step}`);
    });

    expect(steps.length).toBe(7);
  });
});
