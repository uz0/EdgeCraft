import * as BABYLON from '@babylonjs/core';
import type { TerrainData } from '../../formats/maps/types';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import { TerrainTextureBuilder } from './TerrainTextureBuilder';
import { TerrainTextureManager } from './TerrainTextureManager';
import groundVertexShader from './shaders/groundVertex.glsl?raw';
import groundFragmentShader from './shaders/groundFragment.glsl?raw';

/**
 * Terrain renderer matching mdx-m3-viewer's approach
 * Single mesh with 257×257 vertices (corners)
 */
export class W3xTerrainRenderer {
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

    console.log(`Building corner-based terrain: ${columns}×${rows} corners`);

    const textureIds = w3e.groundTextureIds ?? [];
    const textureExtendedMap = await this.textureManager.getTextureExtendedMap(textureIds);

    const { cornerTextures, cornerVariations, tileCount } =
      this.textureBuilder.buildTextureArrays(w3e, textureExtendedMap);

    console.log(`Texture data built: ${tileCount} tiles`);

    const centerOffset = w3e.centerOffset || [0, 0];
    const mesh = this.createCornerMesh(columns, rows, TILE_SIZE, terrain.heightmap, centerOffset);

    this.applyTextureData(mesh, cornerTextures, cornerVariations, columns, rows);

    console.log('Loading terrain textures from hiveworkshop...');
    const textures = await this.textureManager.createTextureAtlas(terrain.textures.map((t) => t.id));
    console.log('Terrain textures loaded!', textures.length);

    const samplerNames = [];
    for (let i = 0; i < Math.min(textures.length, 15); i++) {
      samplerNames.push(`u_tilesets_${i}`);
    }

    const shaderMaterial = new BABYLON.ShaderMaterial(
      'terrainShader',
      this.scene,
      {
        vertexSource: groundVertexShader,
        fragmentSource: groundFragmentShader,
      },
      {
        attributes: [
          'position',
          'normal',
          'uv',
          'instanceCornerTextures',
          'instanceCornerVariations',
        ],
        uniforms: [
          'worldViewProjection',
          'world',
          'lightDirection',
          'lightColor',
          'ambientIntensity',
        ],
        samplers: samplerNames,
      }
    );

    for (let i = 0; i < Math.min(textures.length, 15); i++) {
      shaderMaterial.setTexture(`u_tilesets_${i}`, textures[i] ?? null);
    }
    shaderMaterial.setVector3('lightDirection', new BABYLON.Vector3(0.5, -1.0, 0.5));
    shaderMaterial.setVector3('lightColor', new BABYLON.Vector3(1.0, 1.0, 1.0));
    shaderMaterial.setFloat('ambientIntensity', 0.4);
    shaderMaterial.backFaceCulling = false;

    mesh.material = shaderMaterial as unknown as BABYLON.Material;

    this.terrainMesh = mesh;
    console.log(`Terrain created: ${columns}×${rows} corners`);
  }

  /**
   * Create corner-based mesh (257×257 vertices forming 256×256 tiles)
   * Following mdx-m3-viewer approach
   */
  private createCornerMesh(
    columns: number,
    rows: number,
    tileSize: number,
    heightmap?: Float32Array,
    centerOffset?: [number, number]
  ): BABYLON.Mesh {
    const vertexCount = columns * rows;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    // Use W3E centerOffset to match mdx-m3-viewer coordinate system
    const offsetX = centerOffset ? centerOffset[0] : 0;
    const offsetZ = centerOffset ? centerOffset[1] : 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const index = y * columns + x;
        const vertexIndex = index * 3;
        const uvIndex = index * 2;

        const height = heightmap ? (heightmap[index] ?? 0) * 128.0 : 0;

        positions[vertexIndex] = x * tileSize + offsetX;
        positions[vertexIndex + 1] = height;
        positions[vertexIndex + 2] = y * tileSize + offsetZ;

        normals[vertexIndex] = 0;
        normals[vertexIndex + 1] = 1;
        normals[vertexIndex + 2] = 0;

        uvs[uvIndex] = x / (columns - 1);
        uvs[uvIndex + 1] = y / (rows - 1);
      }
    }

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        const topLeft = y * columns + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * columns + x;
        const bottomRight = bottomLeft + 1;

        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    const mesh = new BABYLON.Mesh('terrain', this.scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;

    vertexData.applyToMesh(mesh);

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);

    return mesh;
  }

  /**
   * Apply per-vertex texture data
   * Each vertex gets texture indices and variations from the 4 surrounding tiles
   */
  private applyTextureData(
    mesh: BABYLON.Mesh,
    cornerTextures: Uint8Array,
    cornerVariations: Uint8Array,
    columns: number,
    rows: number
  ): void {
    const vertexCount = columns * rows;
    const textureData = new Float32Array(vertexCount * 4);
    const variationData = new Float32Array(vertexCount * 4);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const cornerIndex = y * columns + x;
        const dataIndex = cornerIndex * 4;

        const tileX = Math.max(0, x - 1);
        const tileY = Math.max(0, y - 1);
        const tileIndex = tileY * (columns - 1) + tileX;

        if (tileIndex >= 0 && tileIndex < cornerTextures.length / 4) {
          textureData[dataIndex] = cornerTextures[tileIndex * 4] ?? 0;
          textureData[dataIndex + 1] = cornerTextures[tileIndex * 4 + 1] ?? 0;
          textureData[dataIndex + 2] = cornerTextures[tileIndex * 4 + 2] ?? 0;
          textureData[dataIndex + 3] = cornerTextures[tileIndex * 4 + 3] ?? 0;

          variationData[dataIndex] = cornerVariations[tileIndex * 4] ?? 0;
          variationData[dataIndex + 1] = cornerVariations[tileIndex * 4 + 1] ?? 0;
          variationData[dataIndex + 2] = cornerVariations[tileIndex * 4 + 2] ?? 0;
          variationData[dataIndex + 3] = cornerVariations[tileIndex * 4 + 3] ?? 0;
        }
      }
    }

    mesh.setVerticesData('instanceCornerTextures', textureData, false, 4);
    mesh.setVerticesData('instanceCornerVariations', variationData, false, 4);
  }

  public dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.textureManager.dispose();
  }
}
