/**
 * Common types for map loading system
 * Supports W3X/W3M (Warcraft 3), SCM/SCX (StarCraft 1), and SC2Map (StarCraft 2) formats
 */

/**
 * Base interface for all map loaders
 */
export interface IMapLoader {
  /**
   * Parse a map file
   * @param file - Map file (W3X, W3M, SCM, SCX)
   * @returns Raw map data
   */
  parse(file: File | ArrayBuffer): Promise<RawMapData>;
}

/**
 * Raw map data from any source format
 */
export interface RawMapData {
  format: 'w3x' | 'w3m' | 'w3n' | 'scm' | 'scx' | 'sc2map';
  info: MapInfo;
  terrain: TerrainData;
  units: UnitPlacement[];
  doodads: DoodadPlacement[];
  triggers?: TriggerData[];
  scripts?: ScriptData[];
}

/**
 * Map metadata
 */
export interface MapInfo {
  name: string;
  author: string;
  description: string;
  version?: string;
  players: PlayerInfo[];
  forces?: ForceInfo[];
  dimensions: {
    width: number;
    height: number;
    playableWidth?: number;
    playableHeight?: number;
  };
  environment: {
    tileset: string;
    lighting?: string;
    weather?: string;
    fog?: FogInfo;
  };
}

/**
 * Player configuration
 */
export interface PlayerInfo {
  id: number;
  name: string;
  type: 'human' | 'computer' | 'neutral';
  race: string;
  team?: number;
  color?: RGBA;
  startLocation?: Vector3;
  resources?: Record<string, number>;
}

/**
 * Team/force configuration
 */
export interface ForceInfo {
  id: number;
  name: string;
  playerIds: number[];
  alliedVictory?: boolean;
  alliedDefeat?: boolean;
  sharedVision?: boolean;
  sharedControl?: boolean;
}

/**
 * Fog settings
 */
export interface FogInfo {
  zStart: number;
  zEnd: number;
  density: number;
  color: RGBA;
}

/**
 * Terrain data
 */
export interface TerrainData {
  width: number;
  height: number;
  heightmap: Float32Array;
  textures: TerrainTexture[];
  textureIndices?: Uint8Array;
  water?: WaterData;
  cliffs?: CliffData[];
  pathingMap?: Uint8Array;
  raw?: unknown;
}

/**
 * Terrain texture layer
 */
export interface TerrainTexture {
  id: string;
  path?: string;
  blendMap?: Uint8Array;
  scale?: Vector2;
}

/**
 * Water configuration
 */
export interface WaterData {
  level: number;
  color: RGBA;
  tintColor?: RGBA;
}

/**
 * Cliff data
 */
export interface CliffData {
  type: string;
  level: number;
  texture: string;
  x: number;
  y: number;
}

/**
 * Unit placement
 */
export interface UnitPlacement {
  id: string;
  typeId: string;
  owner: number;
  position: Vector3;
  rotation: number;
  scale?: Vector3;
  health?: number;
  mana?: number;
  customName?: string;
  customProperties?: Record<string, unknown>;
}

/**
 * Doodad (decoration) placement
 */
export interface DoodadPlacement {
  id: string;
  typeId: string;
  variation?: number;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  life?: number;
  flags?: number;
}

/**
 * Trigger system data
 */
export interface TriggerData {
  id: string;
  name: string;
  enabled: boolean;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  type: string;
  params: Record<string, unknown>;
  negate?: boolean;
}

/**
 * Trigger action
 */
export interface TriggerAction {
  type: string;
  params: Record<string, unknown>;
  delay?: number;
}

/**
 * Script data
 */
export interface ScriptData {
  language: 'jass' | 'galaxy' | 'unknown';
  source: string;
  transpiled?: string;
}

/**
 * Common vector types
 */
export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * RGBA color
 */
export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-255
}

/**
 * Map loader result
 */
export interface MapLoadResult {
  success: boolean;
  map?: RawMapData;
  error?: string;
}

/**
 * Parse options
 */
export interface ParseOptions {
  extractScripts?: boolean;
  extractTriggers?: boolean;
  validateAssets?: boolean;
  convertAssets?: boolean;
}
