/**
 * UnitInstanceManager tests
 *
 * Tests for thin instance management system
 */

import * as BABYLON from '@babylonjs/core';
import { UnitInstanceManager } from '@/engine/rendering/UnitInstanceManager';
import { UnitInstance } from '@/engine/rendering/types';

describe('UnitInstanceManager', () => {
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;
  let mesh: BABYLON.Mesh;
  let manager: UnitInstanceManager;

  beforeEach(() => {
    // Create Babylon.js engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Create test mesh
    mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);

    // Create instance manager
    manager = new UnitInstanceManager(scene, mesh, 10);
  });

  afterEach(() => {
    if (manager) {
      manager.dispose();
    }
    if (scene) {
      scene.dispose();
    }
    if (engine) {
      engine.dispose();
    }
  });

  describe('Initialization', () => {
    it('should create manager instance', () => {
      expect(manager).toBeDefined();
    });

    it('should start with zero instances', () => {
      expect(manager.getInstanceCount()).toBe(0);
    });

    it('should have correct initial capacity', () => {
      expect(manager.getCapacity()).toBe(10);
    });
  });

  describe('Instance Addition', () => {
    it('should add a single instance', () => {
      const instance: UnitInstance = {
        id: 'test-1',
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        teamColor: BABYLON.Color3.Red(),
        animationState: 'idle',
        animationTime: 0,
      };

      const index = manager.addInstance(instance);

      expect(index).toBe(0);
      expect(manager.getInstanceCount()).toBe(1);
    });

    it('should add multiple instances', () => {
      for (let i = 0; i < 5; i++) {
        const instance: UnitInstance = {
          id: `test-${i}`,
          position: new BABYLON.Vector3(i, 0, 0),
          rotation: 0,
          teamColor: BABYLON.Color3.Red(),
          animationState: 'idle',
          animationTime: 0,
        };

        manager.addInstance(instance);
      }

      expect(manager.getInstanceCount()).toBe(5);
    });

    it('should grow buffers when capacity exceeded', () => {
      const initialCapacity = manager.getCapacity();

      // Add more instances than initial capacity
      for (let i = 0; i < initialCapacity + 5; i++) {
        const instance: UnitInstance = {
          id: `test-${i}`,
          position: new BABYLON.Vector3(i, 0, 0),
          rotation: 0,
          teamColor: BABYLON.Color3.Red(),
          animationState: 'idle',
          animationTime: 0,
        };

        manager.addInstance(instance);
      }

      expect(manager.getInstanceCount()).toBe(initialCapacity + 5);
      expect(manager.getCapacity()).toBeGreaterThan(initialCapacity);
    });
  });

  describe('Instance Updates', () => {
    let instanceIndex: number;

    beforeEach(() => {
      const instance: UnitInstance = {
        id: 'test-1',
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        teamColor: BABYLON.Color3.Red(),
        animationState: 'idle',
        animationTime: 0,
      };

      instanceIndex = manager.addInstance(instance);
    });

    it('should update instance position', () => {
      const newPosition = new BABYLON.Vector3(10, 0, 10);

      manager.updateInstance(instanceIndex, { position: newPosition });

      const instance = manager.getInstance(instanceIndex);
      expect(instance?.position.x).toBe(10);
      expect(instance?.position.z).toBe(10);
    });

    it('should update instance rotation', () => {
      manager.updateInstance(instanceIndex, { rotation: Math.PI / 2 });

      const instance = manager.getInstance(instanceIndex);
      expect(instance?.rotation).toBeCloseTo(Math.PI / 2);
    });

    it('should update instance team color', () => {
      manager.updateInstance(instanceIndex, {
        teamColor: BABYLON.Color3.Blue(),
      });

      const instance = manager.getInstance(instanceIndex);
      expect(instance?.teamColor.b).toBe(1);
    });

    it('should update animation state', () => {
      manager.updateInstance(instanceIndex, {
        animationState: 'walk',
        animationTime: 1.5,
      });

      const instance = manager.getInstance(instanceIndex);
      expect(instance?.animationState).toBe('walk');
      expect(instance?.animationTime).toBe(1.5);
    });

    it('should handle invalid index gracefully', () => {
      expect(() => {
        manager.updateInstance(999, { rotation: 0 });
      }).not.toThrow();
    });
  });

  describe('Instance Removal', () => {
    it('should remove instance by index', () => {
      const instance: UnitInstance = {
        id: 'test-1',
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        teamColor: BABYLON.Color3.Red(),
        animationState: 'idle',
        animationTime: 0,
      };

      const index = manager.addInstance(instance);
      expect(manager.getInstanceCount()).toBe(1);

      manager.removeInstance(index);
      expect(manager.getInstanceCount()).toBe(0);
    });

    it('should handle removing multiple instances', () => {
      // Add 5 instances
      for (let i = 0; i < 5; i++) {
        const instance: UnitInstance = {
          id: `test-${i}`,
          position: new BABYLON.Vector3(i, 0, 0),
          rotation: 0,
          teamColor: BABYLON.Color3.Red(),
          animationState: 'idle',
          animationTime: 0,
        };

        manager.addInstance(instance);
      }

      expect(manager.getInstanceCount()).toBe(5);

      // Remove middle instance
      manager.removeInstance(2);
      expect(manager.getInstanceCount()).toBe(4);
    });

    it('should handle invalid removal index', () => {
      expect(() => {
        manager.removeInstance(999);
      }).not.toThrow();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      // Add multiple instances
      for (let i = 0; i < 5; i++) {
        const instance: UnitInstance = {
          id: `test-${i}`,
          position: new BABYLON.Vector3(i, 0, 0),
          rotation: 0,
          teamColor: BABYLON.Color3.Red(),
          animationState: 'idle',
          animationTime: 0,
        };

        manager.addInstance(instance);
      }
    });

    it('should batch update multiple instances', () => {
      const updates: Array<[number, Partial<UnitInstance>]> = [
        [0, { rotation: Math.PI }],
        [1, { teamColor: BABYLON.Color3.Blue() }],
        [2, { position: new BABYLON.Vector3(100, 0, 100) }],
      ];

      manager.batchUpdate(updates);

      const instance0 = manager.getInstance(0);
      const instance1 = manager.getInstance(1);
      const instance2 = manager.getInstance(2);

      expect(instance0?.rotation).toBeCloseTo(Math.PI);
      expect(instance1?.teamColor.b).toBe(1);
      expect(instance2?.position.x).toBe(100);
    });

    it('should get all instances', () => {
      const allInstances = manager.getAllInstances();
      expect(allInstances.length).toBe(5);
    });

    it('should clear all instances', () => {
      manager.clear();
      expect(manager.getInstanceCount()).toBe(0);
    });
  });

  describe('Spatial Queries', () => {
    beforeEach(() => {
      // Add instances in a grid pattern
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          const instance: UnitInstance = {
            id: `test-${x}-${z}`,
            position: new BABYLON.Vector3(x * 10, 0, z * 10),
            rotation: 0,
            teamColor: BABYLON.Color3.Red(),
            animationState: 'idle',
            animationTime: 0,
          };

          manager.addInstance(instance);
        }
      }
    });

    it('should find instances in radius', () => {
      const center = new BABYLON.Vector3(0, 0, 0);
      const radius = 15;

      const nearbyInstances = manager.findInstancesInRadius(center, radius);

      // Should find instances at (0,0), (10,0), (0,10), and possibly (10,10)
      expect(nearbyInstances.length).toBeGreaterThan(0);
      expect(nearbyInstances.length).toBeLessThan(25);
    });

    it('should return empty array for radius with no instances', () => {
      const center = new BABYLON.Vector3(1000, 0, 1000);
      const radius = 5;

      const nearbyInstances = manager.findInstancesInRadius(center, radius);
      expect(nearbyInstances.length).toBe(0);
    });
  });

  describe('Buffer Management', () => {
    it('should flush buffers', () => {
      const instance: UnitInstance = {
        id: 'test-1',
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        teamColor: BABYLON.Color3.Red(),
        animationState: 'idle',
        animationTime: 0,
      };

      manager.addInstance(instance);

      expect(() => manager.flushBuffers()).not.toThrow();
    });

    it('should track memory usage', () => {
      // Add some instances
      for (let i = 0; i < 10; i++) {
        const instance: UnitInstance = {
          id: `test-${i}`,
          position: new BABYLON.Vector3(i, 0, 0),
          rotation: 0,
          teamColor: BABYLON.Color3.Red(),
          animationState: 'idle',
          animationTime: 0,
        };

        manager.addInstance(instance);
      }

      const memoryUsage = manager.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Animation Management', () => {
    it('should register animations', () => {
      const animations = new Map<string, number>([
        ['idle', 0],
        ['walk', 1],
        ['attack', 2],
      ]);

      expect(() => manager.registerAnimations(animations)).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      const instance: UnitInstance = {
        id: 'test-1',
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        teamColor: BABYLON.Color3.Red(),
        animationState: 'idle',
        animationTime: 0,
      };

      manager.addInstance(instance);

      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
