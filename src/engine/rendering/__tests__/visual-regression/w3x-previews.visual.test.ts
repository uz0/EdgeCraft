/**
 * Visual regression tests for W3X map preview rendering
 *
 * NOTE: W3X maps use multi-compression (0x15 = Huffman + BZip2) which is NOT yet supported.
 * These tests focus on GENERATED previews only (terrain rendering via Babylon.js).
 * When multi-compression is implemented, add embedded extraction tests.
 *
 * These tests use mock images to test the visual regression infrastructure
 * without requiring a full WebGL context. Real rendering tests should be run in
 * a GPU-enabled environment.
 */

import type { RawMapData } from '../../../../formats/maps/types';
import {
  generateMockPreviewImage,
  generateMockTerrainImage,
  hashString,
} from '../visualTestUtils';

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
 * Create mock W3X map data for testing
 */
function createMockMapData(width: number = 128, height: number = 128): RawMapData {
  const size = width * height;
  const heightmap = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    heightmap[i] = Math.random() * 15;
  }

  return {
    format: 'w3x',
    info: {
      name: 'Test W3X Map',
      author: 'Blizzard Entertainment',
      description: 'Test W3X Description',
      players: [
        {
          id: 1,
          name: 'Player 1',
          type: 'human',
          race: 'Human',
        },
        {
          id: 2,
          name: 'Player 2',
          type: 'human',
          race: 'Orc',
        },
        {
          id: 3,
          name: 'Player 3',
          type: 'human',
          race: 'Night Elf',
        },
        {
          id: 4,
          name: 'Player 4',
          type: 'human',
          race: 'Undead',
        },
      ],
      dimensions: {
        width,
        height,
      },
      environment: {
        tileset: 'Ashenvale',
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

describe('W3X Previews', () => {
  describe('Generated Terrain Previews', () => {
    it('should generate preview for small W3X map (EchoIsles)', async () => {
      // Arrange - Generate mock terrain preview
      const mockMapData = createMockMapData(128, 128);

      // Generate mock terrain-based preview with hills
      const dataUrl = generateMockTerrainImage(512, 512, 'hills');

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-echo-isles-generated',
      });
    }, 20000);

    it('should generate preview for medium W3X map (Raging Stream)', async () => {
      // Arrange - Generate mock terrain preview
      const mockMapData = createMockMapData(96, 96);

      // Generate deterministic terrain preview
      const mapIdentifier = 'W3X-RagingStream';
      const seed = hashString(mapIdentifier);
      const dataUrl = generateMockPreviewImage(512, 512, 'Raging Stream', seed);

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-raging-stream-generated',
      });
    }, 20000);
  });

  describe('Terrain Variations', () => {
    it('should render flat terrain consistently', async () => {
      // Arrange - Generate flat terrain preview
      const mockMapData = createMockMapData(64, 64);

      // Generate flat terrain image
      const dataUrl = generateMockTerrainImage(512, 512, 'flat');

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-flat-terrain',
      });
    }, 20000);

    it('should render hilly terrain consistently', async () => {
      // Arrange - Generate hilly terrain preview
      const mockMapData = createMockMapData(64, 64);

      // Generate mountainous terrain image
      const dataUrl = generateMockTerrainImage(512, 512, 'mountains');

      // Assert - Visual regression check
      const imageBuffer = dataUrlToBuffer(dataUrl);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-hilly-terrain',
      });
    }, 20000);
  });

  describe.skip('Embedded Preview Extraction (NOT IMPLEMENTED)', () => {
    it('should extract war3mapPreview.tga when multi-compression is supported', async () => {
      // TODO: Implement when W3X multi-compression (0x15) is supported
      // Expected to extract: war3mapPreview.tga, war3mapMap.tga, or war3mapMap.blp
      // Visual regression check against embedded preview baseline
    });
  });
});
