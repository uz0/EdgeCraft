import * as BABYLON from '@babylonjs/core';
import type { TerrainData } from '../../formats/maps/types';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import { TerrainTextureBuilder } from './TerrainTextureBuilder';
import { TerrainTextureManager } from './TerrainTextureManager';
import { CliffRenderer } from './CliffRenderer';
import { CliffTypesLoader } from './CliffTypesLoader';

export class W3xWarcraftTerrainRenderer {
  private scene: BABYLON.Scene;
  private groundMesh: BABYLON.Mesh | null = null;
  private cliffMeshes: BABYLON.Mesh[] = [];
  private waterMesh: BABYLON.Mesh | null = null;
  private textureBuilder: TerrainTextureBuilder;
  private textureManager: TerrainTextureManager;
  private cliffRenderer: CliffRenderer;
  private cliffTypesLoader: CliffTypesLoader;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.textureBuilder = new TerrainTextureBuilder();
    this.textureManager = new TerrainTextureManager(scene);
    this.cliffRenderer = new CliffRenderer(scene);
    this.cliffTypesLoader = CliffTypesLoader.getInstance();
  }

  public async renderTerrain(terrain: TerrainData): Promise<void> {
    const TILE_SIZE = 128;
    const columns = terrain.width;
    const rows = terrain.height;

    const w3e = terrain.raw as W3ETerrain | undefined;
    if (!w3e) {
      return;
    }

    const textureIds = w3e.groundTextureIds ?? [];
    const loadedTextures = await this.textureManager.createTextureAtlas(textureIds);
    const textureExtendedMap = this.textureManager.getTextureExtendedMap(
      textureIds,
      loadedTextures
    );

    const { cornerTextures, cornerVariations } = this.textureBuilder.buildTextureArrays(
      w3e,
      textureExtendedMap
    );

    this.renderGround(
      w3e,
      columns,
      rows,
      cornerTextures,
      cornerVariations,
      loadedTextures,
      terrain.heightmap,
      TILE_SIZE
    );

    const centerOffset = w3e.centerOffset ?? [0, 0];
    const cliffTypesData = await this.cliffTypesLoader.load();

    await this.cliffRenderer.initialize(
      w3e,
      cliffTypesData,
      { width: columns, height: rows },
      { x: centerOffset[0], y: centerOffset[1] }
    );
  }

  private renderGround(
    w3e: W3ETerrain,
    columns: number,
    rows: number,
    cornerTextures: Uint8Array,
    cornerVariations: Uint8Array,
    loadedTextures: (BABYLON.Texture | null)[],
    heightmap: Float32Array | undefined,
    TILE_SIZE: number
  ): void {
    const quadPositions = [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1];

    const quadUVs = [0, 0, 1, 0, 0, 1, 1, 1];

    const quadIndices = [0, 1, 2, 2, 1, 3];

    const totalQuads = (columns - 1) * (rows - 1);
    const positions = new Float32Array(totalQuads * 4 * 3);
    const uvs = new Float32Array(totalQuads * 4 * 2);
    const normals = new Float32Array(totalQuads * 4 * 3);
    const indices = new Uint32Array(totalQuads * 6);

    const vertexTextures = new Float32Array(totalQuads * 4 * 4);
    const vertexVariations = new Float32Array(totalQuads * 4 * 4);

    const centerOffset = w3e.centerOffset ?? [0, 0];
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

        const tileIndex = y * (columns - 1) + x;
        const tex0 = cornerTextures[tileIndex * 4] ?? 0;
        const tex1 = cornerTextures[tileIndex * 4 + 1] ?? 0;
        const tex2 = cornerTextures[tileIndex * 4 + 2] ?? 0;
        const tex3 = cornerTextures[tileIndex * 4 + 3] ?? 0;

        const var0 = cornerVariations[tileIndex * 4] ?? 0;
        const var1 = cornerVariations[tileIndex * 4 + 1] ?? 0;
        const var2 = cornerVariations[tileIndex * 4 + 2] ?? 0;
        const var3 = cornerVariations[tileIndex * 4 + 3] ?? 0;

        for (let v = 0; v < 4; v++) {
          const vx = quadPositions[v * 3] ?? 0;
          const vz = quadPositions[v * 3 + 2] ?? 0;

          let height = 0;
          if (heightmap) {
            const heightX = Math.min(x + (v === 1 || v === 3 ? 1 : 0), columns - 1);
            const heightY = Math.min(y + (v === 2 || v === 3 ? 1 : 0), rows - 1);
            const heightIndex = heightY * columns + heightX;
            height = (heightmap[heightIndex] ?? 0) * 128.0;
          }

          positions[positionOffset + v * 3] = (x + vx) * TILE_SIZE + offsetX;
          positions[positionOffset + v * 3 + 1] = height;
          positions[positionOffset + v * 3 + 2] = (y + vz) * TILE_SIZE + offsetZ;

          normals[positionOffset + v * 3] = 0;
          normals[positionOffset + v * 3 + 1] = 1;
          normals[positionOffset + v * 3 + 2] = 0;

          uvs[uvOffset + v * 2] = quadUVs[v * 2] ?? 0;
          uvs[uvOffset + v * 2 + 1] = quadUVs[v * 2 + 1] ?? 0;

          vertexTextures[textureOffset + v * 4] = tex0;
          vertexTextures[textureOffset + v * 4 + 1] = tex1;
          vertexTextures[textureOffset + v * 4 + 2] = tex2;
          vertexTextures[textureOffset + v * 4 + 3] = tex3;

          vertexVariations[textureOffset + v * 4] = var0;
          vertexVariations[textureOffset + v * 4 + 1] = var1;
          vertexVariations[textureOffset + v * 4 + 2] = var2;
          vertexVariations[textureOffset + v * 4 + 3] = var3;
        }

        for (let i = 0; i < 6; i++) {
          indices[indexOffset + i] = vertexOffset + (quadIndices[i] ?? 0);
        }

        quadIndex++;
      }
    }

    const mesh = new BABYLON.Mesh('ground', this.scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;

    vertexData.applyToMesh(mesh);

    mesh.setVerticesData('cornerTextures', vertexTextures, false, 4);
    mesh.setVerticesData('cornerVariations', vertexVariations, false, 4);

    const shaderMaterial = new BABYLON.ShaderMaterial(
      'groundShader',
      this.scene,
      {
        vertexSource: this.getGroundVertexShader(),
        fragmentSource: this.getGroundFragmentShader(),
      },
      {
        attributes: ['position', 'normal', 'uv', 'cornerTextures', 'cornerVariations'],
        uniforms: [
          'worldViewProjection',
          'world',
          'u_extended[0]',
          'u_extended[1]',
          'u_extended[2]',
          'u_extended[3]',
          'u_extended[4]',
          'u_extended[5]',
          'u_extended[6]',
          'u_extended[7]',
          'u_extended[8]',
          'u_extended[9]',
          'u_extended[10]',
          'u_extended[11]',
          'u_extended[12]',
          'u_extended[13]',
          'u_extended[14]',
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

    for (let i = 0; i < 15; i++) {
      const texture = loadedTextures[i];
      if (texture) {
        shaderMaterial.setTexture(`u_tileset_${i}`, texture);
        const isExtended = texture.getBaseSize().width > texture.getBaseSize().height;
        shaderMaterial.setFloat(`u_extended[${i}]`, isExtended ? 1.0 : 0.0);
      } else {
        shaderMaterial.setFloat(`u_extended[${i}]`, 0.0);
      }
    }

    shaderMaterial.backFaceCulling = false;
    mesh.material = shaderMaterial as unknown as BABYLON.Material;

    this.groundMesh = mesh;
  }


  private getGroundVertexShader(): string {
    return `
      precision highp float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute vec4 cornerTextures;
      attribute vec4 cornerVariations;

      uniform mat4 worldViewProjection;
      uniform mat4 world;
      uniform float u_extended[15];

      varying vec2 v_uv[4];
      varying vec3 v_normal;
      varying vec4 v_tilesets;

      vec2 getCell(float variation) {
        if (variation < 16.0) {
          return vec2(mod(variation, 4.0), floor(variation / 4.0));
        } else {
          variation -= 16.0;
          return vec2(4.0 + mod(variation, 4.0), floor(variation / 4.0));
        }
      }

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
        if (cornerTextures[0] > 0.5 || cornerTextures[1] > 0.5 || cornerTextures[2] > 0.5 || cornerTextures[3] > 0.5) {
          gl_Position = worldViewProjection * vec4(position, 1.0);

          vec2 localPos = uv;

          int tex0 = int(cornerTextures[0] - 0.6);
          int tex1 = int(cornerTextures[1] - 0.6);
          int tex2 = int(cornerTextures[2] - 0.6);
          int tex3 = int(cornerTextures[3] - 0.6);

          v_uv[0] = getUV(localPos, cornerTextures[0] > 0.5 && u_extended[tex0] > 0.5, cornerVariations.x);
          v_uv[1] = getUV(localPos, cornerTextures[1] > 0.5 && u_extended[tex1] > 0.5, cornerVariations.y);
          v_uv[2] = getUV(localPos, cornerTextures[2] > 0.5 && u_extended[tex2] > 0.5, cornerVariations.z);
          v_uv[3] = getUV(localPos, cornerTextures[3] > 0.5 && u_extended[tex3] > 0.5, cornerVariations.w);

          v_tilesets = cornerTextures;
          v_normal = normalize((world * vec4(normal, 0.0)).xyz);
        } else {
          v_tilesets = vec4(0.0);
          v_uv[0] = vec2(0.0);
          v_uv[1] = vec2(0.0);
          v_uv[2] = vec2(0.0);
          v_uv[3] = vec2(0.0);
          v_normal = vec3(0.0);
          gl_Position = vec4(0.0);
        }
      }
    `;
  }

  private getGroundFragmentShader(): string {
    return `
      precision highp float;

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

      varying vec2 v_uv[4];
      varying vec3 v_normal;
      varying vec4 v_tilesets;

      const vec3 lightDirection = normalize(vec3(-0.3, -0.3, 0.25));

      vec4 sampleTexture(float tileset, vec2 uv) {
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

        return vec4(0.6, 0.6, 0.6, 1.0);
      }

      vec4 blend(vec4 color, float tileset, vec2 uv) {
        vec4 texel = sampleTexture(tileset, uv);
        return mix(color, texel, texel.a);
      }

      void main() {
        if (v_tilesets[0] < 0.5) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          return;
        }

        vec4 color = sampleTexture(v_tilesets[0], v_uv[0]);

        if (v_tilesets[1] > 0.5) {
          color = blend(color, v_tilesets[1], v_uv[1]);
        }

        if (v_tilesets[2] > 0.5) {
          color = blend(color, v_tilesets[2], v_uv[2]);
        }

        if (v_tilesets[3] > 0.5) {
          color = blend(color, v_tilesets[3], v_uv[3]);
        }

        gl_FragColor = vec4(color.rgb, 1.0);
      }
    `;
  }

  public dispose(): void {
    this.groundMesh?.dispose();
    this.groundMesh = null;
    this.cliffMeshes.forEach((mesh) => mesh.dispose());
    this.cliffMeshes = [];
    this.waterMesh?.dispose();
    this.waterMesh = null;
    this.cliffRenderer.dispose();
    this.textureManager.dispose();
  }
}
