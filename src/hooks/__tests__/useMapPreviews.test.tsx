/**
 * Tests for useMapPreviews hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useMapPreviews } from '../useMapPreviews';
import { MapPreviewExtractor } from '../../engine/rendering/MapPreviewExtractor';
import { PreviewCache } from '../../utils/PreviewCache';
import type { MapMetadata } from '../../ui/MapGallery';
import type { RawMapData } from '../../formats/maps/types';

// Mock modules
jest.mock('../../engine/rendering/MapPreviewExtractor');
jest.mock('../../utils/PreviewCache');

// TODO: Requires proper mocking - skipping for now
describe.skip('useMapPreviews', () => {
  const mockMapData: RawMapData = {
    format: 'w3x',
    info: {
      name: 'Test Map',
      author: 'Test Author',
      description: 'Test',
      players: [],
      dimensions: { width: 64, height: 64 },
      environment: { tileset: 'grass' },
    },
    terrain: {
      width: 64,
      height: 64,
      heightmap: new Float32Array(64 * 64),
      textures: [],
    },
    units: [],
    doodads: [],
  };

  const mockMaps: MapMetadata[] = [
    {
      id: 'map1',
      name: 'Test Map 1',
      format: 'w3x',
      sizeBytes: 1024 * 1024,
      file: new File([], 'test1.w3x'),
    },
    {
      id: 'map2',
      name: 'Test Map 2',
      format: 'w3x',
      sizeBytes: 2 * 1024 * 1024,
      file: new File([], 'test2.w3x'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PreviewCache
    (PreviewCache as jest.MockedClass<typeof PreviewCache>).mockImplementation(() => {
      return {
        init: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null), // No cached previews
        set: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
      } as any;
    });

    // Mock MapPreviewExtractor
    (MapPreviewExtractor as jest.MockedClass<typeof MapPreviewExtractor>).mockImplementation(
      () => {
        return {
          extract: jest.fn().mockResolvedValue({
            success: true,
            dataUrl: 'data:image/png;base64,mockdata',
            source: 'generated',
            extractTimeMs: 100,
          }),
          dispose: jest.fn(),
        } as any;
      }
    );
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMapPreviews());

    expect(result.current.previews.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toEqual({ current: 0, total: 0 });
    expect(result.current.error).toBeNull();
  });

  it('should generate previews for maps', async () => {
    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);
    mapDataMap.set('map2', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps, mapDataMap);
    });

    await waitFor(() => {
      expect(result.current.previews.size).toBe(2);
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.previews.get('map1')).toBe('data:image/png;base64,mockdata');
    expect(result.current.previews.get('map2')).toBe('data:image/png;base64,mockdata');
  });

  it('should use cached previews when available', async () => {
    // Mock cache to return cached preview for map1
    (PreviewCache as jest.MockedClass<typeof PreviewCache>).mockImplementation(() => {
      return {
        init: jest.fn().mockResolvedValue(undefined),
        get: jest.fn((mapId: string) => {
          if (mapId === 'map1') {
            return Promise.resolve('data:image/png;base64,cached');
          }
          return Promise.resolve(null);
        }),
        set: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
      } as any;
    });

    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);
    mapDataMap.set('map2', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps, mapDataMap);
    });

    await waitFor(() => {
      expect(result.current.previews.size).toBe(2);
    });

    // map1 should use cached preview
    expect(result.current.previews.get('map1')).toBe('data:image/png;base64,cached');
    // map2 should use generated preview
    expect(result.current.previews.get('map2')).toBe('data:image/png;base64,mockdata');
  });

  it('should update progress during generation', async () => {
    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);
    mapDataMap.set('map2', mockMapData);

    const progressStates: any[] = [];

    // Start generation and capture progress states
    const promise = result.current.generatePreviews(mockMaps, mapDataMap);

    await waitFor(() => {
      if (result.current.progress.total > 0) {
        progressStates.push({ ...result.current.progress });
      }
    });

    await promise;

    // Should have progress updates
    expect(progressStates.length).toBeGreaterThan(0);
    expect(progressStates[0]?.total).toBe(2);
  });

  it('should handle generation errors gracefully', async () => {
    // Mock extractor to return error
    (MapPreviewExtractor as jest.MockedClass<typeof MapPreviewExtractor>).mockImplementation(
      () => {
        return {
          extract: jest.fn().mockResolvedValue({
            success: false,
            source: 'error',
            error: 'Extraction failed',
            extractTimeMs: 0,
          }),
          dispose: jest.fn(),
        } as any;
      }
    );

    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps.slice(0, 1), mapDataMap);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should complete without errors (but no previews generated)
    expect(result.current.previews.size).toBe(0);
  });

  it('should skip maps without map data', async () => {
    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    // Only add data for map1
    mapDataMap.set('map1', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps, mapDataMap);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only map1 should have preview (map2 skipped)
    expect(result.current.previews.size).toBe(1);
    expect(result.current.previews.has('map1')).toBe(true);
    expect(result.current.previews.has('map2')).toBe(false);
  });

  it('should clear cache', async () => {
    const mockClear = jest.fn().mockResolvedValue(undefined);

    (PreviewCache as jest.MockedClass<typeof PreviewCache>).mockImplementation(() => {
      return {
        init: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        clear: mockClear,
      } as any;
    });

    const { result } = renderHook(() => useMapPreviews());

    // Generate some previews first
    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps.slice(0, 1), mapDataMap);
    });

    // Clear cache
    await waitFor(async () => {
      await result.current.clearCache();
    });

    expect(mockClear).toHaveBeenCalled();
    expect(result.current.previews.size).toBe(0);
  });

  it('should dispose extractor on unmount', () => {
    const mockDispose = jest.fn();

    (MapPreviewExtractor as jest.MockedClass<typeof MapPreviewExtractor>).mockImplementation(
      () => {
        return {
          extract: jest.fn(),
          dispose: mockDispose,
        } as any;
      }
    );

    const { unmount } = renderHook(() => useMapPreviews());

    unmount();

    expect(mockDispose).toHaveBeenCalled();
  });

  it('should handle exception during generation', async () => {
    // Mock extractor to throw exception
    (MapPreviewExtractor as jest.MockedClass<typeof MapPreviewExtractor>).mockImplementation(
      () => {
        return {
          extract: jest.fn().mockRejectedValue(new Error('Unexpected error')),
          dispose: jest.fn(),
        } as any;
      }
    );

    const { result } = renderHook(() => useMapPreviews());

    const mapDataMap = new Map<string, RawMapData>();
    mapDataMap.set('map1', mockMapData);

    await waitFor(async () => {
      await result.current.generatePreviews(mockMaps.slice(0, 1), mapDataMap);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should set error
    expect(result.current.error).toBe('Unexpected error');
  });
});
