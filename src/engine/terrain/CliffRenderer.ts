import * as BABYLON from '@babylonjs/core';
import { CliffDetector } from './CliffDetector';
import type { W3ETerrain } from '../../formats/maps/w3x/types';
import type { CliffTypesData, CliffTypeRow } from '../../formats/slk/CliffTypesData';
import { TerrainModel } from './TerrainModel';
import { DDSTextureLoader } from './DDSTextureLoader';
import { getCliffVariation } from './variations';
import cliffVertexShader from './shaders/cliffVertex.glsl?raw';
import cliffFragmentShader from './shaders/cliffFragment.glsl?raw';

export class CliffRenderer {
  private scene: BABYLON.Scene;
  private cliffModels: TerrainModel[] = [];
  private cliffShaderMaterial: BABYLON.ShaderMaterial | null = null;
  private cliffHeightMap: BABYLON.RawTexture | null = null;
  private cliffTextures: BABYLON.Texture[] = [];
  private cliffTypeRows: CliffTypeRow[] = [];

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  async initialize(
    w3e: W3ETerrain,
    cliffTypesData: CliffTypesData,
    mapSize: { width: number; height: number },
    centerOffset: { x: number; y: number }
  ): Promise<void> {
    await this.loadCliffTextures(w3e, cliffTypesData);

    const detector = new CliffDetector(w3e);
    const cliffs: Record<string, { locations: number[]; textures: number[] }> = {};

    for (let y = 0; y < mapSize.height - 1; y++) {
      for (let x = 0; x < mapSize.width - 1; x++) {
        if (!detector.isCliff(x, y)) {
          continue;
        }

        const corners = w3e.corners;
        const bottomLeft = corners[y]?.[x];
        const bottomRight = corners[y]?.[x + 1];
        const topLeft = corners[y + 1]?.[x];
        const topRight = corners[y + 1]?.[x + 1];

        if (!bottomLeft || !bottomRight || !topLeft || !topRight) {
          continue;
        }

        const bottomLeftLayer = bottomLeft.layerHeight;
        const bottomRightLayer = bottomRight.layerHeight;
        const topLeftLayer = topLeft.layerHeight;
        const topRightLayer = topRight.layerHeight;

        const base = Math.min(bottomLeftLayer, bottomRightLayer, topLeftLayer, topRightLayer);
        const fileName = detector.getCliffFileName(
          bottomLeftLayer,
          bottomRightLayer,
          topLeftLayer,
          topRightLayer,
          base
        );

        if (fileName === 'AAAA') {
          continue;
        }

        let cliffTexture = bottomLeft.cliffTexture;
        if (cliffTexture === 15) {
          cliffTexture = 1;
        }

        const cliffRow = this.cliffTypeRows[cliffTexture];
        if (!cliffRow) {
          continue;
        }

        const dir = cliffRow.cliffModelDir;
        const variation = getCliffVariation(dir, fileName, bottomLeft.cliffVariation);
        const path = `Doodads\\Terrain\\${dir}\\${dir}${fileName}${variation}.mdx`;

        if (!cliffs[path]) {
          cliffs[path] = { locations: [], textures: [] };
        }

        const worldX = (x + 1) * 128 + centerOffset.x;
        const worldY = y * 128 + centerOffset.y;
        const worldZ = (base - 2) * 128;

        cliffs[path].locations.push(worldX, worldY, worldZ);
        cliffs[path].textures.push(cliffTexture);
      }
    }

    this.createCliffHeightMap(w3e, mapSize.width, mapSize.height);
    this.createShaderMaterial(mapSize, centerOffset);

    const cliffPromises = Object.entries(cliffs).map(async ([path, data]) => {
      const { locations, textures } = data;
      try {
        const url = `https://www.hiveworkshop.com/casc-contents?path=${path.toLowerCase()}`;
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return new TerrainModel(
          this.scene,
          arrayBuffer,
          locations,
          textures,
          this.cliffShaderMaterial!
        );
      } catch {
        return null;
      }
    });

    const models = await Promise.all(cliffPromises);
    this.cliffModels = models.filter((m): m is TerrainModel => m !== null);

    (window as unknown as { __cliffLoadingComplete: boolean }).__cliffLoadingComplete = true;
  }

  private async loadCliffTextures(w3e: W3ETerrain, cliffTypesData: CliffTypesData): Promise<void> {
    const cliffTextureIds = w3e.cliffTextureIds || [];

    for (const cliffID of cliffTextureIds) {
      const row = cliffTypesData.getRow(cliffID);
      if (row) {
        this.cliffTypeRows.push(row);
      }
    }

    const texturePromises = this.cliffTypeRows.map(async (row) => {
      const path = `${row.texDir}\\${row.texFile}.dds`;
      const url = `https://www.hiveworkshop.com/casc-contents?path=${path.toLowerCase()}`;
      try {
        const internalTexture = await DDSTextureLoader.loadDDSTexture(url, this.scene);
        if (!internalTexture) {
          return null;
        }

        const texture = new BABYLON.Texture(null, this.scene);
        texture._texture = internalTexture;
        return texture;
      } catch {
        return null;
      }
    });

    const textures = await Promise.all(texturePromises);
    this.cliffTextures = textures.filter((t): t is BABYLON.Texture => t !== null);
  }

  private createCliffHeightMap(w3e: W3ETerrain, columns: number, rows: number): void {
    const cliffHeights = new Float32Array(columns * rows * 4);
    const corners = w3e.corners;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const index = (y * columns + x) * 4;
        const corner = corners[y]?.[x];
        const height = corner ? corner.groundHeight : 0;

        cliffHeights[index] = height;
        cliffHeights[index + 1] = height;
        cliffHeights[index + 2] = height;
        cliffHeights[index + 3] = height;
      }
    }

    this.cliffHeightMap = new BABYLON.RawTexture(
      cliffHeights,
      columns,
      rows,
      BABYLON.Constants.TEXTUREFORMAT_RGBA,
      this.scene,
      false,
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      BABYLON.Constants.TEXTURETYPE_FLOAT
    );
  }

  private createShaderMaterial(
    mapSize: { width: number; height: number },
    centerOffset: { x: number; y: number }
  ): void {
    this.cliffShaderMaterial = new BABYLON.ShaderMaterial(
      'cliffShader',
      this.scene,
      {
        vertexSource: cliffVertexShader,
        fragmentSource: cliffFragmentShader,
      },
      {
        attributes: [
          'position',
          'normal',
          'uv',
          'world0',
          'world1',
          'world2',
          'world3',
          'instanceTexture',
        ],
        uniforms: [
          'worldViewProjection',
          'view',
          'projection',
          'heightMap',
          'pixel',
          'centerOffset',
          'u_texture1',
          'u_texture2',
        ],
      }
    );

    if (this.cliffHeightMap) {
      this.cliffShaderMaterial.setTexture('heightMap', this.cliffHeightMap);
    }

    this.cliffShaderMaterial.setVector2(
      'pixel',
      new BABYLON.Vector2(1 / (mapSize.width + 1), 1 / (mapSize.height + 1))
    );
    this.cliffShaderMaterial.setVector2(
      'centerOffset',
      new BABYLON.Vector2(centerOffset.x, centerOffset.y)
    );

    this.cliffShaderMaterial.setInt('u_texture1', 1);
    this.cliffShaderMaterial.setInt('u_texture2', 2);

    this.cliffShaderMaterial.onBind = (): void => {
      const effect = this.cliffShaderMaterial?.getEffect();
      if (effect && this.scene.activeCamera) {
        effect.setMatrix('view', this.scene.activeCamera.getViewMatrix());
        effect.setMatrix('projection', this.scene.activeCamera.getProjectionMatrix());

        if (this.cliffTextures.length > 0 && this.cliffTextures[0]) {
          effect.setTexture('u_texture1', this.cliffTextures[0]);
        }

        if (this.cliffTextures.length > 1 && this.cliffTextures[1]) {
          effect.setTexture('u_texture2', this.cliffTextures[1]);
        }
      }
    };

    this.cliffShaderMaterial.backFaceCulling = false;
  }

  dispose(): void {
    for (const model of this.cliffModels) {
      model.dispose();
    }
    this.cliffModels = [];

    if (this.cliffShaderMaterial) {
      this.cliffShaderMaterial.dispose();
      this.cliffShaderMaterial = null;
    }

    if (this.cliffHeightMap) {
      this.cliffHeightMap.dispose();
      this.cliffHeightMap = null;
    }

    this.cliffTextures = [];
  }
}
