/**
 * W3X Map Loader - Warcraft 3 Map Loader
 * Orchestrates parsing of W3X/W3M maps using MPQ parser
 */

import { MPQParser } from '../../mpq/MPQParser';
import type { MPQFile } from '../../mpq/types';
import { W3IParser } from './W3IParser';
import { W3EParser } from './W3EParser';
import { W3DParser } from './W3DParser';
import { W3UParser } from './W3UParser';
import type { W3ODoodad } from './types';
import type { W3UUnit } from './types';
import type {
  IMapLoader,
  RawMapData,
  MapInfo,
  TerrainData,
  UnitPlacement,
  DoodadPlacement,
  PlayerInfo,
} from '../types';

/**
 * W3X/W3M Map Loader
 * Parses Warcraft 3 map files
 */
export class W3XMapLoader implements IMapLoader {
  /**
   * Extract a file from MPQ (gracefully handles decompression failures)
   */
  private async extractFileWithFallback(
    mpqParser: MPQParser,
    buffer: ArrayBuffer,
    fileName: string
  ): Promise<MPQFile | null> {
    // Try MPQParser first
    try {
      const result = await mpqParser.extractFile(fileName);
      if (result) {
        return result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if this is a decompression error that StormJS can handle
      const isDecompressionError =
        errorMsg.includes('Huffman') ||
        errorMsg.includes('Invalid distance') ||
        errorMsg.includes('ZLIB') ||
        errorMsg.includes('PKZIP') ||
        errorMsg.includes('BZip2') ||
        errorMsg.includes('decompression') ||
        errorMsg.includes('unknown compression method') ||
        errorMsg.includes('incorrect header check');

      if (isDecompressionError) {
        console.warn(
          `[W3XMapLoader] MPQParser decompression failed for ${fileName} - file will be skipped`
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Parse W3X/W3M map file
   * @param file - Map file or ArrayBuffer
   * @returns Raw map data
   */
  public async parse(file: File | ArrayBuffer): Promise<RawMapData> {
    // Convert to ArrayBuffer
    let buffer: ArrayBuffer;

    // Type guard for objects with buffer property (Node.js Buffer or TypedArray)
    interface BufferLike {
      buffer: ArrayBuffer;
      byteOffset: number;
      byteLength: number;
    }

    // Type guard for File-like objects
    interface FileLike {
      arrayBuffer: () => Promise<ArrayBuffer>;
    }

    function hasBuffer(obj: unknown): obj is BufferLike {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        'buffer' in obj &&
        obj.buffer instanceof ArrayBuffer &&
        'byteOffset' in obj &&
        typeof obj.byteOffset === 'number' &&
        'byteLength' in obj &&
        typeof obj.byteLength === 'number'
      );
    }

    function hasArrayBuffer(obj: unknown): obj is FileLike {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        'arrayBuffer' in obj &&
        typeof obj.arrayBuffer === 'function'
      );
    }

    // Check type more carefully
    const isArrayBuffer =
      file instanceof ArrayBuffer ||
      Object.prototype.toString.call(file) === '[object ArrayBuffer]';

    if (isArrayBuffer) {
      // Already an ArrayBuffer
      buffer = file as ArrayBuffer;
    } else if (hasBuffer(file)) {
      // Node.js Buffer or TypedArray - extract the underlying ArrayBuffer
      buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } else if (hasArrayBuffer(file)) {
      // File object - use arrayBuffer() method
      buffer = await file.arrayBuffer();
    } else {
      throw new Error(
        `Invalid input type: expected File, ArrayBuffer, or Buffer. Got ${Object.prototype.toString.call(file)}`
      );
    }

    // Parse MPQ archive
    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success || !mpqResult.archive) {
      throw new Error(`Failed to parse MPQ archive: ${mpqResult.error}`);
    }

    // Debug: List all files in archive
    const allFiles = mpqParser.listFiles();
    // Try to extract files, but catch errors (multi-compression, encryption, etc.)
    let w3iData: MPQFile | null = null;
    let w3eData: MPQFile | null = null;
    let dooData: MPQFile | null = null;
    let unitsData: MPQFile | null = null;

    // WORKER MODE: StormJS with shared WASM module (optimized)
    // Workers receive pre-compiled WebAssembly.Module from main thread
    // This avoids 3× compilation and reduces memory usage significantly
    // Try different case variations for war3map.w3i
    w3iData = await this.extractFileWithFallback(mpqParser, buffer, 'war3map.w3i');
    if (!w3iData) {
      w3iData = await this.extractFileWithFallback(mpqParser, buffer, 'war3map.W3I');
    }
    if (!w3iData) {
      w3iData = await this.extractFileWithFallback(mpqParser, buffer, 'WAR3MAP.W3I');
    }

    // Extract terrain data
    w3eData = await this.extractFileWithFallback(mpqParser, buffer, 'war3map.w3e');

    // Extract doodads (optional)
    dooData = await this.extractFileWithFallback(mpqParser, buffer, 'war3map.doo');

    // Extract units (optional)
    unitsData = await this.extractFileWithFallback(mpqParser, buffer, 'war3mapUnits.doo');

    // If extraction fails (likely due to multi-compression not being supported),
    // create placeholder data so we can still generate SOME preview
    if (!w3iData || !w3eData) {
      console.warn('[W3XMapLoader] ⚠️ Failed to extract W3X map files (likely multi-compression)');
      console.warn('[W3XMapLoader] Creating placeholder map data for preview generation...');

      return this.createPlaceholderMapData(allFiles);
    }

    // Parse map info
    const w3iParser = new W3IParser(w3iData.data);
    const w3iInfo = w3iParser.parse();

    // Parse terrain
    const w3eParser = new W3EParser(w3eData.data);
    const w3eTerrain = w3eParser.parse();

    // Parse doodads (optional)
    let doodads: DoodadPlacement[] = [];
    if (dooData) {
      const w3dParser = new W3DParser(dooData.data);
      const w3oDoodads = w3dParser.parse();
      doodads = this.convertDoodads(w3oDoodads.doodads);
    }

    // Parse units (optional)
    let units: UnitPlacement[] = [];
    if (unitsData) {
      const w3uParser = new W3UParser(unitsData.data);
      const w3uUnits = w3uParser.parse();
      units = this.convertUnits(w3uUnits.units);
    }

    // Convert to RawMapData
    const mapInfo = this.convertMapInfo(w3iInfo);
    const terrainData = this.convertTerrain(w3eTerrain);

    return {
      format: 'w3x',
      info: mapInfo,
      terrain: terrainData,
      units,
      doodads,
    };
  }

  /**
   * Convert W3I map info to generic MapInfo
   */
  private convertMapInfo(w3i: ReturnType<W3IParser['parse']>): MapInfo {
    const players: PlayerInfo[] = w3i.players.map((p) => ({
      id: p.playerNumber,
      name: p.name,
      type: this.convertPlayerType(p.type),
      race: this.convertRace(p.race),
      team: 0, // Will be set by forces
      startLocation: {
        x: p.startX,
        y: p.startY,
        z: 0,
      },
    }));

    return {
      name: w3i.name,
      author: w3i.author,
      description: w3i.description,
      players,
      dimensions: {
        width: w3i.playableWidth,
        height: w3i.playableHeight,
        playableWidth: w3i.playableWidth,
        playableHeight: w3i.playableHeight,
      },
      environment: {
        tileset: w3i.mainTileType,
        fog: {
          zStart: w3i.terrainFog.zStart,
          zEnd: w3i.terrainFog.zEnd,
          density: w3i.terrainFog.density,
          color: w3i.terrainFog.color,
        },
      },
    };
  }

  /**
   * Convert W3E terrain to generic TerrainData
   */
  private convertTerrain(w3e: ReturnType<W3EParser['parse']>): TerrainData {
    // Convert ground tiles to heightmap
    const heightmap = W3EParser.toHeightmap(w3e);

    // Extract texture indices
    const textureIndices = W3EParser.getTextureIndices(w3e);

    // Extract water levels
    const waterLevels = W3EParser.getWaterLevels(w3e);

    // Find if there's water
    let water: TerrainData['water'] | undefined;
    const hasWater = waterLevels.some((level) => level > 0);

    if (hasWater) {
      const avgWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
      water = {
        level: avgWaterLevel,
        color: { r: 0, g: 100, b: 200, a: 180 },
      };
    }

    // CRITICAL FIX: Use groundTextureIds array instead of single tileset character
    // W3E parser extracts groundTextureIds like ["Adrt", "Ldrt", "Agrs", "Arok"]
    // Each tile's groundTexture field (0-7) is an index into this array
    // We need to pass ALL texture IDs so the multi-texture splatmap renderer can load them
    const textures =
      w3e.groundTextureIds && w3e.groundTextureIds.length > 0
        ? w3e.groundTextureIds.map((textureId, index) => ({
            id: textureId,
            // Only the first texture gets the blendMap (it's shared across all textures)
            blendMap: index === 0 ? textureIndices : undefined,
          }))
        : [
            {
              // Fallback to tileset character if groundTextureIds is empty or undefined
              id: w3e.tileset,
              blendMap: textureIndices,
            },
          ];

    return {
      width: w3e.width,
      height: w3e.height,
      heightmap,
      textures,
      water,
    };
  }

  /**
   * Convert W3O doodads to generic DoodadPlacement
   */
  private convertDoodads(w3oDoodads: W3ODoodad[]): DoodadPlacement[] {
    return w3oDoodads.map((doodad) => ({
      id: `doodad_${doodad.editorId}`,
      typeId: doodad.typeId,
      variation: doodad.variation,
      position: doodad.position,
      rotation: doodad.rotation,
      scale: doodad.scale,
      life: doodad.life,
      flags: doodad.flags,
    }));
  }

  /**
   * Convert W3U units to generic UnitPlacement
   */
  private convertUnits(w3uUnits: W3UUnit[]): UnitPlacement[] {
    return w3uUnits.map((unit) => ({
      id: `unit_${unit.editorId}`,
      typeId: unit.typeId,
      owner: unit.owner,
      position: unit.position,
      rotation: unit.rotation,
      scale: unit.scale,
      health: unit.hitPoints === -1 ? 100 : (unit.hitPoints / 100) * 100,
      mana: unit.manaPoints === -1 ? 100 : (unit.manaPoints / 100) * 100,
      customProperties: {
        heroLevel: unit.heroLevel,
        heroStrength: unit.heroStrength,
        heroAgility: unit.heroAgility,
        heroIntelligence: unit.heroIntelligence,
        goldAmount: unit.goldAmount,
        targetAcquisition: unit.targetAcquisition,
      },
    }));
  }

  /**
   * Create placeholder map data when extraction fails
   * This allows preview generation to work even when multi-compression is not supported
   */
  private createPlaceholderMapData(availableFiles: string[]): RawMapData {
    // Determine map size from filename hints if possible
    let mapSize = 256;
    const fileName = availableFiles.find((f) => f.includes('war3map')) || '';
    if (fileName.toLowerCase().includes('small')) {
      mapSize = 128;
    } else if (fileName.toLowerCase().includes('large')) {
      mapSize = 512;
    }

    // Create flat heightmap (all zeros)
    const heightmap = new Float32Array(mapSize * mapSize);
    heightmap.fill(0); // Flat terrain

    // Create minimal map info
    const mapInfo: MapInfo = {
      name: 'W3X Map (Multi-compression not supported)',
      author: 'Unknown',
      description: 'Preview generated with placeholder data due to unsupported compression.',
      players: [],
      dimensions: {
        width: mapSize,
        height: mapSize,
        playableWidth: mapSize,
        playableHeight: mapSize,
      },
      environment: {
        tileset: 'Ashenvale',
        fog: {
          zStart: 0,
          zEnd: 1000,
          density: 0.5,
          color: { r: 128, g: 128, b: 128, a: 255 },
        },
      },
    };

    // Create terrain data
    const terrainData: TerrainData = {
      width: mapSize,
      height: mapSize,
      heightmap,
      textures: [
        {
          id: 'Agrd', // Ashenvale grass
          blendMap: new Uint8Array(mapSize * mapSize).fill(0),
        },
      ],
    };

    return {
      format: 'w3x',
      info: mapInfo,
      terrain: terrainData,
      units: [],
      doodads: [],
    };
  }

  /**
   * Convert player type number to string
   */
  private convertPlayerType(type: number): 'human' | 'computer' | 'neutral' {
    switch (type) {
      case 1:
        return 'human';
      case 2:
        return 'computer';
      case 3:
      case 4:
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  /**
   * Convert race number to string
   */
  private convertRace(race: number): string {
    switch (race) {
      case 1:
        return 'human';
      case 2:
        return 'orc';
      case 3:
        return 'undead';
      case 4:
        return 'nightelf';
      default:
        return 'unknown';
    }
  }
}
