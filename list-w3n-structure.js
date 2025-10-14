/**
 * Test script to identify compression flags in problematic maps
 */

import { MPQParser } from './src/formats/mpq/MPQParser.ts';
import * as fs from 'fs';
import * as path from 'path';

async function testMap(mapPath) {
  console.log(`\n=== Testing: ${path.basename(mapPath)} ===`);
  
  try {
    const buffer = fs.readFileSync(mapPath);
    const parser = new MPQParser(buffer.buffer);
    const result = parser.parse();
    
    if (!result.success) {
      console.log(`❌ Parse failed: ${result.error}`);
      return;
    }
    
    console.log(`✅ Parsed successfully`);
    console.log(`   Files in archive: ${result.archive.blockTable.length}`);
    
    // Try to extract preview files
    const previewFiles = [
      'war3campaign.w3f',
      'PreviewImage.tga',
      'war3map.tga'
    ];
    
    for (const filename of previewFiles) {
      try {
        console.log(`\nAttempting to extract: ${filename}`);
        const fileData = await parser.extractFile(filename);
        
        if (fileData) {
          console.log(`✅ Extracted ${filename}: ${fileData.byteLength} bytes`);
        }
      } catch (error) {
        console.log(`❌ Failed to extract ${filename}: ${error.message}`);
        if (error.message.includes('compression')) {
          console.log(`   ⚠️ This is a compression-related error`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

// Test the problematic maps
const mapsToTest = [
  './maps/Legion_TD_11.2c-hf1_TeamOZE.w3x',
  './maps/BurdenOfUncrowned.w3n',
  './maps/HorrorsOfNaxxramas.w3n'
];

(async () => {
  for (const mapPath of mapsToTest) {
    if (fs.existsSync(mapPath)) {
      await testMap(mapPath);
    } else {
      console.log(`\n⚠️ Map not found: ${mapPath}`);
    }
  }
})();
