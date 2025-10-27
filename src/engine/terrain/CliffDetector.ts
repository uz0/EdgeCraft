import type { W3ETerrain, W3EGroundTile } from '../../formats/maps/w3x/types';

export interface CliffInstance {
  position: [number, number, number];
  textureIndex: number;
  variation: number;
  fileName: string;
}

export interface CliffData {
  instances: Map<string, CliffInstance[]>;
  cliffTextures: Set<number>;
}

/**
 * Detects cliffs in W3E terrain data and generates cliff model instances
 * Based on mdx-m3-viewer implementation
 */
export class CliffDetector {
  private corners: W3EGroundTile[][];
  private width: number;
  private height: number;
  private centerOffset: [number, number];

  constructor(w3e: W3ETerrain) {
    this.corners = w3e.corners;
    this.width = w3e.width;
    this.height = w3e.height;
    this.centerOffset = w3e.centerOffset;
  }

  /**
   * Check if a tile position has a cliff
   * Based on mdx-m3-viewer map.ts line 930
   */
  isCliff(column: number, row: number): boolean {
    if (column < 1 || column > this.width - 1 || row < 1 || row > this.height - 1) {
      return false;
    }

    const bottomLeft = this.corners[row]?.[column]?.layerHeight;
    const bottomRight = this.corners[row]?.[column + 1]?.layerHeight;
    const topLeft = this.corners[row + 1]?.[column]?.layerHeight;
    const topRight = this.corners[row + 1]?.[column + 1]?.layerHeight;

    if (
      bottomLeft === undefined ||
      bottomRight === undefined ||
      topLeft === undefined ||
      topRight === undefined
    ) {
      return false;
    }

    return bottomLeft !== bottomRight || bottomLeft !== topLeft || bottomLeft !== topRight;
  }

  /**
   * Generate cliff model filename from corner heights
   * Based on mdx-m3-viewer map.ts line 891
   */
  getCliffFileName(
    bottomLeftLayer: number,
    bottomRightLayer: number,
    topLeftLayer: number,
    topRightLayer: number,
    base: number
  ): string {
    // Each letter encodes height difference from base (A=0, B=1, C=2, etc.)
    // Order: BL → TL → TR → BR (counter-clockwise starting bottom-left)
    return (
      String.fromCharCode(65 + bottomLeftLayer - base) +
      String.fromCharCode(65 + topLeftLayer - base) +
      String.fromCharCode(65 + topRightLayer - base) +
      String.fromCharCode(65 + bottomRightLayer - base)
    );
  }

  /**
   * Detect all cliffs in the terrain and return cliff instance data
   */
  detectCliffs(): CliffData {
    const instances = new Map<string, CliffInstance[]>();
    const cliffTextures = new Set<number>();

    for (let row = 0; row < this.height - 1; row++) {
      for (let column = 0; column < this.width - 1; column++) {
        if (!this.isCliff(column, row)) {
          continue;
        }

        const corners = this.corners;
        const bottomLeft = corners[row]?.[column];
        const bottomRight = corners[row]?.[column + 1];
        const topLeft = corners[row + 1]?.[column];
        const topRight = corners[row + 1]?.[column + 1];

        if (!bottomLeft || !bottomRight || !topLeft || !topRight) {
          continue;
        }

        const bottomLeftLayer = bottomLeft.layerHeight;
        const bottomRightLayer = bottomRight.layerHeight;
        const topLeftLayer = topLeft.layerHeight;
        const topRightLayer = topRight.layerHeight;

        // Find the minimum height for the base
        const base = Math.min(bottomLeftLayer, bottomRightLayer, topLeftLayer, topRightLayer);

        const fileName = this.getCliffFileName(
          bottomLeftLayer,
          bottomRightLayer,
          topLeftLayer,
          topRightLayer,
          base
        );

        // Skip flat cliffs
        if (fileName === 'AAAA') {
          continue;
        }

        // Get cliff texture (special case: 15 maps to 1)
        let cliffTexture = bottomLeft.cliffTexture;
        if (cliffTexture === 15) {
          cliffTexture = 1;
        }
        cliffTextures.add(cliffTexture);

        // Calculate cliff position
        // Based on mdx-m3-viewer map.ts lines 334-336
        // Position: center of tile at base height
        // X: Right edge of tile (column+1 because cliff mesh is left-aligned)
        // Y: Bottom edge of tile
        // Z: Base height minus 2 offset, scaled by 128
        const position: [number, number, number] = [
          (column + 1) * 128 + this.centerOffset[0],
          row * 128 + this.centerOffset[1],
          (base - 2) * 128,
        ];

        const cliffVariation = bottomLeft.cliffVariation;

        // Store instance data
        const instance: CliffInstance = {
          position,
          textureIndex: cliffTexture,
          variation: cliffVariation,
          fileName,
        };

        // Group by fileName and texture for batching
        const key = `${fileName}_${cliffTexture}`;
        if (!instances.has(key)) {
          instances.set(key, []);
        }
        instances.get(key)!.push(instance);
      }
    }

    return { instances, cliffTextures };
  }

  /**
   * Get the tileset directory name for cliffs
   * This would need to be loaded from CliffTypes.slk data
   */
  getCliffModelDir(cliffTexture: number, tileset: string): string {
    // This is simplified - actual implementation would read from CliffTypes.slk
    // For now, return common cliff directories based on tileset
    const tilesetDirs: Record<string, string[]> = {
      A: ['Cliffs', 'Cliffs'], // Ashenvale
      B: ['Cliffs', 'Cliffs'], // Barrens
      C: ['Cliffs', 'Cliffs'], // Felwood
      D: ['Cliffs', 'Cliffs'], // Dungeon
      F: ['LordaeronCliffs', 'LordaeronCliffs'], // Lordaeron Fall
      G: ['Underground', 'Underground'], // Underground
      I: ['IceCliffs', 'IceCliffs'], // Icecrown
      J: ['DalaranRuinsCliffs', 'DalaranRuinsCliffs'], // Dalaran Ruins
      K: ['BlackCitadelCliffs', 'BlackCitadelCliffs'], // Black Citadel
      L: ['IceCliffs', 'IceCliffs'], // Lordaeron Winter
      N: ['CliffsCityCliffs', 'CliffsCityCliffs'], // Northrend
      O: ['OutlandCliffs', 'OutlandCliffs'], // Outland
      Q: ['VillageCliffs', 'VillageCliffs'], // Village
      V: ['VillageCliffsFall', 'VillageCliffsFall'], // Village Fall
      W: ['LordaeronWinterCliffs', 'LordaeronWinterCliffs'], // Lordaeron Winter
      X: ['DalaranCliffs', 'DalaranCliffs'], // Dalaran
      Y: ['CliffsCityCliffs', 'CliffsCityCliffs'], // Cityscape
      Z: ['SunkenRuinsCliffs', 'SunkenRuinsCliffs'], // Sunken Ruins
    };

    const dirs = tilesetDirs[tileset] || ['Cliffs', 'Cliffs'];
    return dirs[Math.min(cliffTexture, dirs.length - 1)] ?? 'Cliffs';
  }

  /**
   * Generate full model path for a cliff instance
   */
  getCliffModelPath(
    fileName: string,
    cliffTexture: number,
    variation: number,
    tileset: string
  ): string {
    const dir = this.getCliffModelDir(cliffTexture, tileset);
    const clampedVariation = this.getClampedVariation(dir, fileName, variation);
    return `Doodads\\Terrain\\${dir}\\${dir}${fileName}${clampedVariation}.mdx`;
  }

  /**
   * Clamp variation to available model variations
   * Based on mdx-m3-viewer variations.ts
   */
  getClampedVariation(dir: string, fileName: string, variation: number): number {
    // Variation tables from mdx-m3-viewer
    const cliffVariations: Record<string, number> = {
      AAAB: 1,
      AAAC: 0,
      AAAD: 0,
      AABA: 1,
      AABB: 1,
      AABC: 0,
      AABD: 0,
      AACA: 0,
      AACB: 0,
      AACC: 0,
      AACD: 0,
      AADA: 0,
      AADB: 0,
      AADC: 0,
      AADD: 0,
      ABAA: 1,
      ABAB: 0,
      ABAC: 0,
      ABAD: 0,
      ABBA: 2,
      ABBB: 0,
      ABBC: 0,
      ABBD: 0,
      ABCA: 0,
      ABCB: 0,
      ABCC: 0,
      ABCD: 0,
      ABDA: 0,
      ABDB: 0,
      ABDC: 0,
      ABDD: 0,
      ACAA: 0,
      ACAB: 0,
      ACAC: 0,
      ACAD: 0,
      ACBA: 0,
      ACBB: 0,
      ACBC: 0,
      ACBD: 0,
      ACCA: 0,
      ACCB: 0,
      ACCC: 0,
      ACCD: 0,
      ACDA: 0,
      ACDB: 0,
      ACDC: 0,
      ACDD: 0,
      ADAA: 0,
      ADAB: 0,
      ADAC: 0,
      ADAD: 0,
      ADBA: 0,
      ADBB: 0,
      ADBC: 0,
      ADBD: 0,
      ADCA: 0,
      ADCB: 0,
      ADCC: 0,
      ADCD: 0,
      ADDA: 0,
      ADDB: 0,
      ADDC: 0,
      ADDD: 0,
      BAAA: 1,
      BAAB: 0,
      BAAC: 0,
      BAAD: 0,
      BABA: 0,
      BABB: 0,
      BABC: 0,
      BABD: 0,
      BACA: 0,
      BACB: 0,
      BACC: 0,
      BACD: 0,
      BADA: 0,
      BADB: 0,
      BADC: 0,
      BADD: 0,
      BBAA: 1,
      BBAB: 0,
      BBAC: 0,
      BBAD: 0,
      BBBA: 0,
      BBBB: 0,
      BBBC: 0,
      BBBD: 0,
      BBCA: 0,
      BBCB: 0,
      BBCC: 0,
      BBCD: 0,
      BBDA: 0,
      BBDB: 0,
      BBDC: 0,
      BBDD: 0,
      BCAA: 0,
      BCAB: 0,
      BCAC: 0,
      BCAD: 0,
      BCBA: 0,
      BCBB: 0,
      BCBC: 0,
      BCBD: 0,
      BCCA: 0,
      BCCB: 0,
      BCCC: 0,
      BCCD: 0,
      BCDA: 0,
      BCDB: 0,
      BCDC: 0,
      BCDD: 0,
      BDAA: 0,
      BDAB: 0,
      BDAC: 0,
      BDAD: 0,
      BDBA: 0,
      BDBB: 0,
      BDBC: 0,
      BDBD: 0,
      BDCA: 0,
      BDCB: 0,
      BDCC: 0,
      BDCD: 0,
      BDDA: 0,
      BDDB: 0,
      BDDC: 0,
      BDDD: 0,
      CAAA: 0,
      CAAB: 0,
      CAAC: 0,
      CAAD: 0,
      CABA: 0,
      CABB: 0,
      CABC: 0,
      CABD: 0,
      CACA: 0,
      CACB: 0,
      CACC: 0,
      CACD: 0,
      CADA: 0,
      CADB: 0,
      CADC: 0,
      CADD: 0,
      CBAA: 0,
      CBAB: 0,
      CBAC: 0,
      CBAD: 0,
      CBBA: 0,
      CBBB: 0,
      CBBC: 0,
      CBBD: 0,
      CBCA: 0,
      CBCB: 0,
      CBCC: 0,
      CBCD: 0,
      CBDA: 0,
      CBDB: 0,
      CBDC: 0,
      CBDD: 0,
      CCAA: 0,
      CCAB: 0,
      CCAC: 0,
      CCAD: 0,
      CCBA: 0,
      CCBB: 0,
      CCBC: 0,
      CCBD: 0,
      CCCA: 0,
      CCCB: 0,
      CCCC: 0,
      CCCD: 0,
      CCDA: 0,
      CCDB: 0,
      CCDC: 0,
      CCDD: 0,
      CDAA: 0,
      CDAB: 0,
      CDAC: 0,
      CDAD: 0,
      CDBA: 0,
      CDBB: 0,
      CDBC: 0,
      CDBD: 0,
      CDCA: 0,
      CDCB: 0,
      CDCC: 0,
      CDCD: 0,
      CDDA: 0,
      CDDB: 0,
      CDDC: 0,
      CDDD: 0,
      DAAA: 0,
      DAAB: 0,
      DAAC: 0,
      DAAD: 0,
      DABA: 0,
      DABB: 0,
      DABC: 0,
      DABD: 0,
      DACA: 0,
      DACB: 0,
      DACC: 0,
      DACD: 0,
      DADA: 0,
      DADB: 0,
      DADC: 0,
      DADD: 0,
      DBAA: 0,
      DBAB: 0,
      DBAC: 0,
      DBAD: 0,
      DBBA: 0,
      DBBB: 0,
      DBBC: 0,
      DBBD: 0,
      DBCA: 0,
      DBCB: 0,
      DBCC: 0,
      DBCD: 0,
      DBDA: 0,
      DBDB: 0,
      DBDC: 0,
      DBDD: 0,
      DCAA: 0,
      DCAB: 0,
      DCAC: 0,
      DCAD: 0,
      DCBA: 0,
      DCBB: 0,
      DCBC: 0,
      DCBD: 0,
      DCCA: 0,
      DCCB: 0,
      DCCC: 0,
      DCCD: 0,
      DCDA: 0,
      DCDB: 0,
      DCDC: 0,
      DCDD: 0,
      DDAA: 0,
      DDAB: 0,
      DDAC: 0,
      DDAD: 0,
      DDBA: 0,
      DDBB: 0,
      DDBC: 0,
      DDBD: 0,
      DDCA: 0,
      DDCB: 0,
      DDCC: 0,
      DDCD: 0,
      DDDA: 0,
      DDDB: 0,
      DDDC: 0,
      DDDD: 0,
    };

    const cityCliffVariations: Record<string, number> = {
      AAAB: 2,
      AAAC: 0,
      AAAD: 0,
      AABA: 2,
      AABB: 3,
      AABC: 0,
      AABD: 0,
      AACA: 0,
      AACB: 0,
      AACC: 0,
      AACD: 0,
      AADA: 0,
      AADB: 0,
      AADC: 0,
      AADD: 0,
      ABAA: 2,
      ABAB: 0,
      ABAC: 0,
      ABAD: 0,
      ABBA: 3,
      ABBB: 0,
      ABBC: 0,
      ABBD: 0,
      ABCA: 0,
      ABCB: 0,
      ABCC: 0,
      ABCD: 0,
      ABDA: 0,
      ABDB: 0,
      ABDC: 0,
      ABDD: 0,
      ACAA: 0,
      ACAB: 0,
      ACAC: 0,
      ACAD: 0,
      ACBA: 0,
      ACBB: 0,
      ACBC: 0,
      ACBD: 0,
      ACCA: 0,
      ACCB: 0,
      ACCC: 0,
      ACCD: 0,
      ACDA: 0,
      ACDB: 0,
      ACDC: 0,
      ACDD: 0,
      ADAA: 0,
      ADAB: 0,
      ADAC: 0,
      ADAD: 0,
      ADBA: 0,
      ADBB: 0,
      ADBC: 0,
      ADBD: 0,
      ADCA: 0,
      ADCB: 0,
      ADCC: 0,
      ADCD: 0,
      ADDA: 0,
      ADDB: 0,
      ADDC: 0,
      ADDD: 0,
      BAAA: 2,
      BAAB: 0,
      BAAC: 0,
      BAAD: 0,
      BABA: 0,
      BABB: 0,
      BABC: 0,
      BABD: 0,
      BACA: 0,
      BACB: 0,
      BACC: 0,
      BACD: 0,
      BADA: 0,
      BADB: 0,
      BADC: 0,
      BADD: 0,
      BBAA: 2,
      BBAB: 0,
      BBAC: 0,
      BBAD: 0,
      BBBA: 0,
      BBBB: 0,
      BBBC: 0,
      BBBD: 0,
      BBCA: 0,
      BBCB: 0,
      BBCC: 0,
      BBCD: 0,
      BBDA: 0,
      BBDB: 0,
      BBDC: 0,
      BBDD: 0,
      BCAA: 0,
      BCAB: 0,
      BCAC: 0,
      BCAD: 0,
      BCBA: 0,
      BCBB: 0,
      BCBC: 0,
      BCBD: 0,
      BCCA: 0,
      BCCB: 0,
      BCCC: 0,
      BCCD: 0,
      BCDA: 0,
      BCDB: 0,
      BCDC: 0,
      BCDD: 0,
      BDAA: 0,
      BDAB: 0,
      BDAC: 0,
      BDAD: 0,
      BDBA: 0,
      BDBB: 0,
      BDBC: 0,
      BDBD: 0,
      BDCA: 0,
      BDCB: 0,
      BDCC: 0,
      BDCD: 0,
      BDDA: 0,
      BDDB: 0,
      BDDC: 0,
      BDDD: 0,
      CAAA: 0,
      CAAB: 0,
      CAAC: 0,
      CAAD: 0,
      CABA: 0,
      CABB: 0,
      CABC: 0,
      CABD: 0,
      CACA: 0,
      CACB: 0,
      CACC: 0,
      CACD: 0,
      CADA: 0,
      CADB: 0,
      CADC: 0,
      CADD: 0,
      CBAA: 0,
      CBAB: 0,
      CBAC: 0,
      CBAD: 0,
      CBBA: 0,
      CBBB: 0,
      CBBC: 0,
      CBBD: 0,
      CBCA: 0,
      CBCB: 0,
      CBCC: 0,
      CBCD: 0,
      CBDA: 0,
      CBDB: 0,
      CBDC: 0,
      CBDD: 0,
      CCAA: 0,
      CCAB: 0,
      CCAC: 0,
      CCAD: 0,
      CCBA: 0,
      CCBB: 0,
      CCBC: 0,
      CCBD: 0,
      CCCA: 0,
      CCCB: 0,
      CCCC: 0,
      CCCD: 0,
      CCDA: 0,
      CCDB: 0,
      CCDC: 0,
      CCDD: 0,
      CDAA: 0,
      CDAB: 0,
      CDAC: 0,
      CDAD: 0,
      CDBA: 0,
      CDBB: 0,
      CDBC: 0,
      CDBD: 0,
      CDCA: 0,
      CDCB: 0,
      CDCC: 0,
      CDCD: 0,
      CDDA: 0,
      CDDB: 0,
      CDDC: 0,
      CDDD: 0,
      DAAA: 0,
      DAAB: 0,
      DAAC: 0,
      DAAD: 0,
      DABA: 0,
      DABB: 0,
      DABC: 0,
      DABD: 0,
      DACA: 0,
      DACB: 0,
      DACC: 0,
      DACD: 0,
      DADA: 0,
      DADB: 0,
      DADC: 0,
      DADD: 0,
      DBAA: 0,
      DBAB: 0,
      DBAC: 0,
      DBAD: 0,
      DBBA: 0,
      DBBB: 0,
      DBBC: 0,
      DBBD: 0,
      DBCA: 0,
      DBCB: 0,
      DBCC: 0,
      DBCD: 0,
      DBDA: 0,
      DBDB: 0,
      DBDC: 0,
      DBDD: 0,
      DCAA: 0,
      DCAB: 0,
      DCAC: 0,
      DCAD: 0,
      DCBA: 0,
      DCBB: 0,
      DCBC: 0,
      DCBD: 0,
      DCCA: 0,
      DCCB: 0,
      DCCC: 0,
      DCCD: 0,
      DCDA: 0,
      DCDB: 0,
      DCDC: 0,
      DCDD: 0,
      DDAA: 0,
      DDAB: 0,
      DDAC: 0,
      DDAD: 0,
      DDBA: 0,
      DDBB: 0,
      DDBC: 0,
      DDBD: 0,
      DDCA: 0,
      DDCB: 0,
      DDCC: 0,
      DDCD: 0,
      DDDA: 0,
      DDDB: 0,
      DDDC: 0,
      DDDD: 0,
    };

    // Use city variations for city cliff types
    const isCityCliff =
      dir.includes('City') ||
      dir.includes('Dalaran') ||
      dir.includes('Lordaeron') ||
      dir.includes('Village');

    const variations = isCityCliff ? cityCliffVariations : cliffVariations;
    const maxVariation = variations[fileName] ?? 0;

    return Math.min(variation, maxVariation);
  }
}
