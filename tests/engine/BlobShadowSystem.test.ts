/**
 * Blob Shadow System tests
 */

import * as BABYLON from '@babylonjs/core';
import { BlobShadowSystem } from '@/engine/rendering/BlobShadowSystem';

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

describe('BlobShadowSystem', () => {
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
    it('should create blob shadow system', () => {
      const blobSystem = new BlobShadowSystem(scene);

      expect(blobSystem).toBeDefined();
      expect(blobSystem.getBlobCount()).toBe(0);

      blobSystem.dispose();
    });
  });

  describe('Blob Shadow Creation', () => {
    it('should create blob shadow', () => {
      const blobSystem = new BlobShadowSystem(scene);
      const position = new BABYLON.Vector3(0, 0, 0);

      blobSystem.createBlobShadow('unit1', position, 2);
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.dispose();
    });

    it('should create blob shadow with default size', () => {
      const blobSystem = new BlobShadowSystem(scene);
      const position = new BABYLON.Vector3(5, 0, 5);

      blobSystem.createBlobShadow('unit2', position);
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.dispose();
    });

    it('should create multiple blob shadows', () => {
      const blobSystem = new BlobShadowSystem(scene);

      blobSystem.createBlobShadow('unit1', new BABYLON.Vector3(0, 0, 0));
      blobSystem.createBlobShadow('unit2', new BABYLON.Vector3(5, 0, 5));
      blobSystem.createBlobShadow('unit3', new BABYLON.Vector3(10, 0, 10));

      expect(blobSystem.getBlobCount()).toBe(3);

      blobSystem.dispose();
    });

    it('should create blob shadows with different sizes', () => {
      const blobSystem = new BlobShadowSystem(scene);

      blobSystem.createBlobShadow('small', new BABYLON.Vector3(0, 0, 0), 1);
      blobSystem.createBlobShadow('medium', new BABYLON.Vector3(5, 0, 5), 2);
      blobSystem.createBlobShadow('large', new BABYLON.Vector3(10, 0, 10), 3);

      expect(blobSystem.getBlobCount()).toBe(3);

      blobSystem.dispose();
    });
  });

  describe('Blob Shadow Updates', () => {
    it('should update blob shadow position', () => {
      const blobSystem = new BlobShadowSystem(scene);
      const initialPosition = new BABYLON.Vector3(0, 0, 0);

      blobSystem.createBlobShadow('unit1', initialPosition);

      const newPosition = new BABYLON.Vector3(10, 0, 10);
      blobSystem.updateBlobShadow('unit1', newPosition);

      // Blob should still exist
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.dispose();
    });

    it('should handle update of non-existent blob gracefully', () => {
      const blobSystem = new BlobShadowSystem(scene);

      // Should not throw error
      expect(() => {
        blobSystem.updateBlobShadow('nonexistent', new BABYLON.Vector3(0, 0, 0));
      }).not.toThrow();

      blobSystem.dispose();
    });
  });

  describe('Blob Shadow Removal', () => {
    it('should remove blob shadow', () => {
      const blobSystem = new BlobShadowSystem(scene);
      const position = new BABYLON.Vector3(0, 0, 0);

      blobSystem.createBlobShadow('unit1', position);
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.removeBlobShadow('unit1');
      expect(blobSystem.getBlobCount()).toBe(0);

      blobSystem.dispose();
    });

    it('should handle removal of non-existent blob gracefully', () => {
      const blobSystem = new BlobShadowSystem(scene);

      // Should not throw error
      expect(() => {
        blobSystem.removeBlobShadow('nonexistent');
      }).not.toThrow();

      blobSystem.dispose();
    });

    it('should remove correct blob when multiple exist', () => {
      const blobSystem = new BlobShadowSystem(scene);

      blobSystem.createBlobShadow('unit1', new BABYLON.Vector3(0, 0, 0));
      blobSystem.createBlobShadow('unit2', new BABYLON.Vector3(5, 0, 5));
      blobSystem.createBlobShadow('unit3', new BABYLON.Vector3(10, 0, 10));

      expect(blobSystem.getBlobCount()).toBe(3);

      blobSystem.removeBlobShadow('unit2');
      expect(blobSystem.getBlobCount()).toBe(2);

      blobSystem.dispose();
    });
  });

  describe('Statistics', () => {
    it('should return correct blob count', () => {
      const blobSystem = new BlobShadowSystem(scene);

      expect(blobSystem.getBlobCount()).toBe(0);

      blobSystem.createBlobShadow('unit1', new BABYLON.Vector3(0, 0, 0));
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.createBlobShadow('unit2', new BABYLON.Vector3(5, 0, 5));
      expect(blobSystem.getBlobCount()).toBe(2);

      blobSystem.removeBlobShadow('unit1');
      expect(blobSystem.getBlobCount()).toBe(1);

      blobSystem.dispose();
    });
  });

  describe('Disposal', () => {
    it('should dispose all blob shadows', () => {
      const blobSystem = new BlobShadowSystem(scene);

      blobSystem.createBlobShadow('unit1', new BABYLON.Vector3(0, 0, 0));
      blobSystem.createBlobShadow('unit2', new BABYLON.Vector3(5, 0, 5));
      blobSystem.createBlobShadow('unit3', new BABYLON.Vector3(10, 0, 10));

      expect(blobSystem.getBlobCount()).toBe(3);

      blobSystem.dispose();

      expect(blobSystem.getBlobCount()).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle 500 blob shadows efficiently', () => {
      const blobSystem = new BlobShadowSystem(scene);

      // Create 500 blob shadows
      for (let i = 0; i < 500; i++) {
        const x = (i % 25) * 2;
        const z = Math.floor(i / 25) * 2;
        blobSystem.createBlobShadow(`unit${i}`, new BABYLON.Vector3(x, 0, z), 1);
      }

      expect(blobSystem.getBlobCount()).toBe(500);

      blobSystem.dispose();
    });
  });
});
