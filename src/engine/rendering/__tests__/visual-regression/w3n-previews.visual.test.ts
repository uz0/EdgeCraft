/**
 * Visual regression tests for W3N campaign preview rendering
 *
 * ⚠️ SKIPPED IN AUTOMATED TESTS ⚠️
 * W3N files are 320MB-923MB, too large for fast CI/CD pipeline.
 *
 * For manual testing:
 * 1. Temporarily enable these tests by removing describe.skip
 * 2. Run: npm test -- w3n-previews.visual.test.ts --updateSnapshot
 * 3. Verify baselines manually
 * 4. Re-skip these tests
 */

import { MapPreviewExtractor } from '../../MapPreviewExtractor';
import type { RawMapData } from '../../../../formats/maps/types';

// Always skip W3N tests in automation
const describeSkip = describe.skip;

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
 * Load real W3N campaign file for testing
 */
async function loadTestMap(filename: string): Promise<File> {
  const path = `./fixtures/w3n/${filename}`;
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/octet-stream' });
}

/**
 * Create mock W3N map data for testing
 */
function createMockMapData(): RawMapData {
  const width = 256;
  const height = 256;
  const size = width * height;
  const heightmap = new Float32Array(size);

  // Deterministic heightmap
  for (let i = 0; i < size; i++) {
    heightmap[i] = Math.random() * 20;
  }

  return {
    format: 'w3n',
    info: {
      name: 'Searching For Power',
      author: 'Blizzard Entertainment',
      description: 'Campaign Map',
      players: [
        {
          id: 1,
          name: 'Player 1',
          type: 'human',
          race: 'Night Elf',
        },
      ],
      dimensions: {
        width,
        height,
      },
      environment: {
        tileset: 'Felwood',
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

describeSkip('W3N Previews (Manual Testing Only)', () => {
  let extractor: MapPreviewExtractor;

  beforeAll(() => {
    extractor = new MapPreviewExtractor();
  });

  afterAll(() => {
    extractor.dispose();
  });

  it('should generate preview for W3N campaign', async () => {
    // Arrange
    const file = await loadTestMap('SearchingForPower.w3n');
    const mockMapData = createMockMapData();

    // Act
    const result = await extractor.extract(file, mockMapData, { forceGenerate: true });

    // Assert
    expect(result.success).toBe(true);
    const imageBuffer = dataUrlToBuffer(result.dataUrl!);
    expect(imageBuffer).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
      customSnapshotIdentifier: 'w3n-campaign-preview',
    });
  }, 60000); // 60s timeout for large file
});
