/**
 * Terrain Renderer - Handles heightmap-based terrain rendering
 */

import * as BABYLON from '@babylonjs/core';
import type { TerrainOptions, TerrainLoadResult, TerrainLoadStatus } from './types';
import type { AssetLoader } from '../assets/AssetLoader';
import { mapAssetID } from '../assets/AssetMap';

/**
 * Terrain renderer for creating and managing heightmap-based terrain
 *
 * @example
 * ```typescript
 * const terrain = new TerrainRenderer(scene, assetLoader);
 * await terrain.loadHeightmap('/assets/heightmap.png', {
 *   width: 256,
 *   height: 256,
 *   subdivisions: 64,
 *   maxHeight: 50,
 *   textureId: 'Ashenvale'
 * });
 * ```
 */
export class TerrainRenderer {
  private scene: BABYLON.Scene;
  private assetLoader: AssetLoader;
  private mesh?: BABYLON.GroundMesh;
  private material?: BABYLON.StandardMaterial;
  private loadStatus: TerrainLoadStatus = 'idle' as TerrainLoadStatus;
  private static shadersRegistered = false;

  constructor(scene: BABYLON.Scene, assetLoader: AssetLoader) {
    this.scene = scene;
    this.assetLoader = assetLoader;

    // Register terrain shaders on first instantiation
    if (!TerrainRenderer.shadersRegistered) {
      this.registerTerrainShaders();
      TerrainRenderer.shadersRegistered = true;
    }
  }

  /**
   * Register terrain splatmap shaders with Babylon.js
   */
  private registerTerrainShaders(): void {
    // Vertex shader
    const vertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;

// Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);

  vUV = uv;
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vWorldPosition = (world * vec4(position, 1.0)).xyz;
}
    `;

    // Fragment shader
    const fragmentShader = `
precision highp float;

// Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// Uniforms
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec4 textureScales;

// Textures
uniform sampler2D diffuse1;
uniform sampler2D diffuse2;
uniform sampler2D diffuse3;
uniform sampler2D diffuse4;
uniform sampler2D splatmap;

void main(void) {
  // Sample splatmap for blend weights
  vec4 splat = texture2D(splatmap, vUV);

  // Sample diffuse textures with individual tiling
  vec3 color1 = texture2D(diffuse1, vUV * textureScales.x).rgb;
  vec3 color2 = texture2D(diffuse2, vUV * textureScales.y).rgb;
  vec3 color3 = texture2D(diffuse3, vUV * textureScales.z).rgb;
  vec3 color4 = texture2D(diffuse4, vUV * textureScales.w).rgb;

  // Blend textures using splatmap
  vec3 finalColor = color1 * splat.r +
                    color2 * splat.g +
                    color3 * splat.b +
                    color4 * splat.a;

  // Simple directional lighting
  // lightDirection points FROM light source, so use -lightDirection for surface normal dot product
  float diffuseLight = max(dot(vNormal, -lightDirection), 0.0);

  // Increase ambient component for better visibility in RTS game
  // 0.7 ambient + 0.8 * diffuse gives good visibility even in shadows
  finalColor *= 0.7 + diffuseLight * 0.8;

  gl_FragColor = vec4(finalColor, 1.0);
}
    `;

    // Register with Babylon.js shader store
    BABYLON.Effect.ShadersStore['terrainVertexShader'] = vertexShader;
    BABYLON.Effect.ShadersStore['terrainFragmentShader'] = fragmentShader;

    console.log('[TerrainRenderer] Terrain splatmap shaders registered');
  }

  /**
   * Load terrain from heightmap image
   */
  public async loadHeightmap(
    heightmapUrl: string,
    options: TerrainOptions
  ): Promise<TerrainLoadResult> {
    try {
      this.loadStatus = 'loading' as TerrainLoadStatus;

      return await new Promise((resolve, reject) => {
        this.mesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
          'terrain',
          heightmapUrl,
          {
            width: options.width,
            height: options.height,
            subdivisions: options.subdivisions,
            minHeight: options.minHeight ?? 0,
            maxHeight: options.maxHeight,
            onReady: (mesh) => {
              try {
                // Position terrain mesh so (0,0) in W3X coords = (0,0) in Babylon
                // Babylon centers the terrain at origin, but we need it positioned
                // so its corner is at origin to match unit/doodad coordinates
                mesh.position.x = options.width / 2;
                mesh.position.z = options.height / 2;
                console.log(
                  `[TerrainRenderer] Positioned terrain mesh at (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`
                );

                this.applyMaterial(mesh, options);
                this.loadStatus = 'loaded' as TerrainLoadStatus;
                resolve({
                  status: this.loadStatus,
                  mesh: mesh,
                });
              } catch (materialError) {
                console.error('[TerrainRenderer] Failed to apply material:', materialError);
                this.loadStatus = 'error' as TerrainLoadStatus;
                reject(materialError);
              }
            },
            updatable: false,
          },
          this.scene
        );

        // Set wireframe if requested
        if (options.wireframe === true) {
          this.mesh.material = new BABYLON.StandardMaterial('wireframe', this.scene);
          (this.mesh.material as BABYLON.StandardMaterial).wireframe = true;
        }
      });
    } catch (error) {
      this.loadStatus = 'error' as TerrainLoadStatus;
      return {
        status: this.loadStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply material and textures to terrain
   */
  private applyMaterial(mesh: BABYLON.GroundMesh, options: TerrainOptions): void {
    this.material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);

    // Try to load texture from AssetLoader if textureId is provided
    if (options.textureId) {
      try {
        // Map the terrain texture ID to our asset ID
        const mappedId = mapAssetID('w3x', 'terrain', options.textureId);
        console.log(`[TerrainRenderer] Mapped texture ID: ${options.textureId} -> ${mappedId}`);

        // Load the diffuse texture
        const diffuseTexture = this.assetLoader.loadTexture(mappedId);
        diffuseTexture.uScale = 16;
        diffuseTexture.vScale = 16;
        this.material.diffuseTexture = diffuseTexture;

        // Try to load normal map (if available)
        try {
          const normalTexture = this.assetLoader.loadTexture(`${mappedId}_normal`);
          normalTexture.uScale = 16;
          normalTexture.vScale = 16;
          this.material.bumpTexture = normalTexture;
        } catch {
          // Normal map not available, continue without it
        }

        // Try to load roughness map (if available)
        try {
          const roughnessTexture = this.assetLoader.loadTexture(`${mappedId}_roughness`);
          roughnessTexture.uScale = 16;
          roughnessTexture.vScale = 16;
          this.material.specularTexture = roughnessTexture;
        } catch {
          // Roughness map not available, use default specular
          this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        }

        console.log(`[TerrainRenderer] Loaded texture: ${mappedId} for terrain`);
      } catch (error) {
        console.warn(
          `[TerrainRenderer] Failed to load texture for ${options.textureId}, using fallback color`,
          error
        );
        // Fallback to default grass color
        this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
        this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      }
    } else {
      // No textureId provided, use default grass color
      console.log('[TerrainRenderer] No textureId provided, using default grass color');
      this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
      this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    }

    // Enable backface culling for performance
    this.material.backFaceCulling = true;

    // Apply material to mesh
    mesh.material = this.material;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;

    console.log(
      `[TerrainRenderer] Material applied: mesh=${mesh.name}, ` +
        `position=${mesh.position.toString()}, ` +
        `visible=${mesh.isVisible}, ` +
        `material=${this.material?.name ?? 'none'}`
    );
  }

  /**
   * Load terrain with multi-texture splatmap (for W3X maps with groundTextureIds)
   */
  public async loadHeightmapMultiTexture(
    heightmapUrl: string,
    options: TerrainOptions & {
      textureIds: string[];
      blendMap: Uint8Array;
    }
  ): Promise<TerrainLoadResult> {
    try {
      this.loadStatus = 'loading' as TerrainLoadStatus;

      return await new Promise((resolve, reject) => {
        this.mesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
          'terrain',
          heightmapUrl,
          {
            width: options.width,
            height: options.height,
            subdivisions: options.subdivisions,
            minHeight: options.minHeight ?? 0,
            maxHeight: options.maxHeight,
            onReady: (mesh) => {
              try {
                // Position terrain mesh so (0,0) in W3X coords = (0,0) in Babylon
                // Babylon centers the terrain at origin, but we need it positioned
                // so its corner is at origin to match unit/doodad coordinates
                mesh.position.x = options.width / 2;
                mesh.position.z = options.height / 2;
                console.log(
                  `[TerrainRenderer] Positioned multi-texture terrain mesh at (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`
                );

                this.applyMultiTextureMaterial(mesh, options);
                this.loadStatus = 'loaded' as TerrainLoadStatus;
                resolve({
                  status: this.loadStatus,
                  mesh: mesh,
                });
              } catch (materialError) {
                console.error(
                  '[TerrainRenderer] Failed to apply multi-texture material:',
                  materialError
                );
                this.loadStatus = 'error' as TerrainLoadStatus;
                reject(materialError);
              }
            },
            updatable: false,
          },
          this.scene
        );
      });
    } catch (error) {
      this.loadStatus = 'error' as TerrainLoadStatus;
      return {
        status: this.loadStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply multi-texture splatmap material
   */
  private applyMultiTextureMaterial(
    mesh: BABYLON.GroundMesh,
    options: TerrainOptions & {
      textureIds: string[];
      blendMap: Uint8Array;
    }
  ): void {
    const { textureIds, blendMap } = options;

    console.log(
      `[TerrainRenderer] Applying multi-texture material with ${textureIds.length} textures:`,
      textureIds
    );

    // Load up to 4 textures (shader supports 4)
    const textures: BABYLON.Texture[] = [];
    for (let i = 0; i < Math.min(4, textureIds.length); i++) {
      try {
        const mappedId = mapAssetID('w3x', 'terrain', textureIds[i] ?? '');
        const texture = this.assetLoader.loadTexture(mappedId);
        texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        textures.push(texture);
        console.log(`[TerrainRenderer] Loaded texture ${i + 1}: ${textureIds[i]} -> ${mappedId}`);
      } catch (error) {
        console.warn(`[TerrainRenderer] Failed to load texture ${textureIds[i]}, using fallback`);
        // Create fallback colored texture
        const fallbackTexture = new BABYLON.Texture(
          this.createFallbackTextureDataUrl(i),
          this.scene
        );
        textures.push(fallbackTexture);
      }
    }

    // Pad with fallback textures if less than 4
    while (textures.length < 4) {
      textures.push(
        new BABYLON.Texture(this.createFallbackTextureDataUrl(textures.length), this.scene)
      );
    }

    // Create splatmap texture from blendMap
    // Use tile dimensions, not world dimensions (splatmap is 1 pixel per tile)
    const splatWidth = options.splatmapWidth ?? options.width;
    const splatHeight = options.splatmapHeight ?? options.height;
    const splatmapTexture = this.createSplatmapTexture(blendMap, splatWidth, splatHeight);

    // Create custom shader material
    const shaderMaterial = new BABYLON.ShaderMaterial(
      'terrainSplatmap',
      this.scene,
      {
        vertex: 'terrain',
        fragment: 'terrain',
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
        samplers: ['diffuse1', 'diffuse2', 'diffuse3', 'diffuse4', 'splatmap'],
      }
    );

    // Set textures (non-null assertion safe because we padded to 4 textures above)
    shaderMaterial.setTexture('diffuse1', textures[0]!);
    shaderMaterial.setTexture('diffuse2', textures[1]!);
    shaderMaterial.setTexture('diffuse3', textures[2]!);
    shaderMaterial.setTexture('diffuse4', textures[3]!);
    shaderMaterial.setTexture('splatmap', splatmapTexture);

    // Set uniforms
    shaderMaterial.setVector3(
      'cameraPosition',
      this.scene.activeCamera?.position ?? BABYLON.Vector3.Zero()
    );
    // Light direction matches DirectionalLight in MapRendererCore
    // Points from upper-left downward: (-0.5, -1, -0.5) normalized
    shaderMaterial.setVector3('lightDirection', new BABYLON.Vector3(-0.5, -1, -0.5).normalize());
    shaderMaterial.setVector4('textureScales', new BABYLON.Vector4(16, 16, 16, 16)); // Texture tiling

    // Apply material to mesh (cast to Material to avoid type incompatibility)
    // ShaderMaterial is a valid Material but has different method signatures
    mesh.material = shaderMaterial as BABYLON.Material;
    // Store reference
    this.material = shaderMaterial as unknown as BABYLON.StandardMaterial;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;

    console.log('[TerrainRenderer] Multi-texture splatmap material applied successfully');
  }

  /**
   * Create splatmap texture from blend map (discrete tile indices -> RGBA weights)
   */
  private createSplatmapTexture(
    blendMap: Uint8Array,
    width: number,
    height: number
  ): BABYLON.Texture {
    // Create RGBA texture data
    // Each pixel represents blend weights for 4 textures (R, G, B, A)
    const splatmapSize = width * height * 4; // RGBA
    const splatmapData = new Uint8Array(splatmapSize);

    for (let i = 0; i < blendMap.length; i++) {
      const textureIndex = blendMap[i] ?? 0; // 0-3 (or 0-7 for 8 textures)
      const pixelOffset = i * 4;

      // Set RGBA weights: 255 for selected texture, 0 for others
      // This gives hard edges (no blending). For smooth blending, we'd need to
      // interpolate with neighboring tiles.
      splatmapData[pixelOffset + 0] = textureIndex === 0 ? 255 : 0; // R
      splatmapData[pixelOffset + 1] = textureIndex === 1 ? 255 : 0; // G
      splatmapData[pixelOffset + 2] = textureIndex === 2 ? 255 : 0; // B
      splatmapData[pixelOffset + 3] = textureIndex === 3 ? 255 : 0; // A
    }

    // Create texture from raw data
    const texture = BABYLON.RawTexture.CreateRGBATexture(
      splatmapData,
      width,
      height,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE // Use nearest for sharp tile boundaries
    );

    console.log(`[TerrainRenderer] Created splatmap texture: ${width}x${height}`);
    return texture;
  }

  /**
   * Create fallback texture data URL for missing textures
   */
  private createFallbackTextureDataUrl(index: number): string {
    // Create colored canvas based on index
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Different colors for different indices
    const colors = [
      '#5a8a5a', // Green (grass)
      '#8a7a5a', // Brown (dirt)
      '#6a6a6a', // Gray (rock)
      '#4a6a8a', // Blue (water)
    ];
    ctx.fillStyle = colors[index] ?? colors[0] ?? '#5a8a5a';
    ctx.fillRect(0, 0, 64, 64);

    return canvas.toDataURL();
  }

  /**
   * Create flat terrain (for testing)
   */
  public createFlatTerrain(
    width: number,
    height: number,
    subdivisions: number
  ): BABYLON.GroundMesh {
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      'flatTerrain',
      {
        width,
        height,
        subdivisions,
      },
      this.scene
    );

    // Apply default material
    this.material = new BABYLON.StandardMaterial('flatTerrainMaterial', this.scene);
    this.material.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.4);
    this.mesh.material = this.material;

    this.loadStatus = 'loaded' as TerrainLoadStatus;
    return this.mesh;
  }

  /**
   * Get terrain mesh
   */
  public getMesh(): BABYLON.GroundMesh | undefined {
    return this.mesh;
  }

  /**
   * Get terrain material
   */
  public getMaterial(): BABYLON.StandardMaterial | undefined {
    return this.material;
  }

  /**
   * Get load status
   */
  public getLoadStatus(): TerrainLoadStatus {
    return this.loadStatus;
  }

  /**
   * Get height at world position
   */
  public getHeightAtPosition(x: number, z: number): number {
    if (!this.mesh) return 0;

    const ray = new BABYLON.Ray(new BABYLON.Vector3(x, 1000, z), new BABYLON.Vector3(0, -1, 0));
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh === this.mesh);

    return pickInfo?.pickedPoint?.y ?? 0;
  }

  /**
   * Update terrain texture
   */
  public updateTexture(textureUrl: string): void {
    if (!this.material) return;

    this.material.diffuseTexture?.dispose();
    this.material.diffuseTexture = new BABYLON.Texture(textureUrl, this.scene);
  }

  /**
   * Dispose terrain and resources
   */
  public dispose(): void {
    this.material?.dispose();
    this.mesh?.dispose();
    this.loadStatus = 'idle' as TerrainLoadStatus;
  }
}
