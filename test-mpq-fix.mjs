#!/usr/bin/env node

/**
 * Quick test to validate MPQ parser fix
 * Tests that maps can now successfully extract files after header offset fix
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use dynamic import for the TypeScript module
async function testMPQParser() {
  console.log('🧪 Testing MPQ Parser Fix...\n');

  // Import the compiled MPQParser
  const { MPQParser } = await import('./dist/formats/mpq/MPQParser.js');

  // Read test map file
  const mapPath = join(__dirname, '../../public/maps/3P Sentinel 01 v3.06.w3x');
  console.log(`📂 Loading map: ${mapPath}`);

  if (!fs.existsSync(mapPath)) {
    console.error(`❌ Map file not found: ${mapPath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(mapPath);
  console.log(`✅ Map loaded: ${buffer.byteLength} bytes\n`);

  // Parse MPQ
  console.log('🔍 Parsing MPQ archive...');
  const parser = new MPQParser(buffer.buffer);
  const result = parser.parse();

  if (!result.success) {
    console.error(`❌ MPQ parse failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ MPQ parsed successfully!\n`);

  // Try to extract key files
  const filesToTest = [
    'war3map.w3i',
    'war3map.w3e',
    'war3map.doo',
    'war3mapUnits.doo',
  ];

  let successCount = 0;
  for (const filename of filesToTest) {
    console.log(`📄 Extracting ${filename}...`);
    const file = await parser.extractFile(filename);

    if (file) {
      console.log(`   ✅ Success: ${file.data.byteLength} bytes`);
      successCount++;
    } else {
      console.log(`   ❌ Failed: File not found`);
    }
  }

  console.log(`\n📊 Results: ${successCount}/${filesToTest.length} files extracted`);

  if (successCount === filesToTest.length) {
    console.log('✅ 🎉 ALL TESTS PASSED - MPQ Parser Fix Successful!');
    process.exit(0);
  } else if (successCount > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Some files extracted');
    process.exit(0);
  } else {
    console.log('❌ TESTS FAILED - No files extracted');
    process.exit(1);
  }
}

testMPQParser().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
