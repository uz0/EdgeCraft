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
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

    // Parse MPQ archive
    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success || !mpqResult.archive) {
      throw new Error(`Failed to parse MPQ archive: ${mpqResult.error}`);
    }

    // Debug: List all files in archive
    const allFiles = mpqParser.listFiles();
    console.log(`[W3XMapLoader] Files in archive (${allFiles.length} total):`, allFiles.slice(0, 20));

    // Extract war3map files
    const w3iData = await mpqParser.extractFile('war3map.w3i');
    const w3eData = await mpqParser.extractFile('war3map.w3e');
    const dooData = await mpqParser.extractFile('war3map.doo');
    const unitsData = await mpqParser.extractFile('war3mapUnits.doo');

    if (!w3iData) {
      throw new Error('war3map.w3i not found in archive');
    }

    if (!w3eData) {
      throw new Error('war3map.w3e not found in archive');
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

    return {
      width: w3e.width,
      height: w3e.height,
      heightmap,
      textures: [
        {
          id: w3e.tileset,
          blendMap: textureIndices,
        },
      ],
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
