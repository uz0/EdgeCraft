/**
 * Visual regression tests for W3X map preview rendering
 *
 * NOTE: W3X maps use multi-compression (0x15 = Huffman + BZip2) which is NOT yet supported.
 * These tests focus on GENERATED previews only (terrain rendering via Babylon.js).
 * When multi-compression is implemented, add embedded extraction tests.
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
 * Load real W3X map file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/w3x/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
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

describeIfWebGL('W3X Previews', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  describe('Generated Terrain Previews', () => {
    it('should generate preview for small W3X map (EchoIsles)', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData = createMockMapData(128, 128);
      // Use deterministic heightmap for consistent snapshots
      for (let i = 0; i < 128 * 128; i++) {
        mockMapData.terrain.heightmap[i] = Math.sin(i / 30) * 15;
      }

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
        customSnapshotIdentifier: 'w3x-echo-isles-generated',
      });
    }, 20000);

    it('should generate preview for medium W3X map (Raging Stream)', async () => {
      // Arrange
      const file = await loadTestMap('ragingstream.w3x');
      const mockMapData = createMockMapData(96, 96);
      // Use deterministic heightmap for consistent snapshots
      for (let i = 0; i < 96 * 96; i++) {
        mockMapData.terrain.heightmap[i] = Math.sin(i / 20) * 8;
      }

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-raging-stream-generated',
      });
    }, 20000);
  });

  describe('Terrain Variations', () => {
    it('should render flat terrain consistently', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData = createMockMapData(64, 64);
      // Completely flat terrain
      mockMapData.terrain.heightmap.fill(5.0);

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
      expect(imageBuffer).toMatchImageSnapshot({
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: 'w3x-flat-terrain',
      });
    }, 20000);

    it('should render hilly terrain consistently', async () => {
      // Arrange
      const file = await loadTestMap('EchoIslesAlltherandom.w3x');
      const mockMapData = createMockMapData(64, 64);
      // Hilly terrain with deterministic pattern
      for (let i = 0; i < 64 * 64; i++) {
        const x = i % 64;
        const y = Math.floor(i / 64);
        mockMapData.terrain.heightmap[i] = Math.sin(x / 5) * 10 + Math.cos(y / 5) * 10;
      }

      // Act
      const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

      // Assert
      expect(result.success).toBe(true);
      const imageBuffer = dataUrlToBuffer(result.dataUrl!);
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
