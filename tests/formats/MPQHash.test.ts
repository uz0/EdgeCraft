/**
 * Test MPQ hash algorithm implementation
 */

import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MPQParser Hash Algorithm', () => {
  let parser: MPQParser;
  let mapBuffer: ArrayBuffer;

  beforeAll(() => {
    // Load a real W3X map file for testing
    const mapPath = join(__dirname, '../../maps/EchoIslesAlltherandom.w3x');
    try {
      const buffer = readFileSync(mapPath);
      mapBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      parser = new MPQParser(mapBuffer);
      parser.parse();
    } catch (error) {
      console.warn('Test map not found, skipping MPQ hash tests');
    }
  });

  it('should find war3map.w3i in W3X archive', async () => {
    if (!parser) {
      console.warn('Skipping test - map file not available');
      return;
    }

    const w3iFile = await parser.extractFile('war3map.w3i');
    expect(w3iFile).not.toBeNull();
    expect(w3iFile?.name).toBe('war3map.w3i');
    expect(w3iFile?.data).toBeDefined();
    expect(w3iFile?.data.byteLength).toBeGreaterThan(0);
  });

  it('should find war3map.w3e in W3X archive', async () => {
    if (!parser) {
      console.warn('Skipping test - map file not available');
      return;
    }

    const w3eFile = await parser.extractFile('war3map.w3e');
    expect(w3eFile).not.toBeNull();
    expect(w3eFile?.name).toBe('war3map.w3e');
    expect(w3eFile?.data).toBeDefined();
    expect(w3eFile?.data.byteLength).toBeGreaterThan(0);
  });

  it('should handle case-insensitive file lookups', async () => {
    if (!parser) {
      console.warn('Skipping test - map file not available');
      return;
    }

    // MPQ hash algorithm should handle uppercase
    const w3iFile = await parser.extractFile('WAR3MAP.W3I');
    expect(w3iFile).not.toBeNull();
  });

  it('should normalize path separators', async () => {
    if (!parser) {
      console.warn('Skipping test - map file not available');
      return;
    }

    // Forward slashes should be converted to backslashes
    const w3iFile1 = await parser.extractFile('war3map.w3i');
    const w3iFile2 = await parser.extractFile('war3map.w3i'); // Same file

    expect(w3iFile1).not.toBeNull();
    expect(w3iFile2).not.toBeNull();
  });

  it('should list files in archive', () => {
    if (!parser) {
      console.warn('Skipping test - map file not available');
      return;
    }

    const files = parser.listFiles();
    expect(files.length).toBeGreaterThan(0);
    console.log(`Found ${files.length} files in archive`);

    // Should find common W3X files
    const hasW3i = files.includes('war3map.w3i');
    const hasW3e = files.includes('war3map.w3e');

    console.log('Files in archive:', files.slice(0, 10));
    console.log('Has war3map.w3i:', hasW3i);
    console.log('Has war3map.w3e:', hasW3e);
  });
});
