/**
 * Model Loader tests
 *
 * Note: These tests require full WebGL support which is not available in CI environments.
 * They are skipped for now and should be run in a browser environment for integration testing.
 */

import * as BABYLON from '@babylonjs/core';
import { ModelLoader } from '@/assets/ModelLoader';

describe.skip('ModelLoader', () => {
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let loader: ModelLoader;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    engine = new BABYLON.Engine(canvas, false);
    scene = new BABYLON.Scene(engine);
    loader = new ModelLoader(scene);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should create model loader instance', () => {
    expect(loader).toBeDefined();
  });

  it('should create test box mesh', () => {
    const box = loader.createBox('testBox', 2);

    expect(box).toBeDefined();
    expect(box.name).toBe('testBox');
    expect(box).toBeInstanceOf(BABYLON.Mesh);
  });

  it('should create test sphere mesh', () => {
    const sphere = loader.createSphere('testSphere', 3);

    expect(sphere).toBeDefined();
    expect(sphere.name).toBe('testSphere');
    expect(sphere).toBeInstanceOf(BABYLON.Mesh);
  });

  it('should create box with default size', () => {
    const box = loader.createBox('defaultBox');

    expect(box).toBeDefined();
    // Default size is 2
  });

  it('should create sphere with default diameter', () => {
    const sphere = loader.createSphere('defaultSphere');

    expect(sphere).toBeDefined();
    // Default diameter is 2
  });

  // Note: glTF loading tests would require actual glTF files
  // These should be tested in integration/e2e tests with real assets
  it.skip('should load glTF model', async () => {
    // This test requires an actual glTF file
    const result = await loader.loadGLTF('/test-assets/', 'test-model.gltf');

    expect(result).toBeDefined();
    expect(result.rootMesh).toBeDefined();
    expect(result.meshes.length).toBeGreaterThan(0);
  });

  it.skip('should apply scale to loaded model', async () => {
    const result = await loader.loadGLTF('/test-assets/', 'test-model.gltf', {
      scale: 2.0,
    });

    expect(result.rootMesh.scaling.x).toBe(2.0);
    expect(result.rootMesh.scaling.y).toBe(2.0);
    expect(result.rootMesh.scaling.z).toBe(2.0);
  });

  it.skip('should apply position to loaded model', async () => {
    const result = await loader.loadGLTF('/test-assets/', 'test-model.gltf', {
      position: { x: 10, y: 20, z: 30 },
    });

    expect(result.rootMesh.position.x).toBe(10);
    expect(result.rootMesh.position.y).toBe(20);
    expect(result.rootMesh.position.z).toBe(30);
  });

  it.skip('should apply rotation to loaded model', async () => {
    const result = await loader.loadGLTF('/test-assets/', 'test-model.gltf', {
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
    });

    expect(result.rootMesh.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(result.rootMesh.rotation.y).toBe(0);
    expect(result.rootMesh.rotation.z).toBe(0);
  });

  it.skip('should throw error for invalid glTF file', async () => {
    await expect(loader.loadGLTF('/invalid/', 'nonexistent.gltf')).rejects.toThrow();
  });
});
