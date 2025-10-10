/**
 * StarCraft 1 (SCM/SCX) map format types
 * CHK format - chunk-based structure
 */

/**
 * CHK Map - Complete map data
 */
export interface CHKMap {
  // Essential chunks
  VER?: CHKVersion;
  DIM?: CHKDimensions;
  ERA?: CHKTileset;
  MTXM?: CHKTileMap;
  UNIT?: CHKUnits;
  SPRP?: CHKScenario;

  // Optional chunks
  OWNR?: CHKOwners;
  SIDE?: CHKRaces;
  FORC?: CHKForces;
  STR?: CHKStrings;
  UPRP?: CHKCUWP;
}

/**
 * VER - Version
 */
export interface CHKVersion {
  version: number; // 59 = 1.04, 63 = BW
}

/**
 * DIM - Dimensions
 */
export interface CHKDimensions {
  width: number;
  height: number;
}

/**
 * ERA - Tileset
 */
export interface CHKTileset {
  tileset: string;
}

/**
 * MTXM - Tile Map
 */
export interface CHKTileMap {
  tiles: Uint16Array;
}

/**
 * UNIT - Units
 */
export interface CHKUnits {
  units: CHKUnit[];
}

/**
 * Unit placement
 */
export interface CHKUnit {
  classInstance: number;
  x: number; // In pixels (32 pixels = 1 tile)
  y: number; // In pixels
  unitId: number;
  relationToPlayer: number;
  validStateFlags: number;
  validProperties: number;
  owner: number; // Player index
  hitPoints: number; // Percentage
  shieldPoints: number; // Percentage
  energy: number; // Percentage
  resourceAmount: number; // For resource units
  hangarCount: number;
  stateFlags: number;
  unused: number;
  relationClassInstance: number;
}

/**
 * SPRP - Scenario Properties
 */
export interface CHKScenario {
  scenarioName: string;
  description: string;
}

/**
 * OWNR - Player Owners
 */
export interface CHKOwners {
  owners: number[]; // 12 players
}

/**
 * SIDE - Player Races
 */
export interface CHKRaces {
  races: number[]; // 12 players
}

/**
 * FORC - Forces (Teams)
 */
export interface CHKForces {
  forces: CHKForce[];
}

/**
 * Force configuration
 */
export interface CHKForce {
  forceString: number;
  forceFlags: number;
  players: number[]; // Player mask
}

/**
 * STR - String Data
 */
export interface CHKStrings {
  strings: string[];
}

/**
 * UPRP - CUWP Slots
 */
export interface CHKCUWP {
  slots: CHKCUWPSlot[];
}

/**
 * CUWP Slot (Create Unit with Properties)
 */
export interface CHKCUWPSlot {
  validFlags: number;
  owner: number;
  hitPoints: number;
  shieldPoints: number;
  energy: number;
  resourceAmount: number;
  hangarCount: number;
  flags: number;
  unused: number;
}
