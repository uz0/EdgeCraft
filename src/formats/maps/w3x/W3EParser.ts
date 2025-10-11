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

    // Read and validate magic
    const magic = this.read4CC();
    if (magic !== W3EParser.W3E_MAGIC) {
      throw new Error(`Invalid W3E file magic: ${magic}`);
    }

    // Read version
    const version = this.readUint32();

    // Read tileset
    const tilesetChar = String.fromCharCode(this.view.getUint8(this.offset));
    this.offset += 1;

    // Custom tileset flag
    const customTileset = this.readUint32() === 1;

    // Read ground tiles
    const groundTileCount = this.readUint32();
    const groundTiles: W3EGroundTile[] = [];

    for (let i = 0; i < groundTileCount; i++) {
      groundTiles.push(this.readGroundTile());
    }

    // Calculate terrain dimensions (tiles are in a grid)
    // W3E stores tiles in linear array, dimensions are implicit from count
    const totalTiles = groundTileCount;
    const width = Math.floor(Math.sqrt(totalTiles));
    const height = Math.ceil(totalTiles / width);

    // Read cliff tiles (optional, version-dependent)
    let cliffTiles: W3ECliffTile[] | undefined;
    if (this.offset < this.buffer.byteLength) {
      const cliffTileCount = this.readUint32();
      if (cliffTileCount > 0) {
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
      width,
      height,
      groundTiles,
      cliffTiles,
    };
  }

  /**
   * Read ground tile data
   */
  private readGroundTile(): W3EGroundTile {
    this.checkBounds(7); // 2 + 2 + 1 + 1 + 1 = 7 bytes

    // Ground height (16-bit signed, divided by 4 for actual height)
    const rawHeight = this.view.getInt16(this.offset, true);
    this.offset += 2;
    const groundHeight = rawHeight / 4;

    // Water level (16-bit signed, divided by 4 for actual height, relative to ground)
    const rawWaterLevel = this.view.getInt16(this.offset, true);
    this.offset += 2;
    const waterLevel = rawWaterLevel / 4;

    // Tile flags
    const flags = this.view.getUint8(this.offset);
    this.offset += 1;

    // Ground texture index
    const groundTexture = this.view.getUint8(this.offset);
    this.offset += 1;

    // Cliff and layer data (packed into single byte)
    const cliffLayerData = this.view.getUint8(this.offset);
    this.offset += 1;

    const cliffLevel = cliffLayerData & 0x0f; // Lower 4 bits
    const layerHeight = (cliffLayerData & 0xf0) >> 4; // Upper 4 bits

    return {
      groundHeight,
      waterLevel,
      flags,
      groundTexture,
      cliffLevel,
      layerHeight,
    };
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
   * Convert ground tiles to heightmap
   * @param terrain - Parsed W3E terrain data
   * @returns Float32Array heightmap
   */
  public static toHeightmap(terrain: W3ETerrain): Float32Array {
    const { width, height, groundTiles } = terrain;
    const heightmap = new Float32Array(width * height);

    for (let i = 0; i < groundTiles.length; i++) {
      heightmap[i] = groundTiles[i]?.groundHeight ?? 0;
    }

    return heightmap;
  }

  /**
   * Extract texture indices for splatmap generation
   * @param terrain - Parsed W3E terrain data
   * @returns Uint8Array of texture indices
   */
  public static getTextureIndices(terrain: W3ETerrain): Uint8Array {
    const textureIndices = new Uint8Array(terrain.groundTiles.length);

    for (let i = 0; i < terrain.groundTiles.length; i++) {
      textureIndices[i] = terrain.groundTiles[i]?.groundTexture ?? 0;
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
