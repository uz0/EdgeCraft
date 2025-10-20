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

      console.log(`[useMapPreviews] 🚀 Starting preview generation for ${maps.length} maps`);

      try {
        // Process maps in parallel batches of 4 for faster loading
        const BATCH_SIZE = 4;
        let completed = 0;

        const processBatch = async (batch: MapMetadata[]): Promise<void> => {
          console.log(
            `[useMapPreviews] 📦 Processing batch: ${batch.map((m) => m.name).join(', ')}`
          );

          await Promise.all(
            batch.map(async (map) => {
              if (map == null) return;

              // Generate funny loading message
              const loadingMessage = messageGeneratorRef.current.getNext();
              console.log(`[useMapPreviews] 🎲 "${loadingMessage}" - ${map.name}`);

              // Set loading state with message
              newStates.set(map.id, 'loading');
              newMessages.set(map.id, loadingMessage);
              setLoadingStates(new Map(newStates));
              setLoadingMessages(new Map(newMessages));

              try {
                // Check cache first
                console.log(`[useMapPreviews] 🔍 Checking cache for ${map.name}...`);
                const cachedPreview = await cacheRef.current!.get(map.id);

                if (cachedPreview != null && cachedPreview !== '') {
                  console.log(`[useMapPreviews] ✅ Using cached preview for ${map.name}`);
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
                  console.error(`[useMapPreviews] ❌ No map data found for ${map.id}`);
                  newStates.set(map.id, 'error');
                  newMessages.delete(map.id);
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                  return;
                }

                console.log(`[useMapPreviews] 🎨 Generating preview for ${map.name}...`);
                const startTime = performance.now();
                const result = await extractorRef.current!.extract(map.file, mapData);
                const duration = performance.now() - startTime;

                if (result.success && result.dataUrl != null && result.dataUrl !== '') {
                  console.log(
                    `[useMapPreviews] ✅ Preview ${result.source} for ${map.name} in ${duration.toFixed(0)}ms`
                  );

                  newPreviews.set(map.id, result.dataUrl);
                  newStates.set(map.id, 'success');
                  newMessages.delete(map.id);
                  setPreviews(new Map(newPreviews));
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));

                  // Cache for future use
                  await cacheRef.current!.set(map.id, result.dataUrl);
                  console.log(`[useMapPreviews] 💾 Cached preview for ${map.name}`);
                } else {
                  console.error(
                    `[useMapPreviews] ❌ Failed to generate preview for ${map.name}:`,
                    result.error
                  );
                  newStates.set(map.id, 'error');
                  newMessages.delete(map.id);
                  setLoadingStates(new Map(newStates));
                  setLoadingMessages(new Map(newMessages));
                }
              } catch (err) {
                console.error(`[useMapPreviews] ❌ Error generating preview for ${map.name}:`, err);
                newStates.set(map.id, 'error');
                newMessages.delete(map.id);
                setLoadingStates(new Map(newStates));
                setLoadingMessages(new Map(newMessages));
              } finally {
                completed++;
                console.log(
                  `[useMapPreviews] 📊 Progress: ${completed}/${maps.length} (${((completed / maps.length) * 100).toFixed(1)}%)`
                );
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

        console.log('[useMapPreviews] Preview generation complete, size:', newPreviews.size);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        console.error('Preview generation failed:', errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const generateSinglePreview = useCallback(
    async (map: MapMetadata, mapData: RawMapData): Promise<void> => {
      if (!extractorRef.current || !cacheRef.current) {
        console.error('Preview system not initialized');
        return;
      }

      // Set loading state
      setLoadingStates((prev) => new Map(prev).set(map.id, 'loading'));

      try {
        // Check cache first
        const cachedPreview = await cacheRef.current.get(map.id);

        if (cachedPreview != null && cachedPreview !== '') {
          console.log(`Using cached preview for ${map.name}`);
          setPreviews((prev) => new Map(prev).set(map.id, cachedPreview));
          setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));
          return;
        }

        // Not cached - extract or generate
        console.log(`Generating preview for ${map.name}...`);
        const result = await extractorRef.current.extract(map.file, mapData);

        if (result.success && result.dataUrl != null && result.dataUrl !== '') {
          console.log(
            `Preview ${result.source} for ${map.name} (${result.extractTimeMs.toFixed(0)}ms)`
          );

          const dataUrl = result.dataUrl; // Type narrowing
          setPreviews((prev) => new Map(prev).set(map.id, dataUrl));
          setLoadingStates((prev) => new Map(prev).set(map.id, 'success'));

          // Cache for future use
          await cacheRef.current.set(map.id, dataUrl);
        } else {
          console.error(`Failed to generate preview for ${map.name}:`, result.error);
          setLoadingStates((prev) => new Map(prev).set(map.id, 'error'));
        }
      } catch (err) {
        console.error(`Error generating preview for ${map.name}:`, err);
        setLoadingStates((prev) => new Map(prev).set(map.id, 'error'));
      }
    },
    []
  );

  const clearCache = useCallback(async (): Promise<void> => {
    if (!cacheRef.current) return;

    console.log('[useMapPreviews] 🗑️ Clearing all previews and cache...');
    await cacheRef.current.clear();
    setPreviews(new Map());
    setLoadingStates(new Map());
    setLoadingMessages(new Map());
    messageGeneratorRef.current.reset();
    console.log('[useMapPreviews] ✅ Preview cache cleared');
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
