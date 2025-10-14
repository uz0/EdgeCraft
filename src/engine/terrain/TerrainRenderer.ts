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

    // Fragment shader - Extended to support 8 textures with debug mode
    const fragmentShader = `
precision highp float;

// Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// Uniforms
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec4 textureScales1; // Tiling for textures 0-3
uniform vec4 textureScales2; // Tiling for textures 4-7
uniform float debugMode; // 0=normal, 1=splatmap1, 2=splatmap2, 3=UVs

// Textures (8 total)
uniform sampler2D diffuse1;
uniform sampler2D diffuse2;
uniform sampler2D diffuse3;
uniform sampler2D diffuse4;
uniform sampler2D diffuse5;
uniform sampler2D diffuse6;
uniform sampler2D diffuse7;
uniform sampler2D diffuse8;
uniform sampler2D splatmap1; // RGBA = weights for textures 0-3
uniform sampler2D splatmap2; // RGBA = weights for textures 4-7

void main(void) {
  // Sample splatmaps for blend weights
  vec4 splat1 = texture2D(splatmap1, vUV); // Textures 0-3
  vec4 splat2 = texture2D(splatmap2, vUV); // Textures 4-7

  // DEBUG MODES
  if (debugMode > 0.5 && debugMode < 1.5) {
    // Debug mode 1: Show splatmap1 channels as colors
    gl_FragColor = vec4(splat1.rgb, 1.0);
    return;
  }
  if (debugMode > 1.5 && debugMode < 2.5) {
    // Debug mode 2: Show splatmap2 channels as colors
    gl_FragColor = vec4(splat2.rgb, 1.0);
    return;
  }
  if (debugMode > 2.5) {
    // Debug mode 3: Show UVs as colors (red=U, green=V)
    gl_FragColor = vec4(vUV.x, vUV.y, 0.0, 1.0);
    return;
  }

  // NORMAL RENDERING
  // Sample diffuse textures with individual tiling
  vec3 color1 = texture2D(diffuse1, vUV * textureScales1.x).rgb;
  vec3 color2 = texture2D(diffuse2, vUV * textureScales1.y).rgb;
  vec3 color3 = texture2D(diffuse3, vUV * textureScales1.z).rgb;
  vec3 color4 = texture2D(diffuse4, vUV * textureScales1.w).rgb;
  vec3 color5 = texture2D(diffuse5, vUV * textureScales2.x).rgb;
  vec3 color6 = texture2D(diffuse6, vUV * textureScales2.y).rgb;
  vec3 color7 = texture2D(diffuse7, vUV * textureScales2.z).rgb;
  vec3 color8 = texture2D(diffuse8, vUV * textureScales2.w).rgb;

  // Blend textures using splatmaps
  vec3 finalColor = color1 * splat1.r +
                    color2 * splat1.g +
                    color3 * splat1.b +
                    color4 * splat1.a +
                    color5 * splat2.r +
                    color6 * splat2.g +
                    color7 * splat2.b +
                    color8 * splat2.a;

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

    console.log(`[TerrainRenderer] 🔍 MATERIAL DEBUG - Applying multi-texture material`);
    console.log(`[TerrainRenderer] 🔍 Total textures requested: ${textureIds.length}`);
    console.log(`[TerrainRenderer] 🔍 Texture IDs: [${textureIds.join(', ')}]`);

    // Load up to 8 textures (shader now supports 8)
    const textures: BABYLON.Texture[] = [];
    for (let i = 0; i < Math.min(8, textureIds.length); i++) {
      try {
        const textureId = textureIds[i] ?? '';
        const mappedId = mapAssetID('w3x', 'terrain', textureId);
        const texture = this.assetLoader.loadTexture(mappedId);
        texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        textures.push(texture);
        console.log(
          `[TerrainRenderer] ✅ Loaded texture slot ${i}: "${textureId}" -> "${mappedId}"`
        );
      } catch (error) {
        const textureId = textureIds[i] ?? '';
        console.error(
          `[TerrainRenderer] ❌ Failed to load texture slot ${i}: "${textureId}"`,
          error
        );
        // Create fallback colored texture
        const fallbackTexture = new BABYLON.Texture(
          this.createFallbackTextureDataUrl(i),
          this.scene
        );
        textures.push(fallbackTexture);
        console.log(`[TerrainRenderer] 🔶 Using fallback color for slot ${i}`);
      }
    }

    // Pad with fallback textures if less than 8
    while (textures.length < 8) {
      textures.push(
        new BABYLON.Texture(this.createFallbackTextureDataUrl(textures.length), this.scene)
      );
    }

    // Create splatmap textures from blendMap
    // Use tile dimensions, not world dimensions (splatmap is 1 pixel per tile)
    const splatWidth = options.splatmapWidth ?? options.width;
    const splatHeight = options.splatmapHeight ?? options.height;
    const { splatmap1, splatmap2 } = this.createDualSplatmapTextures(
      blendMap,
      splatWidth,
      splatHeight
    );

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
          'textureScales1',
          'textureScales2',
          'debugMode',
        ],
        samplers: [
          'diffuse1',
          'diffuse2',
          'diffuse3',
          'diffuse4',
          'diffuse5',
          'diffuse6',
          'diffuse7',
          'diffuse8',
          'splatmap1',
          'splatmap2',
        ],
      }
    );

    // Set textures (non-null assertion safe because we padded to 8 textures above)
    shaderMaterial.setTexture('diffuse1', textures[0]!);
    shaderMaterial.setTexture('diffuse2', textures[1]!);
    shaderMaterial.setTexture('diffuse3', textures[2]!);
    shaderMaterial.setTexture('diffuse4', textures[3]!);
    shaderMaterial.setTexture('diffuse5', textures[4]!);
    shaderMaterial.setTexture('diffuse6', textures[5]!);
    shaderMaterial.setTexture('diffuse7', textures[6]!);
    shaderMaterial.setTexture('diffuse8', textures[7]!);
    shaderMaterial.setTexture('splatmap1', splatmap1);
    shaderMaterial.setTexture('splatmap2', splatmap2);

    // Set uniforms
    shaderMaterial.setVector3(
      'cameraPosition',
      this.scene.activeCamera?.position ?? BABYLON.Vector3.Zero()
    );
    // Light direction matches DirectionalLight in MapRendererCore
    // Points from upper-left downward: (-0.5, -1, -0.5) normalized
    shaderMaterial.setVector3('lightDirection', new BABYLON.Vector3(-0.5, -1, -0.5).normalize());
    shaderMaterial.setVector4('textureScales1', new BABYLON.Vector4(16, 16, 16, 16)); // Tiling for textures 0-3
    shaderMaterial.setVector4('textureScales2', new BABYLON.Vector4(16, 16, 16, 16)); // Tiling for textures 4-7

    // Debug mode: 0=normal, 1=splatmap1, 2=splatmap2, 3=UVs
    // Can be changed via: window.terrainDebugMode = 1 (then reload map)
    const debugMode = (window as any).terrainDebugMode ?? 0;
    shaderMaterial.setFloat('debugMode', debugMode);

    if (debugMode > 0) {
      console.log(
        `[TerrainRenderer] 🐛 DEBUG MODE ENABLED: ${debugMode} ` +
          `(0=normal, 1=splatmap1, 2=splatmap2, 3=UVs)`
      );
    }

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
   * Create dual splatmap textures from blend map (supports 8 textures)
   * Splatmap1: RGBA = weights for textures 0-3
   * Splatmap2: RGBA = weights for textures 4-7
   */
  private createDualSplatmapTextures(
    blendMap: Uint8Array,
    width: number,
    height: number
  ): { splatmap1: BABYLON.Texture; splatmap2: BABYLON.Texture } {
    // DEBUG: Analyze blendMap indices
    const indexCounts = new Map<number, number>();
    let minIdx = Infinity;
    let maxIdx = -Infinity;
    for (let i = 0; i < blendMap.length; i++) {
      const idx = blendMap[i] ?? 0;
      indexCounts.set(idx, (indexCounts.get(idx) ?? 0) + 1);
      minIdx = Math.min(minIdx, idx);
      maxIdx = Math.max(maxIdx, idx);
    }

    console.log(
      `[TerrainRenderer] 🔍 SPLATMAP DEBUG - Creating dual ${width}x${height} splatmaps from ${blendMap.length} tiles`
    );
    console.log(
      `[TerrainRenderer] 🔍 BlendMap index range: min=${minIdx}, max=${maxIdx}, unique=${indexCounts.size}`
    );
    console.log(
      `[TerrainRenderer] 🔍 Index distribution:`,
      Array.from(indexCounts.entries())
        .sort((a, b) => a[0] - b[0])
        .map(
          ([idx, count]) =>
            `  idx${idx}=${count} (${((count / blendMap.length) * 100).toFixed(1)}%)`
        )
        .join('\n')
    );

    // Create RGBA texture data for both splatmaps
    const splatmapSize = width * height * 4; // RGBA
    const splatmap1Data = new Uint8Array(splatmapSize); // Textures 0-3
    const splatmap2Data = new Uint8Array(splatmapSize); // Textures 4-7

    for (let i = 0; i < blendMap.length; i++) {
      const textureIndex = blendMap[i] ?? 0; // 0-7
      const pixelOffset = i * 4;

      if (textureIndex < 4) {
        // Textures 0-3 go into splatmap1
        splatmap1Data[pixelOffset + 0] = textureIndex === 0 ? 255 : 0; // R
        splatmap1Data[pixelOffset + 1] = textureIndex === 1 ? 255 : 0; // G
        splatmap1Data[pixelOffset + 2] = textureIndex === 2 ? 255 : 0; // B
        splatmap1Data[pixelOffset + 3] = textureIndex === 3 ? 255 : 0; // A
        // Splatmap2 is all zeros for this tile
      } else {
        // Textures 4-7 go into splatmap2
        splatmap2Data[pixelOffset + 0] = textureIndex === 4 ? 255 : 0; // R
        splatmap2Data[pixelOffset + 1] = textureIndex === 5 ? 255 : 0; // G
        splatmap2Data[pixelOffset + 2] = textureIndex === 6 ? 255 : 0; // B
        splatmap2Data[pixelOffset + 3] = textureIndex === 7 ? 255 : 0; // A
        // Splatmap1 is all zeros for this tile
      }
    }

    // Create textures from raw data
    const splatmap1 = BABYLON.RawTexture.CreateRGBATexture(
      splatmap1Data,
      width,
      height,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE // Use nearest for sharp tile boundaries
    );

    const splatmap2 = BABYLON.RawTexture.CreateRGBATexture(
      splatmap2Data,
      width,
      height,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE // Use nearest for sharp tile boundaries
    );

    console.log(`[TerrainRenderer] ✅ Created dual splatmap textures: ${width}x${height}`);
    console.log(
      `[TerrainRenderer] ✅ Splatmap1 (textures 0-3): ${Array.from(indexCounts.entries())
        .filter(([idx]) => idx < 4)
        .map(([idx, count]) => `idx${idx}=${count}`)
        .join(', ')}`
    );
    console.log(
      `[TerrainRenderer] ✅ Splatmap2 (textures 4-7): ${Array.from(indexCounts.entries())
        .filter(([idx]) => idx >= 4)
        .map(([idx, count]) => `idx${idx}=${count}`)
        .join(', ')}`
    );

    return { splatmap1, splatmap2 };
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

    // Different colors for different indices (8 textures total)
    const colors = [
      '#5a8a5a', // 0: Green (grass)
      '#8a7a5a', // 1: Brown (dirt)
      '#6a6a6a', // 2: Gray (rock)
      '#4a6a8a', // 3: Blue (water)
      '#9a6a4a', // 4: Orange-brown (clay)
      '#4a8a4a', // 5: Dark green (forest)
      '#8a8a6a', // 6: Tan (sand)
      '#7a5a4a', // 7: Dark brown (mud)
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
