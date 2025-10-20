/**
 * React hook for loading and caching map previews
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
import { MapPreviewExtractor } from '../engine/rendering/MapPreviewExtractor';
import { PreviewCache } from '../utils/PreviewCache';
import { LoadingMessageGenerator } from '../utils/funnyLoadingMessages';
import type { MapMetadata } from '../ui/MapGallery';
import type { RawMapData } from '../formats/maps/types';

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
 * React hook for loading and caching map previews
 */
export function useMapPreviews(): UseMapPreviewsResult {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, PreviewLoadingState>>(new Map());
  const [loadingMessages, setLoadingMessages] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<PreviewProgress>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const extractorRef = useRef<MapPreviewExtractor | null>(null);
  const cacheRef = useRef<PreviewCache | null>(null);
  const messageGeneratorRef = useRef<LoadingMessageGenerator>(new LoadingMessageGenerator());

  // Initialize on mount
  useEffect(() => {
    extractorRef.current = new MapPreviewExtractor();
    cacheRef.current = new PreviewCache();

    void cacheRef.current.init();

    return () => {
      extractorRef.current?.dispose();
    };
  }, []);

  const generatePreviews = useCallback(
    async (maps: MapMetadata[], mapDataMap: Map<string, RawMapData>): Promise<void> => {
      if (!extractorRef.current || !cacheRef.current) {
        setError('Preview system not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);
      setProgress({ current: 0, total: maps.length });

      const newPreviews = new Map<string, string>();
      const newStates = new Map<string, PreviewLoadingState>();
      const newMessages = new Map<string, string>();

      try {
        // Process maps in parallel batches of 4 for faster loading
        const BATCH_SIZE = 4;
        let completed = 0;

        const processBatch = async (batch: MapMetadata[]): Promise<void> => {
          await Promise.all(
            batch.map(async (map) => {
              if (map == null) return;

              // Generate funny loading message
              const loadingMessage = messageGeneratorRef.current.getNext();

              // Set loading state with message
              newStates.set(map.id, 'loading');
              newMessages.set(map.id, loadingMessage);
              setLoadingStates(new Map(newStates));
              setLoadingMessages(new Map(newMessages));

              try {
                // Check cache first
                const cachedPreview = await cacheRef.current!.get(map.id);

                if (cachedPreview != null && cachedPreview !== '') {
                  newPreviews.set(map.id, cachedPreview);
                  newStates.set(map.id, 'success');
                  newMessages.delete(map.id);
                  setPreviews(new Map(newPreviews));
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                  return;
                }

                // Not cached - extract or generate
                const mapData = mapDataMap.get(map.id);

                if (!mapData) {
                  newStates.set(map.id, 'error');
                  newMessages.delete(map.id);
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                  return;
                }

                const result = await extractorRef.current!.extract(map.file, mapData);

                if (result.success && result.dataUrl != null && result.dataUrl !== '') {
                  newPreviews.set(map.id, result.dataUrl);
                  newStates.set(map.id, 'success');
                  newMessages.delete(map.id);
                  setPreviews(new Map(newPreviews));
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));

                  // Cache for future use
                  await cacheRef.current!.set(map.id, result.dataUrl);
                } else {
                  newStates.set(map.id, 'error');
                  newMessages.delete(map.id);
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                }
              } catch (err) {
                newStates.set(map.id, 'error');
                newMessages.delete(map.id);
                setLoadingStates(new Map(newStates));
                setLoadingMessages(new Map(newMessages));
              } finally {
                completed++;
                setProgress({ current: completed, total: maps.length, currentMap: map.name });
              }
            })
          );
        };

        // Process all maps in batches
        for (let i = 0; i < maps.length; i += BATCH_SIZE) {
          const batch = maps.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
        }
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
      if (!extractorRef.current || !cacheRef.current) {
        return;
      }

      // Set loading state
      setLoadingStates((prev) => new Map(prev).set(map.id, 'loading'));

      try {
        // Check cache first
        const cachedPreview = await cacheRef.current.get(map.id);

        if (cachedPreview != null && cachedPreview !== '') {
          setPreviews((prev) => new Map(prev).set(map.id, cachedPreview));
          setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));
          return;
        }

        // Not cached - extract or generate
        const result = await extractorRef.current.extract(map.file, mapData);

        if (result.success && result.dataUrl != null && result.dataUrl !== '') {
          const dataUrl = result.dataUrl; // Type narrowing
          setPreviews((prev) => new Map(prev).set(map.id, dataUrl));
          setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));

          // Cache for future use
          await cacheRef.current.set(map.id, dataUrl);
        } else {
          setLoadingStates((prev) => new Map(prev).set(map.id, 'error'));
        }
      } catch (err) {
        setLoadingStates((prev) => new Map(prev).set(map.id, 'error'));
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
    messageGeneratorRef.current.reset();
  }, []);

  return {
    previews,
    loadingStates,
    loadingMessages,
    isLoading,
    progress,
    error,
    generatePreviews,
    generateSinglePreview,
    clearCache,
  };
}
