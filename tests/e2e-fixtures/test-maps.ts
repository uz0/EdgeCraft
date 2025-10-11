/**
 * Test Map Metadata
 *
 * Comprehensive set of maps for e2e testing.
 * Selected to cover all formats and size ranges.
 */
export const TEST_MAPS = {
  // === W3X Maps (Warcraft 3) ===

  // Tiny maps (< 500KB) - Fastest loading
  W3X_TINY_1: {
    name: 'EchoIslesAlltherandom.w3x',
    format: 'w3x',
    expectedLoadTime: 3000,
    expectedFPS: 60,
  },

  W3X_TINY_2: {
    name: 'ragingstream.w3x',
    format: 'w3x',
    expectedLoadTime: 3000,
    expectedFPS: 60,
  },

  // Small maps (< 1MB)
  W3X_SMALL: {
    name: 'Footmen Frenzy 1.9f.w3x',
    format: 'w3x',
    expectedLoadTime: 5000,
    expectedFPS: 60,
  },

  // Medium maps (5-15MB)
  W3X_MEDIUM_1: {
    name: '3P Sentinel 01 v3.06.w3x',
    format: 'w3x',
    expectedLoadTime: 8000,
    expectedFPS: 60,
  },

  W3X_MEDIUM_2: {
    name: '3P Sentinel 02 v3.06.w3x',
    format: 'w3x',
    expectedLoadTime: 10000,
    expectedFPS: 60,
  },

  W3X_MEDIUM_3: {
    name: 'Legion_TD_11.2c-hf1_TeamOZE.w3x',
    format: 'w3x',
    expectedLoadTime: 10000,
    expectedFPS: 60,
  },

  W3X_MEDIUM_4: {
    name: 'qcloud_20013247.w3x',
    format: 'w3x',
    expectedLoadTime: 8000,
    expectedFPS: 60,
  },

  // Large maps (15-30MB)
  W3X_LARGE_1: {
    name: '3P Sentinel 05 v3.02.w3x',
    format: 'w3x',
    expectedLoadTime: 12000,
    expectedFPS: 55,
  },

  W3X_LARGE_2: {
    name: '3pUndeadX01v2.w3x',
    format: 'w3x',
    expectedLoadTime: 12000,
    expectedFPS: 55,
  },

  W3X_LARGE_3: {
    name: '3P Sentinel 07 v3.02.w3x',
    format: 'w3x',
    expectedLoadTime: 15000,
    expectedFPS: 55,
  },

  // === W3N Campaigns (Warcraft 3) ===

  // Medium campaign (< 100MB)
  W3N_MEDIUM: {
    name: 'SearchingForPower.w3n',
    format: 'w3n',
    expectedLoadTime: 20000,
    expectedFPS: 55,
  },

  W3N_MEDIUM_2: {
    name: 'Wrath of the Legion.w3n',
    format: 'w3n',
    expectedLoadTime: 20000,
    expectedFPS: 55,
  },

  W3N_MEDIUM_3: {
    name: 'War3Alternate1 - Undead.w3n',
    format: 'w3n',
    expectedLoadTime: 25000,
    expectedFPS: 50,
  },

  // Large campaigns (100-400MB) - Extended timeout
  W3N_LARGE_1: {
    name: 'TheFateofAshenvaleBySvetli.w3n',
    format: 'w3n',
    expectedLoadTime: 35000,
    expectedFPS: 50,
  },

  W3N_LARGE_2: {
    name: 'BurdenOfUncrowned.w3n',
    format: 'w3n',
    expectedLoadTime: 35000,
    expectedFPS: 50,
  },

  // === SC2Map (StarCraft 2) ===

  // Small SC2 map
  SC2_SMALL: {
    name: 'Ruined Citadel.SC2Map',
    format: 'sc2map',
    expectedLoadTime: 5000,
    expectedFPS: 60,
  },

  SC2_SMALL_2: {
    name: 'TheUnitTester7.SC2Map',
    format: 'sc2map',
    expectedLoadTime: 5000,
    expectedFPS: 60,
  },

  // Medium SC2 map
  SC2_MEDIUM: {
    name: 'Aliens Binary Mothership.SC2Map',
    format: 'sc2map',
    expectedLoadTime: 8000,
    expectedFPS: 60,
  },
} as const;

export type TestMapKey = keyof typeof TEST_MAPS;

// Helper to get maps by category
export const MAP_CATEGORIES = {
  W3X_TINY: ['W3X_TINY_1', 'W3X_TINY_2'],
  W3X_SMALL: ['W3X_SMALL'],
  W3X_MEDIUM: ['W3X_MEDIUM_1', 'W3X_MEDIUM_2', 'W3X_MEDIUM_3', 'W3X_MEDIUM_4'],
  W3X_LARGE: ['W3X_LARGE_1', 'W3X_LARGE_2', 'W3X_LARGE_3'],
  W3N_MEDIUM: ['W3N_MEDIUM', 'W3N_MEDIUM_2', 'W3N_MEDIUM_3'],
  W3N_LARGE: ['W3N_LARGE_1', 'W3N_LARGE_2'],
  SC2_ALL: ['SC2_SMALL', 'SC2_SMALL_2', 'SC2_MEDIUM'],
} as const;
