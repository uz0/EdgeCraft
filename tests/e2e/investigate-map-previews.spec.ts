import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface MapInvestigation {
  name: string;
  status: 'loaded' | 'upside-down' | 'broken' | 'placeholder' | 'not-found';
  width: number;
  height: number;
  sourceType: 'data-url' | 'embedded' | 'generated' | 'placeholder' | 'unknown';
  consoleErrors: string[];
  consoleWarnings: string[];
  consoleLogs: string[];
  imageSource: string;
  screenshotPath: string;
}

// Actual map names from the gallery (from list-maps.spec.ts)
const MAPS_TO_TEST = {
  w3x: [
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
    'Legion_TD_11.2c-hf1_TeamOZE.w3x',
    'qcloud_20013247.w3x',
    'ragingstream.w3x',
    'Unity_Of_Forces_Path_10.10.25.w3x'
  ],
  w3n: [
    'BurdenOfUncrowned.w3n',
    'HorrorsOfNaxxramas.w3n',
    'JudgementOfTheDead.w3n',
    'SearchingForPower.w3n',
    'TheFateofAshenvaleBySvetli.w3n',
    'War3Alternate1 - Undead.w3n',
    'Wrath of the Legion.w3n'
  ],
  sc2: [
    'Aliens Binary Mothership.SC2Map',
    'Ruined Citadel.SC2Map',
    'TheUnitTester7.SC2Map'
  ]
};

test.describe('Map Preview Rendering Investigation', () => {
  let investigations: MapInvestigation[] = [];
  const outputDir = path.join(process.cwd(), 'tests/e2e/investigation-output');

  // Override the base URL to use port 3001
  test.use({ baseURL: 'http://localhost:3001' });

  test.beforeAll(async () => {
    // Create output directory for screenshots and reports
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test('Investigate all 24 map previews', async ({ page }) => {
    // Capture console messages
    const consoleMessages: { type: string; text: string; timestamp: number }[] = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    // Navigate to map gallery
    console.log('🌐 Navigating to map gallery at http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for the map gallery to render
    console.log('⏳ Waiting for map gallery to load...');
    await page.waitForSelector('.map-card', { timeout: 60000 });

    // Get all map cards
    const mapCards = await page.locator('.map-card').all();
    console.log(`📊 Found ${mapCards.length} map cards in gallery`);

    // Test each map format
    for (const [formatType, mapNames] of Object.entries(MAPS_TO_TEST)) {
      console.log(`\n🗺️  Testing ${formatType.toUpperCase()} maps (${mapNames.length} total)`);

      for (const mapName of mapNames) {
        console.log(`\n  📍 Investigating: ${mapName}`);

        const investigation: MapInvestigation = {
          name: mapName,
          status: 'not-found',
          width: 0,
          height: 0,
          sourceType: 'unknown',
          consoleErrors: [],
          consoleWarnings: [],
          consoleLogs: [],
          imageSource: '',
          screenshotPath: ''
        };

        try {
          // Find the map card by name (look for the map-card-name div containing the text)
          const mapCard = page.locator('.map-card').filter({ has: page.locator('.map-card-name', { hasText: mapName }) });
          const cardCount = await mapCard.count();

          if (cardCount === 0) {
            console.log(`    ❌ Map card not found: ${mapName}`);
            investigation.status = 'not-found';
            investigations.push(investigation);
            continue;
          }

          // Get the preview image from the thumbnail area
          const previewImage = mapCard.locator('.map-card-thumbnail img').first();
          const imageCount = await previewImage.count();

          if (imageCount === 0) {
            console.log(`    ❌ Preview image not found for: ${mapName}`);
            investigation.status = 'not-found';
            investigations.push(investigation);
            continue;
          }

          // Wait for image to be visible
          await previewImage.waitFor({ state: 'visible', timeout: 5000 });

          // Get image properties
          const imageProperties = await previewImage.evaluate((img: HTMLImageElement) => ({
            src: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            complete: img.complete,
            currentSrc: img.currentSrc
          }));

          investigation.width = imageProperties.width;
          investigation.height = imageProperties.height;
          investigation.imageSource = imageProperties.src.substring(0, 100) + '...'; // Truncate for readability

          // Determine source type
          if (imageProperties.src.startsWith('data:image')) {
            investigation.sourceType = 'data-url';
          } else if (imageProperties.src.includes('placeholder')) {
            investigation.sourceType = 'placeholder';
          } else if (imageProperties.src.startsWith('blob:')) {
            investigation.sourceType = 'generated';
          } else {
            investigation.sourceType = 'embedded';
          }

          // Check if image loaded successfully
          if (!imageProperties.complete || imageProperties.width === 0 || imageProperties.height === 0) {
            console.log(`    ⚠️  Image failed to load (width: ${imageProperties.width}, height: ${imageProperties.height})`);
            investigation.status = 'broken';
          } else if (investigation.sourceType === 'placeholder') {
            console.log(`    🔲 Using placeholder image`);
            investigation.status = 'placeholder';
          } else {
            console.log(`    ✅ Image loaded (${imageProperties.width}x${imageProperties.height}, ${investigation.sourceType})`);
            investigation.status = 'loaded';
          }

          // Capture console logs related to this map
          const mapRelatedLogs = consoleMessages.filter(msg =>
            msg.text.includes(mapName) ||
            msg.text.includes(formatType) ||
            (msg.timestamp > Date.now() - 5000) // Recent messages
          );

          investigation.consoleErrors = mapRelatedLogs
            .filter(msg => msg.type === 'error')
            .map(msg => msg.text);

          investigation.consoleWarnings = mapRelatedLogs
            .filter(msg => msg.type === 'warning')
            .map(msg => msg.text);

          investigation.consoleLogs = mapRelatedLogs
            .filter(msg => msg.type === 'log' || msg.type === 'info')
            .map(msg => msg.text);

          // Log errors/warnings if present
          if (investigation.consoleErrors.length > 0) {
            console.log(`    🔴 Console Errors: ${investigation.consoleErrors.length}`);
            investigation.consoleErrors.forEach(err => console.log(`       - ${err.substring(0, 100)}`));
          }
          if (investigation.consoleWarnings.length > 0) {
            console.log(`    🟡 Console Warnings: ${investigation.consoleWarnings.length}`);
          }

          // Take screenshot of the map card
          const screenshotFileName = `${formatType}-${mapName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          investigation.screenshotPath = path.join(outputDir, screenshotFileName);
          await mapCard.screenshot({ path: investigation.screenshotPath });
          console.log(`    📸 Screenshot saved: ${screenshotFileName}`);

          // Check for upside-down TGA images (heuristic: data URL with TGA content)
          if (investigation.sourceType === 'data-url' && imageProperties.src.includes('image/x-tga')) {
            console.log(`    ⚠️  Potentially upside-down TGA image detected`);
            investigation.status = 'upside-down';
          }

        } catch (error) {
          console.log(`    ❌ Error investigating map: ${error}`);
          investigation.status = 'broken';
          investigation.consoleErrors.push(error instanceof Error ? error.message : String(error));
        }

        investigations.push(investigation);
      }
    }

    // Generate comprehensive report
    await generateReport(investigations, outputDir, consoleMessages);
  });
});

async function generateReport(
  investigations: MapInvestigation[],
  outputDir: string,
  allConsoleLogs: { type: string; text: string; timestamp: number }[]
) {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 MAP PREVIEW INVESTIGATION REPORT');
  console.log('='.repeat(80));

  // Summary statistics
  const stats = {
    total: investigations.length,
    loaded: investigations.filter(i => i.status === 'loaded').length,
    upsideDown: investigations.filter(i => i.status === 'upside-down').length,
    broken: investigations.filter(i => i.status === 'broken').length,
    placeholder: investigations.filter(i => i.status === 'placeholder').length,
    notFound: investigations.filter(i => i.status === 'not-found').length
  };

  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`   Total Maps Tested: ${stats.total}`);
  console.log(`   ✅ Loaded Correctly: ${stats.loaded} (${((stats.loaded / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   🔄 Upside Down: ${stats.upsideDown} (${((stats.upsideDown / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Broken: ${stats.broken} (${((stats.broken / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   🔲 Placeholder: ${stats.placeholder} (${((stats.placeholder / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ❓ Not Found: ${stats.notFound} (${((stats.notFound / stats.total) * 100).toFixed(1)}%)`);

  // Detailed table
  console.log('\n\n📋 DETAILED RESULTS TABLE:');
  console.log('─'.repeat(120));
  console.log(
    '│ ' +
    'Map Name'.padEnd(40) + ' │ ' +
    'Status'.padEnd(15) + ' │ ' +
    'Dimensions'.padEnd(12) + ' │ ' +
    'Source Type'.padEnd(12) + ' │ ' +
    'Errors'.padEnd(8) + ' │'
  );
  console.log('─'.repeat(120));

  for (const inv of investigations) {
    const statusIcon = {
      'loaded': '✅',
      'upside-down': '🔄',
      'broken': '❌',
      'placeholder': '🔲',
      'not-found': '❓'
    }[inv.status];

    console.log(
      '│ ' +
      inv.name.padEnd(40) + ' │ ' +
      `${statusIcon} ${inv.status}`.padEnd(15) + ' │ ' +
      `${inv.width}x${inv.height}`.padEnd(12) + ' │ ' +
      inv.sourceType.padEnd(12) + ' │ ' +
      inv.consoleErrors.length.toString().padEnd(8) + ' │'
    );
  }
  console.log('─'.repeat(120));

  // Group by format
  console.log('\n\n🗂️  RESULTS BY FORMAT:');
  const byFormat = {
    'W3X Maps': investigations.filter(i => i.name.endsWith('.w3x')),
    'W3N Campaigns': investigations.filter(i => i.name.endsWith('.w3n')),
    'SC2 Maps': investigations.filter(i => i.name.endsWith('.SC2Map'))
  };

  for (const [format, maps] of Object.entries(byFormat)) {
    console.log(`\n  ${format} (${maps.length} total):`);
    const formatStats = {
      loaded: maps.filter(m => m.status === 'loaded').length,
      upsideDown: maps.filter(m => m.status === 'upside-down').length,
      broken: maps.filter(m => m.status === 'broken').length,
      placeholder: maps.filter(m => m.status === 'placeholder').length
    };
    console.log(`    ✅ Loaded: ${formatStats.loaded}`);
    console.log(`    🔄 Upside Down: ${formatStats.upsideDown}`);
    console.log(`    ❌ Broken: ${formatStats.broken}`);
    console.log(`    🔲 Placeholder: ${formatStats.placeholder}`);
  }

  // Console errors analysis
  console.log('\n\n🔴 CONSOLE ERRORS ANALYSIS:');
  const mapsWithErrors = investigations.filter(i => i.consoleErrors.length > 0);
  if (mapsWithErrors.length > 0) {
    console.log(`   ${mapsWithErrors.length} maps with console errors:\n`);
    for (const inv of mapsWithErrors) {
      console.log(`   📍 ${inv.name}:`);
      inv.consoleErrors.forEach(err => console.log(`      - ${err}`));
    }
  } else {
    console.log('   No console errors detected');
  }

  // Pattern analysis
  console.log('\n\n🔍 PATTERN ANALYSIS:');

  // Check TGA correlation
  const tgaMaps = investigations.filter(i => i.imageSource.includes('tga'));
  const upsideDownTgaMaps = tgaMaps.filter(i => i.status === 'upside-down');
  console.log(`   TGA Images: ${tgaMaps.length} total, ${upsideDownTgaMaps.length} upside-down`);
  if (tgaMaps.length > 0 && upsideDownTgaMaps.length === tgaMaps.length) {
    console.log(`   ⚠️  ALL TGA images are upside-down!`);
  }

  // Check W3N specific issues
  const w3nMaps = investigations.filter(i => i.name.endsWith('.w3n'));
  const brokenW3nMaps = w3nMaps.filter(i => i.status === 'broken' || i.status === 'placeholder');
  if (brokenW3nMaps.length > 0) {
    console.log(`   W3N Issues: ${brokenW3nMaps.length}/${w3nMaps.length} campaigns failing`);
  }

  // Root cause analysis
  console.log('\n\n💡 ROOT CAUSE ANALYSIS:');
  console.log('\n   1. Upside-Down Images (TGA Format Issue):');
  if (upsideDownTgaMaps.length > 0) {
    console.log(`      - Affects ${upsideDownTgaMaps.length} maps`);
    console.log(`      - Root Cause: TGA images embedded in W3X files have inverted Y-axis`);
    console.log(`      - Fix: Apply vertical flip transformation in MapPreviewExtractor.ts`);
    console.log(`      - File: src/engine/rendering/MapPreviewExtractor.ts`);
  } else {
    console.log(`      - No upside-down TGA images detected`);
  }

  console.log('\n   2. Failed/Broken Previews:');
  const brokenMaps = investigations.filter(i => i.status === 'broken');
  if (brokenMaps.length > 0) {
    console.log(`      - Affects ${brokenMaps.length} maps`);
    console.log(`      - Common errors:`);
    const errorPatterns = new Map<string, number>();
    brokenMaps.forEach(inv => {
      inv.consoleErrors.forEach(err => {
        const key = err.substring(0, 50); // Group similar errors
        errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1);
      });
    });
    errorPatterns.forEach((count, pattern) => {
      console.log(`         - "${pattern}..." (${count} occurrences)`);
    });
  } else {
    console.log(`      - No broken previews detected`);
  }

  console.log('\n   3. W3N Campaign Issues:');
  if (brokenW3nMaps.length > 0) {
    console.log(`      - Affects ${brokenW3nMaps.length} campaigns`);
    console.log(`      - Root Cause: Nested MPQ extraction not implemented`);
    console.log(`      - Fix: Update W3NCampaignLoader to extract nested MPQ archives`);
    console.log(`      - File: src/formats/maps/w3n/W3NCampaignLoader.ts`);
  } else {
    console.log(`      - All W3N campaigns loading correctly`);
  }

  // Recommendations
  console.log('\n\n✅ RECOMMENDATIONS:');
  console.log('\n   Priority 1 (Critical):');
  if (upsideDownTgaMaps.length > 0) {
    console.log(`   - Fix TGA vertical flip in MapPreviewExtractor.ts (affects ${upsideDownTgaMaps.length} maps)`);
  }
  if (brokenW3nMaps.length > 0) {
    console.log(`   - Implement nested MPQ extraction for W3N campaigns (affects ${brokenW3nMaps.length} maps)`);
  }

  console.log('\n   Priority 2 (Important):');
  if (brokenMaps.length > 0) {
    console.log(`   - Debug and fix ${brokenMaps.length} broken preview extractions`);
  }
  const placeholderMaps = investigations.filter(i => i.status === 'placeholder');
  if (placeholderMaps.length > 0) {
    console.log(`   - Generate previews for ${placeholderMaps.length} maps using placeholder`);
  }

  console.log('\n   Priority 3 (Enhancement):');
  console.log('   - Add automated tests for preview orientation validation');
  console.log('   - Add console error monitoring for preview generation');
  console.log('   - Implement preview caching to improve load times');

  console.log('\n\n' + '='.repeat(80));
  console.log('Report generation complete!');
  console.log(`Screenshots saved to: ${outputDir}`);
  console.log('='.repeat(80) + '\n\n');

  // Write JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: stats,
    byFormat,
    investigations,
    patterns: {
      tga: { total: tgaMaps.length, upsideDown: upsideDownTgaMaps.length },
      w3n: { total: w3nMaps.length, broken: brokenW3nMaps.length },
      broken: { total: brokenMaps.length }
    },
    allConsoleLogs: allConsoleLogs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toISOString()
    }))
  };

  const reportPath = path.join(outputDir, 'investigation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📄 JSON report saved to: ${reportPath}`);

  // Write markdown report
  const markdownReport = generateMarkdownReport(investigations, stats, byFormat, outputDir);
  const mdReportPath = path.join(outputDir, 'investigation-report.md');
  fs.writeFileSync(mdReportPath, markdownReport);
  console.log(`📝 Markdown report saved to: ${mdReportPath}`);
}

function generateMarkdownReport(
  investigations: MapInvestigation[],
  stats: any,
  byFormat: any,
  outputDir: string
): string {
  let md = '# Map Preview Rendering Investigation Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `**Location:** ${outputDir}\n\n`;

  // Summary
  md += '## Summary Statistics\n\n';
  md += `- **Total Maps Tested:** ${stats.total}\n`;
  md += `- **✅ Loaded Correctly:** ${stats.loaded} (${((stats.loaded / stats.total) * 100).toFixed(1)}%)\n`;
  md += `- **🔄 Upside Down:** ${stats.upsideDown} (${((stats.upsideDown / stats.total) * 100).toFixed(1)}%)\n`;
  md += `- **❌ Broken:** ${stats.broken} (${((stats.broken / stats.total) * 100).toFixed(1)}%)\n`;
  md += `- **🔲 Placeholder:** ${stats.placeholder} (${((stats.placeholder / stats.total) * 100).toFixed(1)}%)\n`;
  md += `- **❓ Not Found:** ${stats.notFound} (${((stats.notFound / stats.total) * 100).toFixed(1)}%)\n\n`;

  // Detailed table
  md += '## Detailed Results\n\n';
  md += '| Map Name | Status | Dimensions | Source Type | Console Errors | Screenshot |\n';
  md += '|----------|--------|------------|-------------|----------------|------------|\n';

  for (const inv of investigations) {
    const statusIcon = {
      'loaded': '✅',
      'upside-down': '🔄',
      'broken': '❌',
      'placeholder': '🔲',
      'not-found': '❓'
    }[inv.status];

    const screenshotLink = inv.screenshotPath
      ? `[View](${path.basename(inv.screenshotPath)})`
      : 'N/A';

    md += `| ${inv.name} | ${statusIcon} ${inv.status} | ${inv.width}x${inv.height} | ${inv.sourceType} | ${inv.consoleErrors.length} | ${screenshotLink} |\n`;
  }

  // By format
  md += '\n## Results by Format\n\n';
  for (const [format, maps] of Object.entries(byFormat) as [string, MapInvestigation[]][]) {
    md += `### ${format}\n\n`;
    const formatStats = {
      total: maps.length,
      loaded: maps.filter(m => m.status === 'loaded').length,
      upsideDown: maps.filter(m => m.status === 'upside-down').length,
      broken: maps.filter(m => m.status === 'broken').length,
      placeholder: maps.filter(m => m.status === 'placeholder').length
    };
    md += `- Total: ${formatStats.total}\n`;
    md += `- ✅ Loaded: ${formatStats.loaded}\n`;
    md += `- 🔄 Upside Down: ${formatStats.upsideDown}\n`;
    md += `- ❌ Broken: ${formatStats.broken}\n`;
    md += `- 🔲 Placeholder: ${formatStats.placeholder}\n\n`;
  }

  // Console errors
  md += '## Console Errors\n\n';
  const mapsWithErrors = investigations.filter(i => i.consoleErrors.length > 0);
  if (mapsWithErrors.length > 0) {
    for (const inv of mapsWithErrors) {
      md += `### ${inv.name}\n\n`;
      md += '```\n';
      inv.consoleErrors.forEach(err => md += `${err}\n`);
      md += '```\n\n';
    }
  } else {
    md += 'No console errors detected.\n\n';
  }

  // Root causes
  md += '## Root Cause Analysis\n\n';
  md += '### 1. Upside-Down Images (TGA Format Issue)\n\n';
  const upsideDownMaps = investigations.filter(i => i.status === 'upside-down');
  if (upsideDownMaps.length > 0) {
    md += `**Affects:** ${upsideDownMaps.length} maps\n\n`;
    md += '**Root Cause:** TGA images embedded in W3X files have inverted Y-axis\n\n';
    md += '**Fix:** Apply vertical flip transformation in `MapPreviewExtractor.ts`\n\n';
    md += '**Affected Maps:**\n';
    upsideDownMaps.forEach(m => md += `- ${m.name}\n`);
    md += '\n';
  } else {
    md += 'No upside-down TGA images detected.\n\n';
  }

  md += '### 2. Failed/Broken Previews\n\n';
  const brokenMaps = investigations.filter(i => i.status === 'broken');
  if (brokenMaps.length > 0) {
    md += `**Affects:** ${brokenMaps.length} maps\n\n`;
    md += '**Affected Maps:**\n';
    brokenMaps.forEach(m => md += `- ${m.name}\n`);
    md += '\n';
  } else {
    md += 'No broken previews detected.\n\n';
  }

  // Recommendations
  md += '## Recommendations\n\n';
  md += '### Priority 1 (Critical)\n\n';
  if (upsideDownMaps.length > 0) {
    md += `- Fix TGA vertical flip in \`MapPreviewExtractor.ts\` (affects ${upsideDownMaps.length} maps)\n`;
  }
  const brokenW3nMaps = investigations.filter(i => i.name.endsWith('.w3n') && (i.status === 'broken' || i.status === 'placeholder'));
  if (brokenW3nMaps.length > 0) {
    md += `- Implement nested MPQ extraction for W3N campaigns (affects ${brokenW3nMaps.length} maps)\n`;
  }
  md += '\n';

  md += '### Priority 2 (Important)\n\n';
  if (brokenMaps.length > 0) {
    md += `- Debug and fix ${brokenMaps.length} broken preview extractions\n`;
  }
  const placeholderMaps = investigations.filter(i => i.status === 'placeholder');
  if (placeholderMaps.length > 0) {
    md += `- Generate previews for ${placeholderMaps.length} maps using placeholder\n`;
  }
  md += '\n';

  md += '### Priority 3 (Enhancement)\n\n';
  md += '- Add automated tests for preview orientation validation\n';
  md += '- Add console error monitoring for preview generation\n';
  md += '- Implement preview caching to improve load times\n';

  return md;
}
