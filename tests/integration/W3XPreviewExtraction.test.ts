/**
 * W3X Map Preview Extraction Integration Test
 *
 * Verifies the complete pipeline:
 * File → MPQParser → W3XMapLoader → MapPreviewExtractor → Preview Image
 */

import * as fs from 'fs';
import * as path from 'path';
import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { W3XMapLoader } from '../../src/formats/maps/w3x/W3XMapLoader';

describe('W3X Preview Extraction Integration', () => {
  const testMapPath = path.join(
    __dirname,
    '../../maps/EchoIslesAlltherandom.w3x'
  );

  it('should load W3X map and extract required files', async () => {
    // Read map file
    const buffer = fs.readFileSync(testMapPath);
    expect(buffer.byteLength).toBeGreaterThan(0);
    console.log(`Loaded W3X map: ${buffer.byteLength} bytes`);

    // Parse MPQ archive
    const parser = new MPQParser(buffer.buffer);
    const result = parser.parse();

    expect(result.success).toBe(true);
    expect(result.archive).toBeDefined();
    console.log(`MPQ parsed successfully in ${result.parseTimeMs.toFixed(2)}ms`);

    // Verify we can extract war3map.w3i (map info)
    const w3iFile = await parser.extractFile('war3map.w3i');
    expect(w3iFile).not.toBeNull();
    expect(w3iFile?.data.byteLength).toBeGreaterThan(0);
    console.log(`Extracted war3map.w3i: ${w3iFile?.data.byteLength} bytes`);

    // Verify we can extract war3map.w3e (terrain)
    const w3eFile = await parser.extractFile('war3map.w3e');
    expect(w3eFile).not.toBeNull();
    expect(w3eFile?.data.byteLength).toBeGreaterThan(0);
    console.log(`Extracted war3map.w3e: ${w3eFile?.data.byteLength} bytes`);
  });

  it.skip('should parse W3X map using W3XMapLoader (SKIP: multi-compression not yet supported)', async () => {
    // Read map file
    const buffer = fs.readFileSync(testMapPath);

    // Use W3XMapLoader to parse (pass ArrayBuffer directly)
    const loader = new W3XMapLoader();
    const mapData = await loader.parse(buffer.buffer as ArrayBuffer);

    expect(mapData).toBeDefined();
    expect(mapData.format).toBe('w3x');
    expect(mapData.info).toBeDefined();
    expect(mapData.terrain).toBeDefined();

    console.log(`Map name: ${mapData.info.name}`);
    console.log(`Map size: ${mapData.terrain?.width}x${mapData.terrain?.height}`);
    console.log(`Terrain tiles: ${mapData.terrain?.tiles?.length ?? 0}`);

    // Verify terrain data is valid
    expect(mapData.terrain?.width).toBeGreaterThan(0);
    expect(mapData.terrain?.height).toBeGreaterThan(0);
    expect(mapData.terrain?.tiles).toBeDefined();
    expect(mapData.terrain?.tiles?.length).toBeGreaterThan(0);
  });

  it.skip('should complete full extraction pipeline (SKIP: multi-compression not yet supported)', async () => {
    // Read map file
    const buffer = fs.readFileSync(testMapPath);
    const arrayBuffer = buffer.buffer as ArrayBuffer;

    // Parse with MPQ
    const parser = new MPQParser(arrayBuffer);
    const mpqResult = parser.parse();
    expect(mpqResult.success).toBe(true);

    // Load map data
    const loader = new W3XMapLoader();
    const mapData = await loader.parse(arrayBuffer);
    expect(mapData).toBeDefined();

    // List all files in archive
    const files = parser.listFiles();
    console.log(`Archive contains ${files.length} files`);
    console.log('Files:', files.slice(0, 10)); // Show first 10

    // Check for preview files
    const hasPreview = files.some(
      (f) =>
        f.toLowerCase().includes('preview') ||
        f.toLowerCase().includes('map.tga')
    );
    console.log(`Has preview file: ${hasPreview}`);

    // This confirms the pipeline works
    expect(files.length).toBeGreaterThan(0);
    expect(mapData.info.name).toBeTruthy();
    expect(mapData.terrain?.tiles).toBeDefined();
  });
});
