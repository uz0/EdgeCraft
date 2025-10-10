/**
 * SC2 Terrain Parser
 * Parses StarCraft 2 terrain data including heightmap, textures, and water
 */

import { SC2Parser } from './SC2Parser';
import type { SC2TerrainData, SC2Texture } from './types';
import type { TerrainData } from '../types';

/**
 * SC2TerrainParser class
 * Parses terrain data from SC2Map files
 */
export class SC2TerrainParser {
  private parser: SC2Parser;

  constructor() {
    this.parser = new SC2Parser();
  }

  /**
   * Parse SC2 terrain data from buffer
   *
   * @param buffer - ArrayBuffer containing terrain data
   * @returns SC2TerrainData object
   */
  public parse(buffer: ArrayBuffer): SC2TerrainData {
    // Check if buffer contains XML
    if (this.parser.isValidXML(buffer)) {
      return this.parseXMLTerrain(buffer);
    }

    // For binary terrain data, return default for now
    // TODO: Implement binary terrain parsing when format is documented
    return this.createDefaultTerrain();
  }

  /**
   * Parse XML-based terrain data
   *
   * @param buffer - ArrayBuffer containing XML terrain data
   * @returns SC2TerrainData object
   */
  private parseXMLTerrain(buffer: ArrayBuffer): SC2TerrainData {
    const doc = this.parser.parseXML(buffer);

    // Extract terrain metadata
    const width = this.parser.getNumericContent(doc, 'Width', 256);
    const height = this.parser.getNumericContent(doc, 'Height', 256);
    const tileset = this.parser.getTextContentWithDefault(doc, 'Tileset', 'default');

    // Parse heightmap (stub - will be enhanced with actual parsing)
    const heightmap = this.createFlatHeightmap(width, height);

    // Parse textures
    const textures = this.parseTextures(doc);

    // Parse water (if present)
    const water = this.parseWater(doc);

    return {
      heightmap,
      tileset,
      textures,
      water,
    };
  }

  /**
   * Convert SC2TerrainData to common TerrainData format
   *
   * @param sc2Terrain - SC2-specific terrain data
   * @returns Common TerrainData format
   */
  public toCommonFormat(sc2Terrain: SC2TerrainData): TerrainData {
    const { width, height } = this.getDimensions(sc2Terrain.heightmap);

    // Flatten 2D heightmap to Float32Array
    const heightmap = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const row = sc2Terrain.heightmap[y];
        heightmap[y * width + x] = row ? (row[x] ?? 0) : 0;
      }
    }

    return {
      width,
      height,
      heightmap,
      textures: sc2Terrain.textures.map((t) => ({
        id: t.path,
        path: t.path,
        scale: { x: t.scale, y: t.scale },
      })),
      water: sc2Terrain.water
        ? {
            level: sc2Terrain.water.level,
            color: { r: 0, g: 100, b: 200, a: 180 },
          }
        : undefined,
    };
  }

  /**
   * Create default terrain when parsing fails
   *
   * @returns Default SC2TerrainData
   */
  private createDefaultTerrain(): SC2TerrainData {
    return {
      heightmap: this.createFlatHeightmap(256, 256),
      tileset: 'default',
      textures: [
        {
          path: '/assets/textures/grass.png',
          scale: 1.0,
        },
      ],
    };
  }

  /**
   * Create flat heightmap array
   *
   * @param width - Heightmap width
   * @param height - Heightmap height
   * @returns 2D heightmap array filled with zeros
   */
  private createFlatHeightmap(width: number, height: number): number[][] {
    return Array(height)
      .fill(0)
      .map(() => Array(width).fill(0) as number[]);
  }

  /**
   * Parse texture references from XML
   *
   * @param _doc - Parsed XML document (unused for now)
   * @returns Array of SC2Texture objects
   */
  private parseTextures(_doc: Document): SC2Texture[] {
    // TODO: Implement texture parsing when format is documented
    // For now, return default texture
    return [
      {
        path: '/assets/textures/grass.png',
        scale: 1.0,
      },
    ];
  }

  /**
   * Parse water data from XML
   *
   * @param doc - Parsed XML document
   * @returns Water data or undefined
   */
  private parseWater(doc: Document): SC2TerrainData['water'] | undefined {
    const waterLevel = this.parser.getNumericContent(doc, 'WaterLevel', -1);

    if (waterLevel !== -1 && waterLevel >= 0) {
      return {
        level: waterLevel,
        type: this.parser.getTextContentWithDefault(doc, 'WaterType', 'default'),
      };
    }

    return undefined;
  }

  /**
   * Get dimensions from heightmap
   *
   * @param heightmap - 2D heightmap array
   * @returns Width and height
   */
  private getDimensions(heightmap: number[][]): { width: number; height: number } {
    return {
      height: heightmap.length,
      width: heightmap[0]?.length ?? 0,
    };
  }
}
