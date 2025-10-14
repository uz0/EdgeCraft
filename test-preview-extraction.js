#!/usr/bin/env node
/**
 * Test preview extraction for Legion TD and W3N campaigns
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MPQParser } from './src/formats/mpq/MPQParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPreviewExtraction(mapPath) {
  const mapName = path.basename(mapPath);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing preview extraction: ${mapName}`);
  console.log('='.repeat(80));

  try {
    const buffer = await fs.readFile(mapPath);
    console.log(`File size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // Try to extract preview using MPQParser
    console.log('\nAttempting MPQParser extraction...');
    const mpqParser = new MPQParser(buffer.buffer);
    const parseResult = mpqParser.parse();

    if (!parseResult.success) {
      console.error(`❌ MPQ parse failed: ${parseResult.error}`);
      return;
    }

    console.log('✅ MPQ parsed successfully');
    console.log(`Archive: ${parseResult.archive ? 'Available' : 'Not available'}`);

    // Try to extract war3mapPreview.tga
    const previewFiles = ['war3mapPreview.tga', 'war3mapMap.tga'];

    for (const fileName of previewFiles) {
      console.log(`\nTrying to extract: ${fileName}`);
      try {
        const fileData = await mpqParser.extractFile(fileName);

        if (fileData) {
          console.log(`✅ Extracted ${fileName}:`);
          console.log(`   Size: ${fileData.data.byteLength} bytes`);
          console.log(`   Flags: 0x${fileData.flags?.toString(16) || '0'}`);

          // Check if it's a valid TGA by reading header
          const view = new DataView(fileData.data.buffer);
          const imageType = view.getUint8(2);
          const width = view.getUint16(12, true);
          const height = view.getUint16(14, true);
          const pixelDepth = view.getUint8(16);

          console.log(`   TGA Header:`);
          console.log(`     Image type: ${imageType} (${imageType === 2 ? 'Uncompressed' : imageType === 10 ? 'RLE' : 'Unknown'})`);
          console.log(`     Dimensions: ${width}x${height}`);
          console.log(`     Pixel depth: ${pixelDepth}-bit`);

          if (width > 8192 || height > 8192) {
            console.log(`   ⚠️  Image exceeds 8192px limit - needs downsampling`);
          }
        } else {
          console.log(`❌ File not found: ${fileName}`);
        }
      } catch (error) {
        console.error(`❌ Extraction error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Test files
const testFiles = [
  './maps/Legion_TD_11.2c-hf1_TeamOZE.w3x',
  './maps/SearchingForPower.w3n',  // Smallest W3N (74 MB)
  './maps/BurdenOfUncrowned.w3n',  // Medium W3N (320 MB)
];

for (const file of testFiles) {
  const fullPath = path.join(__dirname, file);
  await testPreviewExtraction(fullPath);
}
