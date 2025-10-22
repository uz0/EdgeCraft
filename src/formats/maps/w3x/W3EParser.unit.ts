/**
 * W3EParser Unit Tests
 *
 * Tests parsing of W3E (terrain) files for both v11 (Classic/TFT) and v12 (Reforged) formats
 */

import { W3EParser } from './W3EParser';

describe('W3EParser', () => {
  /**
   * Create a minimal valid v11 W3E file
   * Format: W3E! + version(11) + tileset + custom flag + textures + dimensions + tiles + cliff tiles
   */
  function createV11W3E(): ArrayBuffer {
    const buffer = new ArrayBuffer(200);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset++, 'W'.charCodeAt(0));
    view.setUint8(offset++, '3'.charCodeAt(0));
    view.setUint8(offset++, 'E'.charCodeAt(0));
    view.setUint8(offset++, '!'.charCodeAt(0));

    view.setUint32(offset, 11, true);
    offset += 4;

    view.setUint8(offset++, 'L'.charCodeAt(0));

    view.setUint32(offset, 0, true);
    offset += 4;

    view.setUint32(offset, 2, true);
    offset += 4;
    view.setUint8(offset++, 'L'.charCodeAt(0));
    view.setUint8(offset++, 'd'.charCodeAt(0));
    view.setUint8(offset++, 'r'.charCodeAt(0));
    view.setUint8(offset++, 't'.charCodeAt(0));
    view.setUint8(offset++, 'L'.charCodeAt(0));
    view.setUint8(offset++, 'g'.charCodeAt(0));
    view.setUint8(offset++, 'r'.charCodeAt(0));
    view.setUint8(offset++, 's'.charCodeAt(0));

    view.setUint32(offset, 1, true);
    offset += 4;
    view.setUint8(offset++, 'C'.charCodeAt(0));
    view.setUint8(offset++, 'L'.charCodeAt(0));
    view.setUint8(offset++, 'd'.charCodeAt(0));
    view.setUint8(offset++, 'i'.charCodeAt(0));

    view.setUint32(offset, 3, true);
    offset += 4;
    view.setUint32(offset, 2, true);
    offset += 4;
    view.setFloat32(offset, -128, true);
    offset += 4;
    view.setFloat32(offset, -128, true);
    offset += 4;

    for (let i = 0; i < 4; i++) {
      view.setInt16(offset, 8192, true);
      offset += 2;
      view.setInt16(offset, 8192, true);
      offset += 2;
      view.setUint8(offset++, 0x40);
      view.setUint8(offset++, 0x00);
      view.setUint8(offset++, 0x01);
    }

    view.setUint32(offset, 2, true);
    offset += 4;
    view.setUint8(offset++, 0);
    view.setUint8(offset++, 1);
    view.setUint8(offset++, 0);
    view.setUint8(offset++, 1);
    view.setUint8(offset++, 2);
    view.setUint8(offset++, 3);

    return buffer;
  }

  /**
   * Create a minimal valid v12 W3E file (Reforged)
   * Format: Same as v11 but tiles are 8 bytes instead of 7
   */
  function createV12W3E(): ArrayBuffer {
    const buffer = new ArrayBuffer(220);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset++, 'W'.charCodeAt(0));
    view.setUint8(offset++, '3'.charCodeAt(0));
    view.setUint8(offset++, 'E'.charCodeAt(0));
    view.setUint8(offset++, '!'.charCodeAt(0));

    view.setUint32(offset, 12, true);
    offset += 4;

    view.setUint8(offset++, 'I'.charCodeAt(0));

    view.setUint32(offset, 0, true);
    offset += 4;

    view.setUint32(offset, 3, true);
    offset += 4;
    view.setUint8(offset++, 'I'.charCodeAt(0));
    view.setUint8(offset++, 'd'.charCodeAt(0));
    view.setUint8(offset++, 'r'.charCodeAt(0));
    view.setUint8(offset++, 't'.charCodeAt(0));
    view.setUint8(offset++, 'I'.charCodeAt(0));
    view.setUint8(offset++, 's'.charCodeAt(0));
    view.setUint8(offset++, 'n'.charCodeAt(0));
    view.setUint8(offset++, 'w'.charCodeAt(0));
    view.setUint8(offset++, 'I'.charCodeAt(0));
    view.setUint8(offset++, 'i'.charCodeAt(0));
    view.setUint8(offset++, 'c'.charCodeAt(0));
    view.setUint8(offset++, 'e'.charCodeAt(0));

    view.setUint32(offset, 2, true);
    offset += 4;
    view.setUint8(offset++, 'C'.charCodeAt(0));
    view.setUint8(offset++, 'I'.charCodeAt(0));
    view.setUint8(offset++, 's'.charCodeAt(0));
    view.setUint8(offset++, 'n'.charCodeAt(0));
    view.setUint8(offset++, 'C'.charCodeAt(0));
    view.setUint8(offset++, 'I'.charCodeAt(0));
    view.setUint8(offset++, 'r'.charCodeAt(0));
    view.setUint8(offset++, 'b'.charCodeAt(0));

    view.setUint32(offset, 3, true);
    offset += 4;
    view.setUint32(offset, 3, true);
    offset += 4;
    view.setFloat32(offset, -128, true);
    offset += 4;
    view.setFloat32(offset, -128, true);
    offset += 4;

    for (let i = 0; i < 4; i++) {
      view.setInt16(offset, 8104, true);
      offset += 2;
      view.setInt16(offset, 8192, true);
      offset += 2;
      view.setUint16(offset, 0x0140, true);
      offset += 2;
      view.setUint8(offset++, 0x01);
      view.setUint8(offset++, 0x00);
    }

    return buffer;
  }

  /**
   * Create an invalid W3E file that will exceed buffer bounds
   */
  function createInvalidW3E(): ArrayBuffer {
    const buffer = new ArrayBuffer(20);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset++, 'W'.charCodeAt(0));
    view.setUint8(offset++, '3'.charCodeAt(0));
    view.setUint8(offset++, 'E'.charCodeAt(0));
    view.setUint8(offset++, '!'.charCodeAt(0));

    view.setUint32(offset, 11, true);
    offset += 4;

    view.setUint8(offset++, 'L'.charCodeAt(0));

    view.setUint32(offset, 0, true);
    offset += 4;

    view.setUint32(offset, 2, true);

    return buffer;
  }

  it('should parse v11 W3E file with cliff data', () => {
    const buffer = createV11W3E();
    const parser = new W3EParser(buffer);
    const terrain = parser.parse();

    expect(terrain.version).toBe(11);
    expect(terrain.tileset).toBe('L');
    expect(terrain.customTileset).toBe(false);
    expect(terrain.groundTextureIds).toEqual(['Ldrt', 'Lgrs']);
    expect(terrain.width).toBe(2);
    expect(terrain.height).toBe(2);
    expect(terrain.groundTiles).toHaveLength(4);
    expect(terrain.groundTiles[0]?.groundHeight).toBe(8192);
    expect(terrain.groundTiles[0]?.waterLevel).toBe(8192);
    expect(terrain.groundTiles[0]?.flags).toBe(0x40);
    expect(terrain.groundTiles[0]?.cliffLevel).toBe(1);
    expect(terrain.cliffTiles).toBeDefined();
    expect(terrain.cliffTiles).toHaveLength(2);
    expect(terrain.cliffTiles?.[0]?.cliffType).toBe(0);
    expect(terrain.cliffTiles?.[0]?.cliffLevel).toBe(1);
    expect(terrain.cliffTiles?.[0]?.cliffTexture).toBe(0);
  });

  it('should parse v12 W3E file (Reforged format)', () => {
    const buffer = createV12W3E();
    const parser = new W3EParser(buffer);
    const terrain = parser.parse();

    expect(terrain.version).toBe(12);
    expect(terrain.tileset).toBe('I');
    expect(terrain.customTileset).toBe(false);
    expect(terrain.groundTextureIds).toEqual(['Idrt', 'Isnw', 'Iice']);
    expect(terrain.width).toBe(2);
    expect(terrain.height).toBe(2);
    expect(terrain.groundTiles).toHaveLength(4);
    expect(terrain.groundTiles[0]?.groundHeight).toBe(8104);
    expect(terrain.groundTiles[0]?.waterLevel).toBe(8192);
    expect(terrain.groundTiles[0]?.groundTexture).toBe(0);
    expect(terrain.groundTiles[0]?.flags).toBe(5);
    expect(terrain.groundTiles[0]?.cliffLevel).toBe(1);
    expect(terrain.cliffTiles).toBeUndefined();
  });

  it('should throw error when reading would exceed buffer bounds', () => {
    const buffer = createInvalidW3E();
    const parser = new W3EParser(buffer);

    expect(() => parser.parse()).toThrow('W3E read would exceed buffer bounds');
  });
});
