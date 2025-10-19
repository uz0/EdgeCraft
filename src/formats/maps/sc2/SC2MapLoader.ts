/**
 * SC2Map Loader - StarCraft 2 Map Loader
 * Orchestrates parsing of SC2Map files using MPQ parser
 *
 * Reference: https://www.sc2mapster.com/forums/development/miscellaneous-development/169244-format-of-sc2map
 * Pattern: Follow W3XMapLoader.ts structure
 */

import { MPQParser } from '../../mpq/MPQParser';
import type { MPQFile } from '../../mpq/types';
import { SC2Parser } from './SC2Parser';
import { SC2TerrainParser } from './SC2TerrainParser';
import { SC2UnitsParser } from './SC2UnitsParser';
import type {
  IMapLoader,
  RawMapData,
  MapInfo,
  PlayerInfo,
  TerrainData,
  UnitPlacement,
  DoodadPlacement,
} from '../types';

/**
 * SC2MapLoader class
 * Implements IMapLoader for StarCraft 2 map files
 */
export class SC2MapLoader implements IMapLoader {
  private parser: SC2Parser;
  private terrainParser: SC2TerrainParser;
  private unitsParser: SC2UnitsParser;

  constructor() {
    this.parser = new SC2Parser();
    this.terrainParser = new SC2TerrainParser();
    this.unitsParser = new SC2UnitsParser();
  }

  /**
   * Extract a file from MPQ (gracefully handles decompression failures)
   */
  private async extractFileWithFallback(
    mpqParser: MPQParser,
    buffer: ArrayBuffer,
    fileName: string
  ): Promise<MPQFile | null> {
    // Try MPQParser
    try {
      const result = await mpqParser.extractFile(fileName);
      if (result) {
        return result;
      }
    } catch (error) {
      // eslint-disable-line no-empty
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if this is a decompression error
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
          `[SC2MapLoader] MPQParser decompression failed for ${fileName} - file will be skipped`
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Parse SC2Map file
   *
   * @param file - Map file, ArrayBuffer, or Node.js Buffer
   * @returns Raw map data in common format
   */
  public async parse(file: File | ArrayBuffer | Buffer): Promise<RawMapData> {
    // Convert to ArrayBuffer if needed
    let buffer: ArrayBuffer;
    if (file instanceof ArrayBuffer) {
      buffer = file;
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      // Node.js Buffer - convert to ArrayBuffer (only in Node environment)
      // Create a new ArrayBuffer and copy the data to avoid SharedArrayBuffer issues
      buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    } else if (file instanceof File) {
      // File object - use arrayBuffer() method
      buffer = await file.arrayBuffer();
    } else {
      throw new Error('Invalid input type: expected File, ArrayBuffer, or Buffer');
    }

    // Parse MPQ archive (same container as W3X)
    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success || !mpqResult.archive) {
      throw new Error(`Failed to parse MPQ archive: ${mpqResult.error}`);
    }

    // Extract SC2-specific files
    const docInfoData = await this.extractFileWithFallback(mpqParser, buffer, 'DocumentInfo');
    const mapInfoData = await this.extractFileWithFallback(mpqParser, buffer, 'MapInfo');
    const terrainData = await this.extractFileWithFallback(mpqParser, buffer, 'TerrainData.xml');
    const unitsData = await this.extractFileWithFallback(mpqParser, buffer, 'Units');

    // Parse map info (DocumentInfo is primary, MapInfo is fallback)
    let mapInfo: MapInfo;
    if (docInfoData) {
      mapInfo = this.parseDocumentInfo(docInfoData.data);
    } else if (mapInfoData) {
      mapInfo = this.parseMapInfo(mapInfoData.data);
    } else {
      // No metadata found, use defaults
      mapInfo = this.createDefaultMapInfo();
    }

    // Parse terrain (if available)
    let terrain: TerrainData;
    if (terrainData) {
      const sc2Terrain = this.terrainParser.parse(terrainData.data);
      terrain = this.terrainParser.toCommonFormat(sc2Terrain);
    } else {
      // No terrain data found, create default
      terrain = this.createDefaultTerrain(mapInfo.dimensions);
    }

    // Parse units (if available)
    let units: UnitPlacement[] = [];
    if (unitsData) {
      const sc2Units = this.unitsParser.parse(unitsData.data);
      units = this.unitsParser.toCommonFormat(sc2Units);
    }

    // Parse doodads (stub for now)
    const doodads: DoodadPlacement[] = [];

    return {
      format: 'sc2map',
      info: mapInfo,
      terrain,
      units,
      doodads,
    };
  }

  /**
   * Parse DocumentInfo (XML metadata)
   *
   * @param buffer - ArrayBuffer containing DocumentInfo data
   * @returns MapInfo object
   */
  private parseDocumentInfo(buffer: ArrayBuffer): MapInfo {
    const doc = this.parser.parseXML(buffer);

    const name = this.parser.getTextContentWithDefault(doc, 'Name', 'Unknown Map');
    const author = this.parser.getTextContentWithDefault(doc, 'Author', 'Unknown');
    const description = this.parser.getTextContentWithDefault(doc, 'Description', '');

    // Parse dimensions
    const width = this.parser.getNumericContent(doc, 'Width', 256);
    const height = this.parser.getNumericContent(doc, 'Height', 256);

    return {
      name,
      author,
      description,
      version: '1.0',
      players: this.parsePlayerInfo(doc),
      dimensions: {
        width,
        height,
      },
      environment: {
        tileset: this.parser.getTextContentWithDefault(doc, 'Tileset', 'default'),
      },
    };
  }

  /**
   * Parse MapInfo (alternative metadata format)
   *
   * @param buffer - ArrayBuffer containing MapInfo data
   * @returns MapInfo object
   */
  private parseMapInfo(buffer: ArrayBuffer): MapInfo {
    // Try XML parsing first
    if (this.parser.isValidXML(buffer)) {
      return this.parseDocumentInfo(buffer);
    }

    // If binary, use defaults for now
    return this.createDefaultMapInfo();
  }

  /**
   * Parse player information from XML document
   *
   * @param _doc - Parsed XML document (unused for now)
   * @returns Array of PlayerInfo objects
   */
  private parsePlayerInfo(_doc: Document): PlayerInfo[] {
    // SC2 maps can have 2-16 players
    // For now, return default 2 players
    // TODO: Parse actual player data from XML when format is documented
    return [
      {
        id: 1,
        name: 'Player 1',
        type: 'human',
        race: 'Terran',
        team: 1,
      },
      {
        id: 2,
        name: 'Player 2',
        type: 'human',
        race: 'Protoss',
        team: 2,
      },
    ];
  }

  /**
   * Create default map info when parsing fails
   *
   * @returns Default MapInfo object
   */
  private createDefaultMapInfo(): MapInfo {
    return {
      name: 'Unknown SC2 Map',
      author: 'Unknown',
      description: 'StarCraft 2 map',
      version: '1.0',
      players: this.parsePlayerInfo(new Document()),
      dimensions: {
        width: 256,
        height: 256,
      },
      environment: {
        tileset: 'default',
      },
    };
  }

  /**
   * Create default terrain if parsing fails
   *
   * @param dimensions - Map dimensions
   * @returns Default TerrainData
   */
  private createDefaultTerrain(dimensions: { width: number; height: number }): TerrainData {
    const { width, height } = dimensions;
    const heightmap = new Float32Array(width * height).fill(0);

    return {
      width,
      height,
      heightmap,
      textures: [
        {
          id: 'default',
          path: '/assets/textures/grass.png',
        },
      ],
    };
  }
}
