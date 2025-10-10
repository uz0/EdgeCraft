/**
 * CHK Parser - StarCraft 1 Map Format (scenario.chk)
 * Parses chunk-based CHK files from SCM/SCX maps
 */

import type { CHKMap, CHKVersion, CHKDimensions, CHKTileset, CHKTileMap, CHKUnits, CHKUnit, CHKScenario } from './types';

/**
 * Parse CHK file (scenario.chk from StarCraft maps)
 */
export class CHKParser {
  private buffer: ArrayBuffer;
  private view: DataView;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire CHK file
   * CHK format is chunk-based: [Name(4)][Size(4)][Data(n)]
   */
  public parse(): CHKMap {
    const chunks = new Map<string, ArrayBuffer>();
    let offset = 0;

    // Read all chunks
    while (offset < this.buffer.byteLength) {
      // Read chunk name (4 bytes)
      const name = String.fromCharCode(
        this.view.getUint8(offset),
        this.view.getUint8(offset + 1),
        this.view.getUint8(offset + 2),
        this.view.getUint8(offset + 3)
      );
      offset += 4;

      // Read chunk size (4 bytes, little-endian)
      const size = this.view.getUint32(offset, true);
      offset += 4;

      // Read chunk data
      const data = this.buffer.slice(offset, offset + size);
      chunks.set(name, data);
      offset += size;
    }

    // Parse individual chunks
    const map: CHKMap = {};

    if (chunks.has('VER ')) {
      map.VER = this.parseVER(chunks.get('VER ')!);
    }

    if (chunks.has('DIM ')) {
      map.DIM = this.parseDIM(chunks.get('DIM ')!);
    }

    if (chunks.has('ERA ')) {
      map.ERA = this.parseERA(chunks.get('ERA ')!);
    }

    if (chunks.has('MTXM')) {
      map.MTXM = this.parseMTXM(chunks.get('MTXM')!);
    }

    if (chunks.has('UNIT')) {
      map.UNIT = this.parseUNIT(chunks.get('UNIT')!);
    }

    if (chunks.has('SPRP')) {
      map.SPRP = this.parseSPRP(chunks.get('SPRP')!);
    }

    return map;
  }

  /**
   * Parse VER chunk - Version
   */
  private parseVER(buffer: ArrayBuffer): CHKVersion {
    const view = new DataView(buffer);
    return {
      version: view.getUint16(0, true),
    };
  }

  /**
   * Parse DIM chunk - Dimensions
   */
  private parseDIM(buffer: ArrayBuffer): CHKDimensions {
    const view = new DataView(buffer);
    return {
      width: view.getUint16(0, true),
      height: view.getUint16(2, true),
    };
  }

  /**
   * Parse ERA chunk - Tileset
   */
  private parseERA(buffer: ArrayBuffer): CHKTileset {
    const view = new DataView(buffer);
    const tilesetId = view.getUint16(0, true);

    const tilesets = [
      'Badlands',
      'Space Platform',
      'Installation',
      'Ashworld',
      'Jungle',
      'Desert',
      'Ice',
      'Twilight',
    ];

    return {
      tileset: tilesets[tilesetId] || 'Unknown',
    };
  }

  /**
   * Parse MTXM chunk - Tile Map
   * Tile map is array of 16-bit tile indices
   */
  private parseMTXM(buffer: ArrayBuffer): CHKTileMap {
    const view = new DataView(buffer);
    const tileCount = buffer.byteLength / 2;
    const tiles = new Uint16Array(tileCount);

    for (let i = 0; i < tileCount; i++) {
      tiles[i] = view.getUint16(i * 2, true);
    }

    return { tiles };
  }

  /**
   * Parse UNIT chunk - Units
   * Each unit is 36 bytes
   */
  private parseUNIT(buffer: ArrayBuffer): CHKUnits {
    const view = new DataView(buffer);
    const unitCount = buffer.byteLength / 36;
    const units: CHKUnit[] = [];

    for (let i = 0; i < unitCount; i++) {
      const offset = i * 36;

      units.push({
        classInstance: view.getUint32(offset, true),
        x: view.getUint16(offset + 4, true),
        y: view.getUint16(offset + 6, true),
        unitId: view.getUint16(offset + 8, true),
        relationToPlayer: view.getUint16(offset + 10, true),
        validStateFlags: view.getUint16(offset + 12, true),
        validProperties: view.getUint16(offset + 14, true),
        owner: view.getUint8(offset + 16),
        hitPoints: view.getUint8(offset + 17),
        shieldPoints: view.getUint8(offset + 18),
        energy: view.getUint8(offset + 19),
        resourceAmount: view.getUint32(offset + 20, true),
        hangarCount: view.getUint16(offset + 24, true),
        stateFlags: view.getUint16(offset + 26, true),
        unused: view.getUint32(offset + 28, true),
        relationClassInstance: view.getUint32(offset + 32, true),
      });
    }

    return { units };
  }

  /**
   * Parse SPRP chunk - Scenario Properties
   */
  private parseSPRP(buffer: ArrayBuffer): CHKScenario {
    const view = new DataView(buffer);

    // SPRP contains scenario name and description indices
    // For simplicity, we'll just extract what we can
    const scenarioNameIndex = view.getUint16(0, true);
    const descriptionIndex = view.getUint16(2, true);

    return {
      scenarioName: `Scenario ${scenarioNameIndex}`,
      description: `Description ${descriptionIndex}`,
    };
  }

  /**
   * Convert tile map to heightmap (StarCraft is 2D, so heights are uniform)
   * @param tileMap - Parsed MTXM chunk
   * @param dimensions - Map dimensions
   * @returns Float32Array heightmap
   */
  public static toHeightmap(_tileMap: CHKTileMap, dimensions: CHKDimensions): Float32Array {
    const { width, height } = dimensions;
    const heightmap = new Float32Array(width * height);

    // StarCraft is 2D, so all heights are 0
    // Tile variations could affect height in a 3D engine, but default to flat
    heightmap.fill(0);

    return heightmap;
  }
}
