/**
 * W3U Parser - Warcraft 3 Units (war3mapUnits.doo)
 * Parses unit placements with full configuration
 */

import type { W3UUnits, W3UUnit, W3UInventoryItem, W3UModifiedAbility } from './types';
import type { W3OItemSet, W3ODroppedItem } from './types';
import type { Vector3 } from '../types';
/* eslint-disable @typescript-eslint/no-unused-vars */

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
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unitCount; i++) {
      const unitStartOffset = this.offset;

      try {
        // Check if we have enough buffer left for at least the minimum unit data
        // Minimum: 4 (typeId) + 4 (variation) + 12 (position) + 4 (rotation) + 12 (scale) + 1 (flags) = 37 bytes
        if (this.offset + 37 > this.view.byteLength) {
          console.warn(
            `[W3UParser] Insufficient buffer for unit ${i + 1}/${unitCount}, stopping parse`
          );
          break;
        }

        const unit = this.readUnit(version, subversion);
        units.push(unit);
        successCount++;
      } catch (error) {
        failCount++;

        // Only log first 5 errors to avoid spam
        if (failCount <= 5) {
          console.warn(
            `[W3UParser] Failed to parse unit ${i + 1}/${unitCount} at offset ${unitStartOffset}:`,
            error
          );
        }

        // Try to recover by skipping ahead
        // Most units are 200-400 bytes, so skip 300 bytes and try to resync
        this.offset = unitStartOffset + 300;

        // If we've exceeded buffer, stop
        if (this.offset >= this.view.byteLength) {
          console.warn(
            `[W3UParser] Exceeded buffer after parse error, stopping at unit ${i + 1}/${unitCount}`
          );
          break;
        }
      }
    }
    return {
      version,
      subversion,
      units,
    };
  }

  /**
   * Read unit placement data
   * @param version - File version (version-specific field handling)
   * @param subversion - File subversion (version-specific field handling)
   */
  private readUnit(version: number, subversion: number): W3UUnit {
    const startOffset = this.offset;
    const DEBUG = false; // Enable for detailed logging

    if (DEBUG)
      console.log(
        `[W3UParser:readUnit] Starting at offset ${startOffset} (v${version}.${subversion})`
      );

    // Type ID (4 chars)
    const typeId = this.read4CC();
    if (DEBUG) console.log(`[W3UParser:readUnit] TypeID: ${typeId}, offset: ${this.offset}`);

    // Variation
    const variation = this.readUint32();
    if (DEBUG) console.log(`[W3UParser:readUnit] Variation: ${variation}, offset: ${this.offset}`);

    // Position
    const position: Vector3 = {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };
    if (DEBUG)
      console.log(
        `[W3UParser:readUnit] Position: (${position.x}, ${position.y}, ${position.z}), offset: ${this.offset}`
      );

    // Rotation (radians)
    const rotation = this.readFloat32();
    if (DEBUG) console.log(`[W3UParser:readUnit] Rotation: ${rotation}, offset: ${this.offset}`);

    // Scale
    const scale: Vector3 = {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };
    if (DEBUG)
      console.log(
        `[W3UParser:readUnit] Scale: (${scale.x}, ${scale.y}, ${scale.z}), offset: ${this.offset}`
      );

    // Flags
    this.checkBounds(1);
    const flags = this.view.getUint8(this.offset);
    this.offset += 1;
    if (DEBUG)
      console.log(`[W3UParser:readUnit] Flags: 0x${flags.toString(16)}, offset: ${this.offset}`);

    // Owner (player number)
    const owner = this.readUint32();
    if (DEBUG) console.log(`[W3UParser:readUnit] Owner: ${owner}, offset: ${this.offset}`);

    // Unknown bytes
    this.checkBounds(2);
    const unknown1 = this.view.getUint8(this.offset);
    this.offset += 1;

    const unknown2 = this.view.getUint8(this.offset);
    this.offset += 1;

    // Hit points (-1 = default)
    this.checkBounds(4);
    const hitPoints = this.view.getInt32(this.offset, true);
    this.offset += 4;

    // Mana points (-1 = default)
    this.checkBounds(4);
    const manaPoints = this.view.getInt32(this.offset, true);
    this.offset += 4;

    // Item table index (-1 = none)
    this.checkBounds(4);
    const itemTable = this.view.getInt32(this.offset, true);
    this.offset += 4;
    if (DEBUG) console.log(`[W3UParser:readUnit] ItemTable: ${itemTable}, offset: ${this.offset}`);

    // Item sets
    const itemSetCount = this.readUint32();
    if (DEBUG)
      console.log(`[W3UParser:readUnit] ItemSetCount: ${itemSetCount}, offset: ${this.offset}`);

    // Sanity check: item set count should be reasonable (< 100)
    if (itemSetCount > 100) {
      throw new Error(
        `Unreasonable itemSetCount: ${itemSetCount} (likely corrupted data or version mismatch)`
      );
    }

    const itemSets: W3OItemSet[] = [];

    for (let i = 0; i < itemSetCount; i++) {
      const items: W3ODroppedItem[] = [];
      const itemCount = this.readUint32();

      if (DEBUG)
        console.log(
          `[W3UParser:readUnit] ItemSet ${i}: itemCount=${itemCount}, offset: ${this.offset}`
        );

      // Sanity check: item count should be reasonable (< 50)
      if (itemCount > 50) {
        throw new Error(`Unreasonable itemCount in set ${i}: ${itemCount} (likely corrupted data)`);
      }

      for (let j = 0; j < itemCount; j++) {
        items.push({
          itemId: this.read4CC(),
          chance: this.readUint32(),
        });
      }

      itemSets.push({ items });
    }

    if (DEBUG) console.log(`[W3UParser:readUnit] Finished item sets, offset: ${this.offset}`);

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
    if (DEBUG)
      console.log(
        `[W3UParser:readUnit] InventoryItemCount: ${inventoryItemCount}, offset: ${this.offset}`
      );

    // Sanity check: inventory should be reasonable (< 20)
    if (inventoryItemCount > 20) {
      throw new Error(
        `Unreasonable inventoryItemCount: ${inventoryItemCount} (likely corrupted data or version mismatch)`
      );
    }

    const inventoryItems: W3UInventoryItem[] = [];

    for (let i = 0; i < inventoryItemCount; i++) {
      inventoryItems.push({
        slot: this.readUint32(),
        itemId: this.read4CC(),
      });
    }

    if (DEBUG) console.log(`[W3UParser:readUnit] Finished inventory items, offset: ${this.offset}`);

    // Modified abilities
    const modifiedAbilityCount = this.readUint32();
    if (DEBUG)
      console.log(
        `[W3UParser:readUnit] ModifiedAbilityCount: ${modifiedAbilityCount}, offset: ${this.offset}`
      );

    // Sanity check: abilities should be reasonable (< 50)
    if (modifiedAbilityCount > 50) {
      throw new Error(
        `Unreasonable modifiedAbilityCount: ${modifiedAbilityCount} (likely corrupted data or version mismatch)`
      );
    }

    const modifiedAbilities: W3UModifiedAbility[] = [];

    for (let i = 0; i < modifiedAbilityCount; i++) {
      modifiedAbilities.push({
        abilityId: this.read4CC(),
        active: this.readUint32() === 1,
        level: this.readUint32(),
      });
    }

    if (DEBUG)
      console.log(`[W3UParser:readUnit] Finished modified abilities, offset: ${this.offset}`);

    // Optional fields (may not exist in all versions)
    let randomFlag = 0;
    let level = [0, 0, 0];
    let itemClass = 0;
    let unitGroup = 0;
    let positionInGroup = 0;
    const randomUnitTables: number[] = [];
    let customColor = -1;
    let waygateDestination = -1;
    let creationNumber = 0;
    let editorId = 0;

    // Try to read optional fields (gracefully handle missing data)
    try {
      // Random flag
      randomFlag = this.readUint32();

      // Level array (3 bytes: any, normal, hard)
      this.checkBounds(3);
      level = [
        this.view.getUint8(this.offset),
        this.view.getUint8(this.offset + 1),
        this.view.getUint8(this.offset + 2),
      ];
      this.offset += 3;

      // Item class
      this.checkBounds(1);
      itemClass = this.view.getUint8(this.offset);
      this.offset += 1;

      // Unit group
      unitGroup = this.readUint32();

      // Position in group
      positionInGroup = this.readUint32();

      // Random unit tables
      const randomUnitTableCount = this.readUint32();
      if (DEBUG)
        console.log(
          `[W3UParser:readUnit] RandomUnitTableCount: ${randomUnitTableCount}, offset: ${this.offset}`
        );

      // Sanity check: random unit tables should be reasonable (< 50)
      if (randomUnitTableCount > 50) {
        throw new Error(
          `Unreasonable randomUnitTableCount: ${randomUnitTableCount} (likely corrupted data or version mismatch)`
        );
      }

      for (let i = 0; i < randomUnitTableCount; i++) {
        randomUnitTables.push(this.readUint32());
      }

      if (DEBUG)
        console.log(`[W3UParser:readUnit] Finished random unit tables, offset: ${this.offset}`);

      // Custom color
      customColor = this.readUint32();

      // Waygate destination
      waygateDestination = this.readUint32();

      // Creation number
      creationNumber = this.readUint32();

      // Editor ID
      editorId = this.readUint32();
    } catch (err) {
      // Optional fields missing - this is OK for older map versions
      if (DEBUG) {
      }
    }

    if (DEBUG) {
      const bytesConsumed = this.offset - startOffset;
    }

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
    this.checkBounds(4);
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
    this.checkBounds(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Helper: Read float32
   */
  private readFloat32(): number {
    this.checkBounds(4);
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Helper: Check if we have enough bytes remaining
   */
  private checkBounds(bytes: number): void {
    if (this.offset + bytes > this.view.byteLength) {
      throw new RangeError(
        `Offset ${this.offset} + ${bytes} exceeds buffer length ${this.view.byteLength}`
      );
    }
  }
}
