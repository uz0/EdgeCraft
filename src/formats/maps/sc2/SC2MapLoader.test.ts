/**
 * SC2MapLoader Tests
 * Unit tests for StarCraft 2 map loader
 */

import { SC2MapLoader } from './SC2MapLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('SC2MapLoader', () => {
  let loader: SC2MapLoader;

  beforeEach(() => {
    loader = new SC2MapLoader();
  });

  describe('parse', () => {
    it('should create an instance', () => {
      expect(loader).toBeDefined();
      expect(loader).toBeInstanceOf(SC2MapLoader);
    });

    it('should have a parse method', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const parseMethod = loader.parse;
      expect(parseMethod).toBeDefined();
      expect(typeof parseMethod).toBe('function');
    });

    it('should handle invalid MPQ archive', async () => {
      const emptyBuffer = new ArrayBuffer(512);

      await expect(loader.parse(emptyBuffer)).rejects.toThrow('Failed to parse MPQ archive');
    });

    it('should parse Ruined Citadel.SC2Map', async () => {
      const mapPath = path.join(__dirname, '../../../../maps/Ruined Citadel.SC2Map');

      // Check if file exists and is valid (not a placeholder)
      if (!fs.existsSync(mapPath) || fs.statSync(mapPath).size < 1000) {
        console.warn(`Skipping test: ${mapPath} not found or invalid`);
        return;
      }

      const buffer = fs.readFileSync(mapPath);
      const result = await loader.parse(buffer as unknown as ArrayBuffer);

      expect(result).toBeDefined();
      expect(result.format).toBe('sc2map');
      expect(result.info).toBeDefined();
      expect(result.info.name).toBeTruthy();
      expect(result.terrain).toBeDefined();
      expect(result.terrain.width).toBeGreaterThan(0);
      expect(result.terrain.height).toBeGreaterThan(0);
      expect(result.units).toBeDefined();
      expect(result.doodads).toBeDefined();
    }, 10000); // 10 second timeout

    it('should parse TheUnitTester7.SC2Map', async () => {
      const mapPath = path.join(__dirname, '../../../../maps/TheUnitTester7.SC2Map');

      // Check if file exists and is valid (not a placeholder)
      if (!fs.existsSync(mapPath) || fs.statSync(mapPath).size < 1000) {
        console.warn(`Skipping test: ${mapPath} not found or invalid`);
        return;
      }

      const buffer = fs.readFileSync(mapPath);
      const result = await loader.parse(buffer as unknown as ArrayBuffer);

      expect(result).toBeDefined();
      expect(result.format).toBe('sc2map');
      expect(result.info).toBeDefined();
      expect(result.terrain).toBeDefined();
      expect(result.terrain.width).toBeGreaterThan(0);
      expect(result.terrain.height).toBeGreaterThan(0);
    }, 10000); // 10 second timeout

    it('should parse Aliens Binary Mothership.SC2Map', async () => {
      const mapPath = path.join(__dirname, '../../../../maps/Aliens Binary Mothership.SC2Map');

      // Check if file exists and is valid (not a placeholder)
      if (!fs.existsSync(mapPath) || fs.statSync(mapPath).size < 1000) {
        console.warn(`Skipping test: ${mapPath} not found or invalid`);
        return;
      }

      const buffer = fs.readFileSync(mapPath);
      const result = await loader.parse(buffer as unknown as ArrayBuffer);

      expect(result).toBeDefined();
      expect(result.format).toBe('sc2map');
      expect(result.info).toBeDefined();
      expect(result.terrain).toBeDefined();
      expect(result.terrain.width).toBeGreaterThan(0);
      expect(result.terrain.height).toBeGreaterThan(0);
    }, 10000); // 10 second timeout

    it('should complete loading within 2 seconds for large file', async () => {
      const mapPath = path.join(__dirname, '../../../../maps/Aliens Binary Mothership.SC2Map');

      // Check if file exists and is valid (not a placeholder)
      if (!fs.existsSync(mapPath) || fs.statSync(mapPath).size < 1000) {
        console.warn(`Skipping test: ${mapPath} not found or invalid`);
        return;
      }

      const buffer = fs.readFileSync(mapPath);
      const startTime = performance.now();

      await loader.parse(buffer as unknown as ArrayBuffer);

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(2000); // Should load in less than 2 seconds
    }, 10000); // 10 second timeout
  });

  describe('integration', () => {
    it('should return RawMapData with required fields', async () => {
      const mapPath = path.join(__dirname, '../../../../maps/Ruined Citadel.SC2Map');

      // Check if file exists and is valid (not a placeholder)
      if (!fs.existsSync(mapPath) || fs.statSync(mapPath).size < 1000) {
        console.warn(`Skipping test: ${mapPath} not found or invalid`);
        return;
      }

      const buffer = fs.readFileSync(mapPath);
      const result = await loader.parse(buffer as unknown as ArrayBuffer);

      // Check format
      expect(result.format).toBe('sc2map');

      // Check info
      expect(result.info).toHaveProperty('name');
      expect(result.info).toHaveProperty('author');
      expect(result.info).toHaveProperty('description');
      expect(result.info).toHaveProperty('players');
      expect(result.info).toHaveProperty('dimensions');

      // Check terrain
      expect(result.terrain).toHaveProperty('width');
      expect(result.terrain).toHaveProperty('height');
      expect(result.terrain).toHaveProperty('heightmap');
      expect(result.terrain).toHaveProperty('textures');

      // Check arrays
      expect(Array.isArray(result.units)).toBe(true);
      expect(Array.isArray(result.doodads)).toBe(true);
    }, 10000); // 10 second timeout
  });
});
