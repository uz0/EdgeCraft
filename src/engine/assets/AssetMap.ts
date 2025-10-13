/**
 * AssetMap - Maps Blizzard asset IDs to EdgeCraft asset IDs
 * Part of PRP 2.12: Legal Asset Library
 */

/**
 * Warcraft 3 terrain texture mapping
 * Maps W3X terrain IDs (4-char codes) to our asset IDs
 */
export const W3X_TERRAIN_MAP: Record<string, string> = {
  // Ashenvale tileset (A)
  Agrs: 'terrain_grass_light', // Light grass
  Adrt: 'terrain_dirt_brown', // Dirt
  Arok: 'terrain_rock_gray', // Rock
  Agrd: 'terrain_grass_dirt_mix', // Grassy dirt
  Avin: 'terrain_vines', // Vines
  Adrg: 'terrain_grass_dark', // Dark grass
  Arck: 'terrain_rock_rough', // Rough rock
  Alsh: 'terrain_leaves', // Leaves

  // Barrens tileset (B)
  Bdrt: 'terrain_dirt_desert', // Desert dirt
  Bdrr: 'terrain_sand_desert', // Desert sand
  Bdrg: 'terrain_rock_desert', // Desert rock

  // Lordaeron tileset (L)
  Lgrs: 'terrain_grass_green', // Green grass
  Ldrt: 'terrain_dirt_brown', // Dirt
  Lrok: 'terrain_rock_gray', // Rock

  // Icecrown tileset (I)
  Isnw: 'terrain_snow_clean', // Snow
  Iice: 'terrain_ice', // Ice
  Idrt: 'terrain_dirt_frozen', // Frozen dirt

  // Fallback for unknown terrain
  _fallback: 'terrain_grass_light',
};

/**
 * Warcraft 3 doodad mapping
 * Maps W3X doodad IDs (4-char codes) to our model IDs
 */
export const W3X_DOODAD_MAP: Record<string, string> = {
  // Trees
  ATtr: 'doodad_tree_oak_01', // Ashenvale Tree (primary)
  CTtr: 'doodad_tree_pine_01', // Pine Tree
  BTtw: 'doodad_tree_dead_01', // Dead Tree
  LTtr: 'doodad_tree_oak_02', // Lordaeron Tree
  ATtc: 'doodad_tree_oak_01', // Ashenvale Tree Canopy (use oak)
  ASx1: 'doodad_tree_oak_01', // Ashenvale Small Tree (use oak, scaled)

  // Bushes / Foliage
  ASbc: 'doodad_bush_round_01', // Ashenvale Bush (primary)
  ASbr: 'doodad_bush_round_01', // Ashenvale Bush/Berry (same)
  ASbl: 'doodad_bush_round_01', // Ashenvale Small Boulder (actually bush)
  YOfs: 'doodad_bush_round_01', // Outland Fel Shrub
  YOtf: 'doodad_bush_round_01', // Outland Twisted Foliage

  // Rocks / Boulders
  ARrk: 'doodad_rock_large_01', // Ashenvale Rock (primary)
  AObo: 'doodad_rock_large_01', // Ashenvale Boulder
  LRk1: 'doodad_rock_large_01', // Lordaeron Rock
  LOss: 'doodad_rock_large_01', // Lordaeron Summer Stone
  LObz: 'doodad_rock_large_01', // Lordaeron Boulder
  LObr: 'doodad_rock_large_01', // Lordaeron Boulder (variant)

  // Plants
  APct: 'doodad_plant_generic_01', // Ashenvale Plant/Cattail
  LOsm: 'doodad_plant_generic_01', // Mushroom
  AZrf: 'doodad_plant_generic_01', // Root/Fungus
  ASv0: 'doodad_plant_generic_01', // Vine

  // Special / Invisible (use small box)
  DSp0: 'doodad_marker_small', // Spawn Point (invisible)
  B000: 'doodad_marker_small',
  B001: 'doodad_marker_small',
  B002: 'doodad_marker_small',
  B003: 'doodad_marker_small',
  D000: 'doodad_marker_small',
  D001: 'doodad_marker_small',
  D002: 'doodad_marker_small',
  D003: 'doodad_marker_small',
  D004: 'doodad_marker_small',
  D005: 'doodad_marker_small',
  D006: 'doodad_marker_small',
  D007: 'doodad_marker_small',
  D008: 'doodad_marker_small',
  D00A: 'doodad_marker_small',
  D00B: 'doodad_marker_small',
  D00C: 'doodad_marker_small',
  D00D: 'doodad_marker_small',
  D00E: 'doodad_marker_small',

  // Fallback for unknown doodads
  _fallback: 'doodad_box_placeholder',
};

/**
 * StarCraft 2 terrain mapping
 */
export const SC2_TERRAIN_MAP: Record<string, string> = {
  Agrd: 'terrain_metal_platform', // Metallic platform
  Abld: 'terrain_blight_purple', // Alien blight
  Avin: 'terrain_volcanic_ash', // Volcanic ash
  Alsh: 'terrain_lava', // Lava

  _fallback: 'terrain_rock_gray',
};

/**
 * StarCraft 2 doodad mapping
 */
export const SC2_DOODAD_MAP: Record<string, string> = {
  TreePalm01: 'doodad_tree_palm_01', // Palm tree
  RockDesert01: 'doodad_rock_desert_01', // Desert rock

  _fallback: 'doodad_box_placeholder',
};

/**
 * Map a Blizzard asset ID to our asset ID
 * @param format - Map format (w3x, sc2, w3n)
 * @param assetType - Type of asset (terrain, doodad, unit)
 * @param originalID - Original Blizzard asset ID
 * @returns Our asset ID
 */
export function mapAssetID(
  format: 'w3x' | 'sc2' | 'w3n',
  assetType: 'terrain' | 'doodad' | 'unit',
  originalID: string
): string {
  let mapping: Record<string, string>;

  // Select the appropriate mapping
  if (format === 'sc2') {
    mapping = assetType === 'terrain' ? SC2_TERRAIN_MAP : SC2_DOODAD_MAP;
  } else {
    // W3X and W3N use the same mappings
    mapping = assetType === 'terrain' ? W3X_TERRAIN_MAP : W3X_DOODAD_MAP;
  }

  // Look up the asset ID
  const mappedID = mapping[originalID];

  // Return mapped ID or fallback
  if (mappedID) {
    return mappedID;
  }

  console.warn(`[AssetMap] No mapping for ${format}:${assetType}:${originalID}, using fallback`);
  return mapping['_fallback'] || 'doodad_box_placeholder';
}

/**
 * Get all mapped terrain IDs for a format
 */
export function getAllTerrainIDs(format: 'w3x' | 'sc2' | 'w3n'): string[] {
  const mapping = format === 'sc2' ? SC2_TERRAIN_MAP : W3X_TERRAIN_MAP;
  return Object.values(mapping).filter((id) => id !== mapping['_fallback']);
}

/**
 * Get all mapped doodad IDs for a format
 */
export function getAllDoodadIDs(format: 'w3x' | 'sc2' | 'w3n'): string[] {
  const mapping = format === 'sc2' ? SC2_DOODAD_MAP : W3X_DOODAD_MAP;
  return Object.values(mapping).filter((id) => id !== mapping['_fallback']);
}
