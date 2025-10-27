import * as BABYLON from '@babylonjs/core';

interface TerrainTextureManifest {
  terrain: {
    textures: Record<
      string,
      {
        name: string;
        dir: string;
        file: string;
        url: string;
        extended: boolean;
      }
    >;
  };
}

/**
 * Manages terrain textures - both placeholder and real textures
 */
export class TerrainTextureManager {
  private scene: BABYLON.Scene;
  private textureCache: Map<string, BABYLON.Texture> = new Map();
  private manifest: TerrainTextureManifest | null = null;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Load warcraft-manifest.json for texture path resolution
   */
  public async loadManifest(): Promise<void> {
    if (this.manifest) return;

    try {
      const response = await fetch('/warcraft-manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to load warcraft-manifest.json: ${response.statusText}`);
      }
      const data = (await response.json()) as TerrainTextureManifest;
      this.manifest = data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a placeholder texture for testing
   * Each texture ID gets a unique color for visual debugging
   */
  public createPlaceholderTexture(textureId: string, index: number): BABYLON.Texture {
    const cacheKey = `placeholder_${textureId}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const colors = [
      [0.6, 0.4, 0.2],
      [0.4, 0.6, 0.3],
      [0.3, 0.5, 0.7],
      [0.7, 0.6, 0.4],
      [0.9, 0.8, 0.5],
      [0.5, 0.3, 0.2],
      [0.6, 0.6, 0.6],
      [0.4, 0.7, 0.4],
      [0.3, 0.3, 0.5],
    ];

    const color = colors[index % colors.length] ?? [0.5, 0.5, 0.5];
    const texture = this.createColorTexture(textureId, color[0]!, color[1]!, color[2]!);

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * Create a solid color texture
   */
  private createColorTexture(name: string, r: number, g: number, b: number): BABYLON.Texture {
    const size = 512;
    const textureData = new Uint8Array(size * size * 4);

    const r255 = Math.floor(r * 255);
    const g255 = Math.floor(g * 255);
    const b255 = Math.floor(b * 255);

    for (let i = 0; i < size * size; i++) {
      textureData[i * 4] = r255;
      textureData[i * 4 + 1] = g255;
      textureData[i * 4 + 2] = b255;
      textureData[i * 4 + 3] = 255;
    }

    const texture = BABYLON.RawTexture.CreateRGBATexture(
      textureData,
      size,
      size,
      this.scene,
      false,
      false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    );

    texture.name = name;
    return texture;
  }

  /**
   * Get texture extended info for variation mapping
   * Extended textures (512x256) use different variation cells than non-extended (256x256)
   * Following mdx-m3-viewer: extended = texture.width > texture.height (map.ts:938)
   */
  public getTextureExtendedMap(
    textureIds: string[],
    loadedTextures: BABYLON.Texture[]
  ): Map<number, boolean> {
    const extendedMap = new Map<number, boolean>();

    for (let i = 0; i < Math.min(textureIds.length, loadedTextures.length); i++) {
      const texture = loadedTextures[i];
      if (!texture) {
        extendedMap.set(i, false);
        continue;
      }

      const size = texture.getSize();
      const isExtended = size.width > size.height;
      extendedMap.set(i, isExtended);
    }

    return extendedMap;
  }

  /**
   * Load terrain textures as individual Babylon textures
   * Returns array of textures (up to 15 like mdx-m3-viewer)
   * Waits for all textures to load before returning
   */
  public async createTextureAtlas(textureIds: string[]): Promise<BABYLON.Texture[]> {
    await this.loadManifest();

    const texturePromises: Promise<BABYLON.Texture>[] = [];

    for (let i = 0; i < Math.min(textureIds.length, 15); i++) {
      const textureId = textureIds[i];
      if (
        textureId === undefined ||
        textureId === null ||
        textureId === '' ||
        this.manifest === null
      ) {
        texturePromises.push(Promise.resolve(this.createPlaceholderTexture(`placeholder_${i}`, i)));
        continue;
      }

      const textureInfo = this.manifest.terrain.textures[textureId];
      if (!textureInfo) {
        texturePromises.push(Promise.resolve(this.createPlaceholderTexture(textureId, i)));
        continue;
      }

      const texturePromise = new Promise<BABYLON.Texture>((resolve, _reject) => {
        const texture = new BABYLON.Texture(
          textureInfo.url,
          this.scene,
          false,
          false,
          BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
          () => {
            texture.name = `${textureId}_${textureInfo.name}`;
            texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
            texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
            texture.gammaSpace = false;
            resolve(texture);
          },
          () => {
            resolve(this.createPlaceholderTexture(textureId, i));
          }
        );
      });

      texturePromises.push(texturePromise);
    }

    const textures = await Promise.all(texturePromises);
    return textures;
  }

  /**
   * Dispose all cached textures
   */
  public dispose(): void {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}
