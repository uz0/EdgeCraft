/**
 * Terrain Renderer tests
 *
 * Note: These tests require full WebGL support which is not available in CI environments.
 * They are skipped for now and should be run in a browser environment for integration testing.
 */

import * as BABYLON from '@babylonjs/core';
import { TerrainRenderer } from '@/engine/terrain/TerrainRenderer';
import { AssetLoader } from '@/engine/assets/AssetLoader';

describe.skip('TerrainRenderer', () => {
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let assetLoader: AssetLoader;
  let terrain: TerrainRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    assetLoader = new AssetLoader(scene);
    terrain = new TerrainRenderer(scene, assetLoader);
  });

  afterEach(() => {
    terrain.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('should create terrain renderer', () => {
    expect(terrain).toBeDefined();
  });

  it('should create flat terrain', () => {
    const mesh = terrain.createFlatTerrain(100, 100, 16);

    expect(mesh).toBeDefined();
    expect(mesh.name).toBe('flatTerrain');
    expect(terrain.getLoadStatus()).toBe('loaded');
  });

  it('should get mesh after creation', () => {
    terrain.createFlatTerrain(100, 100, 16);
    const mesh = terrain.getMesh();

    expect(mesh).toBeDefined();
    expect(mesh?.name).toBe('flatTerrain');
  });

  it('should get material after creation', () => {
    terrain.createFlatTerrain(100, 100, 16);
    const material = terrain.getMaterial();

    expect(material).toBeDefined();
    expect(material?.name).toBe('flatTerrainMaterial');
  });

  it('should dispose properly', () => {
    terrain.createFlatTerrain(100, 100, 16);

    expect(() => terrain.dispose()).not.toThrow();
    expect(terrain.getMesh()).toBeUndefined();
    expect(terrain.getLoadStatus()).toBe('idle');
  });

  it('should get height at position', () => {
    terrain.createFlatTerrain(100, 100, 16);
    const height = terrain.getHeightAtPosition(0, 0);

    expect(typeof height).toBe('number');
  });
});
