/**
 * Visual regression tests for SC2 map preview rendering
 * Tests both embedded preview extraction and Babylon.js terrain generation
 */

import { MapPreviewExtractor } from '../../MapPreviewExtractor';
import type { RawMapData } from '../../../../formats/maps/types';

// Skip tests if WebGL is not available (headless CI)
const describeIfWebGL =
  typeof window !== 'undefined' && window.WebGLRenderingContext != null
    ? describe
    : describe.skip;

/**
 * Convert base64 data URL to image buffer for jest-image-snapshot
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Load real SC2 map file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/sc2/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
}

/**
 * Create mock map data for testing
 */
function createMockMapData(width: number = 128, height: number = 128): RawMapData {
  const size = width * height;
  const heightmap = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    heightmap[i] = Math.random() * 10;
  }

  return {
    format: 'sc2map',
    info: {
      name: 'Test Map',
      author: 'Test Author',
      description: 'Test Description',
      players: [
        {
          id: 1,
          name: 'Player 1',
          type: 'human',
          race: 'Terran',
        },
        {
          id: 2,
          name: 'Player 2',
          type: 'human',
          race: 'Protoss',
        },
      ],
      dimensions: {
        width,
        height,
      },
      environment: {
        tileset: 'Bel\'Shir',
      },
    },
    terrain: {
      width,
      height,
      heightmap,
      textures: [],
    },
    units: [],
    doodads: [],
  };
}

describeIfWebGL('SC2 Previews', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  describe('Embedded Preview Extraction', () => {
    it('should extract PreviewImage.tga from SC2 map', async () => {
      // Arrange
      const file = await loadTestMap('Aliens Binary Mothership.SC2Map');
      const mockMapData = createMockMapData(256, 256);

      // Act
      const result = await extractor.extract(file, mockMapData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(result.dataUrl).toBeDefined();

      // Visual regression check
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01, // 1% pixel difference tolerance
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-embedded-preview',
      });
    }, 20000); // 20s timeout for file loading + extraction
  });

  describe('Generated Fallback', () => {
    it('should generate preview when forceGenerate is true', async () => {
      // Arrange
      const file = await loadTestMap('Aliens Binary Mothership.SC2Map');
      const mockMapData = createMockMapData(128, 128);

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(result.dataUrl).toBeDefined();

      // Visual regression check
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-generated-preview',
      });
    }, 20000);
  });

  describe('Terrain Rendering Variations', () => {
    it('should render consistent preview for 64x64 terrain', async () => {
      // Arrange
      const file = await loadTestMap('Ruined Citadel.SC2Map');
      const mockMapData = createMockMapData(64, 64);
      // Use deterministic heightmap for consistent snapshots
      for (let i = 0; i < 64 * 64; i++) {
        mockMapData.terrain.heightmap[i] = Math.sin(i / 10) * 5;
      }

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-64x64-terrain',
      });
    }, 20000);

    it('should render consistent preview for 256x256 terrain', async () => {
      // Arrange
      const file = await loadTestMap('TheUnitTester7.SC2Map');
      const mockMapData = createMockMapData(256, 256);
      // Use deterministic heightmap for consistent snapshots
      for (let i = 0; i < 256 * 256; i++) {
        mockMapData.terrain.heightmap[i] = Math.cos(i / 50) * 10;
      }

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-256x256-terrain',
      });
    }, 20000);
  });
});
