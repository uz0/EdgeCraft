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
  private formatVersion: 'classic' | 'reforged' = 'classic';
  private currentUnitNumber: number = 0;
  private isDetectingFormat: boolean = false; // Track if we're in format detection mode

  // W3do magic (same as doodads)
  private static readonly W3DO_MAGIC = 'W3do';

  constructor(buffer: ArrayBuffer, formatVersion?: 'classic' | 'reforged') {
    this.view = new DataView(buffer);
    if (formatVersion) {
      this.formatVersion = formatVersion;
    }
  }

  /**
   * Detect format version using WC3MapSpecification-compliant multi-strategy approach
   *
   * SPECIFICATION REFERENCE: https://github.com/ChiefOfGxBxL/WC3MapSpecification
   *
   * CRITICAL FACTS:
   * 1. W3U format version (in war3mapUnits.doo) is INDEPENDENT of W3I file version
   * 2. Reforged (v1.32+) added skinId (4 bytes) + 12 bytes padding = 16 total bytes
   * 3. This padding appears AFTER the standard fields, but version number wasn't incremented
   * 4. We CANNOT rely on file version number - must use heuristic detection
   *
   * MULTI-STRATEGY APPROACH:
   * Strategy 1: Try parsing 3 units as CLASSIC, check if all succeed
   * Strategy 2: Try parsing 3 units as REFORGED, check if all succeed
   * Strategy 3: Parse first unit as CLASSIC, check next TypeID at both +0 and +16 offsets
   * Strategy 4: If all fail, make educated guess based on file version range
   */
  private detectFormatVersion(version: number, subversion: number): 'classic' | 'reforged' {
    const startOffset = this.offset;

    // CRITICAL: Set detection flag to prevent gap skip during format detection
    // The gap skip will be undone when we reset offset, so we must NOT apply it during detection
    this.isDetectingFormat = true;

    // STRATEGY 1: Try parsing 3 units as CLASSIC
    let classicSuccess = 0;
    try {
      this.offset = startOffset;
      this.formatVersion = 'classic';

      const maxUnitsToTest = Math.min(3, 5); // Test up to 3 units

      for (let i = 0; i < maxUnitsToTest; i++) {
        const offsetBefore = this.offset;
        try {
          const unit = this.readUnit(version, subversion);
          const _bytesConsumed = this.offset - offsetBefore;

          if (unit.typeId && unit.typeId.length === 4) {
            classicSuccess++;
          } else {
            break;
          }
        } catch (err) {
          const _errorMsg = err instanceof Error ? err.message : String(err);
          break;
        }
      }
    } catch (err) {}

    // STRATEGY 2: Try parsing 3 units as REFORGED
    let reforgedSuccess = 0;
    try {
      this.offset = startOffset;
      this.formatVersion = 'reforged';

      const maxUnitsToTest = Math.min(3, 5); // Test up to 3 units

      for (let i = 0; i < maxUnitsToTest; i++) {
        const offsetBefore = this.offset;
        try {
          const unit = this.readUnit(version, subversion);
          const _bytesConsumed = this.offset - offsetBefore;

          if (unit.typeId && unit.typeId.length === 4) {
            reforgedSuccess++;
          } else {
            break;
          }
        } catch (err) {
          const _errorMsg = err instanceof Error ? err.message : String(err);
          break;
        }
      }
    } catch (err) {
      const _errorMsg = err instanceof Error ? err.message : String(err);
    }

    // Reset to start
    this.offset = startOffset;

    // DECISION LOGIC:
    // - If CLASSIC parsed all 3 units and REFORGED parsed 0-1: CLASSIC
    // - If REFORGED parsed all 3 units and CLASSIC parsed 0-1: REFORGED
    // - If both parsed successfully: Prefer REFORGED (more common in modern maps)
    // - If neither parsed successfully: Try Strategy 3 (next TypeID check)

    if (classicSuccess >= 3 && reforgedSuccess < 2) {
      this.formatVersion = 'classic';
      this.isDetectingFormat = false;
      return 'classic';
    } else if (reforgedSuccess >= 3 && classicSuccess < 2) {
      this.formatVersion = 'reforged';
      this.isDetectingFormat = false;
      return 'reforged';
    } else if (classicSuccess >= 2 && reforgedSuccess >= 2) {
      // Both work - prefer Reforged for modern maps
      this.formatVersion = 'reforged';
      this.isDetectingFormat = false;
      return 'reforged';
    }

    // STRATEGY 3: Parse first unit as CLASSIC, check next TypeID at +0 and +16

    try {
      this.offset = startOffset;
      this.formatVersion = 'classic';

      this.readUnit(version, subversion); // Read first unit to advance offset
      const firstUnitEnd = this.offset;

      // Check TypeID at both offsets
      const isValidTypeID = (offset: number): boolean => {
        if (offset + 4 > this.view.byteLength) return false;

        const chars = [
          this.view.getUint8(offset),
          this.view.getUint8(offset + 1),
          this.view.getUint8(offset + 2),
          this.view.getUint8(offset + 3),
        ];

        // TypeIDs are alphanumeric or space
        return chars.every(
          (c) =>
            (c >= 65 && c <= 90) || // A-Z
            (c >= 97 && c <= 122) || // a-z
            (c >= 48 && c <= 57) || // 0-9
            c === 32 // space
        );
      };

      const classicOffsetValid = isValidTypeID(firstUnitEnd);
      const reforgedOffsetValid = isValidTypeID(firstUnitEnd + 16);

      if (reforgedOffsetValid && !classicOffsetValid) {
        this.offset = startOffset;
        this.formatVersion = 'reforged';
        this.isDetectingFormat = false;
        return 'reforged';
      } else if (classicOffsetValid && !reforgedOffsetValid) {
        this.offset = startOffset;
        this.formatVersion = 'classic';
        this.isDetectingFormat = false;
        return 'classic';
      }
    } catch (err) {}

    // STRATEGY 4: Educated guess based on version ranges (per WC3MapSpecification)
    // Classic: version <= 27
    // Reforged: version >= 28
    // Ambiguous: version = 25 (TFT era, but some maps may have Reforged padding)

    this.offset = startOffset;

    // Reset detection flag before returning
    this.isDetectingFormat = false;

    if (version >= 28) {
      this.formatVersion = 'reforged';
      return 'reforged';
    } else {
      this.formatVersion = 'classic';
      return 'classic';
    }
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

    // Detect format version (Classic vs Reforged) by parsing first unit
    // CRITICAL: Only auto-detect if format was NOT explicitly provided to constructor
    const formatWasExplicitlySet = this.formatVersion !== 'classic'; // Constructor defaults to 'classic'

    if (unitCount > 0 && !formatWasExplicitlySet) {
      this.formatVersion = this.detectFormatVersion(version, subversion);
    } else if (formatWasExplicitlySet) {
    } else {
    }

    const units: W3UUnit[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unitCount; i++) {
      const unitStartOffset = this.offset;

      try {
        // Set current unit number for DEBUG logging
        this.currentUnitNumber = i + 1;

        // Check if we have enough buffer left for at least the minimum unit data
        // Minimum: 4 (typeId) + 4 (variation) + 12 (position) + 4 (rotation) + 12 (scale) + 1 (flags) = 37 bytes
        if (this.offset + 37 > this.view.byteLength) {
          break;
        }

        const unit = this.readUnit(version, subversion);

        // Skip units marked with typeId='SKIP' (invalid randomUnitTableCount recovery)
        if (unit.typeId === 'SKIP') {
          continue;
        }

        units.push(unit);
        successCount++;

        // Log the first successful parse with details
        if (successCount === 1) {
          const _bytesConsumed = this.offset - unitStartOffset;
        }
      } catch (error) {
        failCount++;

        // Log detailed error information for the first few failures
        if (failCount <= 3) {
          const _errorMsg = error instanceof Error ? error.message : String(error);

          // If this is the very first unit and it fails, the format is likely incompatible
          if (i === 0) {
          }
        }

        // IMPROVED: Instead of blind 300-byte skip, stop after 5 consecutive failures
        // This prevents cascading errors from corrupting the entire parse
        if (failCount > 5 && successCount === 0) {
          break;
        }

        // If we've exceeded buffer, stop
        if (this.offset >= this.view.byteLength) {
          break;
        }
      }
    }

    // Log first unit details for verification
    if (units.length > 0) {
      const first = units[0];
      if (first) {
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
   * @param version - File version (used for version-specific parsing)
   * @param subversion - File subversion (used for version-specific parsing)
   */
  private readUnit(version: number, subversion: number): W3UUnit {
    const startOffset = this.offset;

    // Get current unit number from parse() method context
    const _unitNum = this.currentUnitNumber || 0;

    // Only log for units 6 and 7 to reduce noise
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
    this.checkBounds(1);
    const flags = this.view.getUint8(this.offset);
    this.offset += 1;

    // CRITICAL FIX: Unknown int32 field between flags and owner (discovered from wc3maptranslator line 121)
    const _unknownInt = this.readUint32();

    // Owner (player number)
    const owner = this.readUint32();

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
    const itemTable = this.view.getInt32(this.offset, true);
    this.offset += 4;

    // Item sets
    const itemSetCountRaw = this.readUint32();

    // CRITICAL FIX: 0xFFFFFFFF (-1 as signed int) means "no item sets" or "default"
    const itemSetCount = itemSetCountRaw === 0xffffffff ? 0 : itemSetCountRaw;

    // Sanity check: item set count should be reasonable (< 100)
    // But AFTER converting sentinel value to 0
    if (itemSetCount > 100) {
      throw new Error(
        `Unreasonable itemSetCount: ${itemSetCount} (likely corrupted data or version mismatch)`
      );
    }

    const itemSets: W3OItemSet[] = [];

    for (let i = 0; i < itemSetCount; i++) {
      const items: W3ODroppedItem[] = [];
      const itemCountRaw = this.readUint32();

      // CRITICAL FIX: Sentinel values mean "no items" or "default"
      // 0xFFFFFFFF (-1) and 0x80000000 (INT_MIN) are both sentinel values
      const itemCount =
        itemCountRaw === 0xffffffff || itemCountRaw === 0x80000000 ? 0 : itemCountRaw;

      // Sanity check: item count should be reasonable (< 50)
      // But AFTER converting sentinel values to 0
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

    // Gold amount (for gold mines)
    const goldAmount = this.readUint32();

    // Target acquisition
    const targetAcquisition = this.readFloat32();

    // Hero level
    const heroLevel = this.readUint32();

    // Hero stats - ALWAYS read these 3 fields (12 bytes total)
    // CRITICAL FIX: wc3maptranslator ALWAYS reads these fields regardless of heroLevel
    // Even non-hero units have these fields in the binary format
    const heroStrength = this.readUint32();
    const heroAgility = this.readUint32();
    const heroIntelligence = this.readUint32();

    // Inventory items (for heroes)
    const inventoryItemCountRaw = this.readUint32();

    // CRITICAL FIX: 0xFFFFFFFF (-1 as signed int) means "no items" or "default"
    // This is a WC3 sentinel value, NOT corrupted data!
    const inventoryItemCount = inventoryItemCountRaw === 0xffffffff ? 0 : inventoryItemCountRaw;

    // Sanity check: inventory should be reasonable (< 20)
    // But AFTER converting sentinel value to 0
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

    // Modified abilities
    const modifiedAbilityCountRaw = this.readUint32();

    // CRITICAL FIX: 0xFFFFFFFF (-1 as signed int) means "no abilities" or "default"
    const modifiedAbilityCount =
      modifiedAbilityCountRaw === 0xffffffff ? 0 : modifiedAbilityCountRaw;

    // Sanity check: abilities should be reasonable (< 50)
    // But AFTER converting sentinel value to 0
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

    // Random flag
    const randomFlag = this.readUint32();

    // CRITICAL FIX: Branch logic based on randomFlag value (from wc3maptranslator)
    // randFlag values:
    //   0 = Any neutral passive building/item (read 4 bytes: level[3] + itemClass)
    //   1 = Random unit from random group (read 8 bytes: unitGroup + positionInGroup)
    //   2 = Random unit from custom table (read variable: numUnits + [unitId + chance] * numUnits)

    let level: number[] = [0, 0, 0];
    let itemClass = 0;
    let unitGroup = 0;
    let positionInGroup = 0;
    let randomUnitTables: number[] = []; // Store custom table data for randFlag=2

    if (randomFlag === 0) {
      // 0 = Any neutral passive building/item
      // byte[3]: level of the random unit/item, -1 = any (24-bit number)
      // byte: item class of the random item, 0 = any, 1 = permanent
      // (also applies to non-random units, so we have these 4 bytes anyway)
      this.checkBounds(4);
      level = [
        this.view.getUint8(this.offset),
        this.view.getUint8(this.offset + 1),
        this.view.getUint8(this.offset + 2),
      ];
      this.offset += 3;
      itemClass = this.view.getUint8(this.offset);
      this.offset += 1;
    } else if (randomFlag === 1) {
      // 1 = Random unit from random group (defined in w3i)
      // int: unit group number (which group from global table)
      // int: position number (which column of this group)
      unitGroup = this.readUint32();
      positionInGroup = this.readUint32();
    } else if (randomFlag === 2) {
      // 2 = Random unit from custom table
      // int: number "n" of different available units
      // then n times: [4-char unitId + int chance]
      const randomUnitTableCount = this.readUint32();

      // Sanity check
      if (randomUnitTableCount > 200) {
        throw new Error(
          `Unreasonable randomUnitTableCount: ${randomUnitTableCount} (likely corrupted data)`
        );
      }

      // Read and store the custom table data
      randomUnitTables = [];
      for (let i = 0; i < randomUnitTableCount; i++) {
        this.read4CC(); // Unit ID (4 chars) - read and discard for now
        const chance = this.readUint32(); // % chance
        // Store as single uint32 for now (we're not using this data yet)
        // TODO: Parse properly if needed later
        randomUnitTables.push(chance);
      }
    }

    // Final 3 fields (always present in v8+)
    // CRITICAL FIX: wc3maptranslator only reads 3 fields here (color, waygate, id), NOT 4!
    // DO NOT read editorId - that field doesn't exist!
    let customColor = -1;
    let waygateDestination = -1;
    let creationNumber = 0;

    // Only parse these fields if we have enough buffer space
    // Some older maps (ROC era) don't have these fields
    try {
      if (this.offset + 12 <= this.view.byteLength) {
        // Custom color
        customColor = this.readUint32();

        // Waygate destination
        waygateDestination = this.readUint32();

        // Creation number (called "id" in wc3maptranslator)
        creationNumber = this.readUint32();
      } else {
        // Not enough space for optional fields - likely an older format
      }
    } catch (error) {
      // Optional fields failed - this is okay for older formats
    }

    // Reforged-specific fields (v1.32+)
    // CRITICAL: Blizzard added skinId (4 bytes) + padding (12 bytes) in v1.32
    // WITHOUT incrementing version number, creating a 16-byte gap between units
    //
    // STRATEGY: If format is detected as Reforged, ALWAYS skip 16 bytes
    // Try to parse skinId if possible, but skip 16 bytes regardless
    let skinId: string | undefined;

    if (this.formatVersion === 'reforged') {
      const offsetBeforePadding = this.offset;

      // REFORGED FORMAT: Always skip 16 bytes after standard fields
      // CRITICAL BUG FIX: read4CC() increments offset by 4, so we ALWAYS need to skip 12 MORE bytes
      try {
        // Try to read skinId (4 bytes) - read4CC() increments offset automatically
        if (this.offset + 4 <= this.view.byteLength) {
          const potentialSkinId = this.read4CC(); // This ALREADY increments offset by 4!

          // Validate: skinId should be printable ASCII (like type IDs)
          const isValidSkinId = potentialSkinId.split('').every((c) => {
            const code = c.charCodeAt(0);
            return (
              (code >= 65 && code <= 90) || // A-Z
              (code >= 97 && code <= 122) || // a-z
              (code >= 48 && code <= 57) || // 0-9
              code === 32 || // space
              code === 0 // null terminator
            );
          });

          if (isValidSkinId) {
            skinId = potentialSkinId;
          } else {
          }
        }

        // CRITICAL FIX: read4CC() already incremented offset by 4, so skip 12 MORE bytes (not 16!)
        // Total padding = 16 bytes, but 4 already consumed by read4CC()
        const remainingPadding = 12; // Always 12 bytes remaining after read4CC()
        if (this.offset + remainingPadding <= this.view.byteLength) {
          this.offset += remainingPadding;
        }
      } catch (error) {
        // If any Reforged field reading fails, skip remaining bytes to maintain alignment
        // If we got here, read4CC() may or may not have been called
        // Check current offset vs offsetBeforePadding to determine bytes already read
        const bytesAlreadyRead = this.offset - offsetBeforePadding;
        const remainingSkip = 16 - bytesAlreadyRead;
        if (this.offset + remainingSkip <= this.view.byteLength) {
          this.offset += remainingSkip;
        }
      }

      const offsetAfterPadding = this.offset;
      const _totalSkipped = offsetAfterPadding - offsetBeforePadding;
    } else {
      // VERSION 8.11 SUFFIX - Classic maps have a 111-byte suffix at the END of each unit
      // CRITICAL DISCOVERY: Binary analysis shows Unit 2 starts 111 bytes AFTER where parser thinks Unit 1 ends!
      // The suffix structure:
      //   - TypeID duplicate (4 bytes) - same TypeID as start of unit
      //   - 107 bytes of unknown data (possibly editor metadata, map triggers, etc.)
      // This is NOT a gap BETWEEN units - it's missing data at the END of each unit!
      if (
        !this.isDetectingFormat &&
        version === 8 &&
        subversion === 11 &&
        this.formatVersion === 'classic'
      ) {
        const _offsetBeforeSuffix = this.offset;
        const suffixSize = 111;

        if (this.offset + suffixSize <= this.view.byteLength) {
          // Read TypeID duplicate for verification
          const duplicateTypeId = this.read4CC();

          if (duplicateTypeId === typeId) {
          } else {
          }

          // Skip remaining 107 bytes of suffix (already read 4 bytes for TypeID)
          const remainingSuffixBytes = suffixSize - 4;
          if (this.offset + remainingSuffixBytes <= this.view.byteLength) {
            this.offset += remainingSuffixBytes;
          }
        } else {
        }
      }
    }

    const _bytesConsumed = this.offset - startOffset;

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
      skinId, // Reforged v1.32+ field
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
