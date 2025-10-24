/**
 * Warcraft 3 (W3X/W3M) map format types
 */

import type { Vector3, RGBA } from '../types';

/**
 * war3map.w3i - Map Info
 */
export interface W3IMapInfo {
  fileVersion: number;
  mapVersion: number;
  editorVersion: number;
  name: string;
  author: string;
  description: string;
  recommendedPlayers: string;
  cameraBounds: Float32Array; // 8 floats
  cameraComplements: number[]; // 4 ints
  playableWidth: number;
  playableHeight: number;
  flags: number;
  mainTileType: string; // 4 chars
  loadingScreen: LoadingScreenInfo;
  prologue: PrologueInfo;
  terrainFog: TerrainFogInfo;
  globalWeather: number;
  customSoundEnvironment: string;
  customLightEnvironment: string;
  waterTintingColor: RGBA;
  players: W3IPlayer[];
  forces: W3IForce[];
  upgradeAvailability: W3IUpgrade[];
  techAvailability: W3ITech[];
  unitTable?: W3IRandomUnitTable; // Optional - not present in older maps
  itemTable?: W3IRandomItemTable; // Optional - not present in older maps
}

/**
 * Loading screen configuration
 */
export interface LoadingScreenInfo {
  screenNumber: number;
  loadingText: string;
  loadingTitle: string;
  loadingSubtitle: string;
  useGameDataSet: number;
}

/**
 * Prologue configuration
 */
export interface PrologueInfo {
  prologueText: string;
  prologueTitle: string;
  prologueSubtitle: string;
}

/**
 * Terrain fog settings
 */
export interface TerrainFogInfo {
  type: number;
  zStart: number;
  zEnd: number;
  density: number;
  color: RGBA;
}

/**
 * Player configuration
 */
export interface W3IPlayer {
  playerNumber: number;
  type: number; // 1=Human, 2=Computer, 3=Neutral, 4=Rescuable
  race: number; // 1=Human, 2=Orc, 3=Undead, 4=Night Elf
  fixedStartPosition: boolean;
  name: string;
  startX: number;
  startY: number;
  allyLowPriorities: number;
  allyHighPriorities: number;
}

/**
 * Force (team) configuration
 */
export interface W3IForce {
  flags: number;
  playerMask: number;
  name: string;
}

/**
 * Upgrade availability
 */
export interface W3IUpgrade {
  playerFlags: number;
  upgradeId: string; // 4 chars
  levelAffected: number;
  availability: number; // 0=unavailable, 1=available, 2=researched
}

/**
 * Tech availability
 */
export interface W3ITech {
  playerFlags: number;
  techId: string; // 4 chars
}

/**
 * Random unit table
 */
export interface W3IRandomUnitTable {
  tables: W3IRandomUnitGroup[];
}

/**
 * Random unit group
 */
export interface W3IRandomUnitGroup {
  groupNumber: number;
  name: string;
  positions: number; // Number of positions
  unitIds: string[]; // Array of 4-char unit IDs
  chances: number[]; // Array of percentages
}

/**
 * Random item table
 */
export interface W3IRandomItemTable {
  tables: W3IRandomItemGroup[];
}

/**
 * Random item group
 */
export interface W3IRandomItemGroup {
  groupNumber: number;
  name: string;
  itemSets: W3IItemSet[];
}

/**
 * Item set
 */
export interface W3IItemSet {
  items: W3IItem[];
}

/**
 * Item
 */
export interface W3IItem {
  itemId: string; // 4 chars
  chance: number; // Percentage
}

/**
 * war3map.w3e - Terrain/Environment
 */
export interface W3ETerrain {
  version: number;
  tileset: string;
  customTileset: boolean;
  groundTextureIds?: string[]; // v11+ texture list
  width: number;
  height: number;
  centerOffset: [number, number]; // [X, Y] offset to center terrain at world origin
  groundTiles: W3EGroundTile[];
  cliffTiles?: W3ECliffTile[];
  blightTextureIndex?: number;
}

/**
 * Ground tile
 */
export interface W3EGroundTile {
  groundHeight: number;
  waterLevel: number;
  flags: number;
  groundTexture: number;
  groundVariation: number;
  cliffLevel: number;
  layerHeight: number;
  cliffTexture: number;
  blight: boolean;
}

/**
 * Cliff tile
 */
export interface W3ECliffTile {
  cliffType: number;
  cliffLevel: number;
  cliffTexture: number;
}

/**
 * war3map.doo - Doodads
 */
export interface W3ODoodads {
  version: number;
  subversion: number;
  doodads: W3ODoodad[];
  specialDoodadVersion?: number;
  specialDoodads?: W3OSpecialDoodad[];
}

/**
 * Doodad placement
 */
export interface W3ODoodad {
  typeId: string; // 4 chars
  variation: number;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  flags: number;
  life: number; // 0-100 percentage
  itemTable: number;
  itemSets: W3OItemSet[];
  editorId: number;
}

/**
 * Special doodad
 */
export interface W3OSpecialDoodad {
  typeId: string;
  z: number;
  editorId: number;
}

/**
 * Item set for doodads
 */
export interface W3OItemSet {
  items: W3ODroppedItem[];
}

/**
 * Dropped item
 */
export interface W3ODroppedItem {
  itemId: string; // 4 chars
  chance: number; // Percentage
}

/**
 * war3mapUnits.doo - Units
 */
export interface W3UUnits {
  version: number;
  subversion: number;
  units: W3UUnit[];
}

/**
 * Unit placement
 */
export interface W3UUnit {
  typeId: string; // 4 chars
  variation: number;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  flags: number;
  owner: number; // Player number
  unknown1: number;
  unknown2: number;
  hitPoints: number; // -1 = default
  manaPoints: number; // -1 = default
  itemTable: number;
  itemSets: W3OItemSet[];
  goldAmount: number; // For gold mines
  targetAcquisition: number;
  heroLevel: number;
  heroStrength?: number;
  heroAgility?: number;
  heroIntelligence?: number;
  inventoryItems: W3UInventoryItem[];
  modifiedAbilities: W3UModifiedAbility[];
  randomFlag: number;
  level: number[]; // 3 bytes: any, normal, hard
  itemClass: number;
  unitGroup: number;
  positionInGroup: number;
  randomUnitTables: number[];
  customColor: number;
  waygateDestination: number;
  creationNumber: number;
  // Reforged v1.32+ fields
  skinId?: string; // Skin override (e.g., "hfoo" for Footman)
}

/**
 * Inventory item
 */
export interface W3UInventoryItem {
  slot: number;
  itemId: string; // 4 chars
}

/**
 * Modified ability
 */
export interface W3UModifiedAbility {
  abilityId: string; // 4 chars
  active: boolean;
  level: number;
}
