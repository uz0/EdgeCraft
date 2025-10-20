/**
 * Unit tests for AssetMap
 */

import {
  mapAssetID,
  getAllTerrainIDs,
  getAllDoodadIDs,
  W3X_TERRAIN_MAP,
  W3X_DOODAD_MAP,
  SC2_TERRAIN_MAP,
  SC2_DOODAD_MAP,
} from './AssetMap';

describe('AssetMap', () => {
  describe('mapAssetID', () => {
    describe('W3X terrain mapping', () => {
      it('should map known W3X terrain IDs', () => {
        expect(mapAssetID('w3x', 'terrain', 'Agrs')).toBe('terrain_grass_light');
        expect(mapAssetID('w3x', 'terrain', 'Adrt')).toBe('terrain_dirt_brown');
        expect(mapAssetID('w3x', 'terrain', 'Lgrs')).toBe('terrain_grass_green');
        expect(mapAssetID('w3x', 'terrain', 'Isnw')).toBe('terrain_snow_clean');
      });

      it('should return fallback for unknown W3X terrain', () => {
        expect(mapAssetID('w3x', 'terrain', 'UNKNOWN')).toBe('terrain_grass_light');
        expect(mapAssetID('w3x', 'terrain', 'XXXX')).toBe('terrain_grass_light');
      });

      it('should handle empty string terrain ID', () => {
        expect(mapAssetID('w3x', 'terrain', '')).toBe('terrain_grass_light');
      });
    });

    describe('W3X doodad mapping', () => {
      it('should map known W3X doodad IDs', () => {
        expect(mapAssetID('w3x', 'doodad', 'ATtr')).toBe('doodad_tree_oak_01');
        expect(mapAssetID('w3x', 'doodad', 'CTtr')).toBe('doodad_tree_pine_01');
        expect(mapAssetID('w3x', 'doodad', 'BTtw')).toBe('doodad_tree_dead_01');
        expect(mapAssetID('w3x', 'doodad', 'ARrk')).toBe('doodad_rock_large_01');
      });

      it('should return fallback for unknown W3X doodads', () => {
        expect(mapAssetID('w3x', 'doodad', 'UNKNOWN')).toBe('doodad_box_placeholder');
        expect(mapAssetID('w3x', 'doodad', 'XXXX')).toBe('doodad_box_placeholder');
      });

      it('should handle spawn points as markers', () => {
        expect(mapAssetID('w3x', 'doodad', 'DSp0')).toBe('doodad_marker_small');
        expect(mapAssetID('w3x', 'doodad', 'DSp9')).toBe('doodad_marker_small');
      });
    });

    describe('SC2 terrain mapping', () => {
      it('should map known SC2 terrain IDs', () => {
        expect(mapAssetID('sc2', 'terrain', 'Agrd')).toBe('terrain_metal_platform');
        expect(mapAssetID('sc2', 'terrain', 'Abld')).toBe('terrain_blight_purple');
        expect(mapAssetID('sc2', 'terrain', 'Alsh')).toBe('terrain_lava');
      });

      it('should return fallback for unknown SC2 terrain', () => {
        expect(mapAssetID('sc2', 'terrain', 'UNKNOWN')).toBe('terrain_rock_gray');
      });
    });

    describe('SC2 doodad mapping', () => {
      it('should map known SC2 doodad IDs', () => {
        expect(mapAssetID('sc2', 'doodad', 'TreePalm01')).toBe('doodad_tree_palm_01');
        expect(mapAssetID('sc2', 'doodad', 'RockDesert01')).toBe('doodad_rock_desert_01');
      });

      it('should return fallback for unknown SC2 doodads', () => {
        expect(mapAssetID('sc2', 'doodad', 'UNKNOWN')).toBe('doodad_box_placeholder');
      });
    });

    describe('W3N mapping (uses W3X maps)', () => {
      it('should use W3X mappings for W3N terrain', () => {
        expect(mapAssetID('w3n', 'terrain', 'Agrs')).toBe('terrain_grass_light');
        expect(mapAssetID('w3n', 'terrain', 'Lgrs')).toBe('terrain_grass_green');
      });

      it('should use W3X mappings for W3N doodads', () => {
        expect(mapAssetID('w3n', 'doodad', 'ATtr')).toBe('doodad_tree_oak_01');
        expect(mapAssetID('w3n', 'doodad', 'ARrk')).toBe('doodad_rock_large_01');
      });
    });

    describe('edge cases', () => {
      it('should handle null/undefined gracefully', () => {
        expect(mapAssetID('w3x', 'terrain', null as any)).toBe('terrain_grass_light');
        expect(mapAssetID('w3x', 'terrain', undefined as any)).toBe('terrain_grass_light');
      });

      it('should handle special characters', () => {
        expect(mapAssetID('w3x', 'terrain', '@@@@')).toBe('terrain_grass_light');
        expect(mapAssetID('w3x', 'doodad', '####')).toBe('doodad_box_placeholder');
      });
    });
  });

  describe('getAllTerrainIDs', () => {
    it('should return all W3X terrain IDs excluding fallback', () => {
      const ids = getAllTerrainIDs('w3x');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain('terrain_grass_light'); // fallback should be filtered
      expect(ids).toContain('terrain_dirt_brown');
      expect(ids).toContain('terrain_grass_green');
    });

    it('should return all unique SC2 terrain IDs excluding fallback', () => {
      const ids = getAllTerrainIDs('sc2');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain('terrain_rock_gray'); // fallback should be filtered
      expect(ids).toContain('terrain_metal_platform');
    });

    it('should use W3X IDs for W3N', () => {
      const w3xIds = getAllTerrainIDs('w3x');
      const w3nIds = getAllTerrainIDs('w3n');
      expect(w3nIds).toEqual(w3xIds);
    });

    it('should filter out fallback terrain ID', () => {
      const ids = getAllTerrainIDs('w3x');
      expect(ids).not.toContain(W3X_TERRAIN_MAP['_fallback']);
    });
  });

  describe('getAllDoodadIDs', () => {
    it('should return all unique W3X doodad IDs excluding fallback', () => {
      const ids = getAllDoodadIDs('w3x');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain('doodad_box_placeholder'); // fallback should be filtered
      expect(ids).toContain('doodad_tree_oak_01');
      expect(ids).toContain('doodad_rock_large_01');
    });

    it('should return all unique SC2 doodad IDs excluding fallback', () => {
      const ids = getAllDoodadIDs('sc2');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain('doodad_box_placeholder'); // fallback should be filtered
      expect(ids).toContain('doodad_tree_palm_01');
    });

    it('should use W3X IDs for W3N', () => {
      const w3xIds = getAllDoodadIDs('w3x');
      const w3nIds = getAllDoodadIDs('w3n');
      expect(w3nIds).toEqual(w3xIds);
    });

    it('should filter out fallback doodad ID', () => {
      const ids = getAllDoodadIDs('w3x');
      expect(ids).not.toContain(W3X_DOODAD_MAP['_fallback']);
    });
  });

  describe('mapping completeness', () => {
    it('should have fallback entries in all mapping tables', () => {
      expect(W3X_TERRAIN_MAP['_fallback']).toBeDefined();
      expect(W3X_DOODAD_MAP['_fallback']).toBeDefined();
      expect(SC2_TERRAIN_MAP['_fallback']).toBeDefined();
      expect(SC2_DOODAD_MAP['_fallback']).toBeDefined();
    });

    it('should have non-empty mapping tables', () => {
      expect(Object.keys(W3X_TERRAIN_MAP).length).toBeGreaterThan(1); // > 1 because of fallback
      expect(Object.keys(W3X_DOODAD_MAP).length).toBeGreaterThan(1);
      expect(Object.keys(SC2_TERRAIN_MAP).length).toBeGreaterThan(1);
      expect(Object.keys(SC2_DOODAD_MAP).length).toBeGreaterThan(1);
    });

    it('should have valid asset ID formats', () => {
      const allTerrainIds = Object.values(W3X_TERRAIN_MAP);
      allTerrainIds.forEach((id) => {
        expect(id).toMatch(/^(terrain_|doodad_)[a-z_]+$/);
      });

      const allDoodadIds = Object.values(W3X_DOODAD_MAP);
      allDoodadIds.forEach((id) => {
        expect(id).toMatch(/^doodad_[a-z_0-9]+$/);
      });
    });
  });
});
