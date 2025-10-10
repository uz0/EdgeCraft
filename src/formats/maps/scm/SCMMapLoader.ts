/**
 * SCM Map Loader - StarCraft 1 Map Loader
 * Parses SCM/SCX maps using MPQ parser and CHK parser
 */

import { MPQParser } from '../../mpq/MPQParser';
import { CHKParser } from './CHKParser';
import type { IMapLoader, RawMapData, MapInfo, TerrainData, UnitPlacement, PlayerInfo } from '../types';

/**
 * SCM/SCX Map Loader
 * Parses StarCraft 1 map files
 */
export class SCMMapLoader implements IMapLoader {
  /**
   * Parse SCM/SCX map file
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

    // Extract scenario.chk (inside staredit folder)
    const chkData = mpqParser.extractFile('staredit\\scenario.chk');

    if (!chkData) {
      throw new Error('staredit\\scenario.chk not found in archive');
    }

    // Parse CHK file
    const chkParser = new CHKParser(chkData.data);
    const chkMap = chkParser.parse();

    // Convert to RawMapData
    const mapInfo = this.convertMapInfo(chkMap);
    const terrainData = this.convertTerrain(chkMap);
    const units = this.convertUnits(chkMap);

    return {
      format: 'scm',
      info: mapInfo,
      terrain: terrainData,
      units,
      doodads: [], // StarCraft doesn't have doodads in the same way
    };
  }

  /**
   * Convert CHK map to generic MapInfo
   */
  private convertMapInfo(chk: ReturnType<CHKParser['parse']>): MapInfo {
    // Default 8 players for StarCraft
    const players: PlayerInfo[] = [];
    for (let i = 0; i < 8; i++) {
      players.push({
        id: i,
        name: `Player ${i + 1}`,
        type: 'human',
        race: 'terran',
        team: 0,
      });
    }

    const dimensions = chk.DIM || { width: 128, height: 128 };
    const tileset = chk.ERA?.tileset || 'Unknown';
    const scenarioName = chk.SPRP?.scenarioName || 'Untitled';
    const description = chk.SPRP?.description || '';

    return {
      name: scenarioName,
      author: 'Unknown',
      description,
      players,
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
        playableWidth: dimensions.width,
        playableHeight: dimensions.height,
      },
      environment: {
        tileset,
      },
    };
  }

  /**
   * Convert CHK terrain to generic TerrainData
   */
  private convertTerrain(chk: ReturnType<CHKParser['parse']>): TerrainData {
    const dimensions = chk.DIM || { width: 128, height: 128 };
    const tileMap = chk.MTXM || { tiles: new Uint16Array(0) };

    // Convert tile map to heightmap (StarCraft is 2D, so flat)
    const heightmap = tileMap
      ? CHKParser.toHeightmap(tileMap, dimensions)
      : new Float32Array(dimensions.width * dimensions.height);

    // Extract tile texture indices
    const textureIndices = new Uint8Array(tileMap.tiles.length);

    for (let i = 0; i < tileMap.tiles.length; i++) {
      // Extract texture index from tile ID (simplified)
      const tile = tileMap.tiles[i];
      textureIndices[i] = (tile !== undefined ? tile : 0) & 0xff;
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      heightmap,
      textures: [
        {
          id: chk.ERA?.tileset || 'default',
          blendMap: textureIndices,
        },
      ],
    };
  }

  /**
   * Convert CHK units to generic UnitPlacement
   */
  private convertUnits(chk: ReturnType<CHKParser['parse']>): UnitPlacement[] {
    if (!chk.UNIT) {
      return [];
    }

    return chk.UNIT.units.map((unit, index) => {
      // Convert pixel coordinates to tile coordinates
      // StarCraft uses 32 pixels per tile
      const tileX = unit.x / 32;
      const tileY = unit.y / 32;

      return {
        id: `unit_${unit.classInstance || index}`,
        typeId: this.getUnitTypeName(unit.unitId),
        owner: unit.owner,
        position: {
          x: tileX,
          y: tileY,
          z: 0, // StarCraft is 2D
        },
        rotation: 0, // StarCraft doesn't have unit rotation
        health: unit.hitPoints,
        customProperties: {
          shieldPoints: unit.shieldPoints,
          energy: unit.energy,
          resourceAmount: unit.resourceAmount,
          hangarCount: unit.hangarCount,
          stateFlags: unit.stateFlags,
        },
      };
    });
  }

  /**
   * Get unit type name from unit ID
   * This is a simplified mapping - full implementation would use a complete unit database
   */
  private getUnitTypeName(unitId: number): string {
    // StarCraft unit IDs (partial list)
    const unitNames: Record<number, string> = {
      0: 'Terran Marine',
      1: 'Terran Ghost',
      2: 'Terran Vulture',
      3: 'Terran Goliath',
      5: 'Terran Siege Tank',
      7: 'Terran SCV',
      8: 'Terran Wraith',
      9: 'Terran Science Vessel',
      11: 'Terran Dropship',
      12: 'Terran Battlecruiser',
      32: 'Terran Firebat',
      34: 'Terran Medic',
      37: 'Zerg Larva',
      38: 'Zerg Egg',
      39: 'Zerg Zergling',
      40: 'Zerg Hydralisk',
      41: 'Zerg Ultralisk',
      42: 'Zerg Broodling',
      43: 'Zerg Drone',
      44: 'Zerg Overlord',
      45: 'Zerg Mutalisk',
      46: 'Zerg Guardian',
      47: 'Zerg Queen',
      48: 'Zerg Defiler',
      49: 'Zerg Scourge',
      60: 'Protoss Zealot',
      61: 'Protoss Dragoon',
      62: 'Protoss High Templar',
      63: 'Protoss Archon',
      64: 'Protoss Probe',
      65: 'Protoss Scout',
      66: 'Protoss Arbiter',
      67: 'Protoss Carrier',
      69: 'Protoss Reaver',
      70: 'Protoss Observer',
      73: 'Protoss Corsair',
      83: 'Protoss Dark Templar',
      84: 'Zerg Devourer',
      85: 'Protoss Dark Archon',
      86: 'Zerg Lurker',
    };

    return unitNames[unitId] || `Unknown Unit (${unitId})`;
  }
}
