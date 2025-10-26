/**
 * Terrain Renderer - Handles heightmap-based terrain rendering
 */

import * as BABYLON from '@babylonjs/core';
import type { TerrainOptions, TerrainLoadResult, TerrainLoadStatus } from './types';
import type { AssetLoader } from '../assets/AssetLoader';
import { mapAssetID } from '../assets/AssetMap';
import type { CustomShaderSystem } from '../rendering/CustomShaderSystem';
import type { WaterData } from '../../formats/maps/types';

// Extend Window interface for debug mode
declare global {
  interface Window {
    terrainDebugMode?: number;
  }
}

interface WarcraftLayerOptions {
  width: number;
  height: number;
  tileSize: number;
  heightmap: Float32Array;
  cliffLevels?: Uint8Array | null;
  water?: WaterData;
  minHeight: number;
  maxHeight: number;
  shaderSystem?: CustomShaderSystem | null;
}

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
  private mesh?: BABYLON.Mesh;
  private material?: BABYLON.Material;
  private cliffMesh?: BABYLON.Mesh;
  private waterMesh?: BABYLON.Mesh;
  private waterMaterial?: BABYLON.Material;
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
                // Keep terrain centered at origin (0, 0, 0) to match entity coordinates
                // Babylon.js CreateGroundFromHeightMap naturally centers terrain at origin
                // W3X entity coordinates are also centered, so no offset needed

                // CRITICAL FIX: Ensure UV coordinates are present
                // CreateGroundFromHeightMap should generate UVs, but verify and regenerate if missing
                const hasUVs = mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UVKind);
                if (!hasUVs) {
                  // Generate UV coordinates manually
                  const subdivisions = options.subdivisions;
                  const uvs: number[] = [];
                  for (let y = 0; y <= subdivisions; y++) {
                    for (let x = 0; x <= subdivisions; x++) {
                      uvs.push(x / subdivisions, y / subdivisions);
                    }
                  }
                  mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
                }

                this.applyMaterial(mesh, options);
                this.loadStatus = 'loaded' as TerrainLoadStatus;
                resolve({
                  status: this.loadStatus,
                  mesh: mesh,
                });
              } catch (materialError) {
                this.loadStatus = 'error' as TerrainLoadStatus;
                reject(
                  materialError instanceof Error ? materialError : new Error(String(materialError))
                );
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
    const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);
    this.material = material;

    // Try to load texture from AssetLoader if textureId is provided
    if (options.textureId !== undefined && options.textureId !== null && options.textureId !== '') {
      try {
        // Map the terrain texture ID to our asset ID
        const mappedId = mapAssetID('w3x', 'terrain', options.textureId);

        // Load the diffuse texture
        const diffuseTexture = this.assetLoader.loadTexture(mappedId);
        diffuseTexture.uScale = 16;
        diffuseTexture.vScale = 16;
        material.diffuseTexture = diffuseTexture;

        // Try to load normal map (if available)
        try {
          const normalTexture = this.assetLoader.loadTexture(`${mappedId}_normal`);
          normalTexture.uScale = 16;
          normalTexture.vScale = 16;
          material.bumpTexture = normalTexture;
        } catch {
          // Normal map not available, continue without it
        }

        // Try to load roughness map (if available)
        try {
          const roughnessTexture = this.assetLoader.loadTexture(`${mappedId}_roughness`);
          roughnessTexture.uScale = 16;
          roughnessTexture.vScale = 16;
          material.specularTexture = roughnessTexture;
        } catch {
          // Roughness map not available, use default specular
          material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        }
      } catch {
        // Fallback to default grass color
        material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      }
    } else {
      // No textureId provided, use default grass color
      material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
      material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    }

    // Enable backface culling for performance
    material.backFaceCulling = true;

    // Set ambient color to white for proper texture visibility
    // ambientColor (0,0,0) blocks texture rendering
    material.ambientColor = new BABYLON.Color3(1, 1, 1);

    // Apply material to mesh
    mesh.material = material;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
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
                // Keep terrain centered at origin (0, 0, 0) to match entity coordinates
                // Babylon.js CreateGroundFromHeightMap naturally centers terrain at origin
                // W3X entity coordinates are also centered, so no offset needed

                // CRITICAL FIX: Check if indices were generated
                // If heightmap fails to load, Babylon creates vertices but NO indices
                const indices = mesh.getIndices();
                if (!indices || indices.length === 0) {
                  // Calculate subdivisions from actual vertex count
                  // For a grid: vertexCount = (subdivisions + 1)²
                  const totalVertices = mesh.getTotalVertices();
                  const subdivisions = Math.floor(Math.sqrt(totalVertices)) - 1;

                  // Generate indices manually for grid mesh
                  // Use Uint32Array to ensure integer indices (not floats!)
                  const indexCount = subdivisions * subdivisions * 6; // 2 triangles per quad, 3 indices per triangle
                  const generatedIndices = new Uint32Array(indexCount);
                  let indexOffset = 0;

                  for (let y = 0; y < subdivisions; y++) {
                    for (let x = 0; x < subdivisions; x++) {
                      const i0 = y * (subdivisions + 1) + x;
                      const i1 = i0 + 1;
                      const i2 = i0 + (subdivisions + 1);
                      const i3 = i2 + 1;

                      // Two triangles per quad
                      generatedIndices[indexOffset++] = i0; // Triangle 1
                      generatedIndices[indexOffset++] = i2;
                      generatedIndices[indexOffset++] = i1;
                      generatedIndices[indexOffset++] = i1; // Triangle 2
                      generatedIndices[indexOffset++] = i2;
                      generatedIndices[indexOffset++] = i3;
                    }
                  }

                  mesh.setIndices(generatedIndices);
                }

                this.applyMultiTextureMaterial(mesh, options);
                this.loadStatus = 'loaded' as TerrainLoadStatus;
                resolve({
                  status: this.loadStatus,
                  mesh: mesh,
                });
              } catch (materialError) {
                this.loadStatus = 'error' as TerrainLoadStatus;
                reject(
                  materialError instanceof Error ? materialError : new Error(String(materialError))
                );
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
      } catch {
        // Create fallback colored texture
        const fallbackTexture = new BABYLON.Texture(
          this.createFallbackTextureDataUrl(i),
          this.scene
        );
        textures.push(fallbackTexture);
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
    const debugMode = window.terrainDebugMode ?? 0;
    shaderMaterial.setFloat('debugMode', debugMode);

    if (debugMode > 0) {
    }

    // Apply material to mesh (cast to Material to avoid type incompatibility)
    // ShaderMaterial is a valid Material but has different method signatures
    const assignedMaterial = shaderMaterial as unknown as BABYLON.Material;
    mesh.material = assignedMaterial;
    this.material = assignedMaterial;

    // Optimize for static terrain
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
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

    // Create RGBA texture data for both splatmaps
    const splatmapSize = width * height * 4; // RGBA
    const splatmap1Data = new Uint8Array(splatmapSize); // Textures 0-3
    const splatmap2Data = new Uint8Array(splatmapSize); // Textures 4-7

    // DEBUG: Sample first 5 blendMap values

    let _nonZeroSplatmap1Count = 0;
    let _nonZeroSplatmap2Count = 0;

    // SC2-STYLE SMOOTH BLENDING
    // Instead of hard 0/255 values, we blend textures based on neighboring tiles
    // This creates smooth transitions like in StarCraft 2
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const centerTexture = blendMap[i] ?? 0;
        const pixelOffset = i * 4;

        // SC2-style blending: Strong center weight with subtle edge softening
        // Center dominates (80%), neighbors add subtle transitions (20% total)
        const weights = new Float32Array(8); // Weights for each texture (0-7)
        let totalWeight = 0;

        // Subtle 3x3 kernel: Center=8.0, Edge=0.5, Corner=0.25 (sum ~11.5)
        // This gives ~70% center weight, ~30% neighbor influence
        const kernelWeights = [
          0.25,
          0.5,
          0.25, // Top row (corners and edge)
          0.5,
          8.0,
          0.5, // Middle row (CENTER DOMINATES)
          0.25,
          0.5,
          0.25, // Bottom row
        ];

        const offsets = [
          [-1, -1],
          [0, -1],
          [1, -1], // Top row
          [-1, 0],
          [0, 0],
          [1, 0], // Middle row
          [-1, 1],
          [0, 1],
          [1, 1], // Bottom row
        ];

        for (let k = 0; k < offsets.length; k++) {
          const nx = x + (offsets[k]?.[0] ?? 0);
          const ny = y + (offsets[k]?.[1] ?? 0);

          // Clamp to bounds
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIdx = ny * width + nx;
            const neighborTexture = blendMap[neighborIdx] ?? 0;
            const kernelWeight = kernelWeights[k] ?? 1.0;

            if (weights[neighborTexture] !== undefined) {
              weights[neighborTexture] += kernelWeight;
              totalWeight += kernelWeight;
            }
          }
        }

        // Normalize weights to [0, 255]
        if (totalWeight > 0) {
          for (let t = 0; t < 8; t++) {
            weights[t] = ((weights[t] ?? 0) / totalWeight) * 255;
          }
        } else {
          // Fallback: set center texture to full weight
          weights[centerTexture] = 255;
        }

        // Write to splatmap1 (textures 0-3)
        splatmap1Data[pixelOffset + 0] = Math.min(255, Math.max(0, Math.round(weights[0] ?? 0)));
        splatmap1Data[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(weights[1] ?? 0)));
        splatmap1Data[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(weights[2] ?? 0)));
        splatmap1Data[pixelOffset + 3] = Math.min(255, Math.max(0, Math.round(weights[3] ?? 0)));

        if (
          (weights[0] ?? 0) > 0 ||
          (weights[1] ?? 0) > 0 ||
          (weights[2] ?? 0) > 0 ||
          (weights[3] ?? 0) > 0
        ) {
          _nonZeroSplatmap1Count++;
        }

        // Write to splatmap2 (textures 4-7)
        splatmap2Data[pixelOffset + 0] = Math.min(255, Math.max(0, Math.round(weights[4] ?? 0)));
        splatmap2Data[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(weights[5] ?? 0)));
        splatmap2Data[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(weights[6] ?? 0)));
        splatmap2Data[pixelOffset + 3] = Math.min(255, Math.max(0, Math.round(weights[7] ?? 0)));

        if (
          (weights[4] ?? 0) > 0 ||
          (weights[5] ?? 0) > 0 ||
          (weights[6] ?? 0) > 0 ||
          (weights[7] ?? 0) > 0
        ) {
          _nonZeroSplatmap2Count++;
        }
      }
    }

    // DEBUG: Sample first 20 bytes of splatmap1Data

    // Create textures from raw data
    // Use BILINEAR filtering for smooth SC2-style blending between textures
    const splatmap1 = BABYLON.RawTexture.CreateRGBATexture(
      splatmap1Data,
      width,
      height,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.BILINEAR_SAMPLINGMODE // Smooth interpolation for SC2-style blending
    );

    const splatmap2 = BABYLON.RawTexture.CreateRGBATexture(
      splatmap2Data,
      width,
      height,
      this.scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.BILINEAR_SAMPLINGMODE // Smooth interpolation for SC2-style blending
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
  public createFlatTerrain(width: number, height: number, subdivisions: number): BABYLON.Mesh {
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
    const material = new BABYLON.StandardMaterial('flatTerrainMaterial', this.scene);
    material.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.4);
    this.material = material;
    this.mesh.material = material;

    this.loadStatus = 'loaded' as TerrainLoadStatus;
    return this.mesh;
  }

  /**
   * Get terrain mesh
   */
  public getMesh(): BABYLON.Mesh | undefined {
    return this.mesh;
  }

  /**
   * Get terrain material
   */
  public getMaterial(): BABYLON.Material | undefined {
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
    if (!(this.material instanceof BABYLON.StandardMaterial)) {
      return;
    }

    this.material.diffuseTexture?.dispose();
    this.material.diffuseTexture = new BABYLON.Texture(textureUrl, this.scene);
  }

  public renderWarcraftLayers(options: WarcraftLayerOptions): void {
    this.disposeLayers();
    if (options.width <= 0 || options.height <= 0) {
      return;
    }
    this.createCliffMesh(options);
    this.createWaterMesh(options);
  }

  public clearAdditionalLayers(): void {
    this.disposeLayers();
  }

  private disposeLayers(): void {
    this.cliffMesh?.dispose();
    this.cliffMesh = undefined;
    this.waterMesh?.dispose();
    this.waterMesh = undefined;
    this.waterMaterial?.dispose();
    this.waterMaterial = undefined;
  }

  private createCliffMesh(options: WarcraftLayerOptions): void {
    const width = options.width | 0;
    const height = options.height | 0;
    if (width === 0 || height === 0) {
      return;
    }

    const tileSize = options.tileSize;
    const worldWidth = width * tileSize;
    const worldHeight = height * tileSize;
    const originX = -worldWidth / 2;
    const originZ = -worldHeight / 2;
    const threshold = tileSize * 0.45;
    const thickness = Math.max(3, tileSize * 0.04);
    const material = new BABYLON.StandardMaterial('terrainCliffMaterial', this.scene);
    material.diffuseColor = new BABYLON.Color3(0.32, 0.28, 0.24);
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;

    const meshes: BABYLON.Mesh[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const currentHeight = options.heightmap[index] ?? 0;

        if (x < width - 1) {
          const neighborHeight = options.heightmap[index + 1] ?? currentHeight;
          const diff = neighborHeight - currentHeight;
          if (Math.abs(diff) >= threshold) {
            const lower = diff > 0 ? currentHeight : neighborHeight;
            const heightSpan = Math.abs(diff);
            const edgeX = originX + (x + 1) * tileSize;
            const offsetX = diff > 0 ? -thickness / 2 : thickness / 2;
            const centerZ = originZ + y * tileSize + tileSize / 2;
            const centerY = lower + heightSpan / 2;
            const box = BABYLON.MeshBuilder.CreateBox(
              `cliff-east-${x}-${y}`,
              {
                width: thickness,
                height: heightSpan,
                depth: tileSize,
              },
              this.scene
            );
            box.position.set(edgeX + offsetX, centerY, centerZ);
            meshes.push(box);
          }
        }
        if (y < height - 1) {
          const neighborHeight = options.heightmap[index + width] ?? currentHeight;
          const diff = neighborHeight - currentHeight;
          if (Math.abs(diff) >= threshold) {
            const lower = diff > 0 ? currentHeight : neighborHeight;
            const heightSpan = Math.abs(diff);
            const edgeZ = originZ + (y + 1) * tileSize;
            const offsetZ = diff > 0 ? -thickness / 2 : thickness / 2;
            const centerX = originX + x * tileSize + tileSize / 2;
            const centerY = lower + heightSpan / 2;
            const box = BABYLON.MeshBuilder.CreateBox(
              `cliff-south-${x}-${y}`,
              {
                width: tileSize,
                height: heightSpan,
                depth: thickness,
              },
              this.scene
            );
            box.position.set(centerX, centerY, edgeZ + offsetZ);
            meshes.push(box);
          }
        }
      }
    }

    if (meshes.length === 0) {
      material.dispose();
      return;
    }

    for (const mesh of meshes) {
      mesh.material = material;
    }

    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (!merged) {
      material.dispose();
      return;
    }

    merged.name = 'terrainCliffs';
    merged.isPickable = false;
    merged.material = material;
    merged.freezeWorldMatrix();
    merged.doNotSyncBoundingInfo = true;
    this.cliffMesh = merged;
  }

  private createWaterMesh(options: WarcraftLayerOptions): void {
    const water = options.water;
    if (!water) {
      return;
    }

    const width = options.width * options.tileSize;
    const height = options.height * options.tileSize;
    const mesh = BABYLON.MeshBuilder.CreateGround(
      'terrainWater',
      {
        width,
        height,
        subdivisions: 32,
      },
      this.scene
    );

    mesh.isPickable = false;
    mesh.position.y = water.level - 0.5;

    const shader = options.shaderSystem?.createShader({
      name: `terrainWaterShader-${Date.now()}`,
      preset: 'water',
    });

    if (shader) {
      mesh.material = shader as unknown as BABYLON.Material;
    } else {
      const material = new BABYLON.StandardMaterial('terrainWaterMaterial', this.scene);
      const diffuse = new BABYLON.Color3(
        water.color.r / 255,
        water.color.g / 255,
        water.color.b / 255
      );
      material.diffuseColor = diffuse;
      material.alpha = (water.color.a ?? 200) / 255;
      material.specularColor = BABYLON.Color3.Black();
      material.backFaceCulling = false;
      mesh.material = material;
      this.waterMaterial = material;
    }

    mesh.freezeWorldMatrix();
    this.waterMesh = mesh;
  }

  /**
   * Dispose terrain and resources
   */
  public dispose(): void {
    this.material?.dispose();
    this.mesh?.dispose();
    this.disposeLayers();
    this.loadStatus = 'idle' as TerrainLoadStatus;
  }
}
