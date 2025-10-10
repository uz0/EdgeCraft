/**
 * W3U Parser - Warcraft 3 Units (war3mapUnits.doo)
 * Parses unit placements with full configuration
 */

import type { W3UUnits, W3UUnit, W3UInventoryItem, W3UModifiedAbility } from './types';
import type { W3OItemSet, W3ODroppedItem } from './types';
import type { Vector3 } from '../types';

/**
 * Parse war3mapUnits.doo file
 */
export class W3UParser {
  private view: DataView;
  private offset: number = 0;

  // W3do magic (same as doodads)
  private static readonly W3DO_MAGIC = 'W3do';

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire units file
   */
  public parse(): W3UUnits {
    this.offset = 0;

    // Read and validate magic
    const magic = this.read4CC();
    if (magic !== W3UParser.W3DO_MAGIC) {
      throw new Error(`Invalid units file magic: ${magic}`);
    }

    // Read version
    const version = this.readUint32();

    // Read subversion (v8+)
    const subversion = this.readUint32();

    // Read units
    const unitCount = this.readUint32();
    const units: W3UUnit[] = [];

    for (let i = 0; i < unitCount; i++) {
      units.push(this.readUnit());
    }

    return {
      version,
      subversion,
      units,
    };
  }

  /**
   * Read unit placement data
   */
  private readUnit(): W3UUnit {
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

    // Owner (player number)
    const owner = this.readUint32();

    // Unknown bytes
    const unknown1 = this.view.getUint8(this.offset);
    this.offset += 1;

    const unknown2 = this.view.getUint8(this.offset);
    this.offset += 1;

    // Hit points (-1 = default)
    const hitPoints = this.view.getInt32(this.offset, true);
    this.offset += 4;

    // Mana points (-1 = default)
    const manaPoints = this.view.getInt32(this.offset, true);
    this.offset += 4;

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

    // Gold amount (for gold mines)
    const goldAmount = this.readUint32();

    // Target acquisition
    const targetAcquisition = this.readFloat32();

    // Hero level
    const heroLevel = this.readUint32();

    // Hero stats (if hero)
    let heroStrength: number | undefined;
    let heroAgility: number | undefined;
    let heroIntelligence: number | undefined;

    if (heroLevel > 0) {
      heroStrength = this.readUint32();
      heroAgility = this.readUint32();
      heroIntelligence = this.readUint32();
    }

    // Inventory items (for heroes)
    const inventoryItemCount = this.readUint32();
    const inventoryItems: W3UInventoryItem[] = [];

    for (let i = 0; i < inventoryItemCount; i++) {
      inventoryItems.push({
        slot: this.readUint32(),
        itemId: this.read4CC(),
      });
    }

    // Modified abilities
    const modifiedAbilityCount = this.readUint32();
    const modifiedAbilities: W3UModifiedAbility[] = [];

    for (let i = 0; i < modifiedAbilityCount; i++) {
      modifiedAbilities.push({
        abilityId: this.read4CC(),
        active: this.readUint32() === 1,
        level: this.readUint32(),
      });
    }

    // Random flag
    const randomFlag = this.readUint32();

    // Level array (3 bytes: any, normal, hard)
    const level = [
      this.view.getUint8(this.offset),
      this.view.getUint8(this.offset + 1),
      this.view.getUint8(this.offset + 2),
    ];
    this.offset += 3;

    // Item class
    const itemClass = this.view.getUint8(this.offset);
    this.offset += 1;

    // Unit group
    const unitGroup = this.readUint32();

    // Position in group
    const positionInGroup = this.readUint32();

    // Random unit tables
    const randomUnitTableCount = this.readUint32();
    const randomUnitTables: number[] = [];

    for (let i = 0; i < randomUnitTableCount; i++) {
      randomUnitTables.push(this.readUint32());
    }

    // Custom color
    const customColor = this.readUint32();

    // Waygate destination
    const waygateDestination = this.readUint32();

    // Creation number
    const creationNumber = this.readUint32();

    // Editor ID
    const editorId = this.readUint32();

    return {
      typeId,
      variation,
      position,
      rotation,
      scale,
      flags,
      owner,
      unknown1,
      unknown2,
      hitPoints,
      manaPoints,
      itemTable,
      itemSets,
      goldAmount,
      targetAcquisition,
      heroLevel,
      heroStrength,
      heroAgility,
      heroIntelligence,
      inventoryItems,
      modifiedAbilities,
      randomFlag,
      level,
      itemClass,
      unitGroup,
      positionInGroup,
      randomUnitTables,
      customColor,
      waygateDestination,
      creationNumber,
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
