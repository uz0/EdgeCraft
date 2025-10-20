/**
 * IndexPage - Map Gallery Landing Page
 * Shows all available maps with previews
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapGallery, type MapMetadata } from '../ui/MapGallery';
import { MapPreviewReport } from '../ui/MapPreviewReport';
import { useMapPreviews } from '../hooks/useMapPreviews';
import { W3XMapLoader } from '../formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from '../formats/maps/sc2/SC2MapLoader';
import type { RawMapData } from '../formats/maps/types';

// Hardcoded map list (matching actual /maps folder)
// W3X = Warcraft 3 Classic, W3M = Warcraft 3 Reforged, SC2Map = StarCraft 2
const MAP_LIST = [
  { name: '[12]MeltedCrown_1.0.w3x', format: 'w3x' as const, sizeBytes: 667 * 1024 },
  { name: 'asset_test.w3m', format: 'w3m' as const, sizeBytes: 22 * 1024 },
  { name: 'trigger_test.w3m', format: 'w3m' as const, sizeBytes: 697 * 1024 },
  { name: 'Starlight.SC2Map', format: 'sc2map' as const, sizeBytes: 291 * 1024 },
  { name: 'asset_test.SC2Map', format: 'sc2map' as const, sizeBytes: 332 * 1024 },
  { name: 'trigger_test.SC2Map', format: 'sc2map' as const, sizeBytes: 1.1 * 1024 * 1024 },
];

export const IndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'gallery' | 'report'>('gallery');

  const {
    previews,
    loadingStates,
    loadingMessages,
    isLoading: previewsLoading,
    generatePreviews,
    clearCache,
  } = useMapPreviews();

  // Load map list on mount
  useEffect(() => {
    const mapMetadata: MapMetadata[] = MAP_LIST.map((m) => ({
      id: m.name,
      name: m.name,
      format: m.format,
      sizeBytes: m.sizeBytes,
      file: new File([], m.name), // Placeholder
    }));

    setMaps(mapMetadata);
  }, []);

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
        } catch (err) {
          // Silently skip failed maps
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

    return () => {
      cancelled = true;
    };
  }, [maps, generatePreviews]);

  // Handle map selection - navigate to map viewer
  const handleMapSelect = (map: MapMetadata): void => {
    void navigate(`/${encodeURIComponent(map.name)}`);
  };

  // Merge previews with maps
  const mapsWithPreviews = useMemo(() => {
    return maps.map((map) => ({
      ...map,
      thumbnailUrl: previews.get(map.id),
    }));
  }, [maps, previews]);

  return (
    <div className="index-page">
      <header className="app-header">
        <h1>🏗️ Edge Craft</h1>
        <p>Phase 2: Advanced Rendering & Visual Effects - Map Gallery</p>
        <div className="header-stats">
          <span className="stat">Maps: {maps.length}</span>
        </div>
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('gallery')}
            className={`toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
          >
            Gallery View
          </button>
          <button
            onClick={() => setViewMode('report')}
            className={`toggle-btn ${viewMode === 'report' ? 'active' : ''}`}
          >
            Report View
          </button>
        </div>
      </header>

      <main className="app-main">
        {viewMode === 'gallery' ? (
          <MapGallery
            maps={mapsWithPreviews}
            onMapSelect={handleMapSelect}
            isLoading={previewsLoading}
            previewLoadingStates={loadingStates}
            previewLoadingMessages={loadingMessages}
            onClearPreviews={() => {
              void clearCache();
            }}
          />
        ) : (
          <MapPreviewReport maps={mapsWithPreviews} />
        )}
      </main>

      <footer className="app-footer">
        <p>Edge Craft © 2024 - Clean-room implementation</p>
        <p>
          Phase 2 Complete: Post-Processing, Advanced Lighting, GPU Particles, Weather Effects, PBR
          Materials
        </p>
      </footer>
    </div>
  );
};
