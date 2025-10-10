/**
 * EdgeStory Format - Legal, copyright-free RTS map format
 * Based on glTF 2.0 with custom extensions
 */

import type { Vector2, Vector3, RGBA } from '../types';

/**
 * EdgeStory Map - glTF 2.0 based format
 */
export interface EdgeStoryMap {
  // glTF 2.0 base
  asset: {
    version: '2.0';
    generator: string;
    copyright?: string;
  };

  // Extensions
  extensions: {
    EDGE_map_info: EdgeMapInfo;
    EDGE_terrain: EdgeTerrain;
    EDGE_gameplay: EdgeGameplay;
  };

  extensionsUsed: string[];
}

/**
 * Map metadata extension
 */
export interface EdgeMapInfo {
  // Basic info
  name: string;
  author: string;
  description: string;
  version: string;
  created: string; // ISO 8601
  modified: string; // ISO 8601

  // Source info
  sourceFormat?: 'w3x' | 'w3m' | 'scm' | 'scx' | 'native';
  sourceVersion?: string;

  // Map properties
  dimensions: {
    width: number;
    height: number;
    playableWidth: number;
    playableHeight: number;
  };

  // Players
  maxPlayers: number;
  players: EdgePlayer[];
  forces?: EdgeForce[];

  // Environment
  environment: {
    tileset: string;
    lighting?: string;
    weather?: string;
    fog?: EdgeFog;
  };

  // Legal info
  legal: {
    license: string;
    assetSources: EdgeAssetSource[];
    copyrightCompliant: boolean;
    validation: {
      date: string;
      tool: string;
      version: string;
    };
  };
}

/**
 * Player configuration
 */
export interface EdgePlayer {
  id: number;
  name: string;
  type: 'human' | 'computer' | 'neutral';
  race: string;
  team: number;
  color?: RGBA;
  startLocation?: Vector3;
  resources?: Record<string, number>;
}

/**
 * Force (team) configuration
 */
export interface EdgeForce {
  id: number;
  name: string;
  playerIds: number[];
  alliedVictory: boolean;
  alliedDefeat: boolean;
  sharedVision: boolean;
  sharedControl: boolean;
}

/**
 * Fog settings
 */
export interface EdgeFog {
  zStart: number;
  zEnd: number;
  density: number;
  color: RGBA;
}

/**
 * Asset source attribution
 */
export interface EdgeAssetSource {
  assetId: string;
  source: 'original' | 'cc0' | 'ccby' | 'ccbysa' | 'mit' | 'custom';
  license: string;
  author?: string;
  url?: string;
  notes?: string;
}

/**
 * Terrain extension
 */
export interface EdgeTerrain {
  // Heightmap
  heightmap: {
    width: number;
    height: number;
    min: number;
    max: number;
    data: Float32Array;
  };

  // Texture layers
  textureLayers: EdgeTextureLayer[];

  // Water
  water?: EdgeWater;

  // Doodads
  doodads: EdgeDoodad[];

  // Pathing map
  pathingMap?: {
    width: number;
    height: number;
    data: Uint8Array;
  };
}

/**
 * Texture layer
 */
export interface EdgeTextureLayer {
  textureId: string;
  blendMap?: Uint8Array;
  scale?: Vector2;
}

/**
 * Water configuration
 */
export interface EdgeWater {
  level: number;
  color: RGBA;
  shader?: {
    type: 'standard' | 'realistic';
    properties: Record<string, unknown>;
  };
}

/**
 * Doodad placement
 */
export interface EdgeDoodad {
  id: string;
  typeId: string;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  properties?: Record<string, unknown>;
}

/**
 * Gameplay extension
 */
export interface EdgeGameplay {
  units: EdgeUnit[];
  buildings: EdgeBuilding[];
  resources: EdgeResource[];
  triggers?: EdgeTrigger[];
}

/**
 * Unit placement
 */
export interface EdgeUnit {
  id: string;
  typeId: string;
  owner: number;
  position: Vector3;
  rotation: number;
  scale?: Vector3;

  // State
  health?: number;
  mana?: number;
  facing?: number;

  // Properties
  customName?: string;
  customProperties?: Record<string, unknown>;
}

/**
 * Building placement
 */
export interface EdgeBuilding {
  id: string;
  typeId: string;
  owner: number;
  position: Vector3;
  rotation: number;
  health?: number;
}

/**
 * Resource placement
 */
export interface EdgeResource {
  id: string;
  typeId: string;
  position: Vector3;
  amount: number;
}

/**
 * Trigger
 */
export interface EdgeTrigger {
  id: string;
  name: string;
  enabled: boolean;
  conditions: EdgeTriggerCondition[];
  actions: EdgeTriggerAction[];
}

/**
 * Trigger condition
 */
export interface EdgeTriggerCondition {
  type: string;
  params: Record<string, unknown>;
  negate?: boolean;
}

/**
 * Trigger action
 */
export interface EdgeTriggerAction {
  type: string;
  params: Record<string, unknown>;
  delay?: number;
}
