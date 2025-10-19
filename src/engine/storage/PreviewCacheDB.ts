/**
 * IndexedDB-based cache for map preview images
 *
 * Stores extracted preview images to avoid re-extraction on subsequent loads.
 * Uses IndexedDB for persistent browser storage.
 */

const DB_NAME = 'EdgeCraftPreviewCache';
const DB_VERSION = 2; // Bumped to invalidate old cache with generated previews
const STORE_NAME = 'previews';

export interface CachedPreview {
  mapPath: string; // Unique key (e.g., "maps/3P Sentinel 01 v3.06.w3x")
  dataUrl: string; // Base64-encoded image data URL
  extractedAt: number; // Timestamp
  fileSize: number; // Original file size for validation
}

class PreviewCacheDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async initialize(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[PreviewCacheDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'mapPath' });
          objectStore.createIndex('extractedAt', 'extractedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached preview for a map
   */
  async get(mapPath: string): Promise<CachedPreview | null> {
    try {
      const db = await this.initialize();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(mapPath);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CachedPreview | undefined;
          if (result) {
            resolve(result);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error(`[PreviewCacheDB] Failed to get ${mapPath}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PreviewCacheDB] Get operation failed:', error);
      return null;
    }
  }

  /**
   * Store preview in cache
   */
  async set(preview: CachedPreview): Promise<void> {
    try {
      const db = await this.initialize();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(preview);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error(`[PreviewCacheDB] Failed to cache ${preview.mapPath}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PreviewCacheDB] Set operation failed:', error);
      throw error;
    }
  }

  /**
   * Delete cached preview
   */
  async delete(mapPath: string): Promise<void> {
    try {
      const db = await this.initialize();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(mapPath);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error(`[PreviewCacheDB] Failed to delete ${mapPath}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PreviewCacheDB] Delete operation failed:', error);
      throw error;
    }
  }

  /**
   * Clear all cached previews
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initialize();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('[PreviewCacheDB] Failed to clear:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PreviewCacheDB] Clear operation failed:', error);
      throw error;
    }
  }

  /**
   * Get all cached previews
   */
  async getAll(): Promise<CachedPreview[]> {
    try {
      const db = await this.initialize();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result as CachedPreview[];
          resolve(results);
        };

        request.onerror = () => {
          console.error('[PreviewCacheDB] Failed to get all:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PreviewCacheDB] GetAll operation failed:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const previews = await this.getAll();
      const totalSize = previews.reduce((sum, p) => sum + p.dataUrl.length, 0);
      return {
        count: previews.length,
        totalSize,
      };
    } catch (error) {
      console.error('[PreviewCacheDB] Failed to get stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const previewCacheDB = new PreviewCacheDB();
