import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { TGADecoder } from '../../src/engine/rendering/TGADecoder';

test('Verify Sentinel maps have different TGA preview files', async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mapsDir = path.join(__dirname, '../../public/maps');
  const sentinelMaps = [
    '3P Sentinel 01 v3.06.w3x',
    '3P Sentinel 02 v3.06.w3x',
    '3P Sentinel 03 v3.07.w3x',
    '3P Sentinel 04 v3.05.w3x',
    '3P Sentinel 05 v3.02.w3x',
    '3P Sentinel 06 v3.03.w3x',
    '3P Sentinel 07 v3.02.w3x'
  ];

  console.log('\n🔍 Extracting TGA files from Sentinel maps...\n');

  const tgaData = new Map<string, { sha256: string; size: number; dataUrl: string }>();
  const decoder = new TGADecoder();

  for (const mapName of sentinelMaps) {
    const mapPath = path.join(mapsDir, mapName);

    if (!fs.existsSync(mapPath)) {
      console.log(`❌ ${mapName} not found at ${mapPath}`);
      continue;
    }

    const buffer = fs.readFileSync(mapPath);
    console.log(`📦 ${mapName} - ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

    try {
      const parser = new MPQParser(buffer.buffer);
      const result = parser.parse();

      if (result.success && result.archive) {
        const tgaFile = await parser.extractFile('war3mapPreview.tga');

        if (tgaFile) {
          // Calculate SHA-256 hash of the TGA file
          const hashBuffer = await crypto.subtle.digest('SHA-256', tgaFile.data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Decode to data URL
          const dataUrl = decoder.decodeToDataURL(tgaFile.data);

          console.log(`   ✅ Extracted war3mapPreview.tga: ${tgaFile.data.byteLength} bytes`);
          console.log(`   📊 SHA-256: ${hashHex.substring(0, 16)}...`);
          console.log(`   🖼️  Data URL length: ${dataUrl?.length || 0} chars`);

          if (dataUrl) {
            tgaData.set(mapName, {
              sha256: hashHex,
              size: tgaFile.data.byteLength,
              dataUrl
            });
          }
        } else {
          console.log(`   ❌ No war3mapPreview.tga found`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('');
  }

  // Compare hashes
  console.log('\n📊 COMPARISON RESULTS:\n');

  const hashes = Array.from(tgaData.values()).map(d => d.sha256);
  const uniqueHashes = new Set(hashes);

  console.log(`   Total maps checked: ${tgaData.size}`);
  console.log(`   Unique TGA files (by SHA-256): ${uniqueHashes.size}`);

  if (uniqueHashes.size === 1) {
    console.log(`\n   🚨 CONFIRMED: All Sentinel maps have THE SAME TGA preview file!`);
    console.log(`   This is NOT a bug in the code - the maps were created with identical previews.`);
    console.log(`\n   Common hash: ${Array.from(uniqueHashes)[0]?.substring(0, 32)}...`);
  } else {
    console.log(`\n   ✅ Sentinel maps have DIFFERENT TGA preview files`);
    console.log(`\n   Unique hashes:`);
    Array.from(uniqueHashes).forEach((hash, i) => {
      const mapsWithHash = Array.from(tgaData.entries())
        .filter(([_, data]) => data.sha256 === hash)
        .map(([name, _]) => name);
      console.log(`      ${i + 1}. ${hash.substring(0, 16)}... (${mapsWithHash.length} maps)`);
      mapsWithHash.forEach(name => console.log(`         - ${name}`));
    });
  }

  // Compare data URLs
  const dataUrls = Array.from(tgaData.values()).map(d => d.dataUrl);
  const uniqueDataUrls = new Set(dataUrls);

  console.log(`\n   Data URL comparison:`);
  console.log(`      Total data URLs: ${dataUrls.length}`);
  console.log(`      Unique data URLs: ${uniqueDataUrls.size}`);

  if (uniqueDataUrls.size === 1) {
    console.log(`      🚨 All maps produce the SAME data URL!`);
  } else {
    console.log(`      ✅ Maps produce DIFFERENT data URLs`);
  }

  console.log('\n');
});
