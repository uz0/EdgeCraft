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
import { W3NCampaignLoader } from '../formats/maps/w3n/W3NCampaignLoader';
import type { RawMapData } from '../formats/maps/types';

// Hardcoded map list (matching actual /maps folder)
const MAP_LIST = [
  { name: '3P Sentinel 01 v3.06.w3x', format: 'w3x' as const, sizeBytes: 10 * 1024 * 1024 },
  { name: '3P Sentinel 02 v3.06.w3x', format: 'w3x' as const, sizeBytes: 16 * 1024 * 1024 },
  { name: '3P Sentinel 03 v3.07.w3x', format: 'w3x' as const, sizeBytes: 12 * 1024 * 1024 },
  { name: '3P Sentinel 04 v3.05.w3x', format: 'w3x' as const, sizeBytes: 9.5 * 1024 * 1024 },
  { name: '3P Sentinel 05 v3.02.w3x', format: 'w3x' as const, sizeBytes: 19 * 1024 * 1024 },
  { name: '3P Sentinel 06 v3.03.w3x', format: 'w3x' as const, sizeBytes: 19 * 1024 * 1024 },
  { name: '3P Sentinel 07 v3.02.w3x', format: 'w3x' as const, sizeBytes: 27 * 1024 * 1024 },
  { name: '3pUndeadX01v2.w3x', format: 'w3x' as const, sizeBytes: 18 * 1024 * 1024 },
  { name: 'EchoIslesAlltherandom.w3x', format: 'w3x' as const, sizeBytes: 109 * 1024 },
  { name: 'Footmen Frenzy 1.9f.w3x', format: 'w3x' as const, sizeBytes: 221 * 1024 },
  {
    name: 'Legion_TD_11.2c-hf1_TeamOZE.w3x',
    format: 'w3x' as const,
    sizeBytes: 15 * 1024 * 1024,
  },
  {
    name: 'Unity_Of_Forces_Path_10.10.25.w3x',
    format: 'w3x' as const,
    sizeBytes: 4 * 1024 * 1024,
  },
  { name: 'qcloud_20013247.w3x', format: 'w3x' as const, sizeBytes: 7.9 * 1024 * 1024 },
  { name: 'ragingstream.w3x', format: 'w3x' as const, sizeBytes: 200 * 1024 },
  { name: 'BurdenOfUncrowned.w3n', format: 'w3n' as const, sizeBytes: 320 * 1024 * 1024 },
  { name: 'HorrorsOfNaxxramas.w3n', format: 'w3n' as const, sizeBytes: 433 * 1024 * 1024 },
  { name: 'JudgementOfTheDead.w3n', format: 'w3n' as const, sizeBytes: 923 * 1024 * 1024 },
  { name: 'SearchingForPower.w3n', format: 'w3n' as const, sizeBytes: 74 * 1024 * 1024 },
  {
    name: 'TheFateofAshenvaleBySvetli.w3n',
    format: 'w3n' as const,
    sizeBytes: 316 * 1024 * 1024,
  },
  { name: 'War3Alternate1 - Undead.w3n', format: 'w3n' as const, sizeBytes: 106 * 1024 * 1024 },
  { name: 'Wrath of the Legion.w3n', format: 'w3n' as const, sizeBytes: 57 * 1024 * 1024 },
  {
    name: 'Aliens Binary Mothership.SC2Map',
    format: 'sc2map' as const,
    sizeBytes: 3.3 * 1024 * 1024,
  },
  { name: 'Ruined Citadel.SC2Map', format: 'sc2map' as const, sizeBytes: 800 * 1024 },
  { name: 'TheUnitTester7.SC2Map', format: 'sc2map' as const, sizeBytes: 879 * 1024 },
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

          if (map.format === 'w3x') {
            const loader = new W3XMapLoader();
            mapData = await loader.parse(file);
          } else if (map.format === 'w3n') {
            const loader = new W3NCampaignLoader();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

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
