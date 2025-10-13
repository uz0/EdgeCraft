/**
 * Test W3N nested archive extraction
 */

import { MPQParser } from './src/formats/mpq/MPQParser.ts';
import * as fs from 'fs';

async function testW3NExtraction(campaignPath) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing W3N extraction: ${campaignPath}`);
  console.log('='.repeat(70));
  
  try {
    const buffer = fs.readFileSync(campaignPath);
    const mpqParser = new MPQParser(buffer.buffer);
    const mpqResult = mpqParser.parse();
    
    if (!mpqResult.success || !mpqResult.archive) {
      console.log(`❌ Parse failed: ${mpqResult.error}`);
      return;
    }
    
    console.log(`✅ Parsed W3N successfully`);
    console.log(`   Total files: ${mpqResult.archive.blockTable.length}`);
    
    // Find large files (potential W3X maps)
    const blockTable = mpqResult.archive.blockTable;
    const largeFiles = blockTable
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.fileSize > 10000)
      .sort((a, b) => b.block.fileSize - a.block.fileSize);
    
    console.log(`\nLarge files (potential W3X maps): ${largeFiles.length}`);
    for (const { block, index } of largeFiles.slice(0, 10)) {
      console.log(`  [${index}] fileSize=${block.fileSize}, compressedSize=${block.compressedSize}, flags=0x${block.flags.toString(16)}`);
    }
    
    // Try to extract first 5 large files and check for MPQ magic
    console.log(`\nChecking for embedded W3X archives...`);
    for (const { index } of largeFiles.slice(0, 5)) {
      try {
        console.log(`\n  Extracting block ${index}...`);
        const blockData = await mpqParser.extractFileByIndex(index);
        
        if (!blockData) {
          console.log(`    ❌ Failed to extract`);
          continue;
        }
        
        console.log(`    ✅ Extracted: ${blockData.data.byteLength} bytes`);
        
        // Check for MPQ magic
        const view = new DataView(blockData.data);
        const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
        const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;
        const magic1024 = view.byteLength >= 1028 ? view.getUint32(1024, true) : 0;
        
        console.log(`    MPQ magic check: @0=0x${magic0.toString(16)}, @512=0x${magic512.toString(16)}, @1024=0x${magic1024.toString(16)}`);
        
        const hasMPQMagic = 
          magic0 === 0x1a51504d ||
          magic512 === 0x1a51504d ||
          magic1024 === 0x1a51504d;
        
        if (hasMPQMagic) {
          console.log(`    🎯 FOUND EMBEDDED W3X!`);
          
          // Try to parse it
          const nestedParser = new MPQParser(blockData.data);
          const nestedResult = nestedParser.parse();
          
          if (nestedResult.success) {
            console.log(`    ✅ Parsed nested W3X successfully`);
            console.log(`       Nested files: ${nestedResult.archive.blockTable.length}`);
            
            // Try to extract preview
            const previewFiles = ['war3mapPreview.tga', 'PreviewImage.tga'];
            for (const fileName of previewFiles) {
              try {
                const previewData = await nestedParser.extractFile(fileName);
                if (previewData) {
                  console.log(`    ✅ Found preview: ${fileName} (${previewData.data.byteLength} bytes)`);
                  return; // Success!
                }
              } catch (error) {
                console.log(`    ⚠️ No ${fileName}: ${error.message.substring(0, 60)}`);
              }
            }
          } else {
            console.log(`    ❌ Failed to parse nested W3X: ${nestedResult.error}`);
          }
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n❌ No W3X with preview found in campaign`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

// Test campaigns
const campaigns = [
  './maps/BurdenOfUncrowned.w3n',
  './maps/HorrorsOfNaxxramas.w3n'
];

(async () => {
  for (const campaign of campaigns) {
    if (fs.existsSync(campaign)) {
      await testW3NExtraction(campaign);
    } else {
      console.log(`\n⚠️ Campaign not found: ${campaign}`);
    }
  }
})();
