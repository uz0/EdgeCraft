import type { W3ETerrain } from '../../formats/maps/w3x/types';

/**
 * Builds texture arrays for terrain rendering
 * Port of mdx-m3-viewer's texture blending algorithm
 */
export class TerrainTextureBuilder {
  /**
   * Build cornerTextures and cornerVariations arrays
   * Following mdx-m3-viewer algorithm (map.ts:346-386)
   *
   * @param w3e - Parsed W3E terrain data
   * @param textureExtended - Map of texture index to extended flag
   * @returns Texture arrays for instanced rendering
   */
  public buildTextureArrays(
    w3e: W3ETerrain,
    textureExtended: Map<number, boolean>
  ): {
    cornerTextures: Uint8Array;
    cornerVariations: Uint8Array;
    cornerExtended: Uint8Array;
    tileCount: number;
  } {
    const columns = w3e.width;
    const rows = w3e.height;
    const tileCount = (columns - 1) * (rows - 1); // 256×256 = 65,536 tiles

    const cornerTextures = new Uint8Array(tileCount * 4);
    const cornerVariations = new Uint8Array(tileCount * 4);
    const cornerExtended = new Uint8Array(tileCount * 4);

    let instance = 0;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        const bottomLeftTexture = this.cornerTexture(x, y, w3e);
        const bottomRightTexture = this.cornerTexture(x + 1, y, w3e);
        const topLeftTexture = this.cornerTexture(x, y + 1, w3e);
        const topRightTexture = this.cornerTexture(x + 1, y + 1, w3e);

        const textures = this.unique([
          bottomLeftTexture,
          bottomRightTexture,
          topLeftTexture,
          topRightTexture,
        ]).sort((a, b) => a - b);

        let texture = textures[0] ?? 0;
        cornerTextures[instance * 4] = texture + 1;
        cornerExtended[instance * 4] = textureExtended.get(texture) ? 1 : 0;
        const bottomLeft = w3e.groundTiles[y * columns + x];
        cornerVariations[instance * 4] = this.getVariation(
          texture,
          bottomLeft?.groundVariation ?? 0,
          textureExtended
        );

        textures.shift();

        for (let i = 0; i < textures.length && i < 3; i++) {
          let bitset = 0;
          texture = textures[i] ?? 0;

          if (bottomRightTexture === texture) bitset |= 0b0001;
          if (bottomLeftTexture === texture) bitset |= 0b0010;
          if (topRightTexture === texture) bitset |= 0b0100;
          if (topLeftTexture === texture) bitset |= 0b1000;

          cornerTextures[instance * 4 + 1 + i] = texture + 1;
          cornerVariations[instance * 4 + 1 + i] = bitset;
          cornerExtended[instance * 4 + 1 + i] = textureExtended.get(texture) ? 1 : 0;
        }

        instance++;
      }
    }

    return { cornerTextures, cornerVariations, cornerExtended, tileCount };
  }

  /**
   * Get texture at corner, handling cliffs and blight
   * Port of mdx-m3-viewer map.ts:979-1008
   */
  private cornerTexture(column: number, row: number, w3e: W3ETerrain): number {
    const columns = w3e.width;
    const rows = w3e.height;

    for (let y = -1; y < 1; y++) {
      for (let x = -1; x < 1; x++) {
        const checkCol = column + x;
        const checkRow = row + y;

        if (checkCol > 0 && checkCol < columns - 1 && checkRow > 0 && checkRow < rows - 1) {
          if (this.isCliff(checkCol, checkRow, w3e)) {
            const tile = w3e.groundTiles[checkRow * columns + checkCol];
            let cliffTexture = tile?.cliffTexture ?? 0;

            if (cliffTexture === 15) {
              cliffTexture = 1;
            }

            return this.cliffGroundIndex(cliffTexture, w3e);
          }
        }
      }
    }

    const corner = w3e.groundTiles[row * columns + column];

    if (corner?.blight) {
      return w3e.blightTextureIndex ?? 0;
    }

    return corner?.groundTexture ?? 0;
  }

  /**
   * Check if tile is a cliff (has elevation change)
   * Port of mdx-m3-viewer map.ts:931-943
   */
  private isCliff(column: number, row: number, w3e: W3ETerrain): boolean {
    if (column < 1 || column > w3e.width - 1 || row < 1 || row > w3e.height - 1) {
      return false;
    }

    const corners = w3e.groundTiles;
    const columns = w3e.width;
    const bottomLeft = corners[row * columns + column]?.layerHeight ?? 0;
    const bottomRight = corners[row * columns + column + 1]?.layerHeight ?? 0;
    const topLeft = corners[(row + 1) * columns + column]?.layerHeight ?? 0;
    const topRight = corners[(row + 1) * columns + column + 1]?.layerHeight ?? 0;

    return bottomLeft !== bottomRight || bottomLeft !== topLeft || bottomLeft !== topRight;
  }

  /**
   * Get variation index for texture
   * Port of mdx-m3-viewer map.ts:907-926
   */
  private getVariation(
    groundTexture: number,
    variation: number,
    textureExtended: Map<number, boolean>
  ): number {
    const isExtended = textureExtended.get(groundTexture) ?? false;

    if (isExtended) {
      if (variation < 16) {
        return 16 + variation;
      } else if (variation === 16) {
        return 15;
      } else {
        return 0;
      }
    } else {
      if (variation === 0) {
        return 0;
      } else {
        return 15;
      }
    }
  }

  /**
   * Get cliff ground texture index
   * Port of mdx-m3-viewer map.ts:963-974
   */
  private cliffGroundIndex(_cliffTexture: number, _w3e: W3ETerrain): number {
    return 0;
  }

  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }
}
