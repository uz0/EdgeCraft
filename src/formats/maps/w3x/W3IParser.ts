/**
 * W3I Parser - Warcraft 3 Map Info (war3map.w3i)
 * Parses map metadata, players, forces, and configuration
 */

import type {
  W3IMapInfo,
  W3IPlayer,
  W3IForce,
  W3IUpgrade,
  W3ITech,
  W3IRandomUnitTable,
  W3IRandomItemTable,
  W3IRandomUnitGroup,
  W3IRandomItemGroup,
} from './types';
import type { RGBA } from '../types';

/**
 * Parse war3map.w3i file
 */
export class W3IParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire w3i file
   */
  public parse(): W3IMapInfo {
    console.error('🚨🚨🚨 NEW W3IPARSER CODE LOADED - REFORGED FIX ACTIVE 🚨🚨🚨');

    // DEBUG: Log first 64 bytes of W3I buffer to diagnose StormJS extraction issue
    const debugView = new Uint8Array(this.buffer, 0, Math.min(64, this.buffer.byteLength));
    const hexDump = Array.from(debugView)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.error(`[W3IParser] First 64 bytes (hex): ${hexDump}`);
    console.error(`[W3IParser] Buffer size: ${this.buffer.byteLength} bytes`);

    this.offset = 0;

    // Read header
    const fileVersion = this.readUint32();
    const mapVersion = this.readUint32();
    const editorVersion = this.readUint32();

    // CRITICAL FIX: Version 28+ has 4 additional game version fields after editorVersion
    // Per HiveWE wiki: gameVersionMajor, gameVersionMinor, gameVersionPatch, gameVersionBuild
    // These are MANDATORY for Reforged maps (version >= 28)
    if (fileVersion >= 28) {
      const gameVersionMajor = this.readUint32();
      const gameVersionMinor = this.readUint32();
      const gameVersionPatch = this.readUint32();
      const gameVersionBuild = this.readUint32();
      console.log(
        `[W3IParser] Reforged format (v${fileVersion}) - Game version: ${gameVersionMajor}.${gameVersionMinor}.${gameVersionPatch}.${gameVersionBuild}`
      );
    }

    // Log version numbers for format detection debugging
    console.log(
      `[W3IParser] Version numbers - fileVersion: ${fileVersion}, mapVersion: ${mapVersion}, editorVersion: ${editorVersion}`
    );

    // Read strings
    const name = this.readString();
    const author = this.readString();
    const description = this.readString();
    const recommendedPlayers = this.readString();

    // Camera bounds (8 floats)
    const cameraBounds = new Float32Array(8);
    for (let i = 0; i < 8; i++) {
      cameraBounds[i] = this.readFloat32();
    }

    // Camera complements (4 ints)
    const cameraComplements = [
      this.readUint32(),
      this.readUint32(),
      this.readUint32(),
      this.readUint32(),
    ];

    // Dimensions
    const playableWidth = this.readUint32();
    const playableHeight = this.readUint32();

    // Flags
    const flags = this.readUint32();

    // Main tile type (4 chars)
    const mainTileType = String.fromCharCode(
      this.view.getUint8(this.offset),
      this.view.getUint8(this.offset + 1),
      this.view.getUint8(this.offset + 2),
      this.view.getUint8(this.offset + 3)
    );
    this.offset += 4;

    // Loading screen
    const loadingScreen = {
      screenNumber: this.readUint32(),
      loadingText: this.readString(),
      loadingTitle: this.readString(),
      loadingSubtitle: this.readString(),
      useGameDataSet: this.readUint32(),
    };

    // Prologue
    const prologue = {
      prologueText: this.readString(),
      prologueTitle: this.readString(),
      prologueSubtitle: this.readString(),
    };

    // Terrain fog
    const terrainFog = {
      type: this.readUint32(),
      zStart: this.readFloat32(),
      zEnd: this.readFloat32(),
      density: this.readFloat32(),
      color: this.readRGBA(),
    };

    // Global weather
    const globalWeather = this.readUint32();

    // Custom environments
    const customSoundEnvironment = this.readString();
    const customLightEnvironment = String.fromCharCode(this.view.getUint8(this.offset));
    this.offset += 1;

    // Water tinting
    const waterTintingColor = this.readRGBA();

    // Players (may be truncated in old/corrupted maps)
    const players: W3IPlayer[] = [];
    try {
      if (this.offset + 4 <= this.buffer.byteLength) {
        const playerCount = this.readUint32();
        for (let i = 0; i < playerCount; i++) {
          if (this.offset + 40 > this.buffer.byteLength) {
            console.warn(`[W3IParser] Insufficient buffer for player ${i}/${playerCount}`);
            break;
          }
          players.push(this.readPlayer());
        }
      }
    } catch (err) {
      console.warn('[W3IParser] Error reading players (map may be truncated):', err);
    }

    // Forces (may be truncated in old/corrupted maps)
    const forces: W3IForce[] = [];
    try {
      if (this.offset + 4 <= this.buffer.byteLength) {
        const forceCount = this.readUint32();
        for (let i = 0; i < forceCount; i++) {
          if (this.offset + 12 > this.buffer.byteLength) {
            console.warn(`[W3IParser] Insufficient buffer for force ${i}/${forceCount}`);
            break;
          }
          forces.push(this.readForce());
        }
      }
    } catch (err) {
      console.warn('[W3IParser] Error reading forces (map may be truncated):', err);
    }

    // All remaining fields are optional and may not be present
    // Wrap in try-catch to handle truncated files gracefully
    const upgradeAvailability: W3IUpgrade[] = [];
    const techAvailability: W3ITech[] = [];
    let unitTable: W3IRandomUnitTable | undefined;
    let itemTable: W3IRandomItemTable | undefined;

    try {
      // Upgrade availability (optional - may not be present in some maps)
      if (this.offset + 4 <= this.buffer.byteLength) {
        const upgradeCount = this.readUint32();
        for (let i = 0; i < upgradeCount; i++) {
          // Check if we have enough buffer for this upgrade entry (4 + 4 + 4 + 4 = 16 bytes)
          if (this.offset + 16 > this.buffer.byteLength) {
            console.warn(
              `[W3IParser] Insufficient buffer for upgrade ${i}/${upgradeCount} at offset ${this.offset}`
            );
            break;
          }
          upgradeAvailability.push({
            playerFlags: this.readUint32(),
            upgradeId: this.read4CC(),
            levelAffected: this.readUint32(),
            availability: this.readUint32(),
          });
        }
      }

      // Tech availability (optional - may not be present in some maps)
      if (this.offset + 4 <= this.buffer.byteLength) {
        const techCount = this.readUint32();
        for (let i = 0; i < techCount; i++) {
          // Check if we have enough buffer for this tech entry (4 + 4 = 8 bytes)
          if (this.offset + 8 > this.buffer.byteLength) {
            console.warn(
              `[W3IParser] Insufficient buffer for tech ${i}/${techCount} at offset ${this.offset}`
            );
            break;
          }
          techAvailability.push({
            playerFlags: this.readUint32(),
            techId: this.read4CC(),
          });
        }
      }

      // Random unit tables (optional - may not be present in older maps)
      if (this.offset + 4 <= this.buffer.byteLength) {
        try {
          unitTable = this.readRandomUnitTable();
        } catch (err) {
          console.warn('[W3IParser] Failed to read random unit table (optional field):', err);
          unitTable = undefined;
        }
      }

      // Random item tables (optional - may not be present in older maps)
      if (this.offset + 4 <= this.buffer.byteLength) {
        try {
          itemTable = this.readRandomItemTable();
        } catch (err) {
          console.warn('[W3IParser] Failed to read random item table (optional field):', err);
          itemTable = undefined;
        }
      }
    } catch (err) {
      // If any error occurs reading optional fields, log but continue
      console.warn('[W3IParser] Error reading optional fields (this is OK for older maps):', err);
    }

    return {
      fileVersion,
      mapVersion,
      editorVersion,
      name,
      author,
      description,
      recommendedPlayers,
      cameraBounds,
      cameraComplements,
      playableWidth,
      playableHeight,
      flags,
      mainTileType,
      loadingScreen,
      prologue,
      terrainFog,
      globalWeather,
      customSoundEnvironment,
      customLightEnvironment,
      waterTintingColor,
      players,
      forces,
      upgradeAvailability,
      techAvailability,
      unitTable,
      itemTable,
    };
  }

  /**
   * Read player data
   */
  private readPlayer(): W3IPlayer {
    const playerNumber = this.readUint32();
    const type = this.readUint32();
    const race = this.readUint32();
    const fixedStartPosition = this.readUint32() === 1;
    const name = this.readString();
    const startX = this.readFloat32();
    const startY = this.readFloat32();
    const allyLowPriorities = this.readUint32();
    const allyHighPriorities = this.readUint32();

    return {
      playerNumber,
      type,
      race,
      fixedStartPosition,
      name,
      startX,
      startY,
      allyLowPriorities,
      allyHighPriorities,
    };
  }

  /**
   * Read force (team) data
   */
  private readForce(): W3IForce {
    const flags = this.readUint32();
    const playerMask = this.readUint32();
    const name = this.readString();

    return {
      flags,
      playerMask,
      name,
    };
  }

  /**
   * Read random unit table
   */
  private readRandomUnitTable(): W3IRandomUnitTable {
    const tableCount = this.readUint32();
    const tables: W3IRandomUnitGroup[] = [];

    for (let i = 0; i < tableCount; i++) {
      const groupNumber = this.readUint32();
      const name = this.readString();
      const positions = this.readUint32();

      const unitIds = [];
      const chances = [];

      for (let j = 0; j < positions; j++) {
        const unitTypeCount = this.readUint32();
        for (let k = 0; k < unitTypeCount; k++) {
          unitIds.push(this.read4CC());
          chances.push(this.readUint32());
        }
      }

      tables.push({
        groupNumber,
        name,
        positions,
        unitIds,
        chances,
      });
    }

    return { tables };
  }

  /**
   * Read random item table
   */
  private readRandomItemTable(): W3IRandomItemTable {
    const tableCount = this.readUint32();
    const tables: W3IRandomItemGroup[] = [];

    for (let i = 0; i < tableCount; i++) {
      const groupNumber = this.readUint32();
      const name = this.readString();
      const itemSetCount = this.readUint32();

      const itemSets = [];
      for (let j = 0; j < itemSetCount; j++) {
        const itemCount = this.readUint32();
        const items = [];

        for (let k = 0; k < itemCount; k++) {
          items.push({
            itemId: this.read4CC(),
            chance: this.readUint32(),
          });
        }

        itemSets.push({ items });
      }

      tables.push({
        groupNumber,
        name,
        itemSets,
      });
    }

    return { tables };
  }

  /**
   * Helper: Check if we can read 'size' bytes from current offset
   */
  private checkBounds(size: number): void {
    if (this.offset + size > this.buffer.byteLength) {
      throw new Error(
        `W3I read would exceed buffer bounds: offset=${this.offset}, size=${size}, bufferLength=${this.buffer.byteLength}`
      );
    }
  }

  /**
   * Helper: Read null-terminated string
   */
  private readString(): string {
    const bytes = [];
    while (this.offset < this.buffer.byteLength) {
      this.checkBounds(1);
      const byte = this.view.getUint8(this.offset);
      this.offset++;
      if (byte === 0) break;
      bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
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
   * Helper: Read RGBA color
   */
  private readRGBA(): RGBA {
    this.checkBounds(4);
    const r = this.view.getUint8(this.offset);
    const g = this.view.getUint8(this.offset + 1);
    const b = this.view.getUint8(this.offset + 2);
    const a = this.view.getUint8(this.offset + 3);
    this.offset += 4;
    return { r, g, b, a };
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
}
