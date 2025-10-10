/**
 * Game Canvas - React component wrapper for Babylon.js canvas
 */

import React, { useEffect, useRef, useState } from 'react';
import { EdgeCraftEngine } from '@/engine/core/Engine';
import { RTSCamera } from '@/engine/camera/RTSCamera';
import { TerrainRenderer } from '@/engine/terrain/TerrainRenderer';

/**
 * Game Canvas props
 */
export interface GameCanvasProps {
  /** Canvas width */
  width?: string;
  /** Canvas height */
  height?: string;
  /** Enable debug mode */
  debug?: boolean;
  /** Callback when engine is ready */
  onEngineReady?: (engine: EdgeCraftEngine) => void;
}

/**
 * Game Canvas component
 *
 * Wraps Babylon.js canvas and manages engine lifecycle
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  width = '100%',
  height = '600px',
  onEngineReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EdgeCraftEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Create engine
      const engine = new EdgeCraftEngine(canvasRef.current, {
        antialias: true,
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      // Create camera
      const camera = new RTSCamera(engine.scene, canvasRef.current, {
        position: { x: 50, y: 50, z: -50 },
        speed: 1.0,
        enableEdgeScroll: true,
      });

      // Create terrain
      const terrain = new TerrainRenderer(engine.scene);
      terrain.createFlatTerrain(200, 200, 32);

      // Start rendering
      engine.startRenderLoop();

      setIsReady(true);
      onEngineReady?.(engine);

      // Cleanup
      return () => {
        camera.dispose();
        terrain.dispose();
        engine.dispose();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize engine');
      console.error('Engine initialization error:', err);
      return undefined;
    }
  }, [onEngineReady]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          outline: 'none',
        }}
      />
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
      {!isReady && !error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
          }}
        >
          Loading engine...
        </div>
      )}
    </div>
  );
};
