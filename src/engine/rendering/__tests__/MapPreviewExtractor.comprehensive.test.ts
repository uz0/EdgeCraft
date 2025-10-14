/**
 * Comprehensive Unit Tests for MapPreviewExtractor
 *
 * Tests all preview extraction scenarios:
 * - Embedded TGA extraction (W3X, W3N, SC2)
 * - Fallback to terrain generation
 * - Error handling
 * - Format validation
 */

import { MapPreviewExtractor } from '../MapPreviewExtractor';
import { MPQParser } from '../../../formats/mpq/MPQParser';
import type { RawMapData } from '../../../formats/maps/types';
import * as fs from 'fs';
import * as path from 'path';

// Skip tests if running in CI without WebGL support
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Mock modules
jest.mock('../../../formats/mpq/MPQParser');
jest.mock('../TGADecoder');
jest.mock('../MapPreviewGenerator');

if (isCI) {
  describe.skip('MapPreviewExtractor - Comprehensive Unit Tests (skipped in CI)', () => {
    it('requires WebGL support', () => {
      // Placeholder test
    });
  });
} else {
  describe('MapPreviewExtractor - Comprehensive Unit Tests', () => {
    let extractor: MapPreviewExtractor;

    beforeEach(() => {
      extractor = new MapPreviewExtractor();
      jest.clearAllMocks();
    });

    afterEach(() => {
      extractor.dispose();
    });

  // ========================================================================
  // TEST SUITE 1: EMBEDDED EXTRACTION - W3X FORMAT
  // ========================================================================

  describe('Embedded Extraction - W3X Format', () => {
    const mockW3XMapData: RawMapData = {
      format: 'w3x',
      info: {
        name: 'Test Map',
        description: '',
        author: 'Test',
        dimensions: { width: 128, height: 128 },
        players: { maxPlayers: 4 },
        tileset: 'LordaeronSummer',
      },
      terrain: {
        width: 128,
        height: 128,
        heightmap: new Float32Array(128 * 128),
        textures: [],
      },
      units: [],
      doodads: [],
      regions: [],
      cameras: [],
      sounds: [],
    };

    it('should extract war3mapPreview.tga from W3X map', async () => {
      // Mock MPQ parser to return preview file
      const mockPreviewData = Buffer.from('mock TGA data');
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest.fn().mockResolvedValue({
          data: mockPreviewData,
          filename: 'war3mapPreview.tga',
        }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      // Mock TGA decoder
      const mockDataUrl = 'data:image/png;base64,mockedImageData';
      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest.fn().mockReturnValue(mockDataUrl);

      // Create mock File
      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x', {
        type: 'application/octet-stream',
      });

      // Extract
      const result = await extractor.extract(mockFile, mockW3XMapData);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(result.dataUrl).toBe(mockDataUrl);
      expect(mockMPQParser.extractFile).toHaveBeenCalledWith('war3mapPreview.tga');
    });

    it('should fallback to war3mapMap.tga if war3mapPreview.tga missing', async () => {
      // Mock MPQ to fail on first file, succeed on second
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest
          .fn()
          .mockResolvedValueOnce(null) // war3mapPreview.tga not found
          .mockResolvedValueOnce({
            // war3mapMap.tga found
            data: Buffer.from('mock minimap TGA'),
            filename: 'war3mapMap.tga',
          }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const mockDataUrl = 'data:image/png;base64,minimapData';
      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest.fn().mockReturnValue(mockDataUrl);

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockW3XMapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(mockMPQParser.extractFile).toHaveBeenCalledWith('war3mapPreview.tga');
      expect(mockMPQParser.extractFile).toHaveBeenCalledWith('war3mapMap.tga');
    });

    it('should handle maps with no embedded preview files', async () => {
      // Mock MPQ to return null for all preview files
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest.fn().mockResolvedValue(null),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      // Mock generator fallback
      const mockGeneratorDataUrl = 'data:image/png;base64,generatedPreview';
      const MapPreviewGenerator = require('../MapPreviewGenerator').MapPreviewGenerator;
      MapPreviewGenerator.prototype.generatePreview = jest.fn().mockResolvedValue({
        success: true,
        dataUrl: mockGeneratorDataUrl,
        generationTimeMs: 500,
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockW3XMapData);

      // Should fallback to generation
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(result.dataUrl).toBe(mockGeneratorDataUrl);
    });

    it('should handle corrupted TGA files gracefully', async () => {
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest.fn().mockResolvedValue({
          data: Buffer.from('corrupted data'),
          filename: 'war3mapPreview.tga',
        }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      // Mock TGA decoder to return null (decode failure)
      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest.fn().mockReturnValue(null);

      // Mock generator fallback
      const mockGeneratorDataUrl = 'data:image/png;base64,generatedPreview';
      const MapPreviewGenerator = require('../MapPreviewGenerator').MapPreviewGenerator;
      MapPreviewGenerator.prototype.generatePreview = jest.fn().mockResolvedValue({
        success: true,
        dataUrl: mockGeneratorDataUrl,
        generationTimeMs: 500,
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockW3XMapData);

      // Should fallback to generation
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
    });
  });

  // ========================================================================
  // TEST SUITE 2: EMBEDDED EXTRACTION - SC2MAP FORMAT
  // ========================================================================

  describe('Embedded Extraction - SC2Map Format', () => {
    const mockSC2MapData: RawMapData = {
      format: 'sc2map',
      info: {
        name: 'Test SC2 Map',
        description: '',
        author: 'Test',
        dimensions: { width: 256, height: 256 },
        players: { maxPlayers: 2 },
        tileset: 'Char',
      },
      terrain: {
        width: 256,
        height: 256,
        heightmap: new Float32Array(256 * 256),
        textures: [],
      },
      units: [],
      doodads: [],
      regions: [],
      cameras: [],
      sounds: [],
    };

    it('should extract PreviewImage.tga from SC2Map', async () => {
      const mockPreviewData = Buffer.from('SC2 preview TGA');
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest.fn().mockResolvedValue({
          data: mockPreviewData,
          filename: 'PreviewImage.tga',
        }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const mockDataUrl = 'data:image/png;base64,sc2PreviewData';
      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest.fn().mockReturnValue(mockDataUrl);

      const mockFile = new File([new ArrayBuffer(1024)], 'test.SC2Map');
      const result = await extractor.extract(mockFile, mockSC2MapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(mockMPQParser.extractFile).toHaveBeenCalledWith('PreviewImage.tga');
    });

    it('should fallback to Minimap.tga if PreviewImage.tga missing', async () => {
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest
          .fn()
          .mockResolvedValueOnce(null) // PreviewImage.tga not found
          .mockResolvedValueOnce({
            // Minimap.tga found
            data: Buffer.from('SC2 minimap TGA'),
            filename: 'Minimap.tga',
          }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const mockDataUrl = 'data:image/png;base64,sc2MinimapData';
      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest.fn().mockReturnValue(mockDataUrl);

      const mockFile = new File([new ArrayBuffer(1024)], 'test.SC2Map');
      const result = await extractor.extract(mockFile, mockSC2MapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(mockMPQParser.extractFile).toHaveBeenCalledWith('Minimap.tga');
    });
  });

  // ========================================================================
  // TEST SUITE 3: FALLBACK & ERROR HANDLING
  // ========================================================================

  describe('Fallback Chain & Error Handling', () => {
    const mockMapData: RawMapData = {
      format: 'w3x',
      info: {
        name: 'Test',
        description: '',
        author: '',
        dimensions: { width: 64, height: 64 },
        players: { maxPlayers: 2 },
        tileset: 'LordaeronSummer',
      },
      terrain: {
        width: 64,
        height: 64,
        heightmap: new Float32Array(64 * 64),
        textures: [],
      },
      units: [],
      doodads: [],
      regions: [],
      cameras: [],
      sounds: [],
    };

    it('should skip embedded extraction when forceGenerate=true', async () => {
      const mockMPQParser = {
        parse: jest.fn(),
        extractFile: jest.fn(),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const mockGeneratorDataUrl = 'data:image/png;base64,forcedGeneration';
      const MapPreviewGenerator = require('../MapPreviewGenerator').MapPreviewGenerator;
      MapPreviewGenerator.prototype.generatePreview = jest.fn().mockResolvedValue({
        success: true,
        dataUrl: mockGeneratorDataUrl,
        generationTimeMs: 300,
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockMapData, {
        forceGenerate: true,
      });

      // Should NOT call MPQ parser
      expect(mockMPQParser.parse).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
    });

    it('should handle MPQ parse failures gracefully', async () => {
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: false,
          archive: null,
          error: 'Invalid MPQ header',
        }),
        extractFile: jest.fn(),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const mockGeneratorDataUrl = 'data:image/png;base64,fallbackGeneration';
      const MapPreviewGenerator = require('../MapPreviewGenerator').MapPreviewGenerator;
      MapPreviewGenerator.prototype.generatePreview = jest.fn().mockResolvedValue({
        success: true,
        dataUrl: mockGeneratorDataUrl,
        generationTimeMs: 400,
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockMapData);

      // Should fallback to generation
      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(mockMPQParser.extractFile).not.toHaveBeenCalled();
    });

    it('should return error when both extraction and generation fail', async () => {
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: false,
        }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const MapPreviewGenerator = require('../MapPreviewGenerator').MapPreviewGenerator;
      MapPreviewGenerator.prototype.generatePreview = jest.fn().mockResolvedValue({
        success: false,
        generationTimeMs: 0,
        error: 'WebGL not supported',
      });

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockMapData);

      // Should return error
      expect(result.success).toBe(false);
      expect(result.source).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should track extraction time accurately', async () => {
      const mockMPQParser = {
        parse: jest.fn().mockReturnValue({
          success: true,
          archive: { files: [] },
        }),
        extractFile: jest.fn().mockResolvedValue({
          data: Buffer.from('preview'),
          filename: 'war3mapPreview.tga',
        }),
      };

      (MPQParser as jest.MockedClass<typeof MPQParser>).mockImplementation(
        () => mockMPQParser as never
      );

      const TGADecoder = require('../TGADecoder').TGADecoder;
      TGADecoder.prototype.decodeToDataURL = jest
        .fn()
        .mockReturnValue('data:image/png;base64,test');

      const mockFile = new File([new ArrayBuffer(1024)], 'test.w3x');
      const result = await extractor.extract(mockFile, mockMapData);

      expect(result.extractTimeMs).toBeGreaterThan(0);
      expect(result.extractTimeMs).toBeLessThan(5000); // Should be < 5 seconds
    });
  });

  // ========================================================================
  // TEST SUITE 4: EDGE CASES
  // ========================================================================

  describe('Edge Cases & Special Scenarios', () => {
    it('should handle file read errors', async () => {
      const mockFile = {
        name: 'test.w3x',
        arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error')),
      } as unknown as File;

      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Test',
          description: '',
          author: '',
          dimensions: { width: 64, height: 64 },
          players: { maxPlayers: 2 },
          tileset: 'LordaeronSummer',
        },
        terrain: {
          width: 64,
          height: 64,
          heightmap: new Float32Array(64 * 64),
          textures: [],
        },
        units: [],
        doodads: [],
        regions: [],
        cameras: [],
        sounds: [],
      };

      const result = await extractor.extract(mockFile, mockMapData);

      expect(result.success).toBe(false);
      expect(result.source).toBe('error');
      expect(result.error).toContain('File read error');
    });

    it('should handle null/undefined inputs gracefully', async () => {
      const mockFile = new File([new ArrayBuffer(0)], '');
      const result = await extractor.extract(mockFile, null as never);

      expect(result.success).toBe(false);
      expect(result.source).toBe('error');
    });
  });
  });
}
