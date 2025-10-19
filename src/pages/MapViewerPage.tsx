/**
 * MapViewerPage - Individual Map Viewer with 3D Babylon.js rendering
 * Route: /:mapName
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../ui/LoadingScreen';
import { MapRendererCore } from '../engine/rendering/MapRendererCore';
import { QualityPresetManager } from '../engine/rendering/QualityPresetManager';
import * as BABYLON from '@babylonjs/core';

// Map format detection
// W3X = Warcraft 3 Classic, W3M = Warcraft 3 Reforged, SC2Map = StarCraft 2
const getMapFormat = (filename: string): string => {
  if (filename.endsWith('.w3x')) return 'w3x';
  if (filename.endsWith('.w3m')) return 'w3m';
  if (filename.endsWith('.SC2Map')) return 'sc2map';
  return 'unknown';
};

export const MapViewerPage: React.FC = () => {
  const { mapName } = useParams<{ mapName: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const rendererRef = useRef<MapRendererCore | null>(null);

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

    // Set scene ambient color
    scene.ambientColor = new BABYLON.Color3(1, 1, 1);

    // Expose for debugging
    interface WindowWithDebug extends Window {
      __testBabylonEngine?: BABYLON.Engine;
      __testBabylonScene?: BABYLON.Scene;
      scene?: BABYLON.Scene;
      engine?: BABYLON.Engine;
    }
    (window as WindowWithDebug).__testBabylonEngine = engine;
    (window as WindowWithDebug).__testBabylonScene = scene;
    (window as WindowWithDebug).scene = scene;
    (window as WindowWithDebug).engine = engine;

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
      cameraMode: 'free', // Free camera (FPS-style) instead of RTS
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

  // Load map when mapName changes
  useEffect(() => {
    if (!mapName || !rendererRef.current) return;

    const loadMap = async (): Promise<void> => {
      const startTime = Date.now();
      setIsLoading(true);
      setError(null);
      setLoadingProgress(`Fetching ${mapName}...`);

      try {
        // Fetch map file
        const response = await fetch(`/maps/${encodeURIComponent(mapName)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch map: ${response.statusText}`);
        }

        setLoadingProgress('Unpacking MPQ archive...');
        const blob = await response.blob();
        const file = new File([blob], mapName);

        const ext = `.${getMapFormat(mapName)}`;

        setLoadingProgress('Parsing map data...');

        // Load and render map
        const result = await rendererRef.current!.loadMap(file, ext);

        if (result.success) {
          // Ensure loading screen shows for at least 800ms for better UX
          const elapsed = Date.now() - startTime;
          const minLoadingTime = 800;
          if (elapsed < minLoadingTime) {
            await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
          }

          setLoadingProgress('');
          setIsLoading(false);

          // Resize canvas now that it's visible
          if (engineRef.current && !engineRef.current.isDisposed) {
            engineRef.current.resize();
          }
        } else {
          throw new Error('Failed to load map');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load map: ${errorMsg}`);
        setIsLoading(false);
      }
    };

    void loadMap();
  }, [mapName]);

  // Handle back to gallery
  const handleBackToGallery = (): void => {
    void navigate('/');
  };

  return (
    <div className="map-viewer-page">
      {/* Loading screen with progress */}
      {isLoading && <LoadingScreen progress={loadingProgress} mapName={mapName} />}

      {/* Error overlay */}
      {error && (
        <div className="error-overlay">
          <div className="error-content">
            <h2>❌ Error Loading Map</h2>
            <p>{error}</p>
            <button onClick={handleBackToGallery} className="btn-back">
              ← Back to Gallery
            </button>
          </div>
        </div>
      )}

      {/* Viewer controls */}
      {!isLoading && !error && (
        <div className="viewer-controls">
          <button onClick={handleBackToGallery} className="btn-back">
            ← Back to Gallery
          </button>
          <div className="current-map-info">
            <strong>{mapName}</strong>
            <span className="map-format">{getMapFormat(mapName || '').toUpperCase()}</span>
          </div>
          <div className="viewer-stats">
            <span className="stat">FPS: {fps}</span>
          </div>
        </div>
      )}

      {/* Babylon.js canvas */}
      <canvas ref={canvasRef} className="babylon-canvas" />

      <style>{`
        .map-viewer-page {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #000;
        }

        .babylon-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .viewer-controls {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 100;
          background: rgba(0, 0, 0, 0.7);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .btn-back {
          padding: 0.5rem 1rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-back:hover {
          background: #45a049;
        }

        .current-map-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
        }

        .current-map-info strong {
          font-size: 1rem;
        }

        .map-format {
          padding: 0.25rem 0.5rem;
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .viewer-stats {
          display: flex;
          gap: 1rem;
          color: white;
        }

        .stat {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .error-content {
          text-align: center;
          color: white;
          max-width: 600px;
          padding: 2rem;
        }

        .error-content h2 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
        }

        .error-content p {
          margin: 0 0 1.5rem;
          color: #ff9800;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};
