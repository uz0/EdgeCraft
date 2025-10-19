/**
 * Batch Map Loader with Parallel Loading
 * Loads multiple maps efficiently with progress tracking, caching, and priority queue
 */

import type { RawMapData } from './types';
import { MapLoaderRegistry } from './MapLoaderRegistry';

export interface MapLoadTask {
  /** Unique task ID */
  id: string;

  /** File to load */
  file: File | ArrayBuffer;

  /** File extension */
  extension: string;

  /** File size (for prioritization) */
  sizeBytes: number;

  /** Priority (higher = load first) */
  priority?: number;
}

export interface MapLoadProgress {
  /** Task ID */
  taskId: string;

  /** Load status */
  status: 'pending' | 'loading' | 'success' | 'error';

  /** Progress (0-100) */
  progress: number;

  /** Loaded map data (if success) */
  mapData?: RawMapData;

  /** Error message (if failed) */
  error?: string;

  /** Load time in ms */
  loadTimeMs?: number;
}

export interface BatchLoadResult {
  /** Overall success (true if ANY maps loaded) */
  success: boolean;

  /** Per-map results */
  results: Map<string, MapLoadProgress>;

  /** Total load time */
  totalTimeMs: number;

  /** Summary stats */
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    cached: number;
  };
}

export interface BatchMapLoaderConfig {
  /** Max concurrent loads */
  maxConcurrent?: number;

  /** Max cached maps (LRU eviction) */
  maxCacheSize?: number;

  /** Progress callback */
  onProgress?: (progress: MapLoadProgress) => void;

  /** Enable caching */
  enableCache?: boolean;

  /** MapLoaderRegistry instance (optional, creates new if not provided) */
  registry?: MapLoaderRegistry;
}

export class BatchMapLoader {
  private config: Required<BatchMapLoaderConfig>;
  private cache: Map<string, RawMapData> = new Map();
  private cacheAccessOrder: string[] = [];
  private abortController: AbortController | null = null;
  private registry: MapLoaderRegistry;

  constructor(config?: BatchMapLoaderConfig) {
    this.registry = config?.registry ?? new MapLoaderRegistry();
    this.config = {
      maxConcurrent: config?.maxConcurrent ?? 3,
      maxCacheSize: config?.maxCacheSize ?? 10,
      onProgress: config?.onProgress ?? ((): void => {}),
      enableCache: config?.enableCache ?? true,
      registry: this.registry,
    };
  }

  /**
   * Load multiple maps in parallel
   */
  public async loadMaps(tasks: MapLoadTask[]): Promise<BatchLoadResult> {
    const startTime = performance.now();
    this.abortController = new AbortController();

    // Sort by priority (descending), then by size (ascending - small first)
    const sortedTasks = [...tasks].sort((a, b) => {
      if ((a.priority ?? 0) !== (b.priority ?? 0)) {
        return (b.priority ?? 0) - (a.priority ?? 0);
      }
      return a.sizeBytes - b.sizeBytes;
    });

    const results = new Map<string, MapLoadProgress>();

    // Initialize progress tracking
    for (const task of sortedTasks) {
      results.set(task.id, {
        taskId: task.id,
        status: 'pending',
        progress: 0,
      });
    }

    // Load in batches (max concurrent)
    const batches = this.createBatches(sortedTasks, this.config.maxConcurrent);

    let succeeded = 0;
    let failed = 0;
    let cached = 0;

    for (const batch of batches) {
      // Check for cancellation
      if (this.abortController.signal.aborted) {
        break;
      }

      const batchPromises = batch.map(async (task) => {
        // Check cache first
        if (this.config.enableCache && this.cache.has(task.id)) {
          const cachedData = this.cache.get(task.id)!;
          this.updateCacheAccess(task.id);

          results.set(task.id, {
            taskId: task.id,
            status: 'success',
            progress: 100,
            mapData: cachedData,
            loadTimeMs: 0,
          });
          this.config.onProgress(results.get(task.id)!);
          cached++;
          return;
        }

        // Update status to loading
        results.set(task.id, {
          taskId: task.id,
          status: 'loading',
          progress: 0,
        });
        this.config.onProgress(results.get(task.id)!);

        const taskStartTime = performance.now();

        try {
          // Get file extension without dot
          const ext = task.extension.startsWith('.') ? task.extension : `.${task.extension}`;

          // Check if format is supported
          if (!this.registry.isFormatSupported(ext)) {
            throw new Error(`No loader for extension: ${task.extension}`);
          }

          // Use MapLoaderRegistry to load the map
          let mapData: RawMapData;
          if (task.file instanceof File) {
            const result = await this.registry.loadMap(task.file, {
              convertToEdgeStory: false,
              validateAssets: false,
            });
            mapData = result.rawMap;
          } else {
            // ArrayBuffer
            const result = await this.registry.loadMapFromBuffer(task.file, ext, {
              convertToEdgeStory: false,
              validateAssets: false,
            });
            mapData = result.rawMap;
          }

          const loadTimeMs = performance.now() - taskStartTime;

          // Add to cache
          if (this.config.enableCache) {
            this.addToCache(task.id, mapData);
          }

          results.set(task.id, {
            taskId: task.id,
            status: 'success',
            progress: 100,
            mapData,
            loadTimeMs,
          });
          this.config.onProgress(results.get(task.id)!);
          succeeded++;
        } catch (error) {
          // eslint-disable-line no-empty
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.set(task.id, {
            taskId: task.id,
            status: 'error',
            progress: 0,
            error: errorMsg,
            loadTimeMs: performance.now() - taskStartTime,
          });
          this.config.onProgress(results.get(task.id)!);
          failed++;
        }
      });

      await Promise.allSettled(batchPromises);
    }

    const totalTimeMs = performance.now() - startTime;

    return {
      success: succeeded > 0,
      results,
      totalTimeMs,
      stats: {
        total: sortedTasks.length,
        succeeded,
        failed,
        cached,
      },
    };
  }

  /**
   * Cancel all in-progress loads
   */
  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get cached map data
   */
  public getCached(id: string): RawMapData | null {
    if (this.cache.has(id)) {
      this.updateCacheAccess(id);
      return this.cache.get(id)!;
    }
    return null;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheAccessOrder = [];
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: 0, // TODO: Track hits/misses
    };
  }

  /**
   * Add map to cache (with LRU eviction)
   */
  private addToCache(id: string, mapData: RawMapData): void {
    // Evict if full
    if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(id)) {
      const lruId = this.cacheAccessOrder.shift()!;
      this.cache.delete(lruId);
    }

    this.cache.set(id, mapData);
    this.updateCacheAccess(id);
  }

  /**
   * Update cache access order (LRU)
   */
  private updateCacheAccess(id: string): void {
    // Remove from current position
    const index = this.cacheAccessOrder.indexOf(id);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.cacheAccessOrder.push(id);
  }

  /**
   * Create batches for parallel loading
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
