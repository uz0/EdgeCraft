/**
 * Model Loader - Handles loading glTF and other 3D model formats
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

/**
 * Model load options
 */
export interface ModelLoadOptions {
  /** Scale factor */
  scale?: number;
  /** Position offset */
  position?: { x: number; y: number; z: number };
  /** Rotation offset */
  rotation?: { x: number; y: number; z: number };
  /** Enable shadows */
  castShadows?: boolean;
  /** Receive shadows */
  receiveShadows?: boolean;
}

/**
 * Model load result
 */
export interface ModelLoadResult {
  /** Root mesh */
  rootMesh: BABYLON.AbstractMesh;
  /** All meshes */
  meshes: BABYLON.AbstractMesh[];
  /** Skeleton if present */
  skeletons: BABYLON.Skeleton[];
  /** Animation groups */
  animationGroups: BABYLON.AnimationGroup[];
}

/**
 * Model Loader for glTF and other 3D formats
 *
 * @example
 * ```typescript
 * const loader = new ModelLoader(scene);
 * const result = await loader.loadGLTF('/assets/models/', 'unit.gltf');
 * ```
 */
export class ModelLoader {
  private scene: BABYLON.Scene;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Load glTF model
   */
  public async loadGLTF(
    rootUrl: string,
    fileName: string,
    options?: ModelLoadOptions
  ): Promise<ModelLoadResult> {
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);

      if (result.meshes.length === 0) {
        throw new Error(`No meshes found in glTF file: ${fileName}`);
      }

      const rootMesh = result.meshes[0];
      if (!rootMesh) {
        throw new Error(`Failed to get root mesh from glTF file: ${fileName}`);
      }

      // Apply options
      if (options) {
        this.applyOptions(result.meshes, options);
      }

      return {
        rootMesh,
        meshes: result.meshes,
        skeletons: result.skeletons,
        animationGroups: result.animationGroups,
      };
    } catch (error) {
      throw new Error(
        `Failed to load glTF model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load model from URL
   */
  public async loadModel(
    url: string,
    fileName: string,
    options?: ModelLoadOptions
  ): Promise<ModelLoadResult> {
    // For now, assume glTF format
    // In the future, auto-detect format based on extension
    return this.loadGLTF(url, fileName, options);
  }

  /**
   * Apply load options to meshes
   */
  private applyOptions(meshes: BABYLON.AbstractMesh[], options: ModelLoadOptions): void {
    const rootMesh = meshes[0];
    if (!rootMesh) return;

    // Apply scale
    if (options.scale !== undefined) {
      rootMesh.scaling.scaleInPlace(options.scale);
    }

    // Apply position
    if (options.position) {
      rootMesh.position.set(options.position.x, options.position.y, options.position.z);
    }

    // Apply rotation
    if (options.rotation) {
      rootMesh.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
    }

    // Apply shadow settings
    for (const mesh of meshes) {
      if (mesh instanceof BABYLON.Mesh) {
        if (options.castShadows === true) {
          // Shadow casting will be configured when shadow generator is available
          mesh.receiveShadows = false;
        }
        if (options.receiveShadows === true) {
          mesh.receiveShadows = true;
        }
      }
    }
  }

  /**
   * Create a simple box mesh (for testing)
   */
  public createBox(name: string, size: number = 2): BABYLON.Mesh {
    const box = BABYLON.MeshBuilder.CreateBox(name, { size }, this.scene);
    return box;
  }

  /**
   * Create a simple sphere mesh (for testing)
   */
  public createSphere(name: string, diameter: number = 2): BABYLON.Mesh {
    const sphere = BABYLON.MeshBuilder.CreateSphere(name, { diameter }, this.scene);
    return sphere;
  }
}
