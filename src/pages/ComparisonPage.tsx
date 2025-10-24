/**
 * ComparisonPage - Side-by-side comparison of mdx-m3-viewer vs our renderer
 * Route: /comparison
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as BABYLON from '@babylonjs/core';
import { MapRendererCore } from '../engine/rendering/MapRendererCore';
import { QualityPresetManager } from '../engine/rendering/QualityPresetManager';
import { viewer } from '../vendor/mdx-m3-viewer/src';
// @ts-expect-error - mdx-m3-viewer is JavaScript without type definitions
import { setupCamera } from '../vendor/mdx-m3-viewer/clients/shared/camera';

const War3MapViewer = viewer.handlers.War3MapViewer;

interface WindowWithViewer extends Window {
  mdx_viewer: typeof viewer;
  babylonScene?: BABYLON.Scene;
  babylonCamera?: BABYLON.Camera;
  testCube?: BABYLON.Mesh;
  war3MapViewer?: InstanceType<typeof War3MapViewer>;
  simpleOrbitCamera?: {
    horizontalAngle: number;
    verticalAngle: number;
    distance: number;
    position: [number, number, number];
    update: () => void;
  };
}
(window as unknown as WindowWithViewer).mdx_viewer = viewer;

const MAP_PATH = '/maps/%5B12%5DMeltedCrown_1.0.w3x';
// const MAP_PATH = '/maps/asset_test.w3m';

// Camera presets for red square testing (1000-unit cube at origin)
const CAMERA_PRESETS = [
  {
    name: 'Top View',
    alpha: -Math.PI / 2,
    beta: Math.PI / 2,
    radius: 25000,
    description: 'See entire terrain from above',
  },
  {
    name: 'Side View',
    alpha: 0,
    beta: 0.01,
    radius: 28000,
    description: 'Perpendicular view from left side',
  },
  {
    name: '45° View',
    alpha: Math.PI / 4,
    beta: Math.PI / 4,
    radius: 25000,
    description: '45° angle from top-right corner',
  },
];

export const ComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [mdxMapLoaded, setMdxMapLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState({ ours: 0, mdx: 0 });
  const [currentPreset, setCurrentPreset] = useState<number>(0);
  const [overlayMode, setOverlayMode] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [cameraPos, setCameraPos] = useState({ ours: '', mdx: '' });
  const [ourMapLoaded, setOurMapLoaded] = useState(false);

  const ourCanvasRef = useRef<HTMLCanvasElement>(null);
  const mdxCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const rendererRef = useRef<MapRendererCore | null>(null);
  const war3MapViewerRef = useRef<InstanceType<typeof War3MapViewer> | null>(null);
  const cameraRef = useRef<BABYLON.Camera | null>(null);
  interface SimpleOrbitCamera {
    horizontalAngle: number;
    verticalAngle: number;
    distance: number;
    position: [number, number, number];
    target: [number, number, number];
    update: () => void;
  }
  const simpleOrbitCameraRef = useRef<SimpleOrbitCamera | null>(null);

  // Initialize our Babylon.js renderer
  useEffect(() => {
    if (!ourCanvasRef.current) return;

    const canvas = ourCanvasRef.current;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: false,
    });

    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    scene.imageProcessingConfiguration.toneMappingEnabled = false;
    scene.imageProcessingConfiguration.contrastEnabled = false;
    scene.imageProcessingConfiguration.colorGradingEnabled = false;

    scene.ambientColor = new BABYLON.Color3(1, 1, 1);

    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    const topViewPreset = CAMERA_PRESETS[0]!;
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      topViewPreset.alpha,
      topViewPreset.beta,
      topViewPreset.radius,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.fov = 0.7853981633974483;
    camera.attachControl(canvas, true);
    camera.minZ = 1;
    camera.maxZ = 200000;

    (window as unknown as WindowWithViewer).babylonScene = scene;
    (window as unknown as WindowWithViewer).babylonCamera = camera;
    cameraRef.current = camera;

    const qualityManager = new QualityPresetManager(scene);
    const renderer = new MapRendererCore({
      scene,
      qualityManager,
      cameraMode: 'free',
    });
    rendererRef.current = renderer;

    const testCube = BABYLON.MeshBuilder.CreateBox('testCube', { size: 2000 }, scene);
    const testMaterial = new BABYLON.StandardMaterial('testMaterial', scene);
    testMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    testMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    testMaterial.alpha = 1.0;
    testMaterial.backFaceCulling = false;
    testCube.material = testMaterial;
    testCube.position = new BABYLON.Vector3(0, 0, 0);
    (window as unknown as WindowWithViewer).testCube = testCube;

    const fpsInterval = setInterval(() => {
      setFps((prev) => ({ ...prev, ours: Math.round(engine.getFps()) }));

      // Update camera position
      if (cameraRef.current && cameraRef.current.position) {
        const pos = cameraRef.current.position;
        setCameraPos((prev) => ({
          ...prev,
          ours: `(${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`,
        }));
      }
    }, 500);

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = (): void => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return (): void => {
      clearInterval(fpsInterval);
      window.removeEventListener('resize', handleResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  // Initialize mdx-m3-viewer
  useEffect(() => {
    if (!mdxCanvasRef.current) return;

    const canvas = mdxCanvasRef.current;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const pathSolver = (src: unknown): string => {
      const srcStr = String(src);
      if (srcStr.startsWith('http')) return srcStr;
      return `https://www.hiveworkshop.com/casc-contents?path=${srcStr.toLowerCase()}`;
    };

    const mapViewer = new War3MapViewer(canvas, pathSolver, true);
    war3MapViewerRef.current = mapViewer;

    (window as unknown as WindowWithViewer).war3MapViewer = mapViewer;

    mapViewer.addScene();

    let frameCount = 0;
    let lastTime = performance.now();

    function renderLoop(): void {
      requestAnimationFrame(renderLoop);
      mapViewer.updateAndRender();

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        setFps((prev) => ({ ...prev, mdx: fps }));
        frameCount = 0;
        lastTime = now;

        // Update mdx camera position
        if (simpleOrbitCameraRef.current && simpleOrbitCameraRef.current.position) {
          const pos = simpleOrbitCameraRef.current.position;
          setCameraPos((prev) => ({
            ...prev,
            mdx: `(${Math.round(pos[0])}, ${Math.round(pos[1])}, ${Math.round(pos[2])})`,
          }));
        }
      }
    }

    renderLoop();

    return (): void => {
      // Cleanup mdx viewer if needed
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current) return;

    const loadMap = async (): Promise<void> => {
      try {
        setLoadingProgress('Loading map file...');
        const response = await fetch(MAP_PATH);
        if (!response.ok) {
          throw new Error(`Failed to fetch map: ${response.statusText}`);
        }
        const blob = await response.blob();
        const fileName = MAP_PATH.split('/').pop();
        const file = new File(
          [blob],
          fileName !== '' && fileName !== undefined ? fileName : 'map.w3x'
        );
        const result = await rendererRef.current!.loadMap(file, '.w3x');

        if (result.success && result.mapData && sceneRef.current && rendererRef.current) {
          const activeCamera = rendererRef.current.getCamera();
          if (activeCamera) {
            cameraRef.current = activeCamera;
            activeCamera.fov = 0.7853981633974483;
            (window as unknown as WindowWithViewer).babylonCamera = activeCamera;
          }
        }

        setIsLoading(false);
        setOurMapLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setIsLoading(false);
      }
    };

    void loadMap();
  }, []);

  useEffect(() => {
    if (!war3MapViewerRef.current) return;

    const loadMap = async (): Promise<void> => {
      try {
        const mapViewer = war3MapViewerRef.current!;

        await mapViewer.loadBaseFiles();

        const response = await fetch(MAP_PATH);
        const buffer = await response.arrayBuffer();

        mapViewer.loadMap(buffer);

        await new Promise((resolve) => setTimeout(resolve, 100));

        if (mapViewer.map?.worldScene) {
          const mapWidth = mapViewer.map.columns * 128;
          const mapHeight = mapViewer.map.rows * 128;
          const mapCenterX = mapWidth / 2;
          const mapCenterZ = mapHeight / 2;

          const preset = CAMERA_PRESETS[0]!;

          const simpleCamera = setupCamera(mapViewer.map.worldScene, {
            distance: preset.radius,
            target: [mapCenterX, 500, mapCenterZ],
            horizontalAngle: preset.alpha + Math.PI / 2,
            verticalAngle: Math.PI / 2 - preset.beta,
          }) as SimpleOrbitCamera;
          simpleCamera.update();

          simpleOrbitCameraRef.current = simpleCamera;
          (window as unknown as WindowWithViewer).simpleOrbitCamera = simpleCamera;

          // Poll until map dimensions are actually loaded
          let attempts = 0;
          while ((!mapViewer.map?.columns || mapViewer.map.columns === 0) && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          if (mapViewer.map.columns > 0) {
            setMdxMapLoaded(true);
          }
        }
      } catch (err) {
        setError(`mdx-m3-viewer error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    void loadMap();
  }, []);

  useEffect(() => {
    const preset = CAMERA_PRESETS[currentPreset];
    if (!preset || !war3MapViewerRef.current?.map || !mdxMapLoaded || !ourMapLoaded) {
      return;
    }

    const mapWidth = war3MapViewerRef.current.map.columns * 128;
    const mapHeight = war3MapViewerRef.current.map.rows * 128;
    const targetX = mapWidth / 2;
    const targetZ = mapHeight / 2;

    if (targetX === 0 && targetZ === 0) {
      return;
    }

    const { alpha, beta, radius } = preset;

    const horizontalAngle = alpha + Math.PI / 2;
    const verticalAngle = Math.PI / 2 - beta;

    if (simpleOrbitCameraRef.current) {
      simpleOrbitCameraRef.current.horizontalAngle = horizontalAngle;
      simpleOrbitCameraRef.current.verticalAngle = verticalAngle;
      simpleOrbitCameraRef.current.distance = radius;
      simpleOrbitCameraRef.current.update();

      const mdxPos = simpleOrbitCameraRef.current.position;
      const mdxTarget = simpleOrbitCameraRef.current.target;

      // Warcraft maps use 0.5 height scale, compensate for the offset
      const babylonCameraPos = new BABYLON.Vector3(mdxPos[0], mdxPos[2], mdxPos[1]);
      const babylonTargetPos = new BABYLON.Vector3(mdxTarget[0], mdxTarget[2], mdxTarget[1]);

      if (cameraRef.current && sceneRef.current) {
        const camera = cameraRef.current;

        if (
          camera instanceof BABYLON.ArcRotateCamera ||
          camera instanceof BABYLON.UniversalCamera ||
          camera instanceof BABYLON.FreeCamera
        ) {
          camera.position = babylonCameraPos;
          camera.setTarget(babylonTargetPos);
        }
      }
    }
  }, [currentPreset, mdxMapLoaded, ourMapLoaded]);

  // Resize canvases when overlay mode changes
  useEffect(() => {
    const resizeCanvases = (): void => {
      if (ourCanvasRef.current && engineRef.current) {
        const rect = ourCanvasRef.current.getBoundingClientRect();
        ourCanvasRef.current.width = rect.width * window.devicePixelRatio;
        ourCanvasRef.current.height = rect.height * window.devicePixelRatio;
        engineRef.current.resize();
      }

      if (mdxCanvasRef.current && war3MapViewerRef.current) {
        const rect = mdxCanvasRef.current.getBoundingClientRect();
        mdxCanvasRef.current.width = rect.width * window.devicePixelRatio;
        mdxCanvasRef.current.height = rect.height * window.devicePixelRatio;

        const viewer = war3MapViewerRef.current;
        if (viewer.webgl && viewer.webgl.gl) {
          viewer.webgl.gl.viewport(0, 0, mdxCanvasRef.current.width, mdxCanvasRef.current.height);
        }
      }
    };

    // Resize after a short delay to ensure layout has updated
    const timeoutId = setTimeout(resizeCanvases, 100);
    return () => clearTimeout(timeoutId);
  }, [overlayMode]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a' }}
    >
      {/* Compact Header */}
      <div
        style={{
          padding: '0.5rem 1rem',
          background: '#2a2a2a',
          borderBottom: '1px solid #3a3a3a',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => {
            void navigate('/');
          }}
          style={{
            padding: '0.4rem 0.8rem',
            background: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          ← Back
        </button>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setOverlayMode(false)}
            style={{
              padding: '0.4rem 0.8rem',
              background: !overlayMode ? '#4a9eff' : '#3a3a3a',
              color: 'white',
              border: !overlayMode ? '2px solid #fff' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: !overlayMode ? 'bold' : 'normal',
            }}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setOverlayMode(true)}
            style={{
              padding: '0.4rem 0.8rem',
              background: overlayMode ? '#4a9eff' : '#3a3a3a',
              color: 'white',
              border: overlayMode ? '2px solid #fff' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: overlayMode ? 'bold' : 'normal',
            }}
          >
            Overlay
          </button>
        </div>

        {/* Opacity Control (only in overlay mode) */}
        {overlayMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'white', fontSize: '0.85rem' }}>Transparency:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              style={{ width: '120px' }}
            />
            <span style={{ color: 'white', fontSize: '0.85rem', minWidth: '3ch' }}>
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        )}

        {/* Camera Presets */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {CAMERA_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => setCurrentPreset(index)}
              style={{
                padding: '0.4rem 0.8rem',
                background: currentPreset === index ? '#4a9eff' : '#3a3a3a',
                color: 'white',
                border: currentPreset === index ? '2px solid #fff' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: currentPreset === index ? 'bold' : 'normal',
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading/Error */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
          }}
        >
          {loadingProgress}
        </div>
      )}
      {error !== null && error !== '' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff4444',
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Canvases - CSS-only mode switching (no detachment) */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: overlayMode ? '0' : '2px',
          position: 'relative',
          background: '#0a0a0a',
        }}
      >
        {/* Our renderer container */}
        <div
          style={{
            flex: overlayMode ? undefined : 1,
            position: overlayMode ? 'absolute' : 'relative',
            top: overlayMode ? 0 : undefined,
            left: overlayMode ? 0 : undefined,
            width: overlayMode ? '100%' : undefined,
            height: overlayMode ? '100%' : undefined,
            background: '#0a0a0a',
            zIndex: overlayMode ? 2 : undefined,
            opacity: overlayMode ? overlayOpacity : 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              color: 'white',
              background: 'rgba(0,0,0,0.7)',
              padding: '0.4rem',
              borderRadius: '4px',
              zIndex: 10,
              fontSize: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {overlayMode ? 'Our Renderer (Adjustable)' : 'Our Renderer'}
            </div>
            <div>FPS: {fps.ours}</div>
            <div>Pos: {cameraPos.ours}</div>
          </div>
          <canvas
            ref={ourCanvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>

        {/* mdx-m3-viewer container */}
        <div
          style={{
            flex: overlayMode ? undefined : 1,
            position: overlayMode ? 'absolute' : 'relative',
            top: overlayMode ? 0 : undefined,
            left: overlayMode ? 0 : undefined,
            width: overlayMode ? '100%' : undefined,
            height: overlayMode ? '100%' : undefined,
            background: '#0a0a0a',
            zIndex: overlayMode ? 1 : undefined,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              color: 'white',
              background: 'rgba(0,0,0,0.7)',
              padding: '0.4rem',
              borderRadius: '4px',
              zIndex: 10,
              fontSize: '0.75rem',
              textAlign: 'right',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {overlayMode ? 'mdx-m3-viewer (Reference)' : 'mdx-m3-viewer'}
            </div>
            <div>FPS: {fps.mdx}</div>
            <div>Pos: {cameraPos.mdx}</div>
          </div>
          <canvas ref={mdxCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  );
};
