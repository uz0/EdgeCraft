/**
 * Direct test of W3N extraction logic
 */

import { MapPreviewExtractor } from './src/engine/rendering/MapPreviewExtractor.ts';
import { W3NCampaignLoader } from './src/formats/maps/w3n/W3NCampaignLoader.ts';
import * as fs from 'fs';

console.log('='.repeat(70));
console.log('W3N Direct Extraction Test');
console.log('='.repeat(70));

const campaignPath = './maps/BurdenOfUncrowned.w3n';

// Read file
console.log(`\n1. Loading file: ${campaignPath}`);
const fileBuffer = fs.readFileSync(campaignPath);
console.log(`   File size: ${fileBuffer.byteLength} bytes`);

// Create File object
const file = new File([fileBuffer], 'BurdenOfUncrowned.w3n', { type: 'application/octet-stream' });
console.log(`   Created File object: ${file.name}, ${file.size} bytes`);

// Parse campaign
console.log(`\n2. Parsing campaign with W3NCampaignLoader...`);
const loader = new W3NCampaignLoader();
const mapData = await loader.parse(file);
console.log(`   Parsed map data:`, {
  format: mapData.format,
  name: mapData.info.name,
  width: mapData.terrain.width,
  height: mapData.terrain.height
});

// Extract preview
console.log(`\n3. Extracting preview with MapPreviewExtractor...`);
const extractor = new MapPreviewExtractor();

try {
  const result = await extractor.extract(file, mapData);
  
  console.log(`\n4. Extraction result:`, {
    success: result.success,
    source: result.source,
    hasDataUrl: !!result.dataUrl,
    dataUrlLength: result.dataUrl?.length || 0,
    error: result.error,
    extractTimeMs: result.extractTimeMs
  });
  
  if (result.success && result.dataUrl) {
    console.log(`\n✅ SUCCESS! Preview extracted successfully`);
    console.log(`   Data URL preview: ${result.dataUrl.substring(0, 100)}...`);
  } else {
    console.log(`\n❌ FAILED! Preview extraction failed`);
    console.log(`   Error: ${result.error}`);
  }
} catch (error) {
  console.log(`\n❌ EXCEPTION during extraction:`, error);
}

console.log('\n' + '='.repeat(70));
