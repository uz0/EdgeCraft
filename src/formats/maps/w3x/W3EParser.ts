/**
 * W3E Parser - Warcraft 3 Environment/Terrain (war3map.w3e)
 * Parses terrain heightmap, textures, cliffs, and water
 */

import type { W3ETerrain, W3EGroundTile, W3ECliffTile } from './types';
/* eslint-disable @typescript-eslint/no-unused-vars */

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
   * @param mapWidth - Map width from W3I file (optional, will be calculated if not provided)
   * @param mapHeight - Map height from W3I file (optional, will be calculated if not provided)
   */
  public parse(mapWidth?: number, mapHeight?: number): W3ETerrain {
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

    // Read ground texture list (version 11+)
    const groundTextureCount = this.readUint32();

    // Read ground texture IDs (4 bytes each, like "Adrt", "Ldrt", etc.)
    const groundTextureIds: string[] = [];
    for (let i = 0; i < groundTextureCount; i++) {
      const textureId = this.read4CC();
      groundTextureIds.push(textureId);
    }

    // Calculate ground tile count
    // If we have valid dimensions from W3I, use them. Otherwise calculate from buffer.
    let groundTileCount: number;
    if (mapWidth !== undefined && mapHeight !== undefined && mapWidth > 0 && mapHeight > 0) {
      groundTileCount = mapWidth * mapHeight;
    } else {
      // Fallback: Each ground tile is 7 bytes (2 + 2 + 1 + 1 + 1)
      const remainingBytes = this.buffer.byteLength - this.offset;
      groundTileCount = Math.floor(remainingBytes / 7);
    }

    const groundTiles: W3EGroundTile[] = [];

    for (let i = 0; i < groundTileCount; i++) {
      groundTiles.push(this.readGroundTile());
    }

    // Calculate dimensions from map info or tile count
    let width: number;
    let height: number;

    if (mapWidth !== undefined && mapHeight !== undefined && mapWidth > 0 && mapHeight > 0) {
      // Use dimensions from W3I file (most accurate)
      width = mapWidth;
      height = mapHeight;
    } else {
      // Fallback: Calculate dimensions from tile count (for corrupted W3I or maps without W3I)
      const totalTiles = groundTileCount;
      width = Math.floor(Math.sqrt(totalTiles));
      height = Math.ceil(totalTiles / width);
    }

    // Read cliff tiles (optional, version-dependent)
    let cliffTiles: W3ECliffTile[] | undefined;
    if (this.offset + 4 <= this.buffer.byteLength) {
      const cliffTileCount = this.readUint32();
      // Check if we have enough space for the cliff tiles
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

    // Calculate stats for debugging
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let zeroCount = 0;

    for (let i = 0; i < groundTiles.length; i++) {
      const height = groundTiles[i]?.groundHeight ?? 0;
      heightmap[i] = height;

      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
      if (height === 0) zeroCount++;
    }

    // Sample first 10 values for debugging
    const sample = Array.from(heightmap.slice(0, Math.min(10, heightmap.length)));
    return heightmap;
  }

  /**
   * Extract texture indices for splatmap generation
   *
   * IMPORTANT: The groundTexture field in W3E is a packed byte (0-255) that encodes:
   * - Upper 4 bits (>> 4): Texture ID (0-15) → index into groundTextureIds array
   * - Lower 4 bits (& 0xF): Variation/rotation (0-15) → for visual randomness
   *
   * We only need the texture ID for splatmap rendering, so we extract the upper nibble.
   *
   * Example:
   * - groundTexture=0x00 (0)  → textureId=0, variation=0
   * - groundTexture=0x04 (4)  → textureId=0, variation=4
   * - groundTexture=0x10 (16) → textureId=1, variation=0
   * - groundTexture=0x61 (97) → textureId=6, variation=1
   *
   * @param terrain - Parsed W3E terrain data
   * @returns Uint8Array of texture indices (0-15, typically 0-7 for 8 textures)
   */
  public static getTextureIndices(terrain: W3ETerrain): Uint8Array {
    const textureIndices = new Uint8Array(terrain.groundTiles.length);

    for (let i = 0; i < terrain.groundTiles.length; i++) {
      const groundTexture = terrain.groundTiles[i]?.groundTexture ?? 0;

      // Extract texture ID from upper 4 bits (0-15)
      // This maps to groundTextureIds[textureId]
      textureIndices[i] = groundTexture >> 4;
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
