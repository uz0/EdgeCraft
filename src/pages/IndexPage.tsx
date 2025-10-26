/**
 * IndexPage - Map Gallery Landing Page
 * Shows all available maps with previews
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const BenchmarkHarness = React.lazy(async () => {
  const module = await import('./BenchmarkPage');
  return { default: module.BenchmarkPage };
});
import { MapGallery } from '../ui/MapGallery';
import { useMapPreviews } from '../hooks/useMapPreviews';
import { W3XMapLoader } from '../formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from '../formats/maps/sc2/SC2MapLoader';
import type { RawMapData } from '../formats/maps/types';
import './IndexPage.css';

export interface MapMetadata {
  id: string;
  name: string;
  format: 'w3x' | 'w3m' | 'sc2map';
  sizeBytes: number;
  thumbnailUrl?: string;
  file: File;
  players: number;
  author: string;
}

const MAP_LIST = [
  { name: '[12]MeltedCrown_1.0.w3x', format: 'w3x' as const, sizeBytes: 667 * 1024 },
  { name: 'asset_test.w3m', format: 'w3m' as const, sizeBytes: 22 * 1024 },
  { name: 'trigger_test.w3m', format: 'w3m' as const, sizeBytes: 697 * 1024 },
  { name: 'Starlight.SC2Map', format: 'sc2map' as const, sizeBytes: 291 * 1024 },
  { name: 'asset_test.SC2Map', format: 'sc2map' as const, sizeBytes: 332 * 1024 },
  { name: 'trigger_test.SC2Map', format: 'sc2map' as const, sizeBytes: 1.1 * 1024 * 1024 },
];

export const IndexPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [maps] = useState<MapMetadata[]>(() =>
    MAP_LIST.map((m) => ({
      id: m.name,
      name: m.name,
      format: m.format,
      sizeBytes: m.sizeBytes,
      file: new File([], m.name),
      players: 1,
      author: 'Author',
    }))
  );

  const [resetTrigger, setResetTrigger] = useState(0);
  const { previews, generatePreviews, clearCache } = useMapPreviews();

  const benchmarkMode = new URLSearchParams(location.search).get('mode') === 'ci';

  // Generate previews for maps (background process)
  useEffect(() => {
    if (maps.length === 0) return;

    let cancelled = false;

    const loadMapsAndGeneratePreviews = async (): Promise<void> => {
      if (cancelled) return;

      const mapDataMap = new Map<string, RawMapData>();

      const BATCH_SIZE = 4;
      const loadMap = async (map: MapMetadata): Promise<void> => {
        if (cancelled) return;

        try {
          const sizeMB = map.sizeBytes / (1024 * 1024);
          if (sizeMB > 1000) return;

          const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
          if (!response.ok) return;

          const blob = await response.blob();
          const file = new File([blob], map.name);

          map.file = file;

          let mapData: RawMapData | null = null;

          if (map.format === 'w3x' || map.format === 'w3m') {
            // W3X = Warcraft 3 Classic, W3M = Warcraft 3 Reforged (same parser)
            const loader = new W3XMapLoader();
            mapData = await loader.parse(file);
          } else if (map.format === 'sc2map') {
            const loader = new SC2MapLoader();
            mapData = await loader.parse(file);
          }

          if (mapData) {
            mapDataMap.set(map.id, mapData);
          }
        } catch {
          // Silently fail - map will show format badge
        }
      };

      for (let i = 0; i < maps.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = maps.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(loadMap));
      }

      if (!cancelled && mapDataMap.size > 0) {
        await generatePreviews(maps, mapDataMap);
      }
    };

    void loadMapsAndGeneratePreviews();

    return (): void => {
      cancelled = true;
    };
  }, [maps, generatePreviews, resetTrigger]);

  const handleMapSelect = (mapName: string): void => {
    void navigate(`/${encodeURIComponent(mapName)}`);
  };

  const handleReset = (): void => {
    void clearCache().then(() => {
      setResetTrigger((prev) => prev + 1);
    });
  };

  const mapsWithPreviews: MapMetadata[] = maps.map((map) => ({
    ...map,
    thumbnailUrl: previews.get(map.id),
  }));

  if (benchmarkMode) {
    return (
      <React.Suspense fallback={<main data-testid="benchmark-loading" />}>
        <BenchmarkHarness />
      </React.Suspense>
    );
  }

  return (
    <div className="index-page">
      <header className="index-header">
        <div className="index-header-content">
          <div className="index-logo">
            <h1>EdgeCraft</h1>
            <p>The Edge Story</p>
          </div>
          <button
            className="reset-button"
            onClick={handleReset}
            title="Clear previews and regenerate"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.65 2.35C12.2 0.9 10.21 0 8 0C3.58 0 0.01 3.58 0.01 8C0.01 12.42 3.58 16 8 16C11.73 16 14.84 13.45 15.73 10H13.65C12.83 12.33 10.61 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C9.66 2 11.14 2.69 12.22 3.78L9 7H16V0L13.65 2.35Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="index-main">
        <MapGallery maps={mapsWithPreviews} onMapSelect={handleMapSelect} />
      </main>
    </div>
  );
};
