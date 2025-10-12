import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapGallery, type MapMetadata } from './ui/MapGallery';
import { MapPreviewReport } from './ui/MapPreviewReport';
import { MapRendererCore } from './engine/rendering/MapRendererCore';
import { QualityPresetManager } from './engine/rendering/QualityPresetManager';
import { useMapPreviews } from './hooks/useMapPreviews';
import { W3XMapLoader } from './formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from './formats/maps/sc2/SC2MapLoader';
import { W3NCampaignLoader } from './formats/maps/w3n/W3NCampaignLoader';
import type { RawMapData } from './formats/maps/types';
import * as BABYLON from '@babylonjs/core';
import './App.css';

const App: React.FC = () => {
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [currentMap, setCurrentMap] = useState<MapMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [showGallery, setShowGallery] = useState(true);
  const [viewMode, setViewMode] = useState<'gallery' | 'report'>('gallery');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const rendererRef = useRef<MapRendererCore | null>(null);

  // Use the map previews hook
  const { previews, isLoading: previewsLoading, generatePreviews } = useMapPreviews();

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

  // Initialize Babylon.js engine and scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    engineRef.current = engine;

    // Create scene
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    // Basic lighting
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Basic camera
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      50,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.maxZ = 1000;

    // Initialize renderer
    const qualityManager = new QualityPresetManager(scene);
    rendererRef.current = new MapRendererCore({
      scene,
      qualityManager,
    });

    // FPS tracking
    const fpsInterval = setInterval(() => {
      setFps(Math.round(engine.getFps()));
    }, 500);

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = (): void => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(fpsInterval);
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  // Load map list on mount
  useEffect(() => {
    const loadMaps = (): void => {
      setIsLoading(true);
      try {
        // Create MapMetadata from hardcoded list
        const mapMetadata: MapMetadata[] = MAP_LIST.map((m) => ({
          id: m.name,
          name: m.name,
          format: m.format,
          sizeBytes: m.sizeBytes,
          file: new File([], m.name), // Placeholder, will be loaded on demand
        }));

        setMaps(mapMetadata);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load map list: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate previews for maps (background process)
  useEffect(() => {
    if (maps.length === 0) return;

    // Prevent multiple preview generation runs
    let cancelled = false;

    const loadMapsAndGeneratePreviews = async (): Promise<void> => {
      if (cancelled) return;

      console.log('Starting preview generation for', maps.length, 'maps...');
      const mapDataMap = new Map<string, RawMapData>();

      // Load and parse maps (skip very large ones >100MB for preview generation)
      for (const map of maps) {
        if (cancelled) return; // Check cancellation between iterations
        try {
          // Skip very large maps (>100MB) to avoid long load times
          const sizeMB = map.sizeBytes / (1024 * 1024);
          if (sizeMB > 100) {
            console.log(`Skipping preview for large map ${map.name} (${sizeMB.toFixed(1)}MB)`);
            continue;
          }

          console.log(`Loading ${map.name} for preview generation...`);

          // Fetch map file
          console.log(`[App] Fetching map file: /maps/${encodeURIComponent(map.name)}`);
          const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
          if (!response.ok) {
            console.error(
              `[App] ❌ Failed to fetch ${map.name}: ${response.status} ${response.statusText}`
            );
            continue;
          }
          console.log(`[App] ✅ Fetched ${map.name}, size: ${response.headers.get('content-length')} bytes`);

          const blob = await response.blob();
          const file = new File([blob], map.name);

          // Update map metadata with actual file
          map.file = file;

          // Parse map based on format
          let mapData: RawMapData | null = null;

          if (map.format === 'w3x') {
            const loader = new W3XMapLoader();
            mapData = await loader.parse(file);
          } else if (map.format === 'w3n') {
            const loader = new W3NCampaignLoader();
            // parse() returns the first map from the campaign
            mapData = await loader.parse(file);
          } else if (map.format === 'sc2map') {
            const loader = new SC2MapLoader();
            mapData = await loader.parse(file);
          }

          if (mapData) {
            mapDataMap.set(map.id, mapData);
          }
        } catch (err) {
          console.error(`Failed to load ${map.name} for preview:`, err);
        }
      }

      // Generate previews
      if (!cancelled && mapDataMap.size > 0) {
        console.log(`Generating previews for ${mapDataMap.size} maps...`);
        await generatePreviews(maps, mapDataMap);
        if (!cancelled) {
          console.log('Preview generation complete!');
        }
      }
    };

    // Run in background
    void loadMapsAndGeneratePreviews();

    // Cleanup: cancel preview generation if component unmounts or deps change
    return () => {
      cancelled = true;
    };
    // Only run when maps array changes (not when generatePreviews changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

  // Handle map selection
  const handleMapSelect = async (map: MapMetadata): Promise<void> => {
    if (!rendererRef.current) {
      setError('Renderer not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingProgress(`Loading ${map.name}...`);
    setShowGallery(false);

    try {
      // Fetch map file from /maps folder
      const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch map: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], map.name);

      // Determine file extension
      const ext = `.${map.format}`;

      setLoadingProgress('Parsing map data...');

      // Load and render map
      const result = await rendererRef.current.loadMap(file, ext);

      if (result.success) {
        setCurrentMap(map);
        setLoadingProgress('');
        console.log('✅ Map loaded successfully:', map.name);
      } else {
        throw new Error('Failed to load map');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load map: ${errorMsg}`);
      setShowGallery(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back to gallery
  const handleBackToGallery = (): void => {
    setShowGallery(true);
    setCurrentMap(null);
    setError(null);
  };

  // Merge previews with maps
  const mapsWithPreviews = useMemo(() => {
    console.log('[App] Merging previews - previews Map size:', previews.size);
    console.log('[App] Previews Map keys:', Array.from(previews.keys()));

    const merged = maps.map((map) => {
      const thumbnailUrl = previews.get(map.id);
      console.log(`[App] Map "${map.id}" -> thumbnailUrl:`, thumbnailUrl ? 'HAS URL' : 'NO URL');
      return {
        ...map,
        thumbnailUrl,
      };
    });

    return merged;
  }, [maps, previews]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏗️ Edge Craft</h1>
        <p>Phase 2: Advanced Rendering & Visual Effects - Map Viewer</p>
        <div className="header-stats">
          <span className="stat">FPS: {fps}</span>
          <span className="stat">Maps: {maps.length}</span>
          {currentMap && <span className="stat">Current: {currentMap.name}</span>}
        </div>
        {showGallery && (
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
        )}
      </header>

      <main className="app-main">
        {showGallery ? (
          <section className="gallery-view">
            {viewMode === 'gallery' ? (
              <MapGallery
                maps={mapsWithPreviews}
                onMapSelect={(map) => {
                  void handleMapSelect(map);
                }}
                isLoading={isLoading || previewsLoading}
              />
            ) : (
              <MapPreviewReport maps={mapsWithPreviews} />
            )}
          </section>
        ) : (
          <section className="viewer-view">
            <div className="viewer-controls">
              <button onClick={handleBackToGallery} className="btn-back">
                ← Back to Gallery
              </button>
              {currentMap && (
                <div className="current-map-info">
                  <strong>{currentMap.name}</strong>
                  <span className="map-format">{currentMap.format.toUpperCase()}</span>
                  <span className="map-size">
                    {(currentMap.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="babylon-canvas" />

            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner" />
                <p>{loadingProgress}</p>
              </div>
            )}

            {error !== null && error !== '' && (
              <div className="error-overlay">
                <p>❌ {error}</p>
                <button onClick={handleBackToGallery}>Back to Gallery</button>
              </div>
            )}
          </section>
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

export default App;
