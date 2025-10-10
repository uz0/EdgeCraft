/**
 * W3D Parser - Warcraft 3 Doodads (war3map.doo)
 * Parses decorative object (doodad) placements
 */

import type { W3ODoodads, W3ODoodad, W3OItemSet, W3ODroppedItem, W3OSpecialDoodad } from './types';
import type { Vector3 } from '../types';

/**
 * Parse war3map.doo file
 */
export class W3DParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  // W3do magic number
  private static readonly W3DO_MAGIC = 'W3do';

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire doo file
   */
  public parse(): W3ODoodads {
    this.offset = 0;

    // Read and validate magic
    const magic = this.read4CC();
    if (magic !== W3DParser.W3DO_MAGIC) {
      throw new Error(`Invalid doodad file magic: ${magic}`);
    }

    // Read version
    const version = this.readUint32();

    // Read subversion (v8+)
    const subversion = this.readUint32();

    // Read doodads
    const doodadCount = this.readUint32();
    const doodads: W3ODoodad[] = [];

    for (let i = 0; i < doodadCount; i++) {
      doodads.push(this.readDoodad());
    }

    // Read special doodads (optional, version-dependent)
    let specialDoodadVersion: number | undefined;
    let specialDoodads: W3OSpecialDoodad[] | undefined;

    if (this.offset < this.buffer.byteLength) {
      specialDoodadVersion = this.readUint32();
      const specialDoodadCount = this.readUint32();

      if (specialDoodadCount > 0) {
        specialDoodads = [];
        for (let i = 0; i < specialDoodadCount; i++) {
          specialDoodads.push(this.readSpecialDoodad());
        }
      }
    }

    return {
      version,
      subversion,
      doodads,
      specialDoodadVersion,
      specialDoodads,
    };
  }

  /**
   * Read doodad placement data
   */
  private readDoodad(): W3ODoodad {
    // Type ID (4 chars)
    const typeId = this.read4CC();

    // Variation
    const variation = this.readUint32();

    // Position
    const position: Vector3 = {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };

    // Rotation (radians)
    const rotation = this.readFloat32();

    // Scale
    const scale: Vector3 = {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };

    // Flags
    const flags = this.view.getUint8(this.offset);
    this.offset += 1;

    // Life (percentage, 0-100)
    const life = this.view.getUint8(this.offset);
    this.offset += 1;

    // Item table index (-1 = none)
    const itemTable = this.view.getInt32(this.offset, true);
    this.offset += 4;

    // Item sets
    const itemSetCount = this.readUint32();
    const itemSets: W3OItemSet[] = [];

    for (let i = 0; i < itemSetCount; i++) {
      const items: W3ODroppedItem[] = [];
      const itemCount = this.readUint32();

      for (let j = 0; j < itemCount; j++) {
        items.push({
          itemId: this.read4CC(),
          chance: this.readUint32(),
        });
      }

      itemSets.push({ items });
    }

    // Editor ID
    const editorId = this.readUint32();

    return {
      typeId,
      variation,
      position,
      rotation,
      scale,
      flags,
      life,
      itemTable,
      itemSets,
      editorId,
    };
  }

  /**
   * Read special doodad data
   */
  private readSpecialDoodad(): W3OSpecialDoodad {
    const typeId = this.read4CC();
    const z = this.readUint32();
    const editorId = this.readUint32();

    return {
      typeId,
      z,
      editorId,
    };
  }

  /**
   * Helper: Read 4-character code
   */
  private read4CC(): string {
    const chars = String.fromCharCode(
      this.view.getUint8(this.offset),
      this.view.getUint8(this.offset + 1),
      this.view.getUint8(this.offset + 2),
      this.view.getUint8(this.offset + 3)
    );
    this.offset += 4;
    return chars;
  }

  /**
   * Helper: Read uint32
   */
  private readUint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Helper: Read float32
   */
  private readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }
}
