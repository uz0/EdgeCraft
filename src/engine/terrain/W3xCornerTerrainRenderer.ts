import * as BABYLON from '@babylonjs/core';
import type { TerrainData } from '../../formats/maps/types';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import { TerrainTextureBuilder } from './TerrainTextureBuilder';
import { TerrainTextureManager } from './TerrainTextureManager';

/**
 * Corner-based terrain renderer matching mdx-m3-viewer's approach
 * Uses a single quad geometry with per-corner texture data
 */
export class W3xCornerTerrainRenderer {
  private scene: BABYLON.Scene;
  private terrainMesh: BABYLON.Mesh | null = null;
  private textureBuilder: TerrainTextureBuilder;
  private textureManager: TerrainTextureManager;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.textureBuilder = new TerrainTextureBuilder();
    this.textureManager = new TerrainTextureManager(scene);
  }

  public async renderTerrain(terrain: TerrainData): Promise<void> {
    const TILE_SIZE = 128;
    const columns = terrain.width;
    const rows = terrain.height;

    const w3e = terrain.raw as W3ETerrain | undefined;
    if (!w3e) {
      console.error('W3E terrain data not available');
      return;
    }

    const textureIds = w3e.groundTextureIds ?? [];
    const textureExtendedMap = await this.textureManager.getTextureExtendedMap(textureIds);

    const { cornerTextures, cornerVariations, cornerExtended, tileCount } =
      this.textureBuilder.buildTextureArrays(w3e, textureExtendedMap);

    console.log(`Building corner-based terrain: ${tileCount} tiles`);

    // Create a simple quad geometry (0,0) to (1,1)
    const positions = new Float32Array([
      0, 0, 0,  // Bottom-left
      1, 0, 0,  // Bottom-right
      0, 0, 1,  // Top-left
      1, 0, 1,  // Top-right
    ]);

    const normals = new Float32Array([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ]);

    const uvs = new Float32Array([
      0, 0,  // Bottom-left
      1, 0,  // Bottom-right
      0, 1,  // Top-left
      1, 1,  // Top-right
    ]);

    const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    // Create custom mesh
    const customMesh = new BABYLON.Mesh('terrain', this.scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;

    vertexData.applyToMesh(customMesh);

    // Create matrices buffer for instances
    const matrices = new Float32Array(16 * tileCount);
    let matrixIndex = 0;

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        const worldX = x * TILE_SIZE - (columns * TILE_SIZE) / 2;
        const worldZ = y * TILE_SIZE - (rows * TILE_SIZE) / 2;

        const matrix = BABYLON.Matrix.Scaling(TILE_SIZE, 1, TILE_SIZE);
        matrix.setTranslation(new BABYLON.Vector3(worldX, 0, worldZ));
        matrix.copyToArray(matrices, matrixIndex * 16);
        matrixIndex++;
      }
    }

    // Enable instancing
    customMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);

    // Create corner data buffers
    const cornerTextureBuffer = new BABYLON.Buffer(
      this.scene.getEngine(),
      cornerTextures,
      false,
      4
    );

    const cornerVariationBuffer = new BABYLON.Buffer(
      this.scene.getEngine(),
      cornerVariations,
      false,
      4
    );

    const cornerExtendedBuffer = new BABYLON.Buffer(
      this.scene.getEngine(),
      cornerExtended,
      false,
      4
    );

    // Set vertex buffers for corner data
    customMesh.setVerticesBuffer(cornerTextureBuffer.createVertexBuffer('cornerTextures', 0, 4));
    customMesh.setVerticesBuffer(cornerVariationBuffer.createVertexBuffer('cornerVariations', 0, 4));
    customMesh.setVerticesBuffer(cornerExtendedBuffer.createVertexBuffer('cornerExtended', 0, 4));

    // Load textures
    const textures = await this.textureManager.createTextureAtlas(
      terrain.textures.map((t) => t.id)
    );

    // Create shader with unique name to avoid conflicts
    const shaderMaterial = new BABYLON.ShaderMaterial(
      'babylonCornerTerrainShader',  // Unique name to avoid conflicts
      this.scene,
      {
        vertexSource: this.getVertexShader(),
        fragmentSource: this.getFragmentShader(),
      },
      {
        attributes: [
          'position',
          'normal',
          'uv',
          'cornerTextures',
          'cornerVariations',
          'cornerExtended',
        ],
        uniforms: [
          'worldViewProjection',
          'world',
          'lightDirection',
          'lightColor',
          'ambientIntensity',
          'terrainSize',
        ],
        samplers: [
          'tileset0',
          'tileset1',
          'tileset2',
          'tileset3',
          'tileset4',
          'tileset5',
          'tileset6',
          'tileset7',
          'tileset8',
          'tileset9',
          'tileset10',
          'tileset11',
          'tileset12',
          'tileset13',
          'tileset14',
        ],
      }
    );

    // Set textures with unique sampler names
    for (let i = 0; i < textures.length && i < 15; i++) {
      shaderMaterial.setTexture(`tileset${i}`, textures[i] ?? null);
    }

    shaderMaterial.setVector3('lightDirection', new BABYLON.Vector3(0.5, -1.0, 0.5));
    shaderMaterial.setVector3('lightColor', new BABYLON.Vector3(1.0, 1.0, 1.0));
    shaderMaterial.setFloat('ambientIntensity', 0.4);
    shaderMaterial.setVector2('terrainSize', new BABYLON.Vector2(columns, rows));
    shaderMaterial.backFaceCulling = false;

    customMesh.material = shaderMaterial as unknown as BABYLON.Material;

    this.terrainMesh = customMesh;
    console.log(`Corner-based terrain created: ${tileCount} tiles`);
  }

  private getVertexShader(): string {
    return `
      precision highp float;

      // Attributes
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;

      // Per-instance corner data
      attribute vec4 cornerTextures;
      attribute vec4 cornerVariations;
      attribute vec4 cornerExtended;

      // Uniforms
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      uniform vec2 terrainSize;

      // Varyings
      varying vec2 vUV[4];
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec4 vCornerTextures;

      vec2 getCell(float variation) {
        if (variation < 16.0) {
          return vec2(mod(variation, 4.0), floor(variation / 4.0));
        } else {
          float v = variation - 16.0;
          return vec2(4.0 + mod(v, 4.0), floor(v / 4.0));
        }
      }

      vec2 getUV(vec2 localPosition, float variation, bool extended) {
        vec2 cell = getCell(variation);
        vec2 cellSize = vec2(extended ? 0.125 : 0.25, 0.25);
        vec2 uv_flipped = vec2(localPosition.x, 1.0 - localPosition.y);
        vec2 pixelSize = vec2(1.0 / 512.0, 1.0 / 256.0);

        return clamp(
          (cell + uv_flipped) * cellSize,
          cell * cellSize + pixelSize,
          (cell + vec2(1.0, 1.0)) * cellSize - pixelSize
        );
      }

      void main() {
        // Transform position
        vec4 worldPos = world * vec4(position, 1.0);
        gl_Position = worldViewProjection * vec4(position, 1.0);

        // Use UV directly as it represents position within the tile (0-1)
        vec2 tileUV = uv;

        // Calculate UVs for each corner texture layer
        vUV[0] = getUV(tileUV, cornerVariations.x, cornerExtended.x > 0.5);
        vUV[1] = getUV(tileUV, cornerVariations.y, cornerExtended.y > 0.5);
        vUV[2] = getUV(tileUV, cornerVariations.z, cornerExtended.z > 0.5);
        vUV[3] = getUV(tileUV, cornerVariations.w, cornerExtended.w > 0.5);

        // Transform normal
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);

        // Pass world position for lighting
        vPosition = worldPos.xyz;

        // Pass texture indices to fragment shader
        vCornerTextures = cornerTextures;
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      precision highp float;

      // Samplers - unique names to avoid conflicts
      uniform sampler2D tileset0;
      uniform sampler2D tileset1;
      uniform sampler2D tileset2;
      uniform sampler2D tileset3;
      uniform sampler2D tileset4;
      uniform sampler2D tileset5;
      uniform sampler2D tileset6;
      uniform sampler2D tileset7;
      uniform sampler2D tileset8;
      uniform sampler2D tileset9;
      uniform sampler2D tileset10;
      uniform sampler2D tileset11;
      uniform sampler2D tileset12;
      uniform sampler2D tileset13;
      uniform sampler2D tileset14;

      // Uniforms
      uniform vec3 lightDirection;
      uniform vec3 lightColor;
      uniform float ambientIntensity;

      // Varyings
      varying vec2 vUV[4];
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec4 vCornerTextures;

      vec4 sampleTileset(float index, vec2 uv) {
        int idx = int(index);
        if (idx == 1) return texture2D(tileset0, uv);
        if (idx == 2) return texture2D(tileset1, uv);
        if (idx == 3) return texture2D(tileset2, uv);
        if (idx == 4) return texture2D(tileset3, uv);
        if (idx == 5) return texture2D(tileset4, uv);
        if (idx == 6) return texture2D(tileset5, uv);
        if (idx == 7) return texture2D(tileset6, uv);
        if (idx == 8) return texture2D(tileset7, uv);
        if (idx == 9) return texture2D(tileset8, uv);
        if (idx == 10) return texture2D(tileset9, uv);
        if (idx == 11) return texture2D(tileset10, uv);
        if (idx == 12) return texture2D(tileset11, uv);
        if (idx == 13) return texture2D(tileset12, uv);
        if (idx == 14) return texture2D(tileset13, uv);
        if (idx == 15) return texture2D(tileset14, uv);
        return vec4(0.6, 0.6, 0.6, 1.0);
      }

      vec4 blendLayers() {
        vec4 color = vec4(0.0);

        // Sample base texture
        if (vCornerTextures.x > 0.0) {
          color = sampleTileset(vCornerTextures.x, vUV[0]);
        }

        // Blend additional layers if present
        for (int i = 1; i < 4; i++) {
          float textureIndex;
          vec2 uv;

          if (i == 1) {
            textureIndex = vCornerTextures.y;
            uv = vUV[1];
          } else if (i == 2) {
            textureIndex = vCornerTextures.z;
            uv = vUV[2];
          } else {
            textureIndex = vCornerTextures.w;
            uv = vUV[3];
          }

          if (textureIndex > 0.0) {
            vec4 layerColor = sampleTileset(textureIndex, uv);
            float alpha = layerColor.a;
            color.rgb = mix(color.rgb, layerColor.rgb, alpha);
          }
        }

        return color;
      }

      void main() {
        vec4 texColor = blendLayers();

        // Basic lighting
        vec3 normal = normalize(vNormal);
        float NdotL = max(dot(normal, -normalize(lightDirection)), 0.0);
        vec3 diffuse = lightColor * NdotL;
        vec3 ambient = lightColor * ambientIntensity;

        vec3 finalColor = texColor.rgb * (ambient + diffuse);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  public dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.textureManager.dispose();
  }
}