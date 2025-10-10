/**
 * Shadow Caster Manager tests
 */

import * as BABYLON from '@babylonjs/core';
import { ShadowCasterManager } from '@/engine/rendering/ShadowCasterManager';

// Mock canvas 2D context for blob texture generation
const mockCreateRadialGradient = jest.fn().mockReturnValue({
  addColorStop: jest.fn(),
});

const mockGetContext = jest.fn().mockReturnValue({
  createRadialGradient: mockCreateRadialGradient,
  fillStyle: '',
  arc: jest.fn(),
  fill: jest.fn(),
  fillRect: jest.fn(),
});

const originalCreateElement = document.createElement.bind(document);
document.createElement = jest.fn((tagName: string) => {
  const element = originalCreateElement(tagName);
  if (tagName === 'canvas') {
    element.getContext = mockGetContext;
  }
  return element;
});

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

describe('ShadowCasterManager', () => {
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
    it('should create shadow caster manager', () => {
      const manager = new ShadowCasterManager(scene);

      expect(manager).toBeDefined();
      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(0);
      expect(stats.blobShadows).toBe(0);
      expect(stats.totalObjects).toBe(0);

      manager.dispose();
    });

    it('should create with custom max CSM casters', () => {
      const manager = new ShadowCasterManager(scene, 100);

      expect(manager).toBeDefined();

      manager.dispose();
    });
  });

  describe('Object Registration', () => {
    it('should register hero with CSM shadow', () => {
      const manager = new ShadowCasterManager(scene);
      const heroMesh = BABYLON.MeshBuilder.CreateBox('hero', {}, scene);

      manager.registerObject('hero1', heroMesh as BABYLON.AbstractMesh, 'hero');

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(1);
      expect(stats.blobShadows).toBe(0);
      expect(stats.totalObjects).toBe(1);

      manager.dispose();
    });

    it('should register building with CSM shadow', () => {
      const manager = new ShadowCasterManager(scene);
      const buildingMesh = BABYLON.MeshBuilder.CreateBox('building', {}, scene);

      manager.registerObject('building1', buildingMesh as BABYLON.AbstractMesh, 'building');

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(1);
      expect(stats.blobShadows).toBe(0);

      manager.dispose();
    });

    it('should register unit with blob shadow', () => {
      const manager = new ShadowCasterManager(scene);
      const unitMesh = BABYLON.MeshBuilder.CreateBox('unit', {}, scene);

      manager.registerObject('unit1', unitMesh as BABYLON.AbstractMesh, 'unit');

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(0);
      expect(stats.blobShadows).toBe(1);
      expect(stats.totalObjects).toBe(1);

      manager.dispose();
    });

    it('should register doodad with no shadow', () => {
      const manager = new ShadowCasterManager(scene);
      const doodadMesh = BABYLON.MeshBuilder.CreateBox('doodad', {}, scene);

      manager.registerObject('doodad1', doodadMesh as BABYLON.AbstractMesh, 'doodad');

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(0);
      expect(stats.blobShadows).toBe(0);
      expect(stats.totalObjects).toBe(1);

      manager.dispose();
    });

    it('should use blob shadow when CSM limit reached', () => {
      const manager = new ShadowCasterManager(scene, 2); // Only 2 CSM casters allowed

      const hero1 = BABYLON.MeshBuilder.CreateBox('hero1', {}, scene);
      const hero2 = BABYLON.MeshBuilder.CreateBox('hero2', {}, scene);
      const hero3 = BABYLON.MeshBuilder.CreateBox('hero3', {}, scene);

      manager.registerObject('hero1', hero1 as BABYLON.AbstractMesh, 'hero');
      manager.registerObject('hero2', hero2 as BABYLON.AbstractMesh, 'hero');
      manager.registerObject('hero3', hero3 as BABYLON.AbstractMesh, 'hero'); // Should use blob

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(2); // Only 2 CSM
      expect(stats.blobShadows).toBe(1); // Third hero uses blob
      expect(stats.totalObjects).toBe(3);

      manager.dispose();
    });
  });

  describe('Object Updates', () => {
    it('should update blob shadow position', () => {
      const manager = new ShadowCasterManager(scene);
      const unitMesh = BABYLON.MeshBuilder.CreateBox('unit', {}, scene);

      manager.registerObject('unit1', unitMesh as BABYLON.AbstractMesh, 'unit');

      const newPosition = new BABYLON.Vector3(10, 0, 10);
      expect(() => {
        manager.updateObject('unit1', newPosition);
      }).not.toThrow();

      manager.dispose();
    });

    it('should handle CSM shadow update (no-op)', () => {
      const manager = new ShadowCasterManager(scene);
      const heroMesh = BABYLON.MeshBuilder.CreateBox('hero', {}, scene);

      manager.registerObject('hero1', heroMesh as BABYLON.AbstractMesh, 'hero');

      const newPosition = new BABYLON.Vector3(10, 0, 10);
      expect(() => {
        manager.updateObject('hero1', newPosition);
      }).not.toThrow();

      manager.dispose();
    });

    it('should handle update of non-existent object', () => {
      const manager = new ShadowCasterManager(scene);

      expect(() => {
        manager.updateObject('nonexistent', new BABYLON.Vector3(0, 0, 0));
      }).not.toThrow();

      manager.dispose();
    });
  });

  describe('Object Removal', () => {
    it('should remove CSM shadow caster', () => {
      const manager = new ShadowCasterManager(scene);
      const heroMesh = BABYLON.MeshBuilder.CreateBox('hero', {}, scene);

      manager.registerObject('hero1', heroMesh as BABYLON.AbstractMesh, 'hero');

      let stats = manager.getStats();
      expect(stats.csmCasters).toBe(1);
      expect(stats.totalObjects).toBe(1);

      manager.removeObject('hero1', heroMesh as BABYLON.AbstractMesh);

      stats = manager.getStats();
      expect(stats.csmCasters).toBe(0);
      expect(stats.totalObjects).toBe(0);

      manager.dispose();
    });

    it('should remove blob shadow', () => {
      const manager = new ShadowCasterManager(scene);
      const unitMesh = BABYLON.MeshBuilder.CreateBox('unit', {}, scene);

      manager.registerObject('unit1', unitMesh as BABYLON.AbstractMesh, 'unit');

      let stats = manager.getStats();
      expect(stats.blobShadows).toBe(1);
      expect(stats.totalObjects).toBe(1);

      manager.removeObject('unit1');

      stats = manager.getStats();
      expect(stats.blobShadows).toBe(0);
      expect(stats.totalObjects).toBe(0);

      manager.dispose();
    });

    it('should handle removal of non-existent object', () => {
      const manager = new ShadowCasterManager(scene);

      expect(() => {
        manager.removeObject('nonexistent');
      }).not.toThrow();

      manager.dispose();
    });
  });

  describe('Shadow Receivers', () => {
    it('should enable shadows for mesh', () => {
      const manager = new ShadowCasterManager(scene);
      const terrainMesh = BABYLON.MeshBuilder.CreateGround(
        'terrain',
        { width: 100, height: 100 },
        scene
      );

      expect(terrainMesh.receiveShadows).toBe(false);

      manager.enableShadowsForMesh(terrainMesh as BABYLON.AbstractMesh);
      expect(terrainMesh.receiveShadows).toBe(true);

      manager.dispose();
    });
  });

  describe('System Access', () => {
    it('should provide access to CSM system', () => {
      const manager = new ShadowCasterManager(scene);

      const csmSystem = manager.getCSMSystem();
      expect(csmSystem).toBeDefined();

      manager.dispose();
    });

    it('should provide access to blob system', () => {
      const manager = new ShadowCasterManager(scene);

      const blobSystem = manager.getBlobSystem();
      expect(blobSystem).toBeDefined();

      manager.dispose();
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const manager = new ShadowCasterManager(scene);

      // Add 2 heroes (CSM)
      const hero1 = BABYLON.MeshBuilder.CreateBox('hero1', {}, scene);
      const hero2 = BABYLON.MeshBuilder.CreateBox('hero2', {}, scene);
      manager.registerObject('hero1', hero1 as BABYLON.AbstractMesh, 'hero');
      manager.registerObject('hero2', hero2 as BABYLON.AbstractMesh, 'hero');

      // Add 3 units (blob)
      const unit1 = BABYLON.MeshBuilder.CreateBox('unit1', {}, scene);
      const unit2 = BABYLON.MeshBuilder.CreateBox('unit2', {}, scene);
      const unit3 = BABYLON.MeshBuilder.CreateBox('unit3', {}, scene);
      manager.registerObject('unit1', unit1 as BABYLON.AbstractMesh, 'unit');
      manager.registerObject('unit2', unit2 as BABYLON.AbstractMesh, 'unit');
      manager.registerObject('unit3', unit3 as BABYLON.AbstractMesh, 'unit');

      // Add 1 doodad (none)
      const doodad = BABYLON.MeshBuilder.CreateBox('doodad', {}, scene);
      manager.registerObject('doodad1', doodad as BABYLON.AbstractMesh, 'doodad');

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(2);
      expect(stats.blobShadows).toBe(3);
      expect(stats.totalObjects).toBe(6);

      manager.dispose();
    });
  });

  describe('Disposal', () => {
    it('should dispose all shadow systems', () => {
      const manager = new ShadowCasterManager(scene);

      const hero = BABYLON.MeshBuilder.CreateBox('hero', {}, scene);
      const unit = BABYLON.MeshBuilder.CreateBox('unit', {}, scene);

      manager.registerObject('hero1', hero as BABYLON.AbstractMesh, 'hero');
      manager.registerObject('unit1', unit as BABYLON.AbstractMesh, 'unit');

      manager.dispose();

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(0);
      expect(stats.blobShadows).toBe(0);
      expect(stats.totalObjects).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle RTS-scale shadow management (40 CSM + 460 blob)', () => {
      const manager = new ShadowCasterManager(scene, 50);

      // Add 10 heroes (CSM)
      for (let i = 0; i < 10; i++) {
        const hero = BABYLON.MeshBuilder.CreateBox(`hero${i}`, {}, scene);
        manager.registerObject(`hero${i}`, hero as BABYLON.AbstractMesh, 'hero');
      }

      // Add 30 buildings (CSM)
      for (let i = 0; i < 30; i++) {
        const building = BABYLON.MeshBuilder.CreateBox(`building${i}`, {}, scene);
        manager.registerObject(`building${i}`, building as BABYLON.AbstractMesh, 'building');
      }

      // Add 460 units (blob)
      for (let i = 0; i < 460; i++) {
        const unit = BABYLON.MeshBuilder.CreateBox(`unit${i}`, {}, scene);
        manager.registerObject(`unit${i}`, unit as BABYLON.AbstractMesh, 'unit');
      }

      const stats = manager.getStats();
      expect(stats.csmCasters).toBe(40); // 10 heroes + 30 buildings
      expect(stats.blobShadows).toBe(460); // 460 units
      expect(stats.totalObjects).toBe(500);

      manager.dispose();
    });
  });
});
