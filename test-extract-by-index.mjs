import { MPQParser } from './src/formats/mpq/MPQParser.ts';
import * as fs from 'fs';

const campaignPath = './maps/BurdenOfUncrowned.w3n';
const buffer = fs.readFileSync(campaignPath);
const parser = new MPQParser(buffer.buffer);
const result = parser.parse();

if (result.success) {
  console.log('W3N parsed successfully');
  console.log('Block table size:', result.archive.blockTable.length);

  // Print ALL blocks first to see sizes
  console.log('\nAll blocks:');
  result.archive.blockTable.forEach((block, index) => {
    console.log(`  [${index}] filePos=${block.filePos}, uncompressedSize=${block.uncompressedSize}, compressedSize=${block.compressedSize}, flags=0x${block.flags.toString(16)}`);
  });

  // Sort by COMPRESSED size to find large files (uncompressedSize may not be set for uncompressed files)
  const blocks = result.archive.blockTable
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.compressedSize > 100000) // At least 100KB
    .sort((a, b) => b.block.compressedSize - a.block.compressedSize);

  console.log(`\nLarge files (>100KB compressed): ${blocks.length}`);
  blocks.slice(0, 5).forEach(({ block, index }) => {
    console.log(`  Block ${index}: uncompressed=${block.uncompressedSize} bytes, compressed=${block.compressedSize} bytes`);
  });

  if (blocks.length > 0) {
    console.log('\nTrying to extract largest file...');
    const largest = blocks[0];
    const fileData = await parser.extractFileByIndex(largest.index);

    if (fileData) {
      console.log(`Extracted: ${fileData.data.byteLength} bytes`);

      // Check for MPQ magic
      const view = new DataView(fileData.data);
      if (view.byteLength >= 4) {
        const magic = view.getUint32(0, true);
        console.log(`First 4 bytes: 0x${magic.toString(16)}`);
        if (magic === 0x1a51504d) {
          console.log('✅ This is an MPQ archive (W3X map)!');
        }
      }
    } else {
      console.log('Failed to extract');
    }
  } else {
    console.log('No large files found');
  }
}
