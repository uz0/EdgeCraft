/**
 * Debug script to test W3N campaign parsing
 * Run with: node --experimental-specifier-resolution=node test-w3n-debug.js
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Simulate File API for Node.js
class FilePolyfill {
  constructor(buffer, name) {
    this._buffer = buffer;
    this.name = name;
    this.size = buffer.byteLength;
  }

  async arrayBuffer() {
    return this._buffer;
  }
}

async function testCampaign(filename) {
  console.log(`\n========== Testing: ${filename} ==========`);

  try {
    // Read file
    const filePath = resolve(process.cwd(), 'public/maps', filename);
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const file = new FilePolyfill(arrayBuffer, filename);

    console.log(`File size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);

    // Test MPQ header parsing
    const view = new DataView(arrayBuffer);
    const MPQ_MAGIC_V1 = 0x1a51504d;
    const MPQ_MAGIC_V2 = 0x1b51504d;

    // Search for MPQ header
    let headerOffset = 0;
    const searchLimit = Math.min(4096, arrayBuffer.byteLength);

    for (let offset = 0; offset < searchLimit; offset += 512) {
      const magic = view.getUint32(offset, true);
      if (magic === MPQ_MAGIC_V1 || magic === MPQ_MAGIC_V2) {
        headerOffset = offset;
        console.log(`Found MPQ magic at offset ${offset}: 0x${magic.toString(16)}`);
        break;
      }
    }

    if (headerOffset === 0 && view.getUint32(0, true) !== MPQ_MAGIC_V1 && view.getUint32(0, true) !== MPQ_MAGIC_V2) {
      console.error('❌ No MPQ magic found!');
      return;
    }

    // Read header
    const archiveSize = view.getUint32(headerOffset + 8, true);
    const formatVersion = view.getUint16(headerOffset + 12, true);
    const blockSize = 512 * Math.pow(2, view.getUint16(headerOffset + 14, true));
    const hashTablePos = view.getUint32(headerOffset + 16, true) + headerOffset;
    const blockTablePos = view.getUint32(headerOffset + 20, true) + headerOffset;
    const hashTableSize = view.getUint32(headerOffset + 24, true);
    const blockTableSize = view.getUint32(headerOffset + 28, true);

    console.log(`Archive size: ${archiveSize}`);
    console.log(`Format version: ${formatVersion}`);
    console.log(`Block size: ${blockSize}`);
    console.log(`Hash table: pos=${hashTablePos}, size=${hashTableSize}`);
    console.log(`Block table: pos=${blockTablePos}, size=${blockTableSize}`);

    // Validate positions
    if (hashTablePos < 0 || hashTablePos > arrayBuffer.byteLength) {
      console.error(`❌ Invalid hash table position: ${hashTablePos} (buffer size: ${arrayBuffer.byteLength})`);
      return;
    }

    if (blockTablePos < 0 || blockTablePos > arrayBuffer.byteLength) {
      console.error(`❌ Invalid block table position: ${blockTablePos} (buffer size: ${arrayBuffer.byteLength})`);
      return;
    }

    console.log('✅ MPQ header is valid');

    // Try to find (listfile) in hash table
    console.log('\nSearching for (listfile)...');
    const listfileName = '(listfile)';
    const hashA = hashString(listfileName, 1);
    const hashB = hashString(listfileName, 2);
    console.log(`Hash A: ${hashA}, Hash B: ${hashB}`);

    // Read hash table
    const hashTableData = new DataView(arrayBuffer, hashTablePos, hashTableSize * 16);
    let found = false;
    for (let i = 0; i < hashTableSize; i++) {
      const entryHashA = hashTableData.getUint32(i * 16, true);
      const entryHashB = hashTableData.getUint32(i * 16 + 4, true);
      const blockIndex = hashTableData.getUint32(i * 16 + 12, true);

      if (entryHashA === hashA && entryHashB === hashB) {
        console.log(`✅ Found (listfile) at hash entry ${i}, blockIndex: ${blockIndex}`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('❌ (listfile) not found in hash table');
      console.log('Searching for .w3x/.w3m files in hash table...');

      // Try common map filenames
      const commonNames = ['Chapter01.w3x', 'Map01.w3x', '01.w3x', 'chapter01.w3x', 'map01.w3x'];
      for (const name of commonNames) {
        const hashA = hashString(name, 1);
        const hashB = hashString(name, 2);

        for (let i = 0; i < hashTableSize; i++) {
          const entryHashA = hashTableData.getUint32(i * 16, true);
          const entryHashB = hashTableData.getUint32(i * 16 + 4, true);
          const blockIndex = hashTableData.getUint32(i * 16 + 12, true);

          if (entryHashA === hashA && entryHashB === hashB) {
            console.log(`✅ Found ${name} at hash entry ${i}, blockIndex: ${blockIndex}`);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

// Hash string function (from MPQParser)
function hashString(str, hashType) {
  // Initialize crypt table
  if (!hashString.cryptTable) {
    hashString.cryptTable = new Array(0x500);
    let seed = 0x00100001;

    for (let index1 = 0; index1 < 0x100; index1++) {
      let index2 = index1;
      for (let i = 0; i < 5; i++) {
        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp1 = (seed & 0xffff) << 0x10;

        seed = (seed * 125 + 3) % 0x2aaaab;
        const temp2 = seed & 0xffff;

        hashString.cryptTable[index2] = temp1 | temp2;
        index2 += 0x100;
      }
    }
  }

  const cryptTable = hashString.cryptTable;
  const upperStr = str.toUpperCase().replace(/\//g, '\\');
  let seed1 = 0x7fed7fed;
  let seed2 = 0xeeeeeeee;

  for (let i = 0; i < upperStr.length; i++) {
    const ch = upperStr.charCodeAt(i);
    const value = cryptTable[hashType * 0x100 + ch] || 0;
    seed1 = (value ^ (seed1 + seed2)) >>> 0;
    seed2 = (ch + seed1 + seed2 + (seed2 << 5) + 3) >>> 0;
  }

  return seed1;
}

// Test all failing W3N campaigns
const campaigns = [
  'BurdenOfUncrowned.w3n',
  'HorrorsOfNaxxramas.w3n',
  'JudgementOfTheDead.w3n',
  'SearchingForPower.w3n',
  'TheFateofAshenvaleBySvetli.w3n',
  'War3Alternate1 - Undead.w3n',
  'Wrath of the Legion.w3n'
];

(async () => {
  for (const campaign of campaigns) {
    await testCampaign(campaign);
  }
})();
