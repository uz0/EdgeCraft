import * as BABYLON from '@babylonjs/core';
import type { TerrainData } from '../../formats/maps/types';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import { TerrainTextureBuilder } from './TerrainTextureBuilder';
import { TerrainTextureManager } from './TerrainTextureManager';
import groundVertexShader from './shaders/groundVertex.glsl?raw';
import groundFragmentShader from './shaders/groundFragment.glsl?raw';

/**
 * Instanced terrain renderer using corner-based geometry
 * Renders 256×256 tiles (65,536) in a single draw call
 */
export class W3xInstancedTerrainRenderer {
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

    console.log(`Building instanced terrain: ${tileCount} tiles`);
    console.log(`Corner data: ${cornerTextures.length} bytes`);

    // Debug: Log first few texture indices to see what we're getting
    console.log('First 10 corner textures:', Array.from(cornerTextures.slice(0, 40)));
    console.log('First 10 corner variations:', Array.from(cornerVariations.slice(0, 40)));
    console.log('First 10 extended flags:', Array.from(cornerExtended.slice(0, 40)));

    const tileMesh = this.createTileMesh(TILE_SIZE);

    const instanceBuffer = new BABYLON.Buffer(
      this.scene.getEngine(),
      new Float32Array(tileCount * 4 * 3),
      false,
      4 * 3
    );

    const instanceData = new Float32Array(tileCount * 4 * 3);
    for (let i = 0; i < tileCount; i++) {
      instanceData[i * 12] = cornerTextures[i * 4] ?? 0;
      instanceData[i * 12 + 1] = cornerTextures[i * 4 + 1] ?? 0;
      instanceData[i * 12 + 2] = cornerTextures[i * 4 + 2] ?? 0;
      instanceData[i * 12 + 3] = cornerTextures[i * 4 + 3] ?? 0;

      instanceData[i * 12 + 4] = cornerVariations[i * 4] ?? 0;
      instanceData[i * 12 + 5] = cornerVariations[i * 4 + 1] ?? 0;
      instanceData[i * 12 + 6] = cornerVariations[i * 4 + 2] ?? 0;
      instanceData[i * 12 + 7] = cornerVariations[i * 4 + 3] ?? 0;

      instanceData[i * 12 + 8] = cornerExtended[i * 4] ?? 0;
      instanceData[i * 12 + 9] = cornerExtended[i * 4 + 1] ?? 0;
      instanceData[i * 12 + 10] = cornerExtended[i * 4 + 2] ?? 0;
      instanceData[i * 12 + 11] = cornerExtended[i * 4 + 3] ?? 0;
    }
    instanceBuffer.update(instanceData);

    tileMesh.setVerticesBuffer(instanceBuffer.createVertexBuffer('instanceCornerTextures', 0, 4));
    tileMesh.setVerticesBuffer(instanceBuffer.createVertexBuffer('instanceCornerVariations', 4, 4));
    tileMesh.setVerticesBuffer(instanceBuffer.createVertexBuffer('instanceCornerExtended', 8, 4));

    const textures = await this.textureManager.createTextureAtlas(
      terrain.textures.map((t) => t.id)
    );
    console.log(`Loaded ${textures.length} textures:`, textures.map(t => t?.name));

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
          'instanceCornerExtended',
        ],
        uniforms: [
          'worldViewProjection',
          'world',
          'lightDirection',
          'lightColor',
          'ambientIntensity',
        ],
        samplers: [
          'u_tilesets_0',
          'u_tilesets_1',
          'u_tilesets_2',
          'u_tilesets_3',
          'u_tilesets_4',
          'u_tilesets_5',
          'u_tilesets_6',
          'u_tilesets_7',
          'u_tilesets_8',
          'u_tilesets_9',
          'u_tilesets_10',
          'u_tilesets_11',
          'u_tilesets_12',
          'u_tilesets_13',
          'u_tilesets_14',
        ],
      }
    );

    for (let i = 0; i < textures.length && i < 15; i++) {
      const texture = textures[i];
      if (texture) {
        console.log(`Setting texture ${i}: ${texture.name}`);
        shaderMaterial.setTexture(`u_tilesets_${i}`, texture);
      } else {
        console.log(`Warning: Texture ${i} is null`);
      }
    }
    shaderMaterial.setVector3('lightDirection', new BABYLON.Vector3(0.5, -1.0, 0.5));
    shaderMaterial.setVector3('lightColor', new BABYLON.Vector3(1.0, 1.0, 1.0));
    shaderMaterial.setFloat('ambientIntensity', 0.4);
    shaderMaterial.backFaceCulling = false;

    tileMesh.material = shaderMaterial as unknown as BABYLON.Material;

    const instanceMatrices = new Float32Array(tileCount * 16);
    let instance = 0;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        const matrix = BABYLON.Matrix.Translation(
          x * TILE_SIZE - (columns * TILE_SIZE) / 2,
          0,
          y * TILE_SIZE - (rows * TILE_SIZE) / 2
        );

        matrix.copyToArray(instanceMatrices, instance * 16);
        instance++;
      }
    }

    tileMesh.thinInstanceSetBuffer('matrix', instanceMatrices, 16, false);

    if (terrain.heightmap) {
      this.applyHeightmap(tileMesh, terrain.heightmap, columns, rows);
    }

    this.terrainMesh = tileMesh;
    console.log(`Instanced terrain created: ${tileCount} instances`);
  }

  private createTileMesh(tileSize: number): BABYLON.Mesh {
    const mesh = BABYLON.MeshBuilder.CreateGround(
      'terrain-tile',
      {
        width: tileSize,
        height: tileSize,
        subdivisionsX: 1,
        subdivisionsY: 1,
      },
      this.scene
    );

    return mesh;
  }

  private applyHeightmap(
    mesh: BABYLON.Mesh,
    heightmap: Float32Array,
    columns: number,
    rows: number
  ): void {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const heightmapIndex = y * columns + x;
        const vertexIndex = (y * columns + x) * 3;

        if (vertexIndex + 1 < positions.length) {
          const height = heightmap[heightmapIndex] ?? 0;
          positions[vertexIndex + 1] = height * 128.0;
        }
      }
    }

    mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    mesh.createNormals(true);
  }

  public dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.textureManager.dispose();
  }
}
