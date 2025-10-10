/**
 * W3N Campaign Loader Tests
 *
 * Tests for Warcraft 3 Campaign file loading
 */

import { W3NCampaignLoader } from './W3NCampaignLoader';
import { W3FCampaignInfoParser } from './W3FCampaignInfoParser';
import { MPQParser } from '../../mpq/MPQParser';
import { W3XMapLoader } from '../w3x/W3XMapLoader';
import type { RawMapData } from '../types';

// Mock dependencies
jest.mock('../../mpq/MPQParser');
jest.mock('../w3x/W3XMapLoader');

describe('W3NCampaignLoader', () => {
  let loader: W3NCampaignLoader;
  let mockMapData: RawMapData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock map data
    mockMapData = {
      format: 'w3x',
      info: {
        name: 'Test Map',
        author: 'Test Author',
        description: 'Test Description',
        players: [],
        dimensions: { width: 128, height: 128 },
        environment: { tileset: 'A' },
      },
      terrain: {
        width: 128,
        height: 128,
        heightmap: new Float32Array(128 * 128),
        textures: [],
      },
      units: [],
      doodads: [],
    };

    // Mock the W3XMapLoader parse method BEFORE creating loader
    jest.mocked(W3XMapLoader).prototype.parse = jest.fn().mockResolvedValue(mockMapData);

    loader = new W3NCampaignLoader();
  });

  describe('parse', () => {
    it('should parse a valid W3N campaign file', async () => {
      // Create mock campaign buffer
      const mockCampaignBuffer = new ArrayBuffer(1024);

      // Mock MPQParser behavior
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn((filename: string) => {
          if (filename === 'war3campaign.w3f') {
            return {
              name: filename,
              data: createMockCampaignInfo(),
              compressedSize: 512,
              uncompressedSize: 512,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          if (filename === '(listfile)') {
            const listContent = 'war3campaign.w3f\nChapter01.w3x\nChapter02.w3x\n';
            const encoder = new TextEncoder();
            return {
              name: filename,
              data: encoder.encode(listContent).buffer,
              compressedSize: listContent.length,
              uncompressedSize: listContent.length,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          if (filename === 'Chapter01.w3x') {
            return {
              name: filename,
              data: createMockMapBuffer(),
              compressedSize: 1024,
              uncompressedSize: 1024,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          return null;
        }),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      // Parse campaign
      const result = await loader.parse(mockCampaignBuffer);

      // Verify result
      expect(result).toBeDefined();
      expect(result.format).toBe('w3n');
      expect(result.info.name).toBe('Test Map');
    });

    it('should throw error if no maps found in campaign', async () => {
      const mockCampaignBuffer = new ArrayBuffer(1024);

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn().mockReturnValue(null),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      await expect(loader.parse(mockCampaignBuffer)).rejects.toThrow(
        'No maps found in campaign archive'
      );
    });

    it('should throw error if MPQ parsing fails', async () => {
      const mockCampaignBuffer = new ArrayBuffer(1024);

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: false,
          error: 'Invalid MPQ archive',
        }),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      await expect(loader.parse(mockCampaignBuffer)).rejects.toThrow(
        'Failed to parse campaign MPQ archive: Invalid MPQ archive'
      );
    });

    it('should handle File input', async () => {
      // Create a mock File with arrayBuffer method
      const buffer = new ArrayBuffer(1024);
      const mockFile = {
        arrayBuffer: jest.fn().mockResolvedValue(buffer),
        name: 'test.w3n',
      } as unknown as File;

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn((filename: string) => {
          if (filename === '(listfile)') {
            const listContent = 'Chapter01.w3x\n';
            const encoder = new TextEncoder();
            return {
              name: filename,
              data: encoder.encode(listContent).buffer,
              compressedSize: listContent.length,
              uncompressedSize: listContent.length,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          if (filename === 'Chapter01.w3x') {
            return {
              name: filename,
              data: createMockMapBuffer(),
              compressedSize: 1024,
              uncompressedSize: 1024,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          return null;
        }),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Test Map',
          author: 'Test Author',
          description: 'Test Description',
          players: [],
          dimensions: { width: 128, height: 128 },
          environment: { tileset: 'A' },
        },
        terrain: {
          width: 128,
          height: 128,
          heightmap: new Float32Array(128 * 128),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      jest.mocked(W3XMapLoader).prototype.parse = jest.fn().mockResolvedValue(mockMapData);

      const result = await loader.parse(mockFile);

      expect(result).toBeDefined();
      expect(result.format).toBe('w3n');
    });
  });

  describe('getCampaignInfo', () => {
    it('should extract campaign info from W3N file', async () => {
      const mockCampaignBuffer = new ArrayBuffer(1024);

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn((filename: string) => {
          if (filename === 'war3campaign.w3f') {
            return {
              name: filename,
              data: createMockCampaignInfo(),
              compressedSize: 512,
              uncompressedSize: 512,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          return null;
        }),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      const info = await loader.getCampaignInfo(mockCampaignBuffer);

      expect(info).toBeDefined();
      expect(info?.name).toBeDefined();
    });

    it('should return null if campaign info not found', async () => {
      const mockCampaignBuffer = new ArrayBuffer(1024);

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn().mockReturnValue(null),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      const info = await loader.getCampaignInfo(mockCampaignBuffer);

      expect(info).toBeNull();
    });
  });

  describe('getEmbeddedMapList', () => {
    it('should list embedded maps in campaign', async () => {
      const mockCampaignBuffer = new ArrayBuffer(1024);

      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: {},
        }),
        extractFile: jest.fn((filename: string) => {
          if (filename === '(listfile)') {
            const listContent = 'Chapter01.w3x\nChapter02.w3x\n';
            const encoder = new TextEncoder();
            return {
              name: filename,
              data: encoder.encode(listContent).buffer,
              compressedSize: listContent.length,
              uncompressedSize: listContent.length,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          if (filename === 'Chapter01.w3x' || filename === 'Chapter02.w3x') {
            return {
              name: filename,
              data: new ArrayBuffer(1024),
              compressedSize: 1024,
              uncompressedSize: 1024,
              isCompressed: false,
              isEncrypted: false,
            };
          }
          return null;
        }),
      };

      (MPQParser as unknown as jest.Mock).mockImplementation(() => mockMPQParser);

      const maps = await loader.getEmbeddedMapList(mockCampaignBuffer);

      expect(maps).toBeDefined();
      expect(maps.length).toBeGreaterThan(0);
    });
  });
});

describe('W3FCampaignInfoParser', () => {
  it('should parse campaign info buffer', () => {
    const buffer = createMockCampaignInfo();
    const parser = new W3FCampaignInfoParser(buffer);
    const info = parser.parse();

    expect(info).toBeDefined();
    expect(info.formatVersion).toBeDefined();
    expect(info.name).toBeDefined();
  });
});

// Helper functions

function createMockCampaignInfo(): ArrayBuffer {
  // Create a minimal valid war3campaign.w3f buffer
  const buffer = new ArrayBuffer(512);
  const view = new DataView(buffer);
  let offset = 0;

  // Format version (int)
  view.setInt32(offset, 1, true);
  offset += 4;

  // Campaign version (int)
  view.setInt32(offset, 1, true);
  offset += 4;

  // Editor version (int)
  view.setInt32(offset, 6102, true);
  offset += 4;

  // Campaign name (null-terminated string)
  const name = 'Test Campaign';
  for (let i = 0; i < name.length; i++) {
    view.setUint8(offset++, name.charCodeAt(i));
  }
  view.setUint8(offset++, 0); // null terminator

  // Difficulty (null-terminated string)
  const difficulty = 'Normal';
  for (let i = 0; i < difficulty.length; i++) {
    view.setUint8(offset++, difficulty.charCodeAt(i));
  }
  view.setUint8(offset++, 0);

  // Author (null-terminated string)
  const author = 'Test Author';
  for (let i = 0; i < author.length; i++) {
    view.setUint8(offset++, author.charCodeAt(i));
  }
  view.setUint8(offset++, 0);

  // Description (null-terminated string)
  const description = 'Test Description';
  for (let i = 0; i < description.length; i++) {
    view.setUint8(offset++, description.charCodeAt(i));
  }
  view.setUint8(offset++, 0);

  // Difficulty flags (int)
  view.setInt32(offset, 2, true); // Fixed Difficulty, Contains w3x maps
  offset += 4;

  // Background screen index (int)
  view.setInt32(offset, -1, true);
  offset += 4;

  // Custom background path (empty string)
  view.setUint8(offset++, 0);

  // Minimap path (empty string)
  view.setUint8(offset++, 0);

  // Ambient sound index (int)
  view.setInt32(offset, 0, true);
  offset += 4;

  // Custom sound path (empty string)
  view.setUint8(offset++, 0);

  // Fog style index (int)
  view.setInt32(offset, 0, true);
  offset += 4;

  // Fog Z start (float)
  view.setFloat32(offset, 0.0, true);
  offset += 4;

  // Fog Z end (float)
  view.setFloat32(offset, 5000.0, true);
  offset += 4;

  // Fog density (float)
  view.setFloat32(offset, 0.5, true);
  offset += 4;

  // Fog color (RGBA)
  view.setUint8(offset++, 0); // R
  view.setUint8(offset++, 0); // G
  view.setUint8(offset++, 0); // B
  view.setUint8(offset++, 255); // A

  return buffer;
}

function createMockMapBuffer(): ArrayBuffer {
  // Create a minimal valid W3X map buffer (just MPQ header)
  const buffer = new ArrayBuffer(1024);
  const view = new DataView(buffer);

  // MPQ magic number
  view.setUint32(0, 0x1a51504d, true);

  return buffer;
}
