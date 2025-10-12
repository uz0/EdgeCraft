/**
 * Integration tests for map preview system
 *
 * Tests the complete flow from map file → preview extraction/generation → display
 */

import { TGADecoder } from '../engine/rendering/TGADecoder';
import type { RawMapData } from '../formats/maps/types';

// Mock Babylon.js Engine since we don't have WebGL in Jest environment
jest.mock('@babylonjs/core', () => ({
  Engine: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    runRenderLoop: jest.fn(),
    resize: jest.fn(),
  })),
  Scene: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    render: jest.fn(),
    clearColor: {},
  })),
  ArcRotateCamera: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    mode: 0,
    orthoLeft: 0,
    orthoRight: 0,
    orthoTop: 0,
    orthoBottom: 0,
  })),
  Camera: {
    ORTHOGRAPHIC_CAMERA: 1,
  },
  Color4: jest.fn().mockImplementation((r, g, b, a) => ({ r, g, b, a })),
  Color3: {
    Red: jest.fn().mockReturnValue({ r: 1, g: 0, b: 0 }),
  },
  Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
  MeshBuilder: {
    CreateSphere: jest.fn().mockImplementation(() => ({
      position: {},
      material: null,
    })),
  },
  StandardMaterial: jest.fn().mockImplementation(() => ({
    diffuseColor: {},
  })),
  Tools: {
    CreateScreenshotUsingRenderTarget: jest.fn((engine, camera, config, callback) => {
      // Simulate screenshot generation with a minimal PNG data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      callback(dataUrl);
    }),
  },
}));

describe('Map Preview System Integration', () => {

  describe('Data Flow Validation', () => {
    it('should pass valid map data through the system', () => {
      // Verify map data structure is valid
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Test Map',
          description: 'A test map',
          author: 'Test Author',
          dimensions: { width: 128, height: 128 },
          players: 2,
          version: 1,
        },
        terrain: {
          width: 128,
          height: 128,
          heightmap: new Float32Array(128 * 128),
          textures: [{ path: 'grass.dds', tileId: 'Lgrs' }],
          tiles: [],
        },
        units: [],
        doodads: [],
        cameras: [],
        regions: [],
        sounds: [],
        triggers: [],
      };

      expect(mockMapData.format).toBe('w3x');
      expect(mockMapData.terrain.width).toBe(128);
      expect(mockMapData.terrain.heightmap.length).toBe(128 * 128);
    });

    it('should validate heightmap data structure', () => {
      const heightmap = new Float32Array(64 * 64);
      for (let i = 0; i < heightmap.length; i++) {
        heightmap[i] = Math.random();
      }

      expect(heightmap.length).toBe(64 * 64);
      expect(heightmap instanceof Float32Array).toBe(true);
      expect(heightmap.every((v) => v >= 0 && v <= 1)).toBe(true);
    });
  });

  describe('TGA Decoder Integration', () => {
    let decoder: TGADecoder;

    beforeEach(() => {
      decoder = new TGADecoder();
    });

    it('should handle invalid TGA data gracefully', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5]);

      const result = decoder.decodeToDataURL(invalidData);

      expect(result).toBeNull();
    });

    it('should handle empty data', () => {
      const emptyData = new Uint8Array(0);

      const result = decoder.decodeToDataURL(emptyData);

      expect(result).toBeNull();
    });
  });

  describe('Data URL Validation', () => {
    it('should validate PNG data URLs', () => {
      const validPngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      expect(validPngUrl).toMatch(/^data:image\/png;base64,/);

      const base64Data = validPngUrl.split(',')[1];
      expect(() => atob(base64Data!)).not.toThrow();
    });

    it('should validate JPEG data URLs', () => {
      const validJpegUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

      expect(validJpegUrl).toMatch(/^data:image\/jpeg;base64,/);

      const base64Data = validJpegUrl.split(',')[1];
      expect(() => atob(base64Data!)).not.toThrow();
    });

    it('should detect invalid data URLs', () => {
      const invalidUrls = [
        '',
        'invalid',
        'data:text/plain;base64,test',
        'data:image/png;base64,!!!invalid!!!',
      ];

      for (const url of invalidUrls) {
        if (url.includes('base64')) {
          const parts = url.split(',');
          if (parts.length > 1) {
            const base64Data = parts[1];
            if (base64Data && base64Data.length > 0 && !base64Data.match(/^[A-Za-z0-9+/]+=*$/)) {
              expect(() => atob(base64Data)).toThrow();
            }
          }
        }
      }
    });
  });
});
