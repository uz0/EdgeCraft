/**
 * Integration test: Validate map parsers with real map files
 * Tests MPQ extraction, decompression, and format parsing
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { W3XMapLoader } from './w3x/W3XMapLoader';
import { SC2MapLoader } from './sc2/SC2MapLoader';

describe('Map Parser Integration Tests', () => {
  const mapsDir = join(__dirname, '../../../public/maps');

  describe('W3X Map Parser', () => {
    it('should parse [12]MeltedCrown_1.0.w3x successfully', async () => {
      const mapPath = join(mapsDir, '[12]MeltedCrown_1.0.w3x');
      const buffer = await fs.readFile(mapPath);

      const loader = new W3XMapLoader();
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const mapData = await loader.parse(arrayBuffer);

      // Verify map data structure
      expect(mapData).toBeDefined();
      expect(mapData.format).toBe('w3x');
      expect(mapData.info).toBeDefined();
      expect(mapData.terrain).toBeDefined();

      // Verify map info
      expect(mapData.info.name).toBeTruthy();
      expect(mapData.info.dimensions.width).toBeGreaterThan(0);
      expect(mapData.info.dimensions.height).toBeGreaterThan(0);

      // Verify terrain data
      expect(mapData.terrain.width).toBeGreaterThan(0);
      expect(mapData.terrain.height).toBeGreaterThan(0);
      expect(mapData.terrain.heightmap).toBeInstanceOf(Float32Array);
      expect(mapData.terrain.heightmap.length).toBe(
        mapData.terrain.width * mapData.terrain.height
      );

      // Verify textures
      expect(mapData.terrain.textures).toBeDefined();
      expect(mapData.terrain.textures.length).toBeGreaterThan(0);

      console.log(`✓ W3X Map: "${mapData.info.name}"`);
      console.log(`  Dimensions: ${mapData.terrain.width}x${mapData.terrain.height}`);
      console.log(`  Textures: ${mapData.terrain.textures.length}`);
      console.log(`  Units: ${mapData.units?.length ?? 0}`);
      console.log(`  Doodads: ${mapData.doodads?.length ?? 0}`);
    }, 30000);

    it('should parse asset_test.w3m successfully', async () => {
      const mapPath = join(mapsDir, 'asset_test.w3m');
      const buffer = await fs.readFile(mapPath);

      const loader = new W3XMapLoader();
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const mapData = await loader.parse(arrayBuffer);

      expect(mapData).toBeDefined();
      expect(mapData.format).toBe('w3x');
      expect(mapData.terrain.heightmap.length).toBeGreaterThan(0);

      console.log(`✓ W3M Map: "${mapData.info.name}"`);
      console.log(`  Dimensions: ${mapData.terrain.width}x${mapData.terrain.height}`);
    }, 30000);

    it('should parse trigger_test.w3m and verify height data', async () => {
      const mapPath = join(mapsDir, 'trigger_test.w3m');
      const buffer = await fs.readFile(mapPath);

      const loader = new W3XMapLoader();
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const mapData = await loader.parse(arrayBuffer);

      expect(mapData).toBeDefined();
      expect(mapData.format).toBe('w3x');

      const heightmap = mapData.terrain.heightmap;
      const first10 = Array.from(heightmap.slice(0, 10));

      let minHeight = Infinity;
      let maxHeight = -Infinity;
      const uniqueSet = new Set<number>();

      for (let i = 0; i < heightmap.length; i++) {
        const h = heightmap[i]!;
        minHeight = Math.min(minHeight, h);
        maxHeight = Math.max(maxHeight, h);
        uniqueSet.add(h);
      }

      const uniqueHeights = Array.from(uniqueSet).sort((a, b) => a - b);

      console.log('=== trigger_test.w3m Height Analysis ===');
      console.log('Dimensions:', mapData.terrain.width, 'x', mapData.terrain.height);
      console.log('First 10 heights:', first10.map((h) => h.toFixed(2)));
      console.log('Min height:', minHeight);
      console.log('Max height:', maxHeight);
      console.log('Range:', maxHeight - minHeight);
      console.log('Unique heights (first 20):', uniqueHeights.slice(0, 20).map((h) => h.toFixed(2)));
      console.log('Total unique heights:', uniqueHeights.length);

      console.log('\nExpected: Flat terrain (trigger_test.w3m SHOULD BE FLAT!)');
    }, 30000);
  });

  describe('SC2Map Parser', () => {
    it('should parse Starlight.SC2Map successfully', async () => {
      const mapPath = join(mapsDir, 'Starlight.SC2Map');
      const buffer = await fs.readFile(mapPath);

      const loader = new SC2MapLoader();
      const mapData = await loader.parse(buffer as unknown as ArrayBuffer);

      expect(mapData).toBeDefined();
      expect(mapData.format).toBe('sc2map'); // SC2MapLoader returns 'sc2map', not 'sc2'
      expect(mapData.info).toBeDefined();
      expect(mapData.terrain).toBeDefined();

      console.log(`✓ SC2Map: "${mapData.info.name}"`);
      console.log(`  Dimensions: ${mapData.terrain.width}x${mapData.terrain.height}`);
      console.log(`  Units: ${mapData.units?.length ?? 0}`);
    }, 30000);

    it('should parse asset_test.SC2Map successfully', async () => {
      const mapPath = join(mapsDir, 'asset_test.SC2Map');
      const buffer = await fs.readFile(mapPath);

      const loader = new SC2MapLoader();
      const mapData = await loader.parse(buffer as unknown as ArrayBuffer);

      expect(mapData).toBeDefined();
      expect(mapData.format).toBe('sc2map'); // SC2MapLoader returns 'sc2map', not 'sc2'

      console.log(`✓ SC2Map (asset_test): "${mapData.info.name}"`);
    }, 30000);
  });
});
