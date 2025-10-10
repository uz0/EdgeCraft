/**
 * InstancedUnitRenderer tests
 *
 * Tests for GPU instancing and animation system
 */

import * as BABYLON from '@babylonjs/core';
import { InstancedUnitRenderer } from '@/engine/rendering/InstancedUnitRenderer';

describe('InstancedUnitRenderer', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  let renderer: InstancedUnitRenderer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create Babylon.js engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Create renderer
    renderer = new InstancedUnitRenderer(scene);
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
    if (scene) {
      scene.dispose();
    }
    if (engine) {
      engine.dispose();
    }
  });

  describe('Initialization', () => {
    it('should create renderer instance', () => {
      expect(renderer).toBeDefined();
    });

    it('should start with zero units', () => {
      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(0);
      expect(stats.unitTypes).toBe(0);
      expect(stats.drawCalls).toBe(0);
    });
  });

  describe('Unit Type Registration', () => {
    it('should register unit type without animations', async () => {
      // Create a simple test mesh
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);

      // Ensure mesh has metadata to match AbstractMesh type
      mesh.metadata = {};

      // Mock the SceneLoader to return our test mesh
      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);

      const stats = renderer.getStats();
      expect(stats.unitTypes).toBe(1);
    });
  });

  describe('Unit Spawning', () => {
    beforeEach(async () => {
      // Setup a test unit type
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      mesh.metadata = {};

      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);
    });

    it('should spawn a single unit', () => {
      const unitId = renderer.spawnUnit(
        'footman',
        new BABYLON.Vector3(0, 0, 0),
        BABYLON.Color3.Red()
      );

      expect(unitId).not.toBeNull();
      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(1);
    });

    it('should spawn multiple units', () => {
      const unitIds: string[] = [];

      for (let i = 0; i < 10; i++) {
        const unitId = renderer.spawnUnit(
          'footman',
          new BABYLON.Vector3(i, 0, 0),
          BABYLON.Color3.Red()
        );
        if (unitId) {
          unitIds.push(unitId);
        }
      }

      expect(unitIds.length).toBe(10);
      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(10);
    });

    it('should maintain single draw call per unit type', () => {
      // Spawn 100 units of same type
      for (let i = 0; i < 100; i++) {
        renderer.spawnUnit('footman', new BABYLON.Vector3(i, 0, 0), BABYLON.Color3.Red());
      }

      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(100);
      expect(stats.drawCalls).toBe(1); // Only 1 draw call!
    });

    it('should fail gracefully for unknown unit type', () => {
      const unitId = renderer.spawnUnit(
        'unknown',
        new BABYLON.Vector3(0, 0, 0),
        BABYLON.Color3.Red()
      );

      expect(unitId).toBeNull();
    });
  });

  describe('Unit Management', () => {
    let unitId: string | null;

    beforeEach(async () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      mesh.metadata = {};

      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);

      unitId = renderer.spawnUnit('footman', new BABYLON.Vector3(0, 0, 0), BABYLON.Color3.Red());
    });

    it('should get unit data', () => {
      if (!unitId) fail('Unit ID is null');

      const unit = renderer.getUnit(unitId);
      expect(unit).toBeDefined();
      expect(unit?.position).toBeDefined();
      expect(unit?.teamColor).toBeDefined();
    });

    it('should update unit position', () => {
      if (!unitId) fail('Unit ID is null');

      const newPosition = new BABYLON.Vector3(10, 0, 10);
      renderer.moveUnit(unitId, newPosition);

      const unit = renderer.getUnit(unitId);
      expect(unit?.position.x).toBeCloseTo(10);
      expect(unit?.position.z).toBeCloseTo(10);
    });

    it('should update unit properties', () => {
      if (!unitId) fail('Unit ID is null');

      renderer.updateUnit(unitId, {
        rotation: Math.PI / 2,
        teamColor: BABYLON.Color3.Blue(),
      });

      const unit = renderer.getUnit(unitId);
      expect(unit?.rotation).toBeCloseTo(Math.PI / 2);
      expect(unit?.teamColor.b).toBeCloseTo(1);
    });

    it('should despawn unit', () => {
      if (!unitId) fail('Unit ID is null');

      renderer.despawnUnit(unitId);

      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(0);

      const unit = renderer.getUnit(unitId);
      expect(unit).toBeUndefined();
    });
  });

  describe('Unit Queries', () => {
    beforeEach(async () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      mesh.metadata = {};

      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);
    });

    it('should find units by type', () => {
      // Spawn multiple units
      for (let i = 0; i < 5; i++) {
        renderer.spawnUnit('footman', new BABYLON.Vector3(i, 0, 0), BABYLON.Color3.Red());
      }

      const units = renderer.getUnitsByType('footman');
      expect(units.length).toBe(5);
    });

    it('should find units in radius', () => {
      // Spawn units in a pattern
      renderer.spawnUnit('footman', new BABYLON.Vector3(0, 0, 0), BABYLON.Color3.Red());
      renderer.spawnUnit('footman', new BABYLON.Vector3(5, 0, 0), BABYLON.Color3.Red());
      renderer.spawnUnit('footman', new BABYLON.Vector3(50, 0, 0), BABYLON.Color3.Red());

      const center = new BABYLON.Vector3(0, 0, 0);
      const nearbyUnits = renderer.findUnitsInRadius(center, 10);

      expect(nearbyUnits.length).toBe(2); // Only 2 within radius
    });

    it('should get all unit IDs', () => {
      for (let i = 0; i < 3; i++) {
        renderer.spawnUnit('footman', new BABYLON.Vector3(i, 0, 0), BABYLON.Color3.Red());
      }

      const allIds = renderer.getAllUnitIds();
      expect(allIds.length).toBe(3);
    });
  });

  describe('Performance Statistics', () => {
    beforeEach(async () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      mesh.metadata = {};

      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);
    });

    it('should track rendering stats', () => {
      const stats = renderer.getStats();

      expect(stats).toHaveProperty('unitTypes');
      expect(stats).toHaveProperty('totalUnits');
      expect(stats).toHaveProperty('drawCalls');
      expect(stats).toHaveProperty('cpuTime');
      expect(stats).toHaveProperty('memoryUsage');
    });

    it('should update stats as units are added', () => {
      const stats1 = renderer.getStats();
      expect(stats1.totalUnits).toBe(0);

      for (let i = 0; i < 50; i++) {
        renderer.spawnUnit('footman', new BABYLON.Vector3(i, 0, 0), BABYLON.Color3.Red());
      }

      const stats2 = renderer.getStats();
      expect(stats2.totalUnits).toBe(50);
      expect(stats2.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('should clear all units on dispose', async () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      mesh.metadata = {};

      const mockResult: BABYLON.ISceneLoaderAsyncResult = {
        meshes: [mesh as BABYLON.AbstractMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
        spriteManagers: [],
      };

      jest.spyOn(BABYLON.SceneLoader, 'ImportMeshAsync').mockResolvedValue(mockResult);

      await renderer.registerUnitType('footman', 'test.glb', []);

      for (let i = 0; i < 10; i++) {
        renderer.spawnUnit('footman', new BABYLON.Vector3(i, 0, 0), BABYLON.Color3.Red());
      }

      renderer.dispose();

      // After dispose, stats should be cleared
      const stats = renderer.getStats();
      expect(stats.totalUnits).toBe(0);
      expect(stats.unitTypes).toBe(0);
    });
  });
});
