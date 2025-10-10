/**
 * Game Canvas - React component wrapper for Babylon.js canvas
 */

import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { EdgeCraftEngine } from '@/engine/core/Engine';
import { RTSCamera } from '@/engine/camera/RTSCamera';
import { TerrainRenderer } from '@/engine/terrain/TerrainRenderer';
import { ShadowCasterManager } from '@/engine/rendering/ShadowCasterManager';

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
      const terrainMesh = terrain.createFlatTerrain(200, 200, 32);

      // Initialize shadow system
      const shadowManager = new ShadowCasterManager(engine.scene, 50);

      // Enable terrain to receive shadows
      if (terrainMesh !== null && terrainMesh !== undefined) {
        shadowManager.enableShadowsForMesh(terrainMesh as BABYLON.AbstractMesh);
      }

      // Create demo objects with shadows
      // Heroes (CSM shadows)
      const heroPositions = [
        { x: 20, y: 2, z: 20 },
        { x: 40, y: 2, z: 20 },
        { x: 60, y: 2, z: 20 },
        { x: 80, y: 2, z: 20 },
      ];

      heroPositions.forEach((pos, i) => {
        const hero = BABYLON.MeshBuilder.CreateBox(
          `hero${i}`,
          { width: 3, height: 4, depth: 3 },
          engine.scene
        );
        hero.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

        // Create simple material
        const mat = new BABYLON.StandardMaterial(`heroMat${i}`, engine.scene);
        mat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red for heroes
        hero.material = mat;

        // Register as hero (uses CSM)
        shadowManager.registerObject(`hero${i}`, hero, 'hero');
      });

      // Buildings (CSM shadows)
      const buildingPositions = [
        { x: 30, y: 5, z: 50 },
        { x: 60, y: 5, z: 50 },
        { x: 90, y: 5, z: 50 },
      ];

      buildingPositions.forEach((pos, i) => {
        const building = BABYLON.MeshBuilder.CreateBox(
          `building${i}`,
          { width: 8, height: 10, depth: 8 },
          engine.scene
        );
        building.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

        const mat = new BABYLON.StandardMaterial(`buildingMat${i}`, engine.scene);
        mat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6); // Gray for buildings
        building.material = mat;

        // Register as building (uses CSM)
        shadowManager.registerObject(`building${i}`, building, 'building');
      });

      // Regular units (blob shadows)
      const unitCount = 20; // Demo with 20 units (production would be 460+)
      for (let i = 0; i < unitCount; i++) {
        const x = 20 + (i % 10) * 8;
        const z = 80 + Math.floor(i / 10) * 8;

        const unit = BABYLON.MeshBuilder.CreateBox(
          `unit${i}`,
          { width: 2, height: 3, depth: 2 },
          engine.scene
        );
        unit.position = new BABYLON.Vector3(x, 1.5, z);

        const mat = new BABYLON.StandardMaterial(`unitMat${i}`, engine.scene);
        mat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8); // Blue for units
        unit.material = mat;

        // Register as unit (uses blob shadow)
        shadowManager.registerObject(`unit${i}`, unit, 'unit');
      }

      // Log shadow stats
      const shadowStats = shadowManager.getStats();
      console.log('🌑 Shadow System Initialized:');
      console.log(`   - CSM shadow casters: ${shadowStats.csmCasters}`);
      console.log(`   - Blob shadows: ${shadowStats.blobShadows}`);
      console.log(`   - Total objects: ${shadowStats.totalObjects}`);

      // Start rendering
      engine.startRenderLoop();

      setIsReady(true);
      onEngineReady?.(engine);

      // Cleanup
      return () => {
        shadowManager.dispose();
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
      {error !== null && error !== '' && (
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
      {!isReady && (error === null || error === '') && (
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
