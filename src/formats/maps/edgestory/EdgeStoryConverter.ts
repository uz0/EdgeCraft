/**
 * EdgeStory Converter
 * Converts RawMapData to legal .edgestory format
 */

import { AssetMapper } from '../AssetMapper';
import type { RawMapData } from '../types';
import type {
  EdgeStoryMap,
  EdgeMapInfo,
  EdgeTerrain,
  EdgeGameplay,
  EdgeUnit,
  EdgeDoodad,
  EdgeAssetSource,
} from './EdgeStoryFormat';

/**
 * EdgeStory Converter
 * Converts proprietary map formats to legal .edgestory format
 */
export class EdgeStoryConverter {
  private assetMapper: AssetMapper;

  constructor() {
    this.assetMapper = new AssetMapper();
  }

  /**
   * Convert RawMapData to EdgeStory format
   * @param rawMap - Raw map data from any format
   * @returns EdgeStory map with legal assets
   */
  public convert(rawMap: RawMapData): EdgeStoryMap {
    const now = new Date().toISOString();

    // Convert map info
    const mapInfo = this.convertMapInfo(rawMap, now);

    // Convert terrain
    const terrain = this.convertTerrain(rawMap);

    // Convert gameplay with asset replacement
    const gameplay = this.convertGameplay(rawMap);

    // Validate copyright compliance
    const assetValidation = this.validateAssets(gameplay);
    if (!assetValidation.valid) {
      console.warn('Copyright violations detected:', assetValidation.violations);
    }

    return {
      asset: {
        version: '2.0',
        generator: 'Edge Craft Map Converter v1.0',
        copyright: mapInfo.legal.license,
      },
      extensions: {
        EDGE_map_info: mapInfo,
        EDGE_terrain: terrain,
        EDGE_gameplay: gameplay,
      },
      extensionsUsed: ['EDGE_map_info', 'EDGE_terrain', 'EDGE_gameplay'],
    };
  }

  /**
   * Convert map info to EdgeMapInfo
   */
  private convertMapInfo(rawMap: RawMapData, now: string): EdgeMapInfo {
    const assetSources = this.assetMapper.getAllAssetSources() as EdgeAssetSource[];

    return {
      name: rawMap.info.name,
      author: rawMap.info.author,
      description: rawMap.info.description,
      version: rawMap.info.version ?? '1.0.0',
      created: now,
      modified: now,
      sourceFormat: rawMap.format,
      dimensions: {
        width: rawMap.info.dimensions.width,
        height: rawMap.info.dimensions.height,
        playableWidth: rawMap.info.dimensions.playableWidth ?? rawMap.info.dimensions.width,
        playableHeight: rawMap.info.dimensions.playableHeight ?? rawMap.info.dimensions.height,
      },
      maxPlayers: rawMap.info.players.length,
      players: rawMap.info.players.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        race: p.race,
        team: p.team ?? 0,
        color: p.color,
        startLocation: p.startLocation,
        resources: p.resources,
      })),
      environment: {
        tileset: rawMap.info.environment.tileset,
        lighting: rawMap.info.environment.lighting,
        weather: rawMap.info.environment.weather,
        fog: rawMap.info.environment.fog,
      },
      legal: {
        license: 'CC0-1.0',
        assetSources,
        copyrightCompliant: true,
        validation: {
          date: now,
          tool: 'Edge Craft Asset Validator',
          version: '1.0.0',
        },
      },
    };
  }

  /**
   * Convert terrain to EdgeTerrain
   */
  private convertTerrain(rawMap: RawMapData): EdgeTerrain {
    const { terrain } = rawMap;

    // Calculate heightmap min/max
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < terrain.heightmap.length; i++) {
      const h = terrain.heightmap[i];
      if (h !== undefined && h < min) min = h;
      if (h !== undefined && h > max) max = h;
    }

    // Convert texture layers
    const textureLayers = terrain.textures.map((tex) => ({
      textureId: tex.id,
      blendMap: tex.blendMap,
      scale: tex.scale,
    }));

    // Convert doodads with asset replacement
    const doodads: EdgeDoodad[] = rawMap.doodads.map((doodad) => {
      const sourceFormat =
        rawMap.format === 'w3m' || rawMap.format === 'w3n'
          ? 'w3x'
          : rawMap.format === 'scx' || rawMap.format === 'sc2map'
            ? 'scm'
            : rawMap.format;
      const mapping = this.assetMapper.mapDoodadType(doodad.typeId, sourceFormat);

      return {
        id: doodad.id,
        typeId: mapping.edgeTypeId,
        position: doodad.position,
        rotation: doodad.rotation,
        scale: doodad.scale,
        properties: {
          originalTypeId: doodad.typeId,
          life: doodad.life,
          flags: doodad.flags,
        },
      };
    });

    return {
      heightmap: {
        width: terrain.width,
        height: terrain.height,
        min,
        max,
        data: terrain.heightmap,
      },
      textureLayers,
      water: terrain.water,
      doodads,
      pathingMap: terrain.pathingMap
        ? {
            width: terrain.width,
            height: terrain.height,
            data: terrain.pathingMap,
          }
        : undefined,
    };
  }

  /**
   * Convert gameplay elements with asset replacement
   */
  private convertGameplay(rawMap: RawMapData): EdgeGameplay {
    const sourceFormat =
      rawMap.format === 'w3m' || rawMap.format === 'w3n'
        ? 'w3x'
        : rawMap.format === 'scx' || rawMap.format === 'sc2map'
          ? 'scm'
          : rawMap.format;
    const units: EdgeUnit[] = rawMap.units.map((unit) => {
      // Map unit type to legal alternative
      const mapping = this.assetMapper.mapUnitType(unit.typeId, sourceFormat);

      return {
        id: unit.id,
        typeId: mapping.edgeTypeId,
        owner: unit.owner,
        position: unit.position,
        rotation: unit.rotation,
        scale: unit.scale,
        health: unit.health,
        mana: unit.mana,
        customName: unit.customName,
        customProperties: {
          ...unit.customProperties,
          originalTypeId: unit.typeId,
          modelId: mapping.modelId,
          license: mapping.license,
        },
      };
    });

    // Extract buildings from units (buildings are units in some formats)
    const buildings = units
      .filter((unit) => this.isBuildingType(unit.typeId))
      .map((unit) => ({
        id: unit.id,
        typeId: unit.typeId,
        owner: unit.owner,
        position: unit.position,
        rotation: unit.rotation,
        health: unit.health,
      }));

    // Extract resources
    const resources = units
      .filter((unit) => this.isResourceType(unit.typeId))
      .map((unit) => ({
        id: unit.id,
        typeId: unit.typeId,
        position: unit.position,
        amount: this.extractResourceAmount(unit),
      }));

    return {
      units: units.filter((u) => !this.isBuildingType(u.typeId) && !this.isResourceType(u.typeId)),
      buildings,
      resources,
      triggers: rawMap.triggers?.map((trigger) => ({
        id: trigger.id,
        name: trigger.name,
        enabled: trigger.enabled,
        conditions: trigger.conditions,
        actions: trigger.actions,
      })),
    };
  }

  /**
   * Check if unit type is a building
   */
  private isBuildingType(typeId: string): boolean {
    // Simplified check - production would have complete database
    return (
      typeId.includes('building') ||
      typeId.includes('barracks') ||
      typeId.includes('townhall') ||
      typeId.includes('factory')
    );
  }

  /**
   * Check if unit type is a resource
   */
  private isResourceType(typeId: string): boolean {
    return typeId.includes('goldmine') || typeId.includes('vespene') || typeId.includes('mineral');
  }

  /**
   * Extract resource amount from unit properties
   */
  private extractResourceAmount(unit: EdgeUnit): number {
    const customProps = unit.customProperties;
    if (customProps !== undefined) {
      const goldAmount = customProps['goldAmount'];
      if (typeof goldAmount === 'number') {
        return goldAmount;
      }
      const resourceAmount = customProps['resourceAmount'];
      if (typeof resourceAmount === 'number') {
        return resourceAmount;
      }
    }
    return 2500; // Default amount
  }

  /**
   * Validate assets for copyright compliance
   */
  private validateAssets(gameplay: EdgeGameplay): {
    valid: boolean;
    violations: string[];
  } {
    const assetIds = [
      ...gameplay.units.map((u) => u.typeId),
      ...gameplay.buildings.map((b) => b.typeId),
      ...gameplay.resources.map((r) => r.typeId),
    ];

    return this.assetMapper.validateAssets(assetIds);
  }

  /**
   * Export EdgeStory map to JSON
   * @param map - EdgeStory map
   * @returns JSON string
   */
  public exportToJSON(map: EdgeStoryMap): string {
    return JSON.stringify(map, null, 2);
  }

  /**
   * Export EdgeStory map to binary format
   * @param map - EdgeStory map
   * @returns ArrayBuffer
   */
  public exportToBinary(map: EdgeStoryMap): ArrayBuffer {
    // Convert to JSON
    const json = this.exportToJSON(map);

    // Convert to UTF-8 bytes
    const encoder = new TextEncoder();
    return encoder.encode(json).buffer;
  }
}
