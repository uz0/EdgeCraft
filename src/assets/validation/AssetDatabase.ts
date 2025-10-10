/**
 * Asset Database - Maps copyrighted assets to legal replacements
 *
 * Maintains database of known copyrighted assets and their legal alternatives
 * Supports querying by hash, type, category, and tags
 */

export type GameSource = 'wc3' | 'sc1' | 'sc2' | 'unknown';
export type LicenseType = 'CC0' | 'MIT' | 'Apache-2.0' | 'BSD-3-Clause';
export type AssetType = 'texture' | 'model' | 'sound' | 'animation' | 'sprite' | 'data';

/**
 * Original copyrighted asset information
 */
export interface OriginalAsset {
  hash: string;
  name: string;
  game: GameSource;
  category?: string;
  tags?: string[];
}

/**
 * Legal replacement asset information
 */
export interface ReplacementAsset {
  path: string;
  license: LicenseType;
  source: string;
  author?: string;
  visualSimilarity?: number; // 0.0 to 1.0
  notes?: string;
}

/**
 * Asset mapping entry
 */
export interface AssetMapping {
  id: string;
  type: AssetType;
  original: OriginalAsset;
  replacement: ReplacementAsset;
  verified: boolean;
  dateAdded: string;
}

/**
 * Search criteria for finding replacements
 */
export interface SearchCriteria {
  type?: AssetType;
  category?: string;
  tags?: string[];
  game?: GameSource;
  minSimilarity?: number;
}

/**
 * Asset database for managing copyrighted → legal mappings
 *
 * @example
 * ```typescript
 * const db = new AssetDatabase();
 * const replacement = await db.findReplacementByHash(assetHash);
 * if (replacement) {
 *   console.log(`Use: ${replacement.replacement.path}`);
 * }
 * ```
 */
export class AssetDatabase {
  private mappings: Map<string, AssetMapping>;
  private categoryIndex: Map<string, Set<string>>;
  private typeIndex: Map<AssetType, Set<string>>;
  private gameIndex: Map<GameSource, Set<string>>;

  constructor() {
    this.mappings = new Map();
    this.categoryIndex = new Map();
    this.typeIndex = new Map();
    this.gameIndex = new Map();

    // Initialize with default mappings
    this.loadDefaultMappings();
  }

  /**
   * Find replacement by original asset hash
   */
  public findReplacementByHash(hash: string): AssetMapping | undefined {
    return Array.from(this.mappings.values()).find(
      mapping => mapping.original.hash === hash
    );
  }

  /**
   * Find replacement by original asset name
   */
  public findReplacementByName(name: string): AssetMapping | undefined {
    return Array.from(this.mappings.values()).find(
      mapping => mapping.original.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Search for replacement using criteria
   */
  public async findReplacement(criteria: SearchCriteria): Promise<ReplacementAsset | null> {
    const candidates = this.searchMappings(criteria);

    if (candidates.length === 0) {
      return null;
    }

    // Sort by visual similarity if available
    const sorted = candidates.sort((a, b) => {
      const simA = a.replacement.visualSimilarity ?? 0;
      const simB = b.replacement.visualSimilarity ?? 0;
      return simB - simA;
    });

    // Return best match
    return sorted[0]?.replacement ?? null;
  }

  /**
   * Search mappings by criteria
   */
  public searchMappings(criteria: SearchCriteria): AssetMapping[] {
    let candidates = Array.from(this.mappings.values());

    // Filter by type
    if (criteria.type !== undefined) {
      candidates = candidates.filter(m => m.type === criteria.type);
    }

    // Filter by category
    if (criteria.category !== undefined) {
      candidates = candidates.filter(
        m => m.original.category?.toLowerCase() === criteria.category?.toLowerCase()
      );
    }

    // Filter by game
    if (criteria.game !== undefined) {
      candidates = candidates.filter(m => m.original.game === criteria.game);
    }

    // Filter by tags (any tag matches)
    if (criteria.tags !== undefined && criteria.tags.length > 0) {
      candidates = candidates.filter(m =>
        m.original.tags?.some(tag =>
          criteria.tags?.some(searchTag =>
            tag.toLowerCase().includes(searchTag.toLowerCase())
          )
        )
      );
    }

    // Filter by minimum similarity
    if (criteria.minSimilarity !== undefined) {
      candidates = candidates.filter(
        m => (m.replacement.visualSimilarity ?? 0) >= criteria.minSimilarity
      );
    }

    return candidates;
  }

  /**
   * Add new mapping to database
   */
  public addMapping(mapping: AssetMapping): void {
    this.mappings.set(mapping.id, mapping);
    this.updateIndices(mapping);
  }

  /**
   * Remove mapping from database
   */
  public removeMapping(id: string): boolean {
    const mapping = this.mappings.get(id);
    if (mapping === undefined) {
      return false;
    }

    this.mappings.delete(id);
    this.removeFromIndices(mapping);
    return true;
  }

  /**
   * Get all mappings
   */
  public getAllMappings(): AssetMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    totalMappings: number;
    byType: Record<string, number>;
    byGame: Record<string, number>;
    verified: number;
  } {
    const mappings = this.getAllMappings();

    const byType: Record<string, number> = {};
    const byGame: Record<string, number> = {};
    let verified = 0;

    for (const mapping of mappings) {
      // Count by type
      byType[mapping.type] = (byType[mapping.type] ?? 0) + 1;

      // Count by game
      byGame[mapping.original.game] = (byGame[mapping.original.game] ?? 0) + 1;

      // Count verified
      if (mapping.verified) {
        verified++;
      }
    }

    return {
      totalMappings: mappings.length,
      byType,
      byGame,
      verified
    };
  }

  /**
   * Update indices for fast lookup
   */
  private updateIndices(mapping: AssetMapping): void {
    // Update category index
    if (mapping.original.category !== undefined) {
      const categorySet = this.categoryIndex.get(mapping.original.category) ?? new Set();
      categorySet.add(mapping.id);
      this.categoryIndex.set(mapping.original.category, categorySet);
    }

    // Update type index
    const typeSet = this.typeIndex.get(mapping.type) ?? new Set();
    typeSet.add(mapping.id);
    this.typeIndex.set(mapping.type, typeSet);

    // Update game index
    const gameSet = this.gameIndex.get(mapping.original.game) ?? new Set();
    gameSet.add(mapping.id);
    this.gameIndex.set(mapping.original.game, gameSet);
  }

  /**
   * Remove from indices
   */
  private removeFromIndices(mapping: AssetMapping): void {
    // Remove from category index
    if (mapping.original.category !== undefined) {
      const categorySet = this.categoryIndex.get(mapping.original.category);
      categorySet?.delete(mapping.id);
    }

    // Remove from type index
    const typeSet = this.typeIndex.get(mapping.type);
    typeSet?.delete(mapping.id);

    // Remove from game index
    const gameSet = this.gameIndex.get(mapping.original.game);
    gameSet?.delete(mapping.id);
  }

  /**
   * Load default asset mappings
   * In production, this would load from a JSON file or database
   */
  private loadDefaultMappings(): void {
    const defaultMappings: AssetMapping[] = [
      // Warcraft 3 Units
      {
        id: 'wc3-footman-001',
        type: 'model',
        original: {
          hash: 'a1b2c3d4e5f6',
          name: 'Footman',
          game: 'wc3',
          category: 'unit',
          tags: ['infantry', 'human', 'melee']
        },
        replacement: {
          path: 'assets/models/units/knight_basic.gltf',
          license: 'CC0',
          source: 'https://opengameart.org',
          author: 'Community',
          visualSimilarity: 0.65,
          notes: 'Generic medieval infantry'
        },
        verified: true,
        dateAdded: '2025-01-01'
      },
      {
        id: 'wc3-peasant-001',
        type: 'model',
        original: {
          hash: 'b2c3d4e5f6g7',
          name: 'Peasant',
          game: 'wc3',
          category: 'unit',
          tags: ['worker', 'human', 'civilian']
        },
        replacement: {
          path: 'assets/models/units/worker_basic.gltf',
          license: 'CC0',
          source: 'https://opengameart.org',
          author: 'Community',
          visualSimilarity: 0.70,
          notes: 'Generic worker unit'
        },
        verified: true,
        dateAdded: '2025-01-01'
      },
      // Warcraft 3 Buildings
      {
        id: 'wc3-townhall-001',
        type: 'model',
        original: {
          hash: 'c3d4e5f6g7h8',
          name: 'Town Hall',
          game: 'wc3',
          category: 'building',
          tags: ['structure', 'human', 'main']
        },
        replacement: {
          path: 'assets/models/buildings/base_main.gltf',
          license: 'CC0',
          source: 'https://opengameart.org',
          author: 'Community',
          visualSimilarity: 0.60,
          notes: 'Generic main base structure'
        },
        verified: true,
        dateAdded: '2025-01-01'
      },
      // Textures
      {
        id: 'wc3-grass-001',
        type: 'texture',
        original: {
          hash: 'd4e5f6g7h8i9',
          name: 'Grass Texture',
          game: 'wc3',
          category: 'terrain',
          tags: ['ground', 'grass', 'natural']
        },
        replacement: {
          path: 'assets/textures/terrain/grass_01.png',
          license: 'CC0',
          source: 'https://polyhaven.com',
          author: 'Poly Haven',
          visualSimilarity: 0.85,
          notes: 'CC0 grass texture'
        },
        verified: true,
        dateAdded: '2025-01-01'
      },
      // StarCraft Units
      {
        id: 'sc1-marine-001',
        type: 'model',
        original: {
          hash: 'e5f6g7h8i9j0',
          name: 'Marine',
          game: 'sc1',
          category: 'unit',
          tags: ['infantry', 'terran', 'ranged']
        },
        replacement: {
          path: 'assets/models/units/trooper_basic.gltf',
          license: 'CC0',
          source: 'https://opengameart.org',
          author: 'Community',
          visualSimilarity: 0.55,
          notes: 'Generic sci-fi trooper'
        },
        verified: true,
        dateAdded: '2025-01-01'
      }
    ];

    for (const mapping of defaultMappings) {
      this.addMapping(mapping);
    }
  }
}
