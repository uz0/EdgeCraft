/**
 * Terrain Renderer tests
 */

import * as BABYLON from '@babylonjs/core';
import { TerrainRenderer } from '@/engine/terrain/TerrainRenderer';

describe('TerrainRenderer', () => {
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let terrain: TerrainRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    terrain = new TerrainRenderer(scene);
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
