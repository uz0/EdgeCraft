/**
 * Cascaded Shadow System tests
 */

import * as BABYLON from '@babylonjs/core';
import { CascadedShadowSystem } from '@/engine/rendering/CascadedShadowSystem';

// Mock CascadedShadowGenerator for NullEngine
jest.mock('@babylonjs/core', () => {
  const actual = jest.requireActual('@babylonjs/core');
  return {
    ...actual,
    CascadedShadowGenerator: jest.fn().mockImplementation(() => ({
      numCascades: 3,
      cascadeBlendPercentage: 0.15,
      splitFrustum: true,
      filter: 2,
      useContactHardeningShadow: false,
      contactHardeningLightSizeUVRatio: 0.1,
      bias: 0.00001,
      normalBias: 0.02,
      getShadowMap: jest.fn().mockReturnValue({
        getSize: jest.fn().mockReturnValue({ width: 2048, height: 2048 }),
      }),
      addShadowCaster: jest.fn(),
      removeShadowCaster: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

describe('CascadedShadowSystem', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // Use NullEngine for CI compatibility (no WebGL required)
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  describe('Initialization', () => {
    it('should create CSM with default config', () => {
      const csm = new CascadedShadowSystem(scene);

      const stats = csm.getStats();
      expect(stats.cascades).toBe(3);
      expect(stats.shadowMapSize).toBe(2048);
      expect(stats.shadowCasters).toBe(0);

      csm.dispose();
    });

    it('should create CSM with custom config', () => {
      const csm = new CascadedShadowSystem(scene, {
        numCascades: 4,
        shadowMapSize: 4096,
        enablePCF: false,
      });

      const stats = csm.getStats();
      expect(stats.cascades).toBe(4);
      expect(stats.shadowMapSize).toBe(4096);

      csm.dispose();
    });

    it('should create directional light', () => {
      const csm = new CascadedShadowSystem(scene);

      const light = csm.getLight();
      expect(light).toBeDefined();
      expect(light).toBeInstanceOf(BABYLON.DirectionalLight);
      expect(light.intensity).toBe(1.0);

      csm.dispose();
    });

    it('should create shadow generator', () => {
      const csm = new CascadedShadowSystem(scene);

      const generator = csm.getShadowGenerator();
      expect(generator).toBeDefined();
      // Note: instanceof check doesn't work with mocked classes in NullEngine environment

      csm.dispose();
    });
  });

  describe('Shadow Casters', () => {
    it('should add high priority shadow caster', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh = BABYLON.MeshBuilder.CreateBox('test', {}, scene);

      csm.addShadowCaster(mesh as BABYLON.AbstractMesh, 'high');
      expect(csm.getShadowCasterCount()).toBe(1);

      csm.dispose();
    });

    it('should not add medium priority shadow caster to CSM', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh = BABYLON.MeshBuilder.CreateBox('test', {}, scene);

      csm.addShadowCaster(mesh as BABYLON.AbstractMesh, 'medium');
      expect(csm.getShadowCasterCount()).toBe(0);

      csm.dispose();
    });

    it('should remove shadow caster', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh = BABYLON.MeshBuilder.CreateBox('test', {}, scene);

      csm.addShadowCaster(mesh as BABYLON.AbstractMesh, 'high');
      expect(csm.getShadowCasterCount()).toBe(1);

      csm.removeShadowCaster(mesh as BABYLON.AbstractMesh);
      expect(csm.getShadowCasterCount()).toBe(0);

      csm.dispose();
    });

    it('should handle multiple shadow casters', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh1 = BABYLON.MeshBuilder.CreateBox('test1', {}, scene);
      const mesh2 = BABYLON.MeshBuilder.CreateBox('test2', {}, scene);
      const mesh3 = BABYLON.MeshBuilder.CreateBox('test3', {}, scene);

      csm.addShadowCaster(mesh1 as BABYLON.AbstractMesh, 'high');
      csm.addShadowCaster(mesh2 as BABYLON.AbstractMesh, 'high');
      csm.addShadowCaster(mesh3 as BABYLON.AbstractMesh, 'high');

      expect(csm.getShadowCasterCount()).toBe(3);

      csm.dispose();
    });
  });

  describe('Shadow Receivers', () => {
    it('should enable shadows for mesh', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);

      expect(mesh.receiveShadows).toBe(false);

      csm.enableShadowsForMesh(mesh as BABYLON.AbstractMesh);
      expect(mesh.receiveShadows).toBe(true);

      csm.dispose();
    });
  });

  describe('Light Control', () => {
    it('should update light direction', () => {
      const csm = new CascadedShadowSystem(scene);
      const light = csm.getLight();

      const newDirection = new BABYLON.Vector3(0, -1, 0);
      csm.updateLightDirection(newDirection);

      // Check that direction was normalized and applied
      expect(light.direction.length()).toBeCloseTo(1.0, 5);

      csm.dispose();
    });

    it('should set time of day', () => {
      const csm = new CascadedShadowSystem(scene);
      const light = csm.getLight();

      // Test noon (hour 12)
      csm.setTimeOfDay(12);
      expect(light.direction).toBeDefined();

      // Test dawn (hour 6)
      csm.setTimeOfDay(6);
      expect(light.direction).toBeDefined();

      // Test dusk (hour 18)
      csm.setTimeOfDay(18);
      expect(light.direction).toBeDefined();

      csm.dispose();
    });
  });

  describe('Statistics', () => {
    it('should calculate memory usage correctly', () => {
      const csm = new CascadedShadowSystem(scene, {
        numCascades: 3,
        shadowMapSize: 2048,
      });

      const stats = csm.getStats();

      // Expected: 3 cascades × 2048×2048 × 4 bytes = 50,331,648 bytes
      const expected = 3 * 2048 * 2048 * 4;
      expect(stats.memoryUsage).toBe(expected);

      csm.dispose();
    });

    it('should return correct stats structure', () => {
      const csm = new CascadedShadowSystem(scene);
      const stats = csm.getStats();

      expect(stats).toHaveProperty('cascades');
      expect(stats).toHaveProperty('shadowMapSize');
      expect(stats).toHaveProperty('shadowCasters');
      expect(stats).toHaveProperty('memoryUsage');

      expect(typeof stats.cascades).toBe('number');
      expect(typeof stats.shadowMapSize).toBe('number');
      expect(typeof stats.shadowCasters).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');

      csm.dispose();
    });
  });

  describe('Debug Mode', () => {
    it('should enable debug visualization', () => {
      const csm = new CascadedShadowSystem(scene);
      const generator = csm.getShadowGenerator();

      expect(generator.debug).toBe(false);

      csm.enableDebug();
      expect(generator.debug).toBe(true);

      csm.dispose();
    });

    it('should disable debug visualization', () => {
      const csm = new CascadedShadowSystem(scene);
      const generator = csm.getShadowGenerator();

      csm.enableDebug();
      expect(generator.debug).toBe(true);

      csm.disableDebug();
      expect(generator.debug).toBe(false);

      csm.dispose();
    });
  });

  describe('Disposal', () => {
    it('should dispose all resources', () => {
      const csm = new CascadedShadowSystem(scene);
      const mesh = BABYLON.MeshBuilder.CreateBox('test', {}, scene);

      csm.addShadowCaster(mesh as BABYLON.AbstractMesh, 'high');
      expect(csm.getShadowCasterCount()).toBe(1);

      csm.dispose();

      expect(csm.getShadowCasterCount()).toBe(0);
    });
  });
});
