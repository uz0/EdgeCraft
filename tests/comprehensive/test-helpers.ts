/**
 * Test Helpers for Comprehensive Map Preview Testing
 *
 * Shared utilities for all map preview test suites
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RawMapData } from '../../src/formats/maps/types';
import { W3XMapLoader } from '../../src/formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from '../../src/formats/maps/sc2/SC2MapLoader';
import { W3NCampaignLoader } from '../../src/formats/maps/w3n/W3NCampaignLoader';

// ============================================================================
// FILE LOADING
// ============================================================================

/**
 * Load map file from /maps directory
 */
export async function loadMapFile(filename: string): Promise<File> {
  const mapsDir = path.join(__dirname, '../../maps');
  const filePath = path.join(mapsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Map file not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  return new File([buffer], filename, { type: 'application/octet-stream' });
}

/**
 * Get format from filename
 */
export function getFormat(filename: string): 'w3x' | 'w3n' | 'sc2map' {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.w3x' || ext === '.w3m') return 'w3x';
  if (ext === '.w3n') return 'w3n';
  if (ext === '.sc2map') return 'sc2map';

  throw new Error(`Unsupported format: ${ext}`);
}

/**
 * Get appropriate loader for format with unified API
 * All loaders now use .parse() method
 *
 * Note: W3NCampaignLoader returns RawMapData (single map), not an array.
 * Tests should NOT expect campaignData.maps - use the result directly.
 */
export function getLoaderForFormat(format: 'w3x' | 'w3n' | 'sc2map') {
  switch (format) {
    case 'w3x':
      return new W3XMapLoader();
    case 'w3n':
      return new W3NCampaignLoader();
    case 'sc2map':
      return new SC2MapLoader();
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// ============================================================================
// IMAGE VALIDATION
// ============================================================================

/**
 * Validate data URL is a valid base64 image
 */
export function isValidDataURL(dataUrl: string | undefined): boolean {
  if (!dataUrl) return false;

  const regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
  return regex.test(dataUrl);
}

/**
 * Get image dimensions from data URL
 */
export function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Calculate average brightness of image (0-255)
 */
export function calculateAverageBrightness(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        totalBrightness += (r + g + b) / 3;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      resolve(avgBrightness);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// ============================================================================
// TGA VALIDATION
// ============================================================================

/**
 * Parse TGA header from ArrayBuffer
 */
export interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapStart: number;
  colorMapLength: number;
  colorMapDepth: number;
  xOrigin: number;
  yOrigin: number;
  width: number;
  height: number;
  bitsPerPixel: number;
  imageDescriptor: number;
}

export function parseTGAHeader(buffer: ArrayBuffer): TGAHeader {
  const dataView = new DataView(buffer);

  return {
    idLength: dataView.getUint8(0),
    colorMapType: dataView.getUint8(1),
    imageType: dataView.getUint8(2),
    colorMapStart: dataView.getUint16(3, true),
    colorMapLength: dataView.getUint16(5, true),
    colorMapDepth: dataView.getUint8(7),
    xOrigin: dataView.getUint16(8, true),
    yOrigin: dataView.getUint16(10, true),
    width: dataView.getUint16(12, true),
    height: dataView.getUint16(14, true),
    bitsPerPixel: dataView.getUint8(16),
    imageDescriptor: dataView.getUint8(17),
  };
}

/**
 * Validate TGA header conforms to W3X/SC2 standards
 */
export function validateTGAHeader(header: TGAHeader, format: 'w3x' | 'sc2map'): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Common validations
  if (header.imageType !== 2) {
    errors.push(`Invalid image type: ${header.imageType} (expected 2 for uncompressed true-color)`);
  }

  if (header.colorMapType !== 0) {
    errors.push(`Invalid color map type: ${header.colorMapType} (expected 0)`);
  }

  if (header.width <= 0 || header.height <= 0) {
    errors.push(`Invalid dimensions: ${header.width}×${header.height}`);
  }

  // Format-specific validations
  if (format === 'w3x') {
    // W3X uses 32-bit BGRA
    if (header.bitsPerPixel !== 32) {
      errors.push(
        `Invalid bits per pixel for W3X: ${header.bitsPerPixel} (expected 32 for BGRA)`
      );
    }

    // W3X must be square
    if (header.width !== header.height) {
      errors.push(`W3X preview must be square: ${header.width}×${header.height}`);
    }

    // W3X follows 4x4 scaling (dimensions must be divisible by 4)
    if (header.width % 4 !== 0 || header.height % 4 !== 0) {
      errors.push(
        `W3X preview dimensions must be divisible by 4: ${header.width}×${header.height}`
      );
    }
  } else if (format === 'sc2map') {
    // SC2 can be 24-bit BGR or 32-bit BGRA
    if (header.bitsPerPixel !== 24 && header.bitsPerPixel !== 32) {
      errors.push(
        `Invalid bits per pixel for SC2: ${header.bitsPerPixel} (expected 24 or 32)`
      );
    }

    // SC2 must be square
    if (header.width !== header.height) {
      errors.push(`SC2 preview must be square: ${header.width}×${header.height}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Create mock map data for testing
 */
export function createMockMapData(
  format: 'w3x' | 'w3n' | 'sc2map',
  options?: {
    width?: number;
    height?: number;
    name?: string;
  }
): RawMapData {
  const width = options?.width ?? 64;
  const height = options?.height ?? 64;
  const name = options?.name ?? 'Test Map';

  const size = width * height;
  const heightmap = new Float32Array(size);

  // Generate random terrain
  for (let i = 0; i < size; i++) {
    heightmap[i] = Math.random() * 10;
  }

  return {
    format,
    info: {
      name,
      description: 'Test map description',
      author: 'Test Author',
      players: 2,
      dimensions: { width, height },
    },
    terrain: {
      width,
      height,
      heightmap,
      textures: [],
    },
    units: [],
    doodads: [],
  };
}

// ============================================================================
// TEST TIMEOUTS
// ============================================================================

/**
 * Default test timeout for map loading tests (90 seconds)
 * Increased from 30s to 90s for StormJS fallback support
 */
export const MAP_LOAD_TIMEOUT = 90000;

/**
 * Extended test timeout for large maps (180 seconds)
 * Increased from 120s to 180s for W3N campaigns with nested MPQ parsing + StormJS fallback
 */
export const LARGE_MAP_TIMEOUT = 180000;

/**
 * Quick test timeout for unit tests (30 seconds)
 * Increased from 10s to 30s for StormJS fallback
 */
export const QUICK_TEST_TIMEOUT = 30000;

// ============================================================================
// MAP INVENTORY
// ============================================================================

/**
 * Complete inventory of all maps in /maps directory
 */
/**
 * IMPORTANT: Based on deep investigation (October 17, 2025):
 * ALL 24 maps lack embedded preview images.
 * Hash table dump revealed 0 preview files found in 419 files scanned.
 * All "image-sized" files (93 total) are ADPCM audio files, not images.
 * expectedSource = 'generated' for all maps (terrain generation fallback).
 */
export const MAP_INVENTORY = {
  w3x: [
    // 3P Sentinel series (10-27MB)
    { name: '3P Sentinel 01 v3.06.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 02 v3.06.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 03 v3.07.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 04 v3.05.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 05 v3.02.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 06 v3.03.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: '3P Sentinel 07 v3.02.w3x', expectedSource: 'generated' as const, size: 'medium' },

    // Other W3X maps
    { name: '3pUndeadX01v2.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: 'EchoIslesAlltherandom.w3x', expectedSource: 'generated' as const, size: 'small' },
    { name: 'Footmen Frenzy 1.9f.w3x', expectedSource: 'generated' as const, size: 'small' },
    { name: 'Legion_TD_11.2c-hf1_TeamOZE.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: 'qcloud_20013247.w3x', expectedSource: 'generated' as const, size: 'medium' },
    { name: 'ragingstream.w3x', expectedSource: 'generated' as const, size: 'small' },
    { name: 'Unity_Of_Forces_Path_10.10.25.w3x', expectedSource: 'generated' as const, size: 'medium' },
  ],
  w3n: [
    { name: 'BurdenOfUncrowned.w3n', expectedSource: 'generated' as const, size: 'xlarge' },
    { name: 'HorrorsOfNaxxramas.w3n', expectedSource: 'generated' as const, size: 'xlarge' },
    { name: 'JudgementOfTheDead.w3n', expectedSource: 'generated' as const, size: 'xlarge' },
    { name: 'SearchingForPower.w3n', expectedSource: 'generated' as const, size: 'large' },
    { name: 'TheFateofAshenvaleBySvetli.w3n', expectedSource: 'generated' as const, size: 'xlarge' },
    { name: 'War3Alternate1 - Undead.w3n', expectedSource: 'generated' as const, size: 'xlarge' },
    { name: 'Wrath of the Legion.w3n', expectedSource: 'generated' as const, size: 'large' },
  ],
  sc2map: [
    { name: 'Aliens Binary Mothership.SC2Map', expectedSource: 'generated' as const, size: 'medium' },
    { name: 'Ruined Citadel.SC2Map', expectedSource: 'generated' as const, size: 'small' },
    { name: 'TheUnitTester7.SC2Map', expectedSource: 'generated' as const, size: 'small' },
  ],
};

/**
 * Get timeout for map based on size
 */
export function getTimeoutForMap(mapName: string): number {
  const allMaps = [...MAP_INVENTORY.w3x, ...MAP_INVENTORY.w3n, ...MAP_INVENTORY.sc2map];
  const map = allMaps.find((m) => m.name === mapName);

  if (!map) return MAP_LOAD_TIMEOUT;

  switch (map.size) {
    case 'small':
      return QUICK_TEST_TIMEOUT;
    case 'medium':
      return MAP_LOAD_TIMEOUT;
    case 'large':
    case 'xlarge':
      return LARGE_MAP_TIMEOUT;
    default:
      return MAP_LOAD_TIMEOUT;
  }
}
