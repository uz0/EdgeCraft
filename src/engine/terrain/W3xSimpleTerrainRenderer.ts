import * as BABYLON from '@babylonjs/core';
import type { TerrainData } from '../../formats/maps/types';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import { TerrainTextureBuilder } from './TerrainTextureBuilder';
import { TerrainTextureManager } from './TerrainTextureManager';

/**
 * Simple terrain renderer matching mdx-m3-viewer's approach exactly
 * Creates a single mesh with per-vertex texture data
 */
export class W3xSimpleTerrainRenderer {
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

    // Create positions for unit quad (0,0) to (1,1) that will be repeated
    const quadPositions = [
      0, 0, 0,  // Bottom-left
      1, 0, 0,  // Bottom-right
      0, 0, 1,  // Top-left
      1, 0, 1,  // Top-right
    ];

    const quadUVs = [
      0, 0,  // Bottom-left
      1, 0,  // Bottom-right
      0, 1,  // Top-left
      1, 1,  // Top-right
    ];

    const quadIndices = [
      0, 1, 2,  // First triangle
      2, 1, 3,  // Second triangle
    ];

    // Now build full terrain mesh - one quad per tile
    const totalQuads = (columns - 1) * (rows - 1);
    const positions = new Float32Array(totalQuads * 4 * 3); // 4 vertices per quad, 3 coords each
    const uvs = new Float32Array(totalQuads * 4 * 2); // 4 vertices per quad, 2 UV coords each
    const normals = new Float32Array(totalQuads * 4 * 3); // 4 vertices per quad, 3 normal coords each
    const indices = new Uint32Array(totalQuads * 6); // 2 triangles per quad, 3 indices each

    // Custom attributes for texture data (4 vertices per quad)
    const vertexTextures = new Float32Array(totalQuads * 4 * 4); // 4 texture indices per vertex
    const vertexVariations = new Float32Array(totalQuads * 4 * 4); // 4 variations per vertex
    const vertexExtended = new Float32Array(totalQuads * 4 * 4); // 4 extended flags per vertex

    const centerOffset = w3e.centerOffset || [0, 0];
    const offsetX = centerOffset[0];
    const offsetZ = centerOffset[1];

    let quadIndex = 0;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        const vertexOffset = quadIndex * 4;
        const positionOffset = vertexOffset * 3;
        const uvOffset = vertexOffset * 2;
        const indexOffset = quadIndex * 6;
        const textureOffset = vertexOffset * 4;

        // Get texture data for this tile
        const tileIndex = y * (columns - 1) + x;
        const tex0 = cornerTextures[tileIndex * 4] ?? 0;
        const tex1 = cornerTextures[tileIndex * 4 + 1] ?? 0;
        const tex2 = cornerTextures[tileIndex * 4 + 2] ?? 0;
        const tex3 = cornerTextures[tileIndex * 4 + 3] ?? 0;

        const var0 = cornerVariations[tileIndex * 4] ?? 0;
        const var1 = cornerVariations[tileIndex * 4 + 1] ?? 0;
        const var2 = cornerVariations[tileIndex * 4 + 2] ?? 0;
        const var3 = cornerVariations[tileIndex * 4 + 3] ?? 0;

        const ext0 = cornerExtended[tileIndex * 4] ?? 0;
        const ext1 = cornerExtended[tileIndex * 4 + 1] ?? 0;
        const ext2 = cornerExtended[tileIndex * 4 + 2] ?? 0;
        const ext3 = cornerExtended[tileIndex * 4 + 3] ?? 0;

        // Position each quad vertex
        for (let v = 0; v < 4; v++) {
          const vx = quadPositions[v * 3] ?? 0;
          const vy = quadPositions[v * 3 + 1] ?? 0;
          const vz = quadPositions[v * 3 + 2] ?? 0;

          positions[positionOffset + v * 3] = (x + vx) * TILE_SIZE + offsetX;
          positions[positionOffset + v * 3 + 1] = vy;
          positions[positionOffset + v * 3 + 2] = (y + vz) * TILE_SIZE + offsetZ;

          normals[positionOffset + v * 3] = 0;
          normals[positionOffset + v * 3 + 1] = 1;
          normals[positionOffset + v * 3 + 2] = 0;

          uvs[uvOffset + v * 2] = quadUVs[v * 2] ?? 0;
          uvs[uvOffset + v * 2 + 1] = quadUVs[v * 2 + 1] ?? 0;

          // Set texture data for each vertex
          vertexTextures[textureOffset + v * 4] = tex0;
          vertexTextures[textureOffset + v * 4 + 1] = tex1;
          vertexTextures[textureOffset + v * 4 + 2] = tex2;
          vertexTextures[textureOffset + v * 4 + 3] = tex3;

          vertexVariations[textureOffset + v * 4] = var0;
          vertexVariations[textureOffset + v * 4 + 1] = var1;
          vertexVariations[textureOffset + v * 4 + 2] = var2;
          vertexVariations[textureOffset + v * 4 + 3] = var3;

          vertexExtended[textureOffset + v * 4] = ext0;
          vertexExtended[textureOffset + v * 4 + 1] = ext1;
          vertexExtended[textureOffset + v * 4 + 2] = ext2;
          vertexExtended[textureOffset + v * 4 + 3] = ext3;
        }

        // Set indices for this quad
        for (let i = 0; i < 6; i++) {
          indices[indexOffset + i] = vertexOffset + (quadIndices[i] ?? 0);
        }

        quadIndex++;
      }
    }

    // Create the mesh
    const mesh = new BABYLON.Mesh('terrain', this.scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;

    vertexData.applyToMesh(mesh);

    // Apply height data if available
    if (terrain.heightmap) {
      this.applyHeightmap(mesh, terrain.heightmap, columns, rows);
    }

    // Set custom vertex attributes for texture data
    mesh.setVerticesData('cornerTextures', vertexTextures, false, 4);
    mesh.setVerticesData('cornerVariations', vertexVariations, false, 4);
    mesh.setVerticesData('cornerExtended', vertexExtended, false, 4);

    // Load textures
    const textures = await this.textureManager.createTextureAtlas(
      terrain.textures.map((t) => t.id)
    );

    // Create shader material
    const shaderMaterial = new BABYLON.ShaderMaterial(
      'simpleTerrainShader', // Unique name to avoid conflicts
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
          'terrainSize',
          'baseTileset',
        ],
        samplers: [
          'u_tileset_0',
          'u_tileset_1',
          'u_tileset_2',
          'u_tileset_3',
          'u_tileset_4',
          'u_tileset_5',
          'u_tileset_6',
          'u_tileset_7',
          'u_tileset_8',
          'u_tileset_9',
          'u_tileset_10',
          'u_tileset_11',
          'u_tileset_12',
          'u_tileset_13',
          'u_tileset_14',
        ],
      }
    );

    // Bind textures
    for (let i = 0; i < textures.length && i < 15; i++) {
      if (textures[i]) {
        shaderMaterial.setTexture(`u_tileset_${i}`, textures[i]);
      }
    }

    shaderMaterial.setVector2('terrainSize', new BABYLON.Vector2(columns, rows));
    shaderMaterial.setFloat('baseTileset', 0); // First batch of textures (0-14)
    shaderMaterial.backFaceCulling = false;

    mesh.material = shaderMaterial as unknown as BABYLON.Material;

    this.terrainMesh = mesh;
  }

  private applyHeightmap(
    mesh: BABYLON.Mesh,
    heightmap: Float32Array,
    columns: number,
    rows: number
  ): void {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;

    // Apply heights to vertices
    let vertexIndex = 0;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        // Each quad has 4 vertices
        for (let v = 0; v < 4; v++) {
          const vx = v === 1 || v === 3 ? 1 : 0;
          const vy = v === 2 || v === 3 ? 1 : 0;

          const heightX = Math.min(x + vx, columns - 1);
          const heightY = Math.min(y + vy, rows - 1);
          const heightIndex = heightY * columns + heightX;

          const height = (heightmap[heightIndex] ?? 0) * 128.0;
          positions[vertexIndex * 3 + 1] = height;
          vertexIndex++;
        }
      }
    }

    mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    mesh.createNormals(true);
  }

  private getVertexShader(): string {
    // Match mdx-m3-viewer's vertex shader approach exactly
    return `
      precision highp float;

      // Attributes
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute vec4 cornerTextures;
      attribute vec4 cornerVariations;
      attribute vec4 cornerExtended;

      // Uniforms
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      uniform vec2 terrainSize;
      uniform float baseTileset;

      // Varyings to fragment shader
      varying vec2 v_uv[4];
      varying vec3 v_normal;
      varying vec4 v_tilesets;

      // Get cell position for variation - exact copy from mdx-m3-viewer
      vec2 getCell(float variation) {
        if (variation < 16.0) {
          return vec2(mod(variation, 4.0), floor(variation / 4.0));
        } else {
          variation -= 16.0;
          return vec2(4.0 + mod(variation, 4.0), floor(variation / 4.0));
        }
      }

      // Calculate UV for texture sampling - exact copy from mdx-m3-viewer
      vec2 getUV(vec2 position, bool extended, float variation) {
        vec2 cell = getCell(variation);
        vec2 cellSize = vec2(extended ? 0.125 : 0.25, 0.25);
        vec2 uv_local = vec2(position.x, 1.0 - position.y);
        vec2 pixelSize = vec2(1.0 / 512.0, 1.0 / 256.0);

        return clamp(
          (cell + uv_local) * cellSize,
          cell * cellSize + pixelSize,
          (cell + 1.0) * cellSize - pixelSize
        );
      }

      void main() {
        // Transform position
        gl_Position = worldViewProjection * vec4(position, 1.0);

        // Use the UV directly as tile-local position (0-1 within tile)
        vec2 localPos = uv;

        // Adjust texture indices by baseTileset (for texture batching)
        vec4 textures = cornerTextures - baseTileset;

        // Calculate UVs for each texture layer with extended flag
        v_uv[0] = getUV(localPos, cornerExtended.x > 0.5, cornerVariations.x);
        v_uv[1] = getUV(localPos, cornerExtended.y > 0.5, cornerVariations.y);
        v_uv[2] = getUV(localPos, cornerExtended.z > 0.5, cornerVariations.z);
        v_uv[3] = getUV(localPos, cornerExtended.w > 0.5, cornerVariations.w);

        // Pass adjusted texture indices to fragment shader
        v_tilesets = textures;

        // Transform normal
        v_normal = normalize((world * vec4(normal, 0.0)).xyz);
      }
    `;
  }

  private getFragmentShader(): string {
    // Match mdx-m3-viewer's fragment shader exactly
    return `
      precision highp float;

      // Uniforms - texture samplers
      uniform sampler2D u_tileset_0;
      uniform sampler2D u_tileset_1;
      uniform sampler2D u_tileset_2;
      uniform sampler2D u_tileset_3;
      uniform sampler2D u_tileset_4;
      uniform sampler2D u_tileset_5;
      uniform sampler2D u_tileset_6;
      uniform sampler2D u_tileset_7;
      uniform sampler2D u_tileset_8;
      uniform sampler2D u_tileset_9;
      uniform sampler2D u_tileset_10;
      uniform sampler2D u_tileset_11;
      uniform sampler2D u_tileset_12;
      uniform sampler2D u_tileset_13;
      uniform sampler2D u_tileset_14;

      // Varyings from vertex shader
      varying vec2 v_uv[4];
      varying vec3 v_normal;
      varying vec4 v_tilesets;

      // Fixed light direction (matches mdx-m3-viewer)
      const vec3 lightDirection = normalize(vec3(-0.3, -0.3, 0.25));

      vec4 sampleTexture(float tileset, vec2 uv) {
        // mdx-m3-viewer uses tileset - 0.6 to handle floating point precision
        // 1.0 - 1.0 == 0.0 is not always true due to floating point errors
        int i = int(tileset - 0.6);

        if (i == 0) return texture2D(u_tileset_0, uv);
        else if (i == 1) return texture2D(u_tileset_1, uv);
        else if (i == 2) return texture2D(u_tileset_2, uv);
        else if (i == 3) return texture2D(u_tileset_3, uv);
        else if (i == 4) return texture2D(u_tileset_4, uv);
        else if (i == 5) return texture2D(u_tileset_5, uv);
        else if (i == 6) return texture2D(u_tileset_6, uv);
        else if (i == 7) return texture2D(u_tileset_7, uv);
        else if (i == 8) return texture2D(u_tileset_8, uv);
        else if (i == 9) return texture2D(u_tileset_9, uv);
        else if (i == 10) return texture2D(u_tileset_10, uv);
        else if (i == 11) return texture2D(u_tileset_11, uv);
        else if (i == 12) return texture2D(u_tileset_12, uv);
        else if (i == 13) return texture2D(u_tileset_13, uv);
        else if (i == 14) return texture2D(u_tileset_14, uv);

        return vec4(0.6, 0.6, 0.6, 1.0); // Fallback gray
      }

      vec4 blend(vec4 color, float tileset, vec2 uv) {
        vec4 texel = sampleTexture(tileset, uv);
        return mix(color, texel, texel.a);
      }

      void main() {
        // mdx-m3-viewer always samples first texture (no check)
        vec4 color = sampleTexture(v_tilesets[0], v_uv[0]);

        // Blend additional layers
        if (v_tilesets[1] > 0.5) {
          color = blend(color, v_tilesets[1], v_uv[1]);
        }

        if (v_tilesets[2] > 0.5) {
          color = blend(color, v_tilesets[2], v_uv[2]);
        }

        if (v_tilesets[3] > 0.5) {
          color = blend(color, v_tilesets[3], v_uv[3]);
        }

        // Lighting disabled to match mdx-m3-viewer (it's commented out there)
        //color.rgb *= clamp(dot(v_normal, lightDirection) + 0.45, 0.0, 1.0);

        gl_FragColor = vec4(color.rgb, 1.0);
      }
    `;
  }

  public dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.textureManager.dispose();
  }
}