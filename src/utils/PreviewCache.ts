/**
 * IndexedDB-based cache for map preview images
 * Stores preview data URLs with LRU eviction
 */

export interface CacheEntry {
  mapId: string;
  dataUrl: string;
  timestamp: number;
  sizeBytes: number;
}

export class PreviewCache {
  private dbName = 'EdgeCraft_PreviewCache';
  private storeName = 'previews';
  private version = 1;
  private maxSize = 50 * 1024 * 1024; // 50MB limit
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to open database'));
      request.onsuccess = (): void => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event): void => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'mapId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached preview
   */
  public async get(mapId: string): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(mapId);

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to get preview'));
      request.onsuccess = (): void => {
        const entry = request.result as CacheEntry | undefined;
        resolve(entry?.dataUrl ?? null);
      };
    });
  }

  /**
   * Store preview in cache
   */
  public async set(mapId: string, dataUrl: string): Promise<void> {
    if (!this.db) await this.init();

    const sizeBytes = dataUrl.length * 0.75; // Rough base64 size estimate

    // Check if we need to evict old entries
    await this.evictIfNeeded(sizeBytes);

    const entry: CacheEntry = {
      mapId,
      dataUrl,
      timestamp: Date.now(),
      sizeBytes,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to set preview'));
      request.onsuccess = (): void => resolve();
    });
  }

  /**
   * Clear all cached previews
   */
  public async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to clear cache'));
      request.onsuccess = (): void => resolve();
    });
  }

  /**
   * Get cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to get cache size'));
      request.onsuccess = (): void => {
        const entries = request.result as CacheEntry[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
        resolve(totalSize);
      };
    });
  }

  /**
   * Evict oldest entries if cache exceeds max size
   */
  private async evictIfNeeded(newSize: number): Promise<void> {
    const currentSize = await this.getCacheSize();

    if (currentSize + newSize <= this.maxSize) {
      return; // No eviction needed
    }

    // Get all entries sorted by timestamp (oldest first)
    const entries = await this.getAllEntries();
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Evict oldest until we have space
    let sizeToFree = currentSize + newSize - this.maxSize;

    for (const entry of entries) {
      if (sizeToFree <= 0) break;

      await this.delete(entry.mapId);
      sizeToFree -= entry.sizeBytes;
    }
  }

  private async getAllEntries(): Promise<CacheEntry[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to get all entries'));
      request.onsuccess = (): void => resolve(request.result as CacheEntry[]);
    });
  }

  private async delete(mapId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(mapId);

      request.onerror = (): void =>
        reject(new Error(request.error?.message ?? 'Failed to delete entry'));
      request.onsuccess = (): void => resolve();
    });
  }
}
