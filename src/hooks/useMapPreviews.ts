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
import type { MapMetadata } from '../ui/MapGallery';
import type { RawMapData } from '../formats/maps/types';

export interface PreviewProgress {
  current: number;
  total: number;
  currentMap?: string;
}

export interface UseMapPreviewsResult {
  /** Map ID → Data URL */
  previews: Map<string, string>;

  /** Loading state */
  isLoading: boolean;

  /** Progress */
  progress: PreviewProgress;

  /** Error message */
  error: string | null;

  /** Generate previews for maps */
  generatePreviews: (maps: MapMetadata[], mapDataMap: Map<string, RawMapData>) => Promise<void>;

  /** Clear cache */
  clearCache: () => Promise<void>;
}

/**
 * React hook for loading and caching map previews
 */
export function useMapPreviews(): UseMapPreviewsResult {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<PreviewProgress>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const extractorRef = useRef<MapPreviewExtractor | null>(null);
  const cacheRef = useRef<PreviewCache | null>(null);

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

      try {
        for (let i = 0; i < maps.length; i++) {
          const map = maps[i];
          if (!map) continue;

          setProgress({ current: i, total: maps.length, currentMap: map.name });

          // Check cache first
          const cachedPreview = await cacheRef.current.get(map.id);

          if (cachedPreview) {
            console.log(`Using cached preview for ${map.name}`);
            newPreviews.set(map.id, cachedPreview);
            continue;
          }

          // Not cached - extract or generate
          const mapData = mapDataMap.get(map.id);

          if (!mapData) {
            console.warn(`No map data found for ${map.id}`);
            continue;
          }

          console.log(`Generating preview for ${map.name}...`);
          const result = await extractorRef.current.extract(map.file, mapData);

          if (result.success && result.dataUrl) {
            console.log(
              `Preview ${result.source} for ${map.name} (${result.extractTimeMs.toFixed(0)}ms)`
            );

            newPreviews.set(map.id, result.dataUrl);

            // Cache for future use
            await cacheRef.current.set(map.id, result.dataUrl);
          } else {
            console.error(`Failed to generate preview for ${map.name}:`, result.error);
          }
        }

        setPreviews(newPreviews);
        setProgress({ current: maps.length, total: maps.length });
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

  const clearCache = useCallback(async (): Promise<void> => {
    if (!cacheRef.current) return;

    await cacheRef.current.clear();
    setPreviews(new Map());
    console.log('Preview cache cleared');
  }, []);

  return {
    previews,
    isLoading,
    progress,
    error,
    generatePreviews,
    clearCache,
  };
}
