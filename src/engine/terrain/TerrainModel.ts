import * as BABYLON from '@babylonjs/core';
import Model from '../../vendor/mdx-m3-viewer/src/parsers/mdlx/model';

export class TerrainModel {
  private mesh: BABYLON.Mesh | null = null;
  private instances: number;

  constructor(
    scene: BABYLON.Scene,
    arrayBuffer: ArrayBuffer,
    locations: number[],
    textures: number[],
    material: BABYLON.ShaderMaterial
  ) {
    this.instances = locations.length / 3;

    const parser = new Model();
    parser.load(arrayBuffer);

    if (parser.geosets === undefined || parser.geosets.length === 0) {
      console.error('[TerrainModel] MDX has no geosets');
      return;
    }

    const geoset = parser.geosets[0];
    if (!geoset) {
      console.error('[TerrainModel] First geoset is undefined');
      return;
    }

    console.log(`[TerrainModel] Parsing MDX with ${geoset.vertices.length / 3} vertices, ${geoset.faces.length / 3} faces`);

    const vertices = geoset.vertices;
    const normals = geoset.normals;
    const uvs = geoset.uvSets?.[0];
    const faces = geoset.faces;

    if (
      vertices === undefined ||
      normals === undefined ||
      uvs === undefined ||
      faces === undefined
    ) {
      console.error('[TerrainModel] Missing required geoset data:', {
        hasVertices: vertices !== undefined,
        hasNormals: normals !== undefined,
        hasUVs: uvs !== undefined,
        hasFaces: faces !== undefined
      });
      return;
    }

    const convertedVertices = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      convertedVertices[i] = vertices[i] ?? 0;
      convertedVertices[i + 1] = vertices[i + 2] ?? 0;
      convertedVertices[i + 2] = vertices[i + 1] ?? 0;
    }

    const convertedNormals = new Float32Array(normals.length);
    for (let i = 0; i < normals.length; i += 3) {
      convertedNormals[i] = normals[i] ?? 0;
      convertedNormals[i + 1] = normals[i + 2] ?? 0;
      convertedNormals[i + 2] = normals[i + 1] ?? 0;
    }

    this.mesh = new BABYLON.Mesh('cliffModel', scene);
    const engine = scene.getEngine();

    const vertexBuffer = new BABYLON.Buffer(engine, convertedVertices, false, 3);
    const normalBuffer = new BABYLON.Buffer(engine, convertedNormals, false, 3);
    const uvBuffer = new BABYLON.Buffer(engine, uvs, false, 2);

    this.mesh.setVerticesBuffer(vertexBuffer.createVertexBuffer('position', 0, 3));
    this.mesh.setVerticesBuffer(normalBuffer.createVertexBuffer('normal', 0, 3));
    this.mesh.setVerticesBuffer(uvBuffer.createVertexBuffer('uv', 0, 2));
    this.mesh.setIndices(Array.from(faces));

    const matrixData = new Float32Array(this.instances * 16);
    const textureData = new Float32Array(this.instances);

    for (let i = 0; i < this.instances; i++) {
      const x = locations[i * 3] ?? 0;
      const y = locations[i * 3 + 1] ?? 0;
      const z = locations[i * 3 + 2] ?? 0;

      const matrixOffset = i * 16;
      matrixData[matrixOffset + 0] = 1;
      matrixData[matrixOffset + 1] = 0;
      matrixData[matrixOffset + 2] = 0;
      matrixData[matrixOffset + 3] = 0;

      matrixData[matrixOffset + 4] = 0;
      matrixData[matrixOffset + 5] = 1;
      matrixData[matrixOffset + 6] = 0;
      matrixData[matrixOffset + 7] = 0;

      matrixData[matrixOffset + 8] = 0;
      matrixData[matrixOffset + 9] = 0;
      matrixData[matrixOffset + 10] = 1;
      matrixData[matrixOffset + 11] = 0;

      matrixData[matrixOffset + 12] = x;
      matrixData[matrixOffset + 13] = z;
      matrixData[matrixOffset + 14] = y;
      matrixData[matrixOffset + 15] = 1;

      textureData[i] = textures[i] ?? 0;
    }

    this.mesh.thinInstanceSetBuffer('matrix', matrixData, 16);
    this.mesh.thinInstanceSetBuffer('instanceTexture', textureData, 1);

    this.mesh.material = material as BABYLON.Material;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
  }
}
