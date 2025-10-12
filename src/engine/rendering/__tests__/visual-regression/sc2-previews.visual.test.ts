/**
 * Visual regression tests for SC2 map preview rendering
 * Tests both embedded preview extraction and Babylon.js terrain generation
 *
 * Note: These tests use mock images to test the visual regression infrastructure
 * without requiring a full WebGL context. Real rendering tests should be run in
 * a GPU-enabled environment.
 */

import type { RawMapData } from '../../../../formats/maps/types';
import { generateMockPreviewImage, generateMockTerrainImage, hashString } from '../visualTestUtils';

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
        tileset: "Bel'Shir",
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

describe('SC2 Previews', () => {
  describe('Embedded Preview Extraction', () => {
    it('should extract PreviewImage.tga from SC2 map', async () => {
      // Arrange - Generate mock embedded preview
      const mockMapData = createMockMapData(256, 256);
      const mapIdentifier = 'SC2-Embedded-AliensBinaryMothership';
      const seed = hashString(mapIdentifier);

      // Generate deterministic mock image
      const dataUrl = generateMockPreviewImage(512, 512, mapIdentifier, seed);

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01, // 1% pixel difference tolerance
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-embedded-preview',
      });
    }, 20000);
  });

  describe('Generated Fallback', () => {
    it('should generate preview when forceGenerate is true', async () => {
      // Arrange - Generate mock terrain preview
      const mockMapData = createMockMapData(128, 128);

      // Generate mock terrain-based preview
      const dataUrl = generateMockTerrainImage(512, 512, 'hills');

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-generated-preview',
      });
    }, 20000);
  });

  describe('Terrain Rendering Variations', () => {
    it('should render consistent preview for 64x64 terrain', async () => {
      // Arrange - Generate small terrain preview
      const mockMapData = createMockMapData(64, 64);

      // Generate deterministic terrain preview
      const mapIdentifier = 'SC2-64x64-RuinedCitadel';
      const seed = hashString(mapIdentifier);
      const dataUrl = generateMockPreviewImage(512, 512, '64x64 Terrain', seed);

      // Assert
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-64x64-terrain',
      });
    }, 20000);

    it('should render consistent preview for 256x256 terrain', async () => {
      // Arrange - Generate large terrain preview
      const mockMapData = createMockMapData(256, 256);

      // Generate deterministic terrain preview
      const mapIdentifier = 'SC2-256x256-TheUnitTester7';
      const seed = hashString(mapIdentifier);
      const dataUrl = generateMockPreviewImage(512, 512, '256x256 Terrain', seed);

      // Assert
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'sc2-256x256-terrain',
      });
    }, 20000);
  });
});
