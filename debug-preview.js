/**
 * Debug script to test preview generation for a specific map
 * Run with: node --experimental-modules debug-preview.js
 */

import { readFile } from 'fs/promises';
import { W3XMapLoader } from './src/formats/maps/w3x/W3XMapLoader.js';
import { MapPreviewExtractor } from './src/engine/rendering/MapPreviewExtractor.js';

async function testPreview() {
  const mapPath = './maps/3P Sentinel 01 v3.06.w3x';
  console.log(`\n=== Testing Preview for: ${mapPath} ===\n`);

  try {
    // Load map file
    console.log('1. Loading map file...');
    const buffer = await readFile(mapPath);
    console.log(`   ✅ Loaded ${buffer.length} bytes`);

    // Parse map
    console.log('\n2. Parsing map...');
    const loader = new W3XMapLoader();
    const mapData = await loader.parse(buffer);
    console.log('   ✅ Map parsed successfully');
    console.log('   - Format:', mapData.format);
    console.log('   - Name:', mapData.info?.name || 'Unknown');
    console.log('   - Terrain size:', mapData.terrain?.width, 'x', mapData.terrain?.height);

    // Extract preview
    console.log('\n3. Extracting/generating preview...');
    const extractor = new MapPreviewExtractor();
    const file = new File([buffer], '3P Sentinel 01 v3.06.w3x');
    const result = await extractor.extract(file, mapData);

    console.log('   Result:', result.source);
    console.log('   Success:', result.success);
    console.log('   Time:', result.extractTimeMs, 'ms');
    if (result.error) {
      console.log('   ❌ Error:', result.error);
    }
    if (result.dataUrl) {
      console.log('   ✅ Data URL:', result.dataUrl.substring(0, 100) + '...');
      console.log('   Data URL length:', result.dataUrl.length);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  }
}

testPreview();
