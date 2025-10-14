import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const {
    previews,
    loadingStates,
    loadingMessages,
    isLoading: previewsLoading,
    generatePreviews,
    clearCache,
  } = useMapPreviews();

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

    // Expose engine and scene to window for E2E tests and debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).__testBabylonEngine = engine;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).__testBabylonScene = scene;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).scene = scene;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).engine = engine;

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

  // Handle map selection (defined before useEffects that use it)
  const handleMapSelect = useCallback(async (map: MapMetadata): Promise<void> => {
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
      console.log('[handleMapSelect] Fetching:', `/maps/${encodeURIComponent(map.name)}`);
      const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch map: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('[handleMapSelect] Blob size:', blob.size, 'bytes');
      const file = new File([blob], map.name);
      console.log('[handleMapSelect] File created:', file.name, file.size, 'bytes');

      // Determine file extension
      const ext = `.${map.format}`;
      console.log('[handleMapSelect] Extension:', ext);

      setLoadingProgress('Parsing map data...');

      // Load and render map
      const result = await rendererRef.current.loadMap(file, ext);

      if (result.success) {
        setCurrentMap(map);
        setLoadingProgress('');
        console.log('✅ Map loaded successfully:', map.name);

        // Resize canvas now that it's visible
        if (engineRef.current && !engineRef.current.isDisposed) {
          engineRef.current.resize();
          console.log('[APP] Canvas resized after map load');
        }
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
  }, []); // Empty deps - uses refs and setters which are stable

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

      // Load and parse maps in parallel batches (4 at a time) for faster loading
      const BATCH_SIZE = 4;
      const loadMap = async (map: MapMetadata): Promise<void> => {
        if (cancelled) return;

        try {
          // Skip very large maps (>1000MB) to avoid long load times
          const sizeMB = map.sizeBytes / (1024 * 1024);
          if (sizeMB > 1000) {
            console.log(`Skipping preview for large map ${map.name} (${sizeMB.toFixed(1)}MB)`);
            return;
          }

          console.log(`Loading ${map.name} for preview generation...`);

          // Fetch map file
          const response = await fetch(`/maps/${encodeURIComponent(map.name)}`);
          if (!response.ok) {
            console.error(
              `[App] ❌ Failed to fetch ${map.name}: ${response.status} ${response.statusText}`
            );
            return;
          }

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
      };

      // Process maps in batches
      for (let i = 0; i < maps.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = maps.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(loadMap));
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

  // Expose handleMapSelect for E2E tests
  useEffect(() => {
    console.log('[APP] Exposing handleMapSelect on window for E2E tests');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).__handleMapSelect = handleMapSelect;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).__testReady = true;

    return () => {
      console.log('[APP] Removing handleMapSelect from window');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (window as any).__handleMapSelect;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (window as any).__testReady;
    };
  }, [handleMapSelect]); // Only depend on handleMapSelect (stable with useCallback)

  // Register event listener for test:loadMap events (E2E testing)
  useEffect(() => {
    const handleTestLoadMap = (event: Event): void => {
      const customEvent = event as CustomEvent<{ name: string; path: string; format: string }>;
      console.log('[APP] test:loadMap event received:', customEvent.detail);

      // Find the map by name
      const map = maps.find((m) => m.name === customEvent.detail.name);
      if (map) {
        console.log('[APP] Loading map from event:', map.name);
        void handleMapSelect(map);
      } else {
        console.error('[APP] Map not found:', customEvent.detail.name);
      }
    };

    console.log('[APP] Registering test:loadMap event listener');
    window.addEventListener('test:loadMap', handleTestLoadMap);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).__testLoadMapListenerRegistered = true;

    return () => {
      console.log('[APP] Removing test:loadMap event listener');
      window.removeEventListener('test:loadMap', handleTestLoadMap);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (window as any).__testLoadMapListenerRegistered;
    };
  }, [maps, handleMapSelect]);

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
                previewLoadingStates={loadingStates}
                previewLoadingMessages={loadingMessages}
                onClearPreviews={() => {
                  void clearCache();
                }}
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

        {/* Canvas always rendered for Babylon.js initialization */}
        <canvas
          ref={canvasRef}
          className="babylon-canvas"
          style={{ display: showGallery ? 'none' : 'block' }}
        />
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
