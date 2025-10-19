/**
 * React hook for loading and caching map previews
 *
 * Uses Web Workers for parallel preview generation without UI freezes.
 * Implements cache-first strategy for instant display of cached previews.
 *
 * @example
 * ```typescript
 * const { previews, isLoading, generatePreviews } = useMapPreviews();
 *
 * useEffect(() => {
 *   if (maps.length > 0 && mapDataMap.size > 0) {
 *     generatePreviews(maps, mapDataMap);
 *   }
 * }, [maps, mapDataMap]);
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkerPoolManager } from '../workers/WorkerPoolManager';
import { PreviewCache } from '../utils/PreviewCache';
import type { MapMetadata } from '../ui/MapGallery';
import type { RawMapData } from '../formats/maps/types';
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface PreviewProgress {
  current: number;
  total: number;
  currentMap?: string;
}

export type PreviewLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface UseMapPreviewsResult {
  /** Map ID → Data URL */
  previews: Map<string, string>;

  /** Map ID → Loading state */
  loadingStates: Map<string, PreviewLoadingState>;

  /** Map ID → Funny loading message */
  loadingMessages: Map<string, string>;

  /** Map ID → Progress percentage (0-100) */
  loadingProgress: Map<string, number>;

  /** Loading state */
  isLoading: boolean;

  /** Progress */
  progress: PreviewProgress;

  /** Error message */
  error: string | null;

  /** Generate previews for maps */
  generatePreviews: (maps: MapMetadata[], mapDataMap: Map<string, RawMapData>) => Promise<void>;

  /** Generate a single preview on demand */
  generateSinglePreview: (map: MapMetadata, mapData: RawMapData) => Promise<void>;

  /** Clear cache and reset all previews */
  clearCache: () => Promise<void>;
}

/**
 * Determine map format from file extension
 */
function getMapFormat(fileName: string): 'w3x' | 'w3n' | 'sc2map' {
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.w3n')) return 'w3n';
  if (ext.endsWith('.sc2map')) return 'sc2map';
  return 'w3x'; // Default to W3X (includes .w3x and .w3m)
}

/**
 * React hook for loading and caching map previews
 */
export function useMapPreviews(): UseMapPreviewsResult {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, PreviewLoadingState>>(new Map());
  const [loadingMessages, setLoadingMessages] = useState<Map<string, string>>(new Map());
  const [loadingProgress, setLoadingProgress] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<PreviewProgress>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const workerPoolRef = useRef<WorkerPoolManager | null>(null);
  const cacheRef = useRef<PreviewCache | null>(null);

  // Initialize on mount
  useEffect(() => {
    workerPoolRef.current = new WorkerPoolManager({ poolSize: 3 });
    cacheRef.current = new PreviewCache();

    void cacheRef.current.init();

    return () => {
      workerPoolRef.current?.dispose();
    };
  }, []);

  const generatePreviews = useCallback(
    async (maps: MapMetadata[], mapDataMap: Map<string, RawMapData>): Promise<void> => {
      if (!workerPoolRef.current || !cacheRef.current) {
        setError('Preview system not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);
      setProgress({ current: 0, total: maps.length });

      const newPreviews = new Map<string, string>();
      const newStates = new Map<string, PreviewLoadingState>();
      const newMessages = new Map<string, string>();
      const newProgress = new Map<string, number>();

      try {
        let completed = 0;

        // PHASE 1: Cache-first - check and show all cached previews immediately
        await Promise.all(
          maps.map(async (map) => {
            const cachedPreview = await cacheRef.current!.get(map.id);
            if (cachedPreview) {
              newPreviews.set(map.id, cachedPreview);
              newStates.set(map.id, 'success');
              completed++;
            } else {
              // Not cached - set to idle state
              newStates.set(map.id, 'idle');
            }
          })
        );

        // Update UI with cached previews immediately
        setPreviews(new Map(newPreviews));
        setLoadingStates(new Map(newStates));
        setProgress({ current: completed, total: maps.length });

        // PHASE 2: Generate missing previews using workers
        const mapsToGenerate = maps.filter((map) => !newPreviews.has(map.id));

        if (mapsToGenerate.length === 0) {
          setIsLoading(false);
          return;
        }

        // Start all worker tasks in parallel (pool handles queue)
        await Promise.all(
          mapsToGenerate.map(async (map) => {
            try {
              // Check if file is available
              if (!map.file || map.file.size === 0) {
                newStates.set(map.id, 'error');
                setLoadingStates(new Map(newStates));
                return;
              }

              // Determine map format
              const format = getMapFormat(map.file.name);

              // Start worker task (worker will handle parsing)
              const result = await workerPoolRef.current!.generatePreview(
                map.id,
                map.name,
                map.file,
                format,
                undefined,
                // Progress callback
                (progressUpdate) => {
                  newStates.set(map.id, 'loading');
                  newMessages.set(map.id, progressUpdate.message);
                  newProgress.set(map.id, progressUpdate.progress);
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                  setLoadingProgress(new Map(newProgress));
                }
              );

              // Worker completed successfully
              newPreviews.set(map.id, result.dataUrl);
              newStates.set(map.id, 'success');
              newMessages.delete(map.id);
              newProgress.delete(map.id);
              completed++;
              // Update UI
              setPreviews(new Map(newPreviews));
              setLoadingStates(new Map(newStates));
              setLoadingMessages(new Map(newMessages));
              setLoadingProgress(new Map(newProgress));
              setProgress({ current: completed, total: maps.length, currentMap: map.name });

              // Cache for future use
              await cacheRef.current!.set(map.id, result.dataUrl);
            } catch (err) {
              console.error(`[useMapPreviews] ❌ Error generating preview for ${map.id}:`, err);
              newStates.set(map.id, 'error');
              newMessages.delete(map.id);
              newProgress.delete(map.id);
              completed++;
              setLoadingStates(new Map(newStates));
              setLoadingMessages(new Map(newMessages));
              setLoadingProgress(new Map(newProgress));
              setProgress({ current: completed, total: maps.length, currentMap: map.name });
            }
          })
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const generateSinglePreview = useCallback(
    async (map: MapMetadata, mapData: RawMapData): Promise<void> => {
      if (!workerPoolRef.current || !cacheRef.current) {
        return;
      }

      try {
        // Cache-first: Check cache
        const cachedPreview = await cacheRef.current.get(map.id);

        if (cachedPreview) {
          setPreviews((prev) => new Map(prev).set(map.id, cachedPreview));
          setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));
          return;
        }

        // Not cached - generate using worker
        const format = getMapFormat(map.file.name);

        // Start worker task with progress
        const result = await workerPoolRef.current.generatePreview(
          map.id,
          map.name,
          map.file,
          format,
          undefined,
          // Progress callback
          (progressUpdate) => {
            setLoadingStates((prev) => new Map(prev).set(map.id, 'loading'));
            setLoadingMessages((prev) => new Map(prev).set(map.id, progressUpdate.message));
            setLoadingProgress((prev) => new Map(prev).set(map.id, progressUpdate.progress));
          }
        );

        // Worker completed successfully
        setPreviews((prev) => new Map(prev).set(map.id, result.dataUrl));
        setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));
        setLoadingMessages((prev) => {
          const updated = new Map(prev);
          updated.delete(map.id);
          return updated;
        });
        setLoadingProgress((prev) => {
          const updated = new Map(prev);
          updated.delete(map.id);
          return updated;
        });

        // Cache for future use
        await cacheRef.current.set(map.id, result.dataUrl);
      } catch (err) {
        setLoadingStates((prev) => new Map(prev).set(map.id, 'error'));
        setLoadingMessages((prev) => {
          const updated = new Map(prev);
          updated.delete(map.id);
          return updated;
        });
        setLoadingProgress((prev) => {
          const updated = new Map(prev);
          updated.delete(map.id);
          return updated;
        });
      }
    },
    []
  );

  const clearCache = useCallback(async (): Promise<void> => {
    if (!cacheRef.current) return;
    await cacheRef.current.clear();
    setPreviews(new Map());
    setLoadingStates(new Map());
    setLoadingMessages(new Map());
    setLoadingProgress(new Map());
  }, []);

  return {
    previews,
    loadingStates,
    loadingMessages,
    loadingProgress,
    isLoading,
    progress,
    error,
    generatePreviews,
    generateSinglePreview,
    clearCache,
  };
}
