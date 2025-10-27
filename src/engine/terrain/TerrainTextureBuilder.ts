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
        if (this.isCliff(x, y, w3e)) {
          cornerTextures[instance * 4 + 0] = 0;
          cornerTextures[instance * 4 + 1] = 0;
          cornerTextures[instance * 4 + 2] = 0;
          cornerTextures[instance * 4 + 3] = 0;
          cornerVariations[instance * 4 + 0] = 0;
          cornerVariations[instance * 4 + 1] = 0;
          cornerVariations[instance * 4 + 2] = 0;
          cornerVariations[instance * 4 + 3] = 0;
          cornerExtended[instance * 4 + 0] = 0;
          cornerExtended[instance * 4 + 1] = 0;
          cornerExtended[instance * 4 + 2] = 0;
          cornerExtended[instance * 4 + 3] = 0;
        } else {
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
          cornerExtended[instance * 4] = textureExtended.get(texture) === true ? 1 : 0;
          const bottomLeft = w3e.groundTiles[y * columns + x];
          const groundVariation = bottomLeft?.groundVariation ?? 0;
          const calculatedVariation = this.getVariation(texture, groundVariation, textureExtended);

          cornerVariations[instance * 4] = calculatedVariation;

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
            cornerExtended[instance * 4 + 1 + i] = textureExtended.get(texture) === true ? 1 : 0;
          }
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

    if (corner?.blight === true) {
      return w3e.blightTextureIndex ?? 0;
    }

    return corner?.groundTexture ?? 0;
  }

  /**
   * Check if a tile is a cliff
   * Port of mdx-m3-viewer map.ts:932-944
   */
  private isCliff(column: number, row: number, w3e: W3ETerrain): boolean {
    const columns = w3e.width;
    const rows = w3e.height;

    if (column < 1 || column > columns - 2 || row < 1 || row > rows - 2) {
      return false;
    }

    const corners = w3e.corners;
    const bottomLeft = corners[row]?.[column]?.layerHeight;
    const bottomRight = corners[row]?.[column + 1]?.layerHeight;
    const topLeft = corners[row + 1]?.[column]?.layerHeight;
    const topRight = corners[row + 1]?.[column + 1]?.layerHeight;

    if (
      bottomLeft === undefined ||
      bottomRight === undefined ||
      topLeft === undefined ||
      topRight === undefined
    ) {
      return false;
    }

    return bottomLeft !== bottomRight || bottomLeft !== topLeft || bottomLeft !== topRight;
  }

  /**
   * Get the ground texture index for a cliff
   * Port of mdx-m3-viewer map.ts:964-975
   *
   * NOTE: In our implementation, we don't have access to the full cliff tileset data
   * (which requires external data files). For now, we return the cliff texture index directly.
   * This creates a reasonable approximation - cliff areas will use textures that blend with
   * the surrounding cliffs.
   */
  private cliffGroundIndex(whichCliff: number, _w3e: W3ETerrain): number {
    return whichCliff;
  }

  /**
   * Get variation index for texture
   * EXACT port of mdx-m3-viewer map.ts:906-925
   *
   * For extended textures (512x256):
   * - Variations 0-15: map to cells 16-31 (second half of atlas)
   * - Variation 16: maps to cell 15
   * - Variation 17+: maps to cell 0
   *
   * For non-extended textures (256x512):
   * - Variation 0: maps to cell 0
   * - Any other variation: maps to cell 15
   *
   * IMPORTANT: mdx-m3-viewer's logic for non-extended only returns 0 or 15
   * This appears to be intentional simplification by Blizzard
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
      // Non-extended textures: mdx-m3-viewer only returns 0 or 15
      // Lines 919-922 in mdx-m3-viewer/map.ts
      if (variation === 0) {
        return 0;
      } else {
        return 15;
      }
    }
  }

  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }
}
