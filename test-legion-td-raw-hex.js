/**
 * Dump raw hex data to see if header is encrypted
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const filename = 'Legion_TD_11.2c-hf1_TeamOZE.w3x';
const filePath = resolve(process.cwd(), 'public/maps', filename);
const buffer = readFileSync(filePath);

console.log('\n========== Raw Hex Dump: Legion TD ==========');
console.log('\n📄 First 512 bytes (possible W3X user data):');
for (let i = 0; i < Math.min(512, buffer.length); i += 16) {
  const hex = Array.from(buffer.slice(i, i + 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  const ascii = Array.from(buffer.slice(i, i + 16))
    .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
    .join('');
  console.log(`${i.toString().padStart(4, '0')}: ${hex.padEnd(48, ' ')} | ${ascii}`);
}

console.log('\n📄 Bytes 512-544 (claimed MPQ header):');
for (let i = 512; i < Math.min(544, buffer.length); i += 16) {
  const hex = Array.from(buffer.slice(i, i + 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  const ascii = Array.from(buffer.slice(i, i + 16))
    .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
    .join('');
  console.log(`${i.toString().padStart(4, '0')}: ${hex.padEnd(48, ' ')} | ${ascii}`);
}

console.log('\n📄 Searching for REAL MPQ header (scanning entire file)...');
const MPQ_MAGIC_V1 = Buffer.from([0x4d, 0x50, 0x51, 0x1a]); // 'MPQ\x1A'
let foundCount = 0;

for (let i = 0; i < buffer.length - 32; i += 4) {
  if (buffer.slice(i, i + 4).equals(MPQ_MAGIC_V1)) {
    console.log(`\n✅ Found MPQ magic at offset ${i}`);
    foundCount++;

    // Read header values
    const view = new DataView(buffer.buffer, buffer.byteOffset + i, 32);
    const headerSize = view.getUint32(4, true);
    const archiveSize = view.getUint32(8, true);
    const formatVersion = view.getUint16(12, true);
    const sectorSizeShift = view.getUint16(14, true);
    const hashTablePos = view.getUint32(16, true);
    const blockTablePos = view.getUint32(20, true);
    const hashTableSize = view.getUint32(24, true);
    const blockTableSize = view.getUint32(28, true);

    console.log(`   Header size: ${headerSize}`);
    console.log(`   Archive size: ${archiveSize}`);
    console.log(`   Format version: ${formatVersion}`);
    console.log(`   Sector size shift: ${sectorSizeShift}`);
    console.log(`   Hash table offset: ${hashTablePos}`);
    console.log(`   Block table offset: ${blockTablePos}`);
    console.log(`   Hash table size: ${hashTableSize}`);
    console.log(`   Block table size: ${blockTableSize}`);

    // Validate
    const hashTableAbsolute = i + hashTablePos;
    const blockTableAbsolute = i + blockTablePos;
    const isValid = headerSize <= 1024 &&
                    formatVersion <= 3 &&
                    sectorSizeShift <= 16 &&
                    hashTableAbsolute < buffer.length &&
                    blockTableAbsolute < buffer.length;

    if (isValid) {
      console.log(`   ✅ VALID header! This is likely the real MPQ header.`);
    } else {
      console.log(`   ❌ Invalid header (likely false positive or encrypted)`);
    }

    // Dump hex at this offset
    console.log(`\n   Hex dump at offset ${i}:`);
    for (let j = 0; j < 48; j += 16) {
      const hex = Array.from(buffer.slice(i + j, i + j + 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`   ${(i + j).toString().padStart(4, '0')}: ${hex}`);
    }

    if (foundCount >= 5) {
      console.log('\n(Stopped after finding 5 matches)');
      break;
    }
  }
}

if (foundCount === 0) {
  console.log('❌ No valid MPQ headers found in entire file!');
}
