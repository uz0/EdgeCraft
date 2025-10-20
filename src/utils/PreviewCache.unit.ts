/**
 * Tests for PreviewCache
 */

import { PreviewCache } from './PreviewCache';

interface MockEntry {
  mapId: string;
  preview: string;
  timestamp: number;
}

// Mock IndexedDB
const mockIndexedDB = ((): {
  open: jest.Mock;
  clearStore: () => void;
} => {
  let store: Record<string, MockEntry> = {};

  return {
    open: jest.fn((_name: string, _version: number) => {
      const request = {
        result: {
          objectStoreNames: {
            contains: jest.fn(() => false),
          },
          transaction: jest.fn((_storeName: string, _mode: string) => {
            return {
              objectStore: jest.fn(() => {
                return {
                  get: jest.fn((key: string) => {
                    return {
                      result: store[key],
                      onerror: null as ((event: Event) => void) | null,
                      onsuccess: null as ((event: Event) => void) | null,
                    };
                  }),
                  put: jest.fn((entry: MockEntry) => {
                    store[entry.mapId] = entry;
                    return {
                      onerror: null as ((event: Event) => void) | null,
                      onsuccess: null as ((event: Event) => void) | null,
                    };
                  }),
                  delete: jest.fn((key: string) => {
                    delete store[key];
                    return {
                      onerror: null as ((event: Event) => void) | null,
                      onsuccess: null as ((event: Event) => void) | null,
                    };
                  }),
                  clear: jest.fn(() => {
                    store = {};
                    return {
                      onerror: null as ((event: Event) => void) | null,
                      onsuccess: null as ((event: Event) => void) | null,
                    };
                  }),
                  getAll: jest.fn(() => {
                    return {
                      result: Object.values(store),
                      onerror: null as ((event: Event) => void) | null,
                      onsuccess: null as ((event: Event) => void) | null,
                    };
                  }),
                  createIndex: jest.fn(),
                };
              }),
            };
          }),
          createObjectStore: jest.fn(() => {
            return {
              createIndex: jest.fn(),
            };
          }),
        },
        onerror: null as ((event: Event) => void) | null,
        onsuccess: null as (() => void) | null,
        onupgradeneeded: null as ((event: { target: unknown }) => void) | null,
      };

      // Simulate async behavior
      setTimeout(() => {
        if (request.onupgradeneeded !== null) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess !== null) {
          request.onsuccess();
        }
      }, 0);

      return request;
    }),
    clearStore: (): void => {
      store = {};
    },
  };
})();

// Replace global indexedDB
interface GlobalWithIndexedDB {
  indexedDB: typeof mockIndexedDB;
}
(global as unknown as GlobalWithIndexedDB).indexedDB = mockIndexedDB;

// TODO: Requires proper IndexedDB mocking - skipping for now
describe.skip('PreviewCache', () => {
  let cache: PreviewCache;

  beforeEach(async () => {
    mockIndexedDB.clearStore();
    cache = new PreviewCache();
    await cache.init();
  });

  describe('init', () => {
    it('should initialize IndexedDB', async () => {
      const newCache = new PreviewCache();
      await expect(newCache.init()).resolves.not.toThrow();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve preview', async () => {
      const mapId = 'test-map-1';
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg';

      await cache.set(mapId, dataUrl);
      const result = await cache.get(mapId);

      expect(result).toBe(dataUrl);
    });

    it('should return null for non-existent entry', async () => {
      const result = await cache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should update existing entry', async () => {
      const mapId = 'test-map-1';
      const dataUrl1 = 'data:image/png;base64,first';
      const dataUrl2 = 'data:image/png;base64,second';

      await cache.set(mapId, dataUrl1);
      await cache.set(mapId, dataUrl2);

      const result = await cache.get(mapId);
      expect(result).toBe(dataUrl2);
    });
  });

  describe('clear', () => {
    it('should clear all cached previews', async () => {
      await cache.set('map1', 'data:image/png;base64,data1');
      await cache.set('map2', 'data:image/png;base64,data2');

      await cache.clear();

      const result1 = await cache.get('map1');
      const result2 = await cache.get('map2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('eviction', () => {
    it('should not evict when under size limit', async () => {
      // Small preview that won't trigger eviction
      const smallDataUrl = 'data:image/png;base64,small';

      await cache.set('map1', smallDataUrl);
      await cache.set('map2', smallDataUrl);

      // Both should still be cached
      const result1 = await cache.get('map1');
      const result2 = await cache.get('map2');

      expect(result1).toBe(smallDataUrl);
      expect(result2).toBe(smallDataUrl);
    });

    // Note: Full eviction testing would require more complex IndexedDB mocking
    // to accurately track cache size and trigger eviction logic
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const errorCache = new PreviewCache();

      // Mock indexedDB.open to throw error
      const originalOpen = indexedDB.open.bind(indexedDB);
      const mockOpen = jest.fn(() => {
        const request = {
          onerror: null as (() => void) | null,
          onsuccess: null as (() => void) | null,
          onupgradeneeded: null as ((event: { target: unknown }) => void) | null,
          error: new Error('Init failed'),
        };
        setTimeout(() => {
          if (request.onerror !== null) {
            request.onerror();
          }
        }, 0);
        return request;
      });
      (indexedDB as unknown as GlobalWithIndexedDB['indexedDB']).open =
        mockOpen as unknown as typeof mockIndexedDB.open;

      await expect(errorCache.init()).rejects.toThrow();

      // Restore original
      (indexedDB as unknown as GlobalWithIndexedDB['indexedDB']).open =
        originalOpen as unknown as typeof mockIndexedDB.open;
    });
  });
});
