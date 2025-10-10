/**
 * Terrain Material - Custom shader material for multi-texture terrain rendering
 */

import * as BABYLON from '@babylonjs/core';
import type { TerrainTextureLayer } from './types';

// Import shader code
import vertexShader from './shaders/terrain.vertex.fx?raw';
import fragmentShader from './shaders/terrain.fragment.fx?raw';

/**
 * Custom shader material for terrain with multi-texture splatting
 *
 * Supports up to 4 texture layers blended using an RGBA splatmap
 */
export class TerrainMaterial extends BABYLON.ShaderMaterial {
  private layers: TerrainTextureLayer[] = [];
  private splatmap?: BABYLON.Texture;

  constructor(name: string, scene: BABYLON.Scene) {
    super(
      name,
      scene,
      {
        vertexSource: vertexShader,
        fragmentSource: fragmentShader,
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'view',
          'cameraPosition',
          'lightDirection',
          'textureScales',
        ],
        samplers: [
          'diffuse1',
          'diffuse2',
          'diffuse3',
          'diffuse4',
          'normal1',
          'normal2',
          'normal3',
          'normal4',
          'splatmap',
        ],
      }
    );

    // Set default light direction (sun from top-right)
    this.setVector3('lightDirection', new BABYLON.Vector3(0.5, -1, 0.5).normalize());

    // Set default texture scales
    this.setVector4('textureScales', new BABYLON.Vector4(1, 1, 1, 1));

    // Enable backface culling for performance
    this.backFaceCulling = true;
  }

  /**
   * Set a texture layer (0-3)
   *
   * @param index - Layer index (0-3)
   * @param layer - Texture layer configuration
   */
  setTextureLayer(index: number, layer: TerrainTextureLayer): void {
    if (index < 0 || index > 3) {
      throw new Error('Texture layer index must be between 0 and 3');
    }

    const scene = this.getScene();

    // Load diffuse texture
    const diffuse = new BABYLON.Texture(layer.diffuseTexture, scene);
    diffuse.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    diffuse.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    this.setTexture(`diffuse${index + 1}`, diffuse);

    // Load normal map if provided
    if (layer.normalTexture) {
      const normal = new BABYLON.Texture(layer.normalTexture, scene);
      normal.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      normal.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      this.setTexture(`normal${index + 1}`, normal);
    }

    // Store layer configuration
    this.layers[index] = layer;
    this.updateTextureScales();
  }

  /**
   * Set the splatmap for texture blending
   *
   * @param splatmapUrl - URL to RGBA splatmap texture
   */
  setSplatmap(splatmapUrl: string): void {
    const scene = this.getScene();
    this.splatmap = new BABYLON.Texture(splatmapUrl, scene);
    this.splatmap.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    this.splatmap.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    this.setTexture('splatmap', this.splatmap);
  }

  /**
   * Update light direction
   *
   * @param direction - Light direction vector
   */
  setLightDirection(direction: BABYLON.Vector3): void {
    this.setVector3('lightDirection', direction.normalize());
  }

  /**
   * Update texture scales from layer configurations
   */
  private updateTextureScales(): void {
    const scales = [
      this.layers[0]?.scale || 1.0,
      this.layers[1]?.scale || 1.0,
      this.layers[2]?.scale || 1.0,
      this.layers[3]?.scale || 1.0,
    ];
    this.setVector4('textureScales', new BABYLON.Vector4(...scales));
  }

  /**
   * Update camera position (called automatically by scene)
   *
   * @param camera - Active camera
   */
  updateCameraPosition(camera: BABYLON.Camera): void {
    if (camera.globalPosition) {
      this.setVector3('cameraPosition', camera.globalPosition);
    }
  }

  /**
   * Dispose material and all textures
   */
  override dispose(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean): void {
    // Dispose splatmap
    this.splatmap?.dispose();

    // Call parent dispose (will handle texture disposal)
    super.dispose(forceDisposeEffect, forceDisposeTextures);
  }
}
