/**
 * W3N Campaign file format types
 * Used for Warcraft 3 Campaign files (.w3n)
 */

import type { RGBA } from '../types';

/**
 * Campaign difficulty flags
 */
export enum CampaignDifficulty {
  FIXED_W3M = 0, // Fixed Difficulty, Only w3m maps
  VARIABLE_W3M = 1, // Variable Difficulty, Only w3m maps
  FIXED_W3X = 2, // Fixed Difficulty, Contains w3x maps
  VARIABLE_W3X = 3, // Variable Difficulty, Contains w3x maps
}

/**
 * Campaign info from war3campaign.w3f
 */
export interface W3FCampaignInfo {
  /** File format version */
  formatVersion: number;

  /** Campaign version (save count) */
  campaignVersion: number;

  /** Editor version used to save */
  editorVersion: number;

  /** Campaign name */
  name: string;

  /** Campaign difficulty description */
  difficulty: string;

  /** Campaign author */
  author: string;

  /** Campaign description */
  description: string;

  /** Difficulty and expansion flags */
  difficultyFlags: CampaignDifficulty;

  /** Background screen settings */
  background: {
    /** Background screen index (-1 = custom) */
    screenIndex: number;
    /** Custom background path */
    customPath: string;
    /** Minimap picture path */
    minimapPath: string;
  };

  /** Ambient sound settings */
  ambientSound: {
    /** Sound index (-1 = custom, 0 = none, >0 = preset) */
    soundIndex: number;
    /** Custom sound path */
    customPath: string;
  };

  /** Terrain fog settings */
  fog: {
    /** Uses fog (0 = not used, >0 = style index) */
    styleIndex: number;
    /** Fog start Z height */
    zStart: number;
    /** Fog end Z height */
    zEnd: number;
    /** Fog density */
    density: number;
    /** Fog color */
    color: RGBA;
  };
}

/**
 * Embedded map information
 */
export interface EmbeddedMapInfo {
  /** Map filename within campaign */
  filename: string;

  /** Map index in campaign progression */
  index: number;

  /** Map file size */
  size: number;
}

/**
 * W3N parse result
 */
export interface W3NParseResult {
  success: boolean;
  campaignInfo?: W3FCampaignInfo;
  embeddedMaps?: EmbeddedMapInfo[];
  error?: string;
}
