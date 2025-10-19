/**
 * W3X Map Loader - Warcraft 3 Map Loader
 * Orchestrates parsing of W3X/W3M maps using MPQ parser
 */

import { MPQParser } from '../../mpq/MPQParser';
import { W3IParser } from './W3IParser';
import { W3EParser } from './W3EParser';
import { W3DParser } from './W3DParser';
import { W3UParser } from './W3UParser';
import { UnitsTranslator } from 'wc3maptranslator';
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

    // List all files in archive
    const allFiles = mpqParser.listFiles();

    // Try to extract files, but catch errors (multi-compression, encryption, etc.)
    let w3iData: Awaited<ReturnType<typeof mpqParser.extractFile>> | null = null;
    let w3eData: Awaited<ReturnType<typeof mpqParser.extractFile>> | null = null;
    let dooData: Awaited<ReturnType<typeof mpqParser.extractFile>> | null = null;
    let unitsData: Awaited<ReturnType<typeof mpqParser.extractFile>> | null = null;

    try {
      // Try different case variations for war3map.w3i
      w3iData = await mpqParser.extractFile('war3map.w3i');
      if (!w3iData) {
        w3iData = await mpqParser.extractFile('war3map.W3I');
      }
      if (!w3iData) {
        w3iData = await mpqParser.extractFile('WAR3MAP.W3I');
      }
    } catch (err) {
      console.warn(
        '[W3XMapLoader] ⚠️ Failed to extract war3map.w3i:',
        err instanceof Error ? err.message : String(err)
      );
    }

    try {
      w3eData = await mpqParser.extractFile('war3map.w3e');
      if (w3eData) {
        console.log(
          `[W3XMapLoader] ✅ Successfully extracted war3map.w3e: ${w3eData.data.byteLength} bytes`
        );
      } else {
        console.error(
          '[W3XMapLoader] ❌ war3map.w3e extraction returned null (file not found in MPQ)'
        );
      }
    } catch (err) {
      console.error(
        '[W3XMapLoader] ❌ CRITICAL: Failed to extract war3map.w3e:',
        err instanceof Error ? err.message : String(err)
      );
      console.error(
        '[W3XMapLoader] This will result in FLAT TERRAIN (placeholder data will be used)'
      );
    }

    try {
      dooData = await mpqParser.extractFile('war3map.doo');
    } catch (err) {
      // Optional file, silent fail
    }

    try {
      unitsData = await mpqParser.extractFile('war3mapUnits.doo');
    } catch (err) {
      // Optional file, silent fail
    }

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

    // HIGH-LEVEL FORMAT DETECTION (User's insight!)
    // Use W3I version numbers to detect Reforged format BEFORE parsing units
    // CRITICAL FIX: fileVersion >= 28 indicates Reforged (v1.32+), NOT >= 25!
    // Version 25 is The Frozen Throne (TFT), which uses Classic W3U format (no 16-byte padding).
    // Version 28+ adds 4 game version fields in W3I AND 16-byte padding in W3U.
    const mapFormat: 'classic' | 'reforged' = w3iInfo.fileVersion >= 28 ? 'reforged' : 'classic';
    console.error(
      `[W3XMapLoader] 🔍 Map format detected: ${mapFormat.toUpperCase()} (fileVersion=${w3iInfo.fileVersion})`
    );
    console.error(
      `[W3XMapLoader] ⚠️ FORMAT DETECTION CHECKPOINT - fileVersion=${w3iInfo.fileVersion}, mapFormat=${mapFormat}`
    );

    // Parse terrain
    const w3eParser = new W3EParser(w3eData.data);
    const w3eTerrain = w3eParser.parse();

    // Parse doodads (optional)
    let doodads: DoodadPlacement[] = [];
    if (dooData) {
      try {
        console.log(
          `[W3XMapLoader] 🔍 DEBUG: Parsing doodads from war3map.doo (${dooData.data.byteLength} bytes)`
        );
        const w3dParser = new W3DParser(dooData.data);
        const w3oDoodads = w3dParser.parse();
        console.log(`[W3XMapLoader] ✅ W3D parser extracted ${w3oDoodads.doodads.length} doodads`);
        doodads = this.convertDoodads(w3oDoodads.doodads);
        console.log(`[W3XMapLoader] ✅ Converted ${doodads.length} doodads to RawMapData format`);
      } catch (doodadError) {
        console.error(
          '[W3XMapLoader] ❌ Failed to parse doodads:',
          doodadError instanceof Error ? doodadError.message : String(doodadError)
        );
        console.error('[W3XMapLoader] 🔍 DEBUG: Full doodad parser error:', doodadError);
        doodads = [];
      }
    } else {
      console.warn('[W3XMapLoader] ⚠️ No war3map.doo data found, doodads will not be rendered');
    }

    // Parse units (optional)
    let units: UnitPlacement[] = [];
    if (unitsData) {
      // CRITICAL FIX: wc3maptranslator doesn't support Reforged format (version >= 25)
      // Skip it entirely for Reforged maps and go straight to W3UParser
      if (mapFormat === 'reforged') {
        console.log(
          `[W3XMapLoader] 🔧 Reforged map detected (fileVersion=${w3iInfo.fileVersion}), using W3UParser directly`
        );
        console.log('[W3XMapLoader] (Skipping wc3maptranslator - it only supports Classic format)');

        try {
          const w3uParser = new W3UParser(unitsData.data); // Let auto-detect format (W3I version ≠ W3U format!)
          const w3uUnits = w3uParser.parse();
          units = this.convertUnits(w3uUnits.units);
          console.log(`[W3XMapLoader] ✅ W3UParser parsed ${units.length} units`);
        } catch (customError) {
          console.error(
            '[W3XMapLoader] ❌ W3UParser failed. Units will not be rendered.',
            customError instanceof Error ? customError.message : String(customError)
          );
          console.error('[W3XMapLoader] 🔍 DEBUG: Full W3UParser error:', customError);
          units = [];
        }
      } else {
        // Classic map - try wc3maptranslator first, then W3UParser as fallback
        try {
          console.log(
            '[W3XMapLoader] Classic map detected, attempting to parse units with wc3maptranslator library...'
          );

          const nodeBuffer = Buffer.from(unitsData.data);
          const result = UnitsTranslator.warToJson(nodeBuffer);

          if (result.json && result.json.length > 0) {
            console.log(
              `[W3XMapLoader] ✅ wc3maptranslator successfully parsed ${result.json.length} units`
            );
            units = this.convertUnitsFromWc3MapTranslator(result.json);
          } else {
            console.warn(
              '[W3XMapLoader] wc3maptranslator returned 0 units, falling back to custom parser'
            );
            throw new Error('wc3maptranslator returned 0 units');
          }
        } catch (libError) {
          // FALLBACK: Use custom W3UParser
          console.warn(
            '[W3XMapLoader] wc3maptranslator failed, trying custom W3UParser:',
            libError instanceof Error ? libError.message : String(libError)
          );

          try {
            const w3uParser = new W3UParser(unitsData.data); // Let auto-detect format (W3I version ≠ W3U format!)
            const w3uUnits = w3uParser.parse();
            units = this.convertUnits(w3uUnits.units);
            console.log(`[W3XMapLoader] ✅ Custom W3UParser parsed ${units.length} units`);
          } catch (customError) {
            console.error(
              '[W3XMapLoader] ❌ Both parsers failed. Units will not be rendered.',
              customError instanceof Error ? customError.message : String(customError)
            );
            console.error('[W3XMapLoader] 🔍 DEBUG: Full custom parser error:', customError);
            units = [];
          }
        }
      }
    }

    // Convert to RawMapData
    const mapInfo = this.convertMapInfo(w3iInfo, w3eTerrain);
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
   *
   * @param w3i - Parsed W3I data
   * @param w3e - Parsed W3E data (used as fallback for dimensions if W3I is corrupt)
   */
  private convertMapInfo(
    w3i: ReturnType<W3IParser['parse']>,
    w3e: ReturnType<W3EParser['parse']>
  ): MapInfo {
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

    // CRITICAL FIX: Detect garbage W3I dimensions (happens with format version 25+)
    // If dimensions are unreasonably large (> 1000), use W3E dimensions as fallback
    const isGarbageDimensions = w3i.playableWidth > 1000 || w3i.playableHeight > 1000;

    let width = w3i.playableWidth;
    let height = w3i.playableHeight;

    if (isGarbageDimensions) {
      console.warn(
        '[W3XMapLoader] 🔧 W3I dimensions look corrupt (likely format version 25+), using W3E dimensions as fallback'
      );
      console.warn(
        `[W3XMapLoader]   W3I dimensions: ${w3i.playableWidth}x${w3i.playableHeight} (GARBAGE)`
      );
      console.warn(`[W3XMapLoader]   W3E dimensions: ${w3e.width}x${w3e.height} (USING THIS)`);
      width = w3e.width;
      height = w3e.height;
    }

    return {
      name: w3i.name,
      author: w3i.author,
      description: w3i.description,
      players,
      dimensions: {
        width,
        height,
        playableWidth: width,
        playableHeight: height,
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

    // CRITICAL FIX: Use groundTextureIds array (e.g., ["Adrt", "Ldrt", "Agrs", "Arok"])
    // instead of tileset name (e.g., "A"). The textureIndices (blendMap) point into this array.
    //
    // Example:
    // - groundTextureIds = ["Adrt", "Agrs", "Arok", "Avin"]
    // - textureIndices[i] = 0 → use groundTextureIds[0] = "Adrt" (dirt)
    // - textureIndices[i] = 1 → use groundTextureIds[1] = "Agrs" (grass)
    // - textureIndices[i] = 2 → use groundTextureIds[2] = "Arok" (rock)
    //
    // If groundTextureIds is empty (shouldn't happen, but defensive), fall back to tileset.
    const textureIds =
      w3e.groundTextureIds && w3e.groundTextureIds.length > 0
        ? w3e.groundTextureIds
        : [w3e.tileset];

    console.log(
      `[W3XMapLoader] Terrain textures: ${textureIds.length} textures [${textureIds.join(', ')}], ` +
        `blendMap: ${textureIndices.length} indices (range: 0-${Math.max(...textureIndices)})`
    );

    // Create a TerrainTexture for each ground texture in the map
    // The blendMap (textureIndices) determines which texture is used at each point
    const textures = textureIds.map((id) => ({
      id,
      blendMap: textureIndices, // Same blendMap shared by all textures (indices point into textureIds array)
    }));

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
    // DEBUG: Log first 3 doodad positions to verify coordinate system
    if (w3oDoodads.length > 0) {
      console.log(`[W3XMapLoader] 🔍 Raw doodad positions from war3map.doo (first 3):`);
      for (let i = 0; i < Math.min(3, w3oDoodads.length); i++) {
        const d = w3oDoodads[i];
        if (d) {
          console.log(
            `  [${i}] typeId=${d.typeId}, pos=(${d.position.x.toFixed(1)}, ${d.position.y.toFixed(1)}, ${d.position.z.toFixed(1)})`
          );
        }
      }
    }

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
   * Convert wc3maptranslator JSON units to generic UnitPlacement
   */
  private convertUnitsFromWc3MapTranslator(
    jsonUnits: Array<{
      type: string;
      variation: number;
      position: number[];
      rotation: number;
      scale: number[];
      hero: { level: number; str: number; agi: number; int: number };
      inventory: Array<{ slot: number; type: string }>;
      abilities: Array<{ ability: string; active: boolean; level: number }>;
      player: number;
      hitpoints: number;
      mana: number;
      gold: number;
      targetAcquisition: number;
      color: number;
      id: number;
    }>
  ): UnitPlacement[] {
    return jsonUnits.map((unit) => ({
      id: `unit_${unit.id}`,
      typeId: unit.type,
      owner: unit.player,
      position: {
        x: unit.position[0] ?? 0,
        y: unit.position[1] ?? 0,
        z: unit.position[2] ?? 0,
      },
      rotation: unit.rotation,
      scale: {
        x: unit.scale[0] ?? 1,
        y: unit.scale[1] ?? 1,
        z: unit.scale[2] ?? 1,
      },
      health: unit.hitpoints === -1 ? 100 : unit.hitpoints,
      mana: unit.mana === -1 ? 100 : unit.mana,
      customProperties: {
        heroLevel: unit.hero.level,
        heroStrength: unit.hero.str,
        heroAgility: unit.hero.agi,
        heroIntelligence: unit.hero.int,
        goldAmount: unit.gold,
        targetAcquisition: unit.targetAcquisition,
      },
    }));
  }

  /**
   * Convert W3U units to generic UnitPlacement (custom parser fallback)
   */
  private convertUnits(w3uUnits: W3UUnit[]): UnitPlacement[] {
    return w3uUnits.map((unit) => ({
      id: `unit_${unit.creationNumber}`,
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
