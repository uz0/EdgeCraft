/**
 * MapViewerPage Tests - Format Detection
 */

import { describe, it, expect } from '@jest/globals';

// Map format detection logic (extracted from MapViewerPage.tsx)
const getMapFormat = (filename: string): string => {
  if (filename.endsWith('.w3x')) return 'w3x';
  if (filename.endsWith('.w3m')) return 'w3m';
  if (filename.endsWith('.SC2Map')) return 'sc2map';
  return 'unknown';
};

describe('MapViewerPage - Format Detection', () => {
  describe('getMapFormat', () => {
    it('should detect W3X format (Warcraft 3 Classic)', () => {
      expect(getMapFormat('[12]MeltedCrown_1.0.w3x')).toBe('w3x');
      expect(getMapFormat('test.w3x')).toBe('w3x');
      expect(getMapFormat('Map-v1.2.3.w3x')).toBe('w3x');
    });

    it('should detect W3M format (Warcraft 3 Reforged)', () => {
      expect(getMapFormat('asset_test.w3m')).toBe('w3m');
      expect(getMapFormat('trigger_test.w3m')).toBe('w3m');
      expect(getMapFormat('CustomMap.w3m')).toBe('w3m');
    });

    it('should detect SC2Map format (StarCraft 2)', () => {
      expect(getMapFormat('Starlight.SC2Map')).toBe('sc2map');
      expect(getMapFormat('asset_test.SC2Map')).toBe('sc2map');
      expect(getMapFormat('trigger_test.SC2Map')).toBe('sc2map');
    });

    it('should return unknown for unsupported formats', () => {
      expect(getMapFormat('test.txt')).toBe('unknown');
      expect(getMapFormat('map.zip')).toBe('unknown');
      expect(getMapFormat('NoExtension')).toBe('unknown');
      expect(getMapFormat('')).toBe('unknown');
    });

    it('should be case-sensitive for SC2Map', () => {
      expect(getMapFormat('test.SC2Map')).toBe('sc2map');
      expect(getMapFormat('test.sc2map')).toBe('unknown'); // lowercase not supported
    });

    it('should handle edge cases', () => {
      expect(getMapFormat('.w3x')).toBe('w3x');
      expect(getMapFormat('.w3m')).toBe('w3m');
      expect(getMapFormat('.SC2Map')).toBe('sc2map');
      expect(getMapFormat('file.w3x.backup')).toBe('unknown'); // doesn't end with .w3x
    });
  });
});
