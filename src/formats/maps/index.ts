/**
 * Map Loading System
 * Supports W3X/W3M (Warcraft 3) and SCM/SCX (StarCraft 1) formats
 */

export { MapLoaderRegistry } from './MapLoaderRegistry';
export type { MapLoadOptions, MapLoadResult } from './MapLoaderRegistry';

export { W3XMapLoader } from './w3x/W3XMapLoader';
export { SCMMapLoader } from './scm/SCMMapLoader';

export { EdgeStoryConverter } from './edgestory/EdgeStoryConverter';
export type { EdgeStoryMap } from './edgestory/EdgeStoryFormat';

export { AssetMapper } from './AssetMapper';
export type { AssetMapping } from './AssetMapper';

export type {
  IMapLoader,
  RawMapData,
  MapInfo,
  TerrainData,
  UnitPlacement,
  DoodadPlacement,
  PlayerInfo,
  ForceInfo,
  TriggerData,
  ScriptData,
} from './types';
