/**
 * MapViewer - Direct map viewer component for /:mapName route
 * Loads and renders a single map without the gallery UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';
import { MapRendererCore } from '../engine/rendering/MapRendererCore';
import { QualityPresetManager } from '../engine/rendering/QualityPresetManager';
import * as BABYLON from '@babylonjs/core';

export const MapViewer: React.FC = () => {
  const { mapName } = useParams<{ mapName: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [rendererReady, setRendererReady] = useState(false);

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

    // Mark renderer as ready
    console.log('[MapViewer] Renderer initialized, marking as ready');
    setRendererReady(true);

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

  // Load map when mapName changes AND renderer is ready
  useEffect(() => {
    const loadMap = async (): Promise<void> => {
      if (!mapName || !rendererRef.current || !rendererReady) {
        console.log('[MapViewer] Skipping map load:', {
          hasMapName: !!mapName,
          hasRenderer: !!rendererRef.current,
          rendererReady,
        });
        return;
      }

      console.log('[MapViewer] Starting map load for:', mapName);

      setIsLoading(true);
      setError(null);
      setLoadingProgress(`Loading ${mapName}...`);

      try {
        // Fetch map file from /maps folder
        const decodedMapName = decodeURIComponent(mapName);
        const response = await fetch(`/maps/${encodeURIComponent(decodedMapName)}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch map: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], decodedMapName);

        // Determine file extension
        const ext = decodedMapName.includes('.') ? `.${decodedMapName.split('.').pop()}` : '.w3x';

        setLoadingProgress('Parsing map data...');

        // Load and render map
        const result = await rendererRef.current.loadMap(file, ext);

        if (result.success) {
          setLoadingProgress('');

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
      } finally {
        setIsLoading(false);
      }
    };

    void loadMap();
  }, [mapName, rendererReady]); // Depend on both mapName and rendererReady

  return (
    <div className="map-viewer">
      {isLoading && (
        <LoadingScreen
          progress={loadingProgress}
          mapName={mapName ? decodeURIComponent(mapName) : undefined}
        />
      )}

      <header className="viewer-header">
        <button
          onClick={(): void => {
            void navigate('/');
          }}
          className="btn-back"
        >
          ← Back to Gallery
        </button>
        <h1>🏗️ Edge Craft - {mapName ? decodeURIComponent(mapName) : 'Map Viewer'}</h1>
        <div className="header-stats">
          <span className="stat">FPS: {fps}</span>
        </div>
      </header>

      <main className="viewer-main">
        {error && (
          <div className="error-overlay">
            <p>❌ {error}</p>
            <button
              onClick={(): void => {
                void navigate('/');
              }}
            >
              Back to Gallery
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="babylon-canvas" />
      </main>

      <style>{`
        .map-viewer {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #1a1a1a;
          color: #fff;
        }

        .viewer-header {
          padding: 1rem 2rem;
          background: #2a2a2a;
          display: flex;
          align-items: center;
          gap: 2rem;
          border-bottom: 2px solid #444;
        }

        .viewer-header h1 {
          flex: 1;
          margin: 0;
          font-size: 1.5rem;
        }

        .header-stats {
          display: flex;
          gap: 1rem;
        }

        .stat {
          padding: 0.5rem 1rem;
          background: #333;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }

        .btn-back {
          padding: 0.5rem 1rem;
          background: #444;
          border: 1px solid #666;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-back:hover {
          background: #555;
        }

        .viewer-main {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .babylon-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .loading-overlay,
        .error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          z-index: 1000;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #333;
          border-top: 4px solid #0f0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-overlay button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #d32f2f;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
        }

        .error-overlay button:hover {
          background: #b71c1c;
        }
      `}</style>
    </div>
  );
};
