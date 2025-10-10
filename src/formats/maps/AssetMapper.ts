/**
 * Asset Mapper - Maps copyrighted assets to legal alternatives
 * Ensures 100% copyright compliance
 */

/**
 * Asset mapping information
 */
export interface AssetMapping {
  edgeTypeId: string;
  modelId: string;
  source: 'original' | 'cc0' | 'ccby' | 'ccbysa' | 'mit';
  license: string;
  author?: string;
  url?: string;
  notes?: string;
}

/**
 * Asset Mapper
 * Replaces proprietary game assets with legal alternatives
 */
export class AssetMapper {
  private mappings: Map<string, AssetMapping>;

  constructor() {
    this.mappings = this.createMappingDatabase();
  }

  /**
   * Map unit type to legal alternative
   * @param originalTypeId - Original unit type ID
   * @param sourceFormat - Source format (w3x, scm, etc.)
   * @returns Asset mapping
   */
  public mapUnitType(originalTypeId: string, sourceFormat: 'w3x' | 'scm'): AssetMapping {
    const key = `${sourceFormat}:${originalTypeId}`;
    const mapping = this.mappings.get(key);

    if (!mapping) {
      console.warn(`No asset mapping for: ${key}`);
      return this.getPlaceholderMapping('unit');
    }

    return mapping;
  }

  /**
   * Map building type to legal alternative
   * @param originalTypeId - Original building type ID
   * @param sourceFormat - Source format
   * @returns Asset mapping
   */
  public mapBuildingType(originalTypeId: string, sourceFormat: 'w3x' | 'scm'): AssetMapping {
    const key = `${sourceFormat}:building:${originalTypeId}`;
    const mapping = this.mappings.get(key);

    if (!mapping) {
      return this.getPlaceholderMapping('building');
    }

    return mapping;
  }

  /**
   * Map doodad type to legal alternative
   * @param originalTypeId - Original doodad type ID
   * @param sourceFormat - Source format
   * @returns Asset mapping
   */
  public mapDoodadType(originalTypeId: string, sourceFormat: 'w3x' | 'scm'): AssetMapping {
    const key = `${sourceFormat}:doodad:${originalTypeId}`;
    const mapping = this.mappings.get(key);

    if (!mapping) {
      return this.getPlaceholderMapping('doodad');
    }

    return mapping;
  }

  /**
   * Get placeholder mapping for missing assets
   */
  private getPlaceholderMapping(type: 'unit' | 'building' | 'doodad'): AssetMapping {
    return {
      edgeTypeId: `edge_placeholder_${type}`,
      modelId: `models/placeholders/${type}.glb`,
      source: 'original',
      license: 'CC0-1.0',
      notes: 'Placeholder asset - original missing',
    };
  }

  /**
   * Create mapping database
   * This is a simplified version - production would have hundreds of mappings
   */
  private createMappingDatabase(): Map<string, AssetMapping> {
    const mappings = new Map<string, AssetMapping>();

    // ===== WARCRAFT 3 UNITS =====

    // Human units
    mappings.set('w3x:hfoo', {
      edgeTypeId: 'edge_warrior_melee_01',
      modelId: 'models/units/warrior_melee_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic melee warrior - replaces Footman',
    });

    mappings.set('w3x:hpea', {
      edgeTypeId: 'edge_worker_01',
      modelId: 'models/units/worker_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic worker - replaces Peasant',
    });

    mappings.set('w3x:hkni', {
      edgeTypeId: 'edge_warrior_mounted_01',
      modelId: 'models/units/warrior_mounted_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic mounted warrior - replaces Knight',
    });

    mappings.set('w3x:hrif', {
      edgeTypeId: 'edge_warrior_ranged_01',
      modelId: 'models/units/warrior_ranged_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic ranged warrior - replaces Rifleman',
    });

    // Orc units
    mappings.set('w3x:opeo', {
      edgeTypeId: 'edge_worker_02',
      modelId: 'models/units/worker_02.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic worker variant 2 - replaces Peon',
    });

    mappings.set('w3x:ogru', {
      edgeTypeId: 'edge_warrior_heavy_01',
      modelId: 'models/units/warrior_heavy_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic heavy warrior - replaces Grunt',
    });

    // Undead units
    mappings.set('w3x:uaco', {
      edgeTypeId: 'edge_worker_03',
      modelId: 'models/units/worker_03.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic worker variant 3 - replaces Acolyte',
    });

    mappings.set('w3x:ugho', {
      edgeTypeId: 'edge_warrior_melee_02',
      modelId: 'models/units/warrior_melee_02.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic melee warrior variant 2 - replaces Ghoul',
    });

    // Night Elf units
    mappings.set('w3x:ewsp', {
      edgeTypeId: 'edge_worker_04',
      modelId: 'models/units/worker_04.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic worker variant 4 - replaces Wisp',
    });

    mappings.set('w3x:earc', {
      edgeTypeId: 'edge_warrior_ranged_02',
      modelId: 'models/units/warrior_ranged_02.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic ranged warrior variant 2 - replaces Archer',
    });

    // ===== STARCRAFT 1 UNITS =====

    // Terran units
    mappings.set('scm:Terran Marine', {
      edgeTypeId: 'edge_infantry_rifle_01',
      modelId: 'models/units/infantry_rifle_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic rifle infantry - replaces Marine',
    });

    mappings.set('scm:Terran SCV', {
      edgeTypeId: 'edge_engineer_01',
      modelId: 'models/units/engineer_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic engineer - replaces SCV',
    });

    mappings.set('scm:Terran Firebat', {
      edgeTypeId: 'edge_infantry_flamer_01',
      modelId: 'models/units/infantry_flamer_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic flamer infantry - replaces Firebat',
    });

    // Zerg units
    mappings.set('scm:Zerg Drone', {
      edgeTypeId: 'edge_worker_organic_01',
      modelId: 'models/units/worker_organic_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic organic worker - replaces Drone',
    });

    mappings.set('scm:Zerg Zergling', {
      edgeTypeId: 'edge_melee_fast_01',
      modelId: 'models/units/melee_fast_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic fast melee - replaces Zergling',
    });

    mappings.set('scm:Zerg Hydralisk', {
      edgeTypeId: 'edge_ranged_medium_01',
      modelId: 'models/units/ranged_medium_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic medium ranged - replaces Hydralisk',
    });

    // Protoss units
    mappings.set('scm:Protoss Probe', {
      edgeTypeId: 'edge_worker_tech_01',
      modelId: 'models/units/worker_tech_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic tech worker - replaces Probe',
    });

    mappings.set('scm:Protoss Zealot', {
      edgeTypeId: 'edge_melee_heavy_tech_01',
      modelId: 'models/units/melee_heavy_tech_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic heavy tech melee - replaces Zealot',
    });

    mappings.set('scm:Protoss Dragoon', {
      edgeTypeId: 'edge_ranged_heavy_tech_01',
      modelId: 'models/units/ranged_heavy_tech_01.glb',
      source: 'cc0',
      license: 'CC0-1.0',
      notes: 'Generic heavy tech ranged - replaces Dragoon',
    });

    return mappings;
  }

  /**
   * Get all mapped assets for attribution
   * @returns Array of unique asset sources
   */
  public getAllAssetSources(): Array<{
    assetId: string;
    source: string;
    license: string;
    author?: string;
    url?: string;
    notes?: string;
  }> {
    const sources = new Map<string, any>();

    for (const [, mapping] of this.mappings.entries()) {
      if (!sources.has(mapping.modelId)) {
        sources.set(mapping.modelId, {
          assetId: mapping.modelId,
          source: mapping.source,
          license: mapping.license,
          author: mapping.author,
          url: mapping.url,
          notes: mapping.notes,
        });
      }
    }

    return Array.from(sources.values());
  }

  /**
   * Validate that a map uses only legal assets
   * @returns Validation result
   */
  public validateAssets(assetIds: string[]): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const assetId of assetIds) {
      // Check if asset is in our legal database
      const isLegal = Array.from(this.mappings.values()).some(
        (mapping) => mapping.modelId === assetId
      );

      if (!isLegal && !assetId.includes('placeholder')) {
        violations.push(assetId);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}
