/**
 * Debug script for Legion TD MPQ parsing issue
 * Error: Invalid hash table position: 3962473115 (buffer size: 15702385)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

async function testLegionTD() {
  console.log('\n========== Testing: Legion_TD_11.2c-hf1_TeamOZE.w3x ==========');

  const filename = 'Legion_TD_11.2c-hf1_TeamOZE.w3x';
  const filePath = resolve(process.cwd(), 'public/maps', filename);
  const buffer = readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const view = new DataView(arrayBuffer);

  console.log(`File size: ${arrayBuffer.byteLength} bytes (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB)`);

  const MPQ_MAGIC_V1 = 0x1a51504d;
  const MPQ_MAGIC_V2 = 0x1b51504d;

  // Search for MPQ header in first 4KB
  console.log('\n🔍 Searching for MPQ header...');
  let headerOffset = -1;
  const searchLimit = Math.min(4096, arrayBuffer.byteLength);

  for (let offset = 0; offset < searchLimit; offset += 512) {
    const magic = view.getUint32(offset, true);
    console.log(`  Offset ${offset}: 0x${magic.toString(16).padStart(8, '0')}`);

    if (magic === MPQ_MAGIC_V1) {
      headerOffset = offset;
      console.log(`  ✅ Found MPQ v1 magic at offset ${offset}`);
      break;
    } else if (magic === MPQ_MAGIC_V2) {
      console.log(`  ✅ Found MPQ user data header at offset ${offset}`);
      const realHeaderOffset = view.getUint32(offset + 8, true);
      console.log(`  Real MPQ header should be at offset: ${realHeaderOffset}`);
      headerOffset = realHeaderOffset;

      // Verify real header
      if (headerOffset + 32 <= arrayBuffer.byteLength) {
        const realMagic = view.getUint32(headerOffset, true);
        console.log(`  Magic at real offset ${headerOffset}: 0x${realMagic.toString(16).padStart(8, '0')}`);
        if (realMagic === MPQ_MAGIC_V1) {
          console.log(`  ✅ Verified real MPQ header at ${headerOffset}`);
        } else {
          console.log(`  ❌ Real header magic mismatch!`);
        }
      }
      break;
    }
  }

  if (headerOffset === -1) {
    console.error('❌ No MPQ header found!');
    return;
  }

  // Read header fields
  console.log('\n📋 Reading MPQ header fields...');
  const magic = view.getUint32(headerOffset, true);
  const headerSize = view.getUint32(headerOffset + 4, true);
  const archiveSize = view.getUint32(headerOffset + 8, true);
  const formatVersion = view.getUint16(headerOffset + 12, true);
  const sectorSizeShift = view.getUint16(headerOffset + 14, true);
  const blockSize = 512 * Math.pow(2, sectorSizeShift);

  // CRITICAL: These are RELATIVE offsets from headerOffset!
  const hashTablePosRelative = view.getUint32(headerOffset + 16, true);
  const blockTablePosRelative = view.getUint32(headerOffset + 20, true);
  const hashTableSize = view.getUint32(headerOffset + 24, true);
  const blockTableSize = view.getUint32(headerOffset + 28, true);

  console.log(`  Magic: 0x${magic.toString(16)} (${magic === MPQ_MAGIC_V1 ? 'MPQ v1' : 'Unknown'})`);
  console.log(`  Header size: ${headerSize} bytes`);
  console.log(`  Archive size: ${archiveSize} bytes`);
  console.log(`  Format version: ${formatVersion}`);
  console.log(`  Sector size shift: ${sectorSizeShift} (block size: ${blockSize})`);
  console.log(`  Hash table RELATIVE offset: ${hashTablePosRelative}`);
  console.log(`  Block table RELATIVE offset: ${blockTablePosRelative}`);
  console.log(`  Hash table size: ${hashTableSize} entries`);
  console.log(`  Block table size: ${blockTableSize} entries`);

  // Calculate absolute positions
  const hashTablePosAbsolute = headerOffset + hashTablePosRelative;
  const blockTablePosAbsolute = headerOffset + blockTablePosRelative;

  console.log('\n📍 Calculated absolute positions:');
  console.log(`  Hash table: ${hashTablePosRelative} + ${headerOffset} = ${hashTablePosAbsolute}`);
  console.log(`  Block table: ${blockTablePosRelative} + ${headerOffset} = ${blockTablePosAbsolute}`);
  console.log(`  File size: ${arrayBuffer.byteLength}`);

  // Validate
  console.log('\n✅ Validation:');
  const hashTableEnd = hashTablePosAbsolute + (hashTableSize * 16);
  const blockTableEnd = blockTablePosAbsolute + (blockTableSize * 16);

  if (hashTablePosAbsolute < 0 || hashTablePosAbsolute > arrayBuffer.byteLength) {
    console.error(`  ❌ Hash table position OUT OF BOUNDS: ${hashTablePosAbsolute} (file size: ${arrayBuffer.byteLength})`);
    console.error(`     This is the EXACT error from the app!`);
    console.error(`     headerOffset = ${headerOffset}`);
    console.error(`     hashTablePosRelative = ${hashTablePosRelative}`);
  } else {
    console.log(`  ✅ Hash table position OK: ${hashTablePosAbsolute}`);
  }

  if (hashTableEnd > arrayBuffer.byteLength) {
    console.error(`  ❌ Hash table extends beyond file: ${hashTableEnd} > ${arrayBuffer.byteLength}`);
  } else {
    console.log(`  ✅ Hash table end OK: ${hashTableEnd}`);
  }

  if (blockTablePosAbsolute < 0 || blockTablePosAbsolute > arrayBuffer.byteLength) {
    console.error(`  ❌ Block table position OUT OF BOUNDS: ${blockTablePosAbsolute}`);
  } else {
    console.log(`  ✅ Block table position OK: ${blockTablePosAbsolute}`);
  }

  if (blockTableEnd > arrayBuffer.byteLength) {
    console.error(`  ❌ Block table extends beyond file: ${blockTableEnd} > ${arrayBuffer.byteLength}`);
  } else {
    console.log(`  ✅ Block table end OK: ${blockTableEnd}`);
  }

  // Check if this file might have EXTENDED header (MPQ format v1 with extended fields)
  console.log('\n🔬 Checking for extended header fields...');
  if (headerSize > 32) {
    console.log(`  Extended header detected (size: ${headerSize} bytes)`);

    // Extended MPQ header format
    if (headerOffset + 44 <= arrayBuffer.byteLength) {
      const extendedBlockTableOffset = view.getBigUint64(headerOffset + 32, true);
      const hashTableOffsetHigh = view.getUint16(headerOffset + 40, true);
      const blockTableOffsetHigh = view.getUint16(headerOffset + 42, true);

      console.log(`  Extended block table offset: ${extendedBlockTableOffset}`);
      console.log(`  Hash table offset (high): ${hashTableOffsetHigh}`);
      console.log(`  Block table offset (high): ${blockTableOffsetHigh}`);
    }
  } else {
    console.log(`  Standard 32-byte header (no extensions)`);
  }
}

testLegionTD().catch(console.error);
