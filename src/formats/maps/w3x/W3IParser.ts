/**
 * W3I Parser - Warcraft 3 Map Info (war3map.w3i)
 * Parses map metadata, players, forces, and configuration
 */

import type { W3IMapInfo, W3IPlayer, W3IForce } from './types';
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
    this.offset = 0;

    // Read header
    const fileVersion = this.readUint32();
    const mapVersion = this.readUint32();
    const editorVersion = this.readUint32();

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

    // Players
    const playerCount = this.readUint32();
    const players: W3IPlayer[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push(this.readPlayer());
    }

    // Forces
    const forceCount = this.readUint32();
    const forces: W3IForce[] = [];
    for (let i = 0; i < forceCount; i++) {
      forces.push(this.readForce());
    }

    // Upgrade availability
    const upgradeCount = this.readUint32();
    const upgradeAvailability = [];
    for (let i = 0; i < upgradeCount; i++) {
      upgradeAvailability.push({
        playerFlags: this.readUint32(),
        upgradeId: this.read4CC(),
        levelAffected: this.readUint32(),
        availability: this.readUint32(),
      });
    }

    // Tech availability
    const techCount = this.readUint32();
    const techAvailability = [];
    for (let i = 0; i < techCount; i++) {
      techAvailability.push({
        playerFlags: this.readUint32(),
        techId: this.read4CC(),
      });
    }

    // Random unit tables
    const unitTable = this.readRandomUnitTable();

    // Random item tables
    const itemTable = this.readRandomItemTable();

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
  private readRandomUnitTable() {
    const tableCount = this.readUint32();
    const tables = [];

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
  private readRandomItemTable() {
    const tableCount = this.readUint32();
    const tables = [];

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
   * Helper: Read null-terminated string
   */
  private readString(): string {
    const bytes = [];
    while (this.offset < this.buffer.byteLength) {
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
