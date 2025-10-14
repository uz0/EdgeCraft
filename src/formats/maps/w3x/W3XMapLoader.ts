/**
 * W3X Map Loader - Warcraft 3 Map Loader
 * Orchestrates parsing of W3X/W3M maps using MPQ parser
 */

import { MPQParser } from '../../mpq/MPQParser';
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
   * Parse W3X/W3M map file
   * @param file - Map file or ArrayBuffer
   * @returns Raw map data
   */
  public async parse(file: File | ArrayBuffer): Promise<RawMapData> {
    // Convert File to ArrayBuffer if needed
    let buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

    // Check for HM3W header (Warcraft 3: Reforged format)
    const view = new DataView(buffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    console.log(
      `[W3XMapLoader] File size: ${buffer.byteLength}, magic: "${magic}" (0x${view.getUint32(0, false).toString(16)})`
    );

    if (magic === 'HM3W') {
      console.log('[W3XMapLoader] HM3W format detected, skipping 512-byte header');
      // HM3W format: 512-byte header followed by MPQ data
      // Skip the header and parse the MPQ archive from offset 512
      buffer = buffer.slice(512);

      // Check MPQ magic after header
      const mpqView = new DataView(buffer);
      const mpqMagic = String.fromCharCode(
        mpqView.getUint8(0),
        mpqView.getUint8(1),
        mpqView.getUint8(2),
        mpqView.getUint8(3)
      );
      console.log(
        `[W3XMapLoader] MPQ magic after header: "${mpqMagic}" (0x${mpqView.getUint32(0, true).toString(16)})`
      );
    } else {
      console.log('[W3XMapLoader] No HM3W header, assuming direct MPQ format');
    }

    // Parse MPQ archive
    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success || !mpqResult.archive) {
      throw new Error(`Failed to parse MPQ archive: ${mpqResult.error}`);
    }

    // Try to extract the file list first to see what's in the archive
    const listFile = await mpqParser.extractFile('(listfile)');
    if (listFile) {
      const fileList = new TextDecoder().decode(listFile.data);
      console.log('[W3XMapLoader] Files in archive:', fileList.split('\n').slice(0, 10));
    } else {
      console.log('[W3XMapLoader] No (listfile) found, trying direct extraction');
    }

    // Extract war3map files - try both with and without backslashes
    console.log('[W3XMapLoader] Extracting war3map.w3i...');
    let w3iData = await mpqParser.extractFile('war3map.w3i');
    if (!w3iData) {
      console.log('[W3XMapLoader] Trying War3Map.w3i...');
      w3iData = await mpqParser.extractFile('War3Map.w3i'); // Try capitalized
    }

    if (w3iData) {
      console.log(`[W3XMapLoader] Got w3i data: ${w3iData.data.byteLength} bytes`);
    }

    console.log('[W3XMapLoader] Extracting war3map.w3e...');
    let w3eData = await mpqParser.extractFile('war3map.w3e');
    if (!w3eData) {
      console.log('[W3XMapLoader] Trying War3Map.w3e...');
      w3eData = await mpqParser.extractFile('War3Map.w3e');
    }

    if (w3eData) {
      console.log(`[W3XMapLoader] Got w3e data: ${w3eData.data.byteLength} bytes`);
    }

    const dooData = await mpqParser.extractFile('war3map.doo');
    const unitsData = await mpqParser.extractFile('war3mapUnits.doo');

    if (!w3iData) {
      throw new Error('war3map.w3i not found in archive');
    }

    if (!w3eData) {
      throw new Error('war3map.w3e not found in archive');
    }

    // Parse map info
    console.log(`[W3XMapLoader] Parsing war3map.w3i (${w3iData.data.byteLength} bytes)...`);
    let w3iInfo;
    try {
      const w3iParser = new W3IParser(w3iData.data);
      w3iInfo = w3iParser.parse();
      console.log(`[W3XMapLoader] Successfully parsed map info`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse war3map.w3i: ${errorMsg}`);
    }

    // Parse terrain
    console.log(`[W3XMapLoader] Parsing war3map.w3e (${w3eData.data.byteLength} bytes)...`);
    let w3eTerrain;
    try {
      const w3eParser = new W3EParser(w3eData.data);
      // Pass map dimensions from W3I to W3E parser for accurate terrain layout
      w3eTerrain = w3eParser.parse(w3iInfo.playableWidth, w3iInfo.playableHeight);
      console.log(
        `[W3XMapLoader] Successfully parsed terrain: ${w3eTerrain.width}x${w3eTerrain.height} (${w3eTerrain.groundTiles.length} tiles)`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse war3map.w3e: ${errorMsg}`);
    }

    // Parse doodads (optional)
    let doodads: DoodadPlacement[] = [];
    if (dooData) {
      try {
        console.log(`[W3XMapLoader] Parsing war3map.doo (${dooData.data.byteLength} bytes)...`);
        const w3dParser = new W3DParser(dooData.data);
        const w3oDoodads = w3dParser.parse();
        doodads = this.convertDoodads(w3oDoodads.doodads);
        console.log(`[W3XMapLoader] Successfully parsed ${doodads.length} doodads`);
      } catch (err) {
        console.error(`[W3XMapLoader] Failed to parse war3map.doo:`, err);
        // Continue without doodads
      }
    }

    // Parse units (optional)
    let units: UnitPlacement[] = [];
    if (unitsData) {
      try {
        console.log(
          `[W3XMapLoader] Parsing war3mapUnits.doo (${unitsData.data.byteLength} bytes)...`
        );
        const w3uParser = new W3UParser(unitsData.data);
        const w3uUnits = w3uParser.parse();
        units = this.convertUnits(w3uUnits.units);
        console.log(`[W3XMapLoader] Successfully parsed ${units.length} units`);
      } catch (err) {
        console.error(`[W3XMapLoader] Failed to parse war3mapUnits.doo:`, err);
        // Continue without units
      }
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

    // Map groundTextureIds to terrain textures (multi-texture splatmap)
    // Each tile in textureIndices (0-N) maps to groundTextureIds[index]
    const groundTextureIds = w3e.groundTextureIds ?? [];

    // DEBUG: Analyze texture index distribution
    const textureIndexCounts = new Map<number, number>();
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    for (let i = 0; i < textureIndices.length; i++) {
      const idx = textureIndices[i] ?? 0;
      textureIndexCounts.set(idx, (textureIndexCounts.get(idx) ?? 0) + 1);
      minIndex = Math.min(minIndex, idx);
      maxIndex = Math.max(maxIndex, idx);
    }

    console.log(
      `[W3XMapLoader] 🔍 TERRAIN DEBUG - Tileset: ${w3e.tileset}, ` +
        `groundTextureIds: [${groundTextureIds.join(', ')}], ` +
        `tile count: ${w3e.width}x${w3e.height}=${w3e.width * w3e.height}`
    );
    console.log(
      `[W3XMapLoader] 🔍 Texture index range: min=${minIndex}, max=${maxIndex}, ` +
        `unique indices used: ${textureIndexCounts.size}`
    );
    console.log(
      `[W3XMapLoader] 🔍 Texture index distribution:`,
      Array.from(textureIndexCounts.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([idx, count]) => `  idx${idx}=${count} tiles (${((count / textureIndices.length) * 100).toFixed(1)}%)`)
        .join('\n')
    );

    // Validate that all indices are within bounds
    if (maxIndex >= groundTextureIds.length) {
      console.error(
        `[W3XMapLoader] ❌ ERROR: Texture index ${maxIndex} exceeds groundTextureIds length ${groundTextureIds.length}!`
      );
    }

    // Create texture array from groundTextureIds
    // All textures share the same blendMap (textureIndices array indicates which texture per tile)
    const textures = groundTextureIds.map((textureId) => ({
      id: textureId,
      blendMap: textureIndices, // Shared: each value is index into groundTextureIds
    }));

    // Fallback to single tileset letter if no groundTextureIds (shouldn't happen in modern maps)
    if (textures.length === 0) {
      console.warn(
        `[W3XMapLoader] No groundTextureIds found, falling back to tileset letter: ${w3e.tileset}`
      );
      textures.push({
        id: w3e.tileset,
        blendMap: textureIndices,
      });
    }

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
