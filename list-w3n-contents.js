/**
 * List all files in W3N campaigns to understand structure
 */

import { MPQParser } from './src/formats/mpq/MPQParser.ts';
import * as fs from 'fs';
import * as path from 'path';

async function listArchiveContents(mapPath) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${path.basename(mapPath)}`);
  console.log('='.repeat(70));
  
  try {
    const buffer = fs.readFileSync(mapPath);
    const parser = new MPQParser(buffer.buffer);
    const result = parser.parse();
    
    if (!result.success) {
      console.log(`❌ Parse failed: ${result.error}`);
      return;
    }
    
    console.log(`✅ Parsed successfully`);
    console.log(`   Total files in archive: ${result.archive.blockTable.length}`);
    console.log(`\nAttempting to list all files by checking hash table...`);
    
    // Get all files from block table
    const files = [];
    for (let i = 0; i < result.archive.blockTable.length; i++) {
      const block = result.archive.blockTable[i];
      files.push({
        index: i,
        filePos: block.filePos,
        compressedSize: block.compressedSize,
        fileSize: block.fileSize,
        flags: `0x${block.flags.toString(16)}`
      });
    }
    
    // Sort by file position
    files.sort((a, b) => a.filePos - b.filePos);
    
    console.log(`\nFiles (sorted by position):`);
    console.log('-'.repeat(70));
    files.forEach((file, idx) => {
      const compression = file.compressedSize < file.fileSize ? 'COMPRESSED' : 'UNCOMPRESSED';
      const ratio = file.compressedSize > 0 ? (file.fileSize / file.compressedSize).toFixed(2) : '1.00';
      console.log(`[${idx}] Block ${file.index}: pos=${file.filePos}, compressed=${file.compressedSize}, size=${file.fileSize}, flags=${file.flags}, ${compression} (${ratio}x)`);
    });
    
    // Check for common filenames
    console.log(`\n\nChecking for common W3N/W3X files:`);
    const commonFiles = [
      'war3campaign.w3f',  // Campaign info file
      'war3map.w3x',       // Embedded map
      'war3mapPreview.tga',
      'PreviewImage.tga',
      '(listfile)',        // File list
      '(attributes)',
      '(signature)'
    ];
    
    for (const filename of commonFiles) {
      try {
        const fileData = await parser.extractFile(filename);
        if (fileData) {
          console.log(`  ✅ ${filename}: ${fileData.byteLength} bytes`);
        }
      } catch (error) {
        console.log(`  ❌ ${filename}: ${error.message.substring(0, 80)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Test W3N campaigns
const campaigns = [
  './maps/BurdenOfUncrowned.w3n',
  './maps/HorrorsOfNaxxramas.w3n'
];

(async () => {
  for (const campaign of campaigns) {
    if (fs.existsSync(campaign)) {
      await listArchiveContents(campaign);
    } else {
      console.log(`\n⚠️ Campaign not found: ${campaign}`);
    }
  }
})();
