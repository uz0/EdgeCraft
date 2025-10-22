/**
 * W3E Parser - Warcraft 3 Environment/Terrain (war3map.w3e)
 * Parses terrain heightmap, textures, cliffs, and water
 */

import type { W3ETerrain, W3EGroundTile, W3ECliffTile } from './types';

/**
 * Parse war3map.w3e file
 */
export class W3EParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  // W3E magic number
  private static readonly W3E_MAGIC = 'W3E!';

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire w3e file
   */
  public parse(): W3ETerrain {
    this.offset = 0;

    const magic = this.read4CC();
    if (magic !== W3EParser.W3E_MAGIC) {
      throw new Error(`Invalid W3E file magic: ${magic}`);
    }

    const version = this.readUint32();

    if (version === 11 || version === 12) {
      return this.parseTerrain(version);
    } else {
      throw new Error(`Unsupported W3E version: ${version}`);
    }
  }

  /**
   * Parse W3E terrain (v11 Classic/TFT or v12 Reforged)
   *
   * Key v12 differences (discovered by Luashine):
   * - Tile size: 7 bytes → 8 bytes
   * - Height calculation: (w3eWidth - 1) × w3eHeight → (w3eWidth - 1) × (w3eHeight - 1)
   * - Texture/Flags: byte → ushort (supports 64 textures instead of 16)
   *
   * Source: https://github.com/ChiefOfGxBxL/WC3MapSpecification/pull/11
   * Credit: @Luashine for reverse-engineering the v12 Reforged format
   */
  private parseTerrain(version: number): W3ETerrain {
    const tilesetChar = String.fromCharCode(this.view.getUint8(this.offset));
    this.offset += 1;

    const customTileset = this.readUint32() === 1;

    const groundTextureCount = this.readUint32();
    const groundTextureIds: string[] = [];
    for (let i = 0; i < groundTextureCount; i++) {
      groundTextureIds.push(this.read4CC());
    }

    const cliffTextureCount = this.readUint32();
    const cliffTextureIds: string[] = [];
    for (let i = 0; i < cliffTextureCount; i++) {
      cliffTextureIds.push(this.read4CC());
    }

    const w3eWidth = this.readUint32();
    const w3eHeight = this.readUint32();
    this.offset += 4;
    this.offset += 4;

    const width = w3eWidth - 1;
    const height = version === 11 ? w3eHeight : w3eHeight - 1;

    const expectedTileCount = width * height;
    const tileByteSize = version === 11 ? 7 : 8;
    const groundTiles: W3EGroundTile[] = [];

    for (
      let i = 0;
      i < expectedTileCount && this.offset + tileByteSize <= this.buffer.byteLength;
      i++
    ) {
      const tile = this.readGroundTile(version);
      groundTiles.push(tile);
    }

    let cliffTiles: W3ECliffTile[] | undefined;
    if (version === 11 && this.offset + 4 <= this.buffer.byteLength) {
      const cliffTileCount = this.readUint32();
      if (cliffTileCount > 0 && this.offset + cliffTileCount * 3 <= this.buffer.byteLength) {
        cliffTiles = [];
        for (let i = 0; i < cliffTileCount; i++) {
          cliffTiles.push(this.readCliffTile());
        }
      }
    }

    return {
      version,
      tileset: tilesetChar,
      customTileset,
      groundTextureIds,
      width,
      height,
      groundTiles,
      cliffTiles,
    };
  }

  /**
   * Read ground tile data (version-dependent format)
   *
   * v11 (Classic/TFT): 7 bytes per tile
   * - Texture/Flags: 1 byte (4 bits texture, 4 bits flags) → max 16 textures
   *
   * v12 (Reforged): 8 bytes per tile
   * - Texture/Flags: 2 bytes (6 bits texture, 10 bits flags) → max 64 textures
   *
   * v12 changes discovered by @Luashine:
   * https://github.com/ChiefOfGxBxL/WC3MapSpecification/pull/11
   */
  private readGroundTile(version: number): W3EGroundTile {
    const tileByteSize = version === 11 ? 7 : 8;
    this.checkBounds(tileByteSize);

    // Read raw height values WITHOUT normalization
    // Keep the original values for Babylon to scale
    const groundHeight = this.view.getInt16(this.offset, true);
    this.offset += 2;

    const waterLevel = this.view.getInt16(this.offset, true);
    this.offset += 2;

    let flags: number;
    let groundTexture: number;

    if (version === 11) {
      const flagsAndGroundTexture = this.view.getUint8(this.offset);
      this.offset += 1;
      flags = flagsAndGroundTexture & 0xf0;
      groundTexture = flagsAndGroundTexture & 0x0f;
      this.offset += 1;
    } else {
      const flagsAndGroundTexture = this.view.getUint16(this.offset, true);
      this.offset += 2;
      groundTexture = flagsAndGroundTexture & 0x3f;
      flags = (flagsAndGroundTexture & 0xffc0) >> 6;
    }

    const cliffTextureAndLayerHeight = this.view.getUint8(this.offset);
    this.offset += 1;
    const layerHeight = cliffTextureAndLayerHeight & 0x0f;

    if (version === 12) {
      this.offset += 1;
    }

    const cliffLevel = layerHeight;

    const tile = {
      groundHeight,
      waterLevel,
      flags,
      groundTexture,
      cliffLevel,
      layerHeight,
    };

    return tile;
  }

  /**
   * Read cliff tile data
   */
  private readCliffTile(): W3ECliffTile {
    this.checkBounds(3); // 1 + 1 + 1 = 3 bytes

    const cliffType = this.view.getUint8(this.offset);
    this.offset += 1;

    const cliffLevel = this.view.getUint8(this.offset);
    this.offset += 1;

    const cliffTexture = this.view.getUint8(this.offset);
    this.offset += 1;

    return {
      cliffType,
      cliffLevel,
      cliffTexture,
    };
  }

  /**
   * Convert ground tiles to heightmap using mdx-m3-viewer formula
   *
   * mdx-m3-viewer formula: cornerHeight = (groundHeight + layerHeight - 2) * 128
   * - groundHeight: base terrain height (raw Int16 value from W3E)
   * - layerHeight: cliff tier (0-15)
   * - The "- 2" offset adjusts the base level
   * - The "* 128" converts from W3E units to world coordinates
   *
   * However, since Babylon's CreateGroundFromHeightMap will scale the values
   * using minHeight/maxHeight parameters, we store the unscaled height here
   * and let Babylon handle the * 128 scaling.
   *
   * Source: mdx-m3-viewer/src/viewer/handlers/w3x/map.js
   * - cornerHeights[index] = bottomLeft.groundHeight + bottomLeft.layerHeight - 2;
   *
   * @param terrain - Parsed W3E terrain data
   * @returns Float32Array heightmap with terrain + cliff heights combined
   */
  public static toHeightmap(terrain: W3ETerrain): Float32Array {
    const { width, height, groundTiles } = terrain;
    const heightmap = new Float32Array(width * height);

    for (let i = 0; i < groundTiles.length && i < heightmap.length; i++) {
      const tile = groundTiles[i];
      if (!tile) {
        heightmap[i] = 0;
        continue;
      }

      // mdx-m3-viewer formula (without * 128, Babylon will scale it)
      heightmap[i] = tile.groundHeight + tile.layerHeight - 2;
    }

    return heightmap;
  }

  /**
   * Extract texture indices for splatmap generation
   *
   * IMPORTANT: The groundTexture field is already extracted as lower 4 bits (0-15)
   * from byte 4 of the tile data. It directly indexes into the groundTextureIds array.
   *
   * @param terrain - Parsed W3E terrain data
   * @returns Uint8Array of texture indices (0-15)
   */
  public static getTextureIndices(terrain: W3ETerrain): Uint8Array {
    const textureIndices = new Uint8Array(terrain.groundTiles.length);

    for (let i = 0; i < terrain.groundTiles.length; i++) {
      const groundTexture = terrain.groundTiles[i]?.groundTexture ?? 0;
      textureIndices[i] = groundTexture;
    }

    return textureIndices;
  }

  /**
   * Extract water level data
   * @param terrain - Parsed W3E terrain data
   * @returns Float32Array of water levels
   */
  public static getWaterLevels(terrain: W3ETerrain): Float32Array {
    const waterLevels = new Float32Array(terrain.groundTiles.length);

    for (let i = 0; i < terrain.groundTiles.length; i++) {
      waterLevels[i] = terrain.groundTiles[i]?.waterLevel ?? 0;
    }

    return waterLevels;
  }

  /**
   * Helper: Check if we can read 'size' bytes from current offset
   */
  private checkBounds(size: number): void {
    if (this.offset + size > this.buffer.byteLength) {
      throw new Error(
        `W3E read would exceed buffer bounds: offset=${this.offset}, size=${size}, bufferLength=${this.buffer.byteLength}`
      );
    }
  }

  /**
   * Helper: Read 4-character code
   */
  private read4CC(): string {
    this.checkBounds(4);
    const chars = String.fromCharCode(
      this.view.getUint8(this.offset),
      this.view.getUint8(this.offset + 1),
      this.view.getUint8(this.offset + 2),
      this.view.getUint8(this.offset + 3)
    );
    this.offset += 4;
    return chars;
  }

  /**
   * Helper: Read uint32
   */
  private readUint32(): number {
    this.checkBounds(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }
}
