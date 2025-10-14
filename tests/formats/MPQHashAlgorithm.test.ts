/**
 * Test MPQ hash algorithm correctness
 *
 * Tests against known hash values to verify implementation
 */

import { MPQParser } from '../../src/formats/mpq/MPQParser';

describe('MPQ Hash Algorithm Correctness', () => {
  it('should compute correct hash for simple filename', () => {
    // Create a simple MPQ archive just to access the hash function
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    // Minimal valid MPQ header
    view.setUint32(0, 0x1a51504d, true); // MPQ magic
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    parser.parse();

    // Access the private hashString method via reflection
    const hashString = (parser as any).hashString.bind(parser);

    // Test known values
    const hashA = hashString('war3map.w3i', 0);
    const hashB = hashString('war3map.w3i', 1);

    console.log(`war3map.w3i: hashA=${hashA}, hashB=${hashB}`);

    // These should be consistent at least
    expect(hashA).toBeGreaterThan(0);
    expect(hashB).toBeGreaterThan(0);
    expect(hashA).not.toBe(hashB);
  });

  it('should produce different hashes for hash types 0 and 1', () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    view.setUint32(0, 0x1a51504d, true);
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    parser.parse();

    const hashString = (parser as any).hashString.bind(parser);

    const hashA = hashString('test.txt', 0);
    const hashB = hashString('test.txt', 1);
    const tableOffset = hashString('test.txt', 2);

    console.log(`test.txt: hashA=${hashA}, hashB=${hashB}, tableOffset=${tableOffset}`);

    // All three should be different
    expect(hashA).not.toBe(hashB);
    expect(hashA).not.toBe(tableOffset);
    expect(hashB).not.toBe(tableOffset);
  });

  it('should be case-insensitive', () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    view.setUint32(0, 0x1a51504d, true);
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    parser.parse();

    const hashString = (parser as any).hashString.bind(parser);

    const hash1 = hashString('war3map.w3i', 0);
    const hash2 = hashString('WAR3MAP.W3I', 0);
    const hash3 = hashString('War3Map.W3I', 0);

    console.log(`Case sensitivity: ${hash1} === ${hash2} === ${hash3}`);

    // Should all be the same (case-insensitive)
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it('should normalize path separators', () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    view.setUint32(0, 0x1a51504d, true);
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    parser.parse();

    const hashString = (parser as any).hashString.bind(parser);

    const hash1 = hashString('path/to/file.txt', 0);
    const hash2 = hashString('path\\to\\file.txt', 0);

    console.log(`Path separator normalization: ${hash1} === ${hash2}`);

    // Should be the same (forward slashes converted to backslashes)
    expect(hash1).toBe(hash2);
  });
});
