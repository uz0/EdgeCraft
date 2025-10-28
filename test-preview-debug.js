#!/usr/bin/env node
/**
 * Debug script to test preview extraction for Legion TD and W3N campaigns
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simplified MPQ header reading
function readMPQHeaders(buffer) {
  const view = new DataView(buffer);
  const searchLimit = Math.min(4096, buffer.byteLength);
  const MPQ_MAGIC_V1 = 0x1a51504d;
  const MPQ_MAGIC_V2 = 0x1b51504d;

  const headers = [];

  for (let offset = 0; offset < searchLimit; offset += 512) {
    const magic = view.getUint32(offset, true);

    if (magic === MPQ_MAGIC_V1 || magic === MPQ_MAGIC_V2) {
      let headerOffset = offset;

      // Handle user data header
      if (magic === MPQ_MAGIC_V2) {
        const realHeaderOffset = view.getUint32(offset + 8, true);
        if (realHeaderOffset < buffer.byteLength - 32) {
          headerOffset = realHeaderOffset;
        }
      }

      // Parse header
      const archiveSize = view.getUint32(headerOffset + 8, true);
      const formatVersion = view.getUint16(headerOffset + 12, true);
      const sectorSizeShift = view.getUint16(headerOffset + 14, true);
      const hashTablePos = view.getUint32(headerOffset + 16, true);
      const blockTablePos = view.getUint32(headerOffset + 20, true);
      const hashTableSize = view.getUint32(headerOffset + 24, true);
      const blockTableSize = view.getUint32(headerOffset + 28, true);

      // Validate header
      const isValid =
        formatVersion <= 3 &&
        sectorSizeShift <= 16 &&
        hashTableSize < 1000000 &&
        blockTableSize < 1000000 &&
        hashTablePos < buffer.byteLength &&
        blockTablePos < buffer.byteLength;

      headers.push({
        offset,
        headerOffset,
        magic: magic.toString(16),
        archiveSize,
        formatVersion,
        sectorSizeShift,
        hashTablePos,
        blockTablePos,
        hashTableSize,
        blockTableSize,
        isValid,
      });
    }
  }

  return headers;
}

// Check for TGA files in hash table
function findTGAFiles(buffer) {
  // Simple check: scan for TGA signatures in the file
  const view = new DataView(buffer);
  const tgaFiles = [];

  // Scan for possible TGA headers (very basic)
  for (let i = 0; i < buffer.byteLength - 18; i += 512) {
    const imageType = view.getUint8(i + 2);
    const width = view.getUint16(i + 12, true);
    const height = view.getUint16(i + 14, true);
    const pixelDepth = view.getUint8(i + 16);

    // Check if this looks like a TGA header
    if ((imageType === 2 || imageType === 10) &&
        (pixelDepth === 24 || pixelDepth === 32) &&
        width > 0 && width < 10000 &&
        height > 0 && height < 10000) {
      tgaFiles.push({
        offset: i,
        width,
        height,
        pixelDepth,
        imageType,
        estimatedSize: width * height * (pixelDepth / 8),
      });
    }
  }

  return tgaFiles;
}

async function testMap(mapPath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${path.basename(mapPath)}`);
  console.log('='.repeat(80));

  try {
    const buffer = await fs.readFile(mapPath);
    console.log(`File size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // Test 1: Find MPQ headers
    console.log('\n📦 MPQ Headers:');
    const headers = readMPQHeaders(buffer.buffer);

    if (headers.length === 0) {
      console.log('❌ No MPQ headers found!');
      return;
    }

    headers.forEach((h, i) => {
      console.log(`\nHeader ${i + 1}:`);
      console.log(`  Offset: ${h.offset}`);
      console.log(`  Magic: 0x${h.magic}`);
      console.log(`  Format version: ${h.formatVersion}`);
      console.log(`  Sector size shift: ${h.sectorSizeShift}`);
      console.log(`  Hash table: pos=${h.hashTablePos}, size=${h.hashTableSize}`);
      console.log(`  Block table: pos=${h.blockTablePos}, size=${h.blockTableSize}`);
      console.log(`  ${h.isValid ? '✅ VALID' : '❌ INVALID'}`);
    });

    // Test 2: Find TGA files
    console.log('\n🖼️  TGA Files:');
    const tgaFiles = findTGAFiles(buffer.buffer);

    if (tgaFiles.length === 0) {
      console.log('❌ No TGA files found!');
    } else {
      console.log(`Found ${tgaFiles.length} possible TGA files:`);
      tgaFiles.slice(0, 5).forEach((tga, i) => {
        console.log(`\nTGA ${i + 1}:`);
        console.log(`  Offset: ${tga.offset}`);
        console.log(`  Size: ${tga.width}x${tga.height}`);
        console.log(`  Pixel depth: ${tga.pixelDepth}`);
        console.log(`  Type: ${tga.imageType === 2 ? 'Uncompressed' : 'RLE'}`);
        console.log(`  Estimated size: ${(tga.estimatedSize / 1024).toFixed(1)} KB`);
      });
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Test files
const testFiles = [
  './maps/Legion_TD_11.2c-hf1_TeamOZE.w3x',
  './maps/BurdenOfUncrowned.w3n',
  './maps/HorrorsOfNaxxramas.w3n',
];

for (const file of testFiles) {
  const fullPath = path.join(__dirname, file);
  await testMap(fullPath);
}
