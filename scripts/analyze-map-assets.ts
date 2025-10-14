/**
 * Map Asset Analyzer
 * Analyzes a W3X map file and extracts all required assets
 */

import * as fs from 'fs';
import * as path from 'path';
import { MPQParser } from '../src/formats/mpq/MPQParser';
import { W3EParser } from '../src/formats/maps/w3x/W3EParser';
import { W3DParser } from '../src/formats/maps/w3x/W3DParser';
import { W3IParser } from '../src/formats/maps/w3x/W3IParser';

interface AssetRequirements {
  mapName: string;
  mapSize: { width: number; height: number };
  tileset: string;
  tilesetName: string;
  terrainTextures: {
    id: string;
    count: number;
  }[];
  doodadTypes: {
    id: string;
    count: number;
    name?: string;
  }[];
  totalDoodads: number;
  totalTerrainTiles: number;
}

/**
 * Get tileset full name from character code
 */
function getTilesetName(char: string): string {
  const tilesets: Record<string, string> = {
    A: 'Ashenvale (Night Elf Forest)',
    B: 'Barrens (Desert Wasteland)',
    C: 'Felwood (Corrupted Forest)',
    D: 'Dungeon (Underground)',
    F: 'Lordaeron Fall (Autumn)',
    G: 'Underground (Cave)',
    I: 'Icecrown (Frozen Wasteland)',
    J: 'Dalaran (City Ruins)',
    K: 'Black Citadel (Undead)',
    L: 'Lordaeron Summer (Plains)',
    N: 'Northrend (Snow)',
    O: 'Outland (Alien Wasteland)',
    Q: 'Village Fall (Autumn Village)',
    V: 'Village (Human Village)',
    W: 'Lordaeron Winter (Snow Plains)',
    X: 'Dalaran (City)',
    Y: 'Cityscape (Urban)',
    Z: 'Sunken Ruins (Underwater)',
  };
  return tilesets[char] || `Unknown (${char})`;
}

/**
 * Analyze a W3X map file
 */
async function analyzeMap(mapPath: string): Promise<AssetRequirements> {
  console.log(`\n📂 Analyzing map: ${path.basename(mapPath)}`);
  console.log(`   Path: ${mapPath}`);

  // Read map file
  const mapBuffer = fs.readFileSync(mapPath);
  console.log(`   Size: ${(mapBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Check for HM3W header (512 bytes)
  let mpqOffset = 0;
  const magic = mapBuffer.toString('ascii', 0, 4);
  if (magic === 'HM3W') {
    mpqOffset = 512;
    console.log(`   Format: HM3W (skipping 512-byte header)`);
  }

  // Parse MPQ archive
  const mpqBuffer = mapBuffer.slice(mpqOffset).buffer;
  const mpq = new MPQParser(mpqBuffer);
  const archive = mpq.parse();
  console.log(`   MPQ Files: ${archive.fileCount}`);

  // Extract war3map.w3i (map info)
  const w3iFile = archive.files.find((f) => f.name?.toLowerCase() === 'war3map.w3i');
  if (!w3iFile) {
    throw new Error('war3map.w3i not found in MPQ archive');
  }
  const w3iData = mpq.extractFile(w3iFile);
  const w3iParser = new W3IParser(w3iData);
  const mapInfo = w3iParser.parse();

  console.log(`\n📏 Map Info:`);
  console.log(`   Name: ${mapInfo.name}`);
  console.log(`   Size: ${mapInfo.width}x${mapInfo.height}`);
  console.log(`   Players: ${mapInfo.playerCount}`);

  // Extract war3map.w3e (terrain)
  const w3eFile = archive.files.find((f) => f.name?.toLowerCase() === 'war3map.w3e');
  if (!w3eFile) {
    throw new Error('war3map.w3e not found in MPQ archive');
  }
  const w3eData = mpq.extractFile(w3eFile);
  const w3eParser = new W3EParser(w3eData);
  const terrain = w3eParser.parse(mapInfo.width, mapInfo.height);

  console.log(`\n🗺️  Terrain:`);
  console.log(`   Tileset: ${terrain.tileset} - ${getTilesetName(terrain.tileset)}`);
  console.log(`   Custom: ${terrain.customTileset ? 'Yes' : 'No'}`);
  console.log(`   Textures: ${terrain.groundTextureIds.length}`);
  console.log(`   Tiles: ${terrain.groundTiles.length}`);

  // Count texture usage
  const textureUsage = new Map<number, number>();
  for (const tile of terrain.groundTiles) {
    const idx = tile.groundTexture;
    textureUsage.set(idx, (textureUsage.get(idx) || 0) + 1);
  }

  const terrainTextures = Array.from(textureUsage.entries())
    .map(([idx, count]) => ({
      id: terrain.groundTextureIds[idx] || `Unknown_${idx}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  console.log(`\n🎨 Texture Usage (${terrainTextures.length} unique):`);
  for (const tex of terrainTextures) {
    const percentage = ((tex.count / terrain.groundTiles.length) * 100).toFixed(1);
    console.log(`   ${tex.id}: ${tex.count.toLocaleString()} tiles (${percentage}%)`);
  }

  // Extract war3map.doo (doodads)
  const dooFile = archive.files.find((f) => f.name?.toLowerCase() === 'war3map.doo');
  let doodadTypes: { id: string; count: number }[] = [];
  let totalDoodads = 0;

  if (dooFile) {
    const dooData = mpq.extractFile(dooFile);
    const dooParser = new W3DParser(dooData);
    const doodads = dooParser.parse();

    totalDoodads = doodads.doodads.length;

    // Count doodad type usage
    const doodadUsage = new Map<string, number>();
    for (const doodad of doodads.doodads) {
      const id = doodad.typeId;
      doodadUsage.set(id, (doodadUsage.get(id) || 0) + 1);
    }

    doodadTypes = Array.from(doodadUsage.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);

    console.log(
      `\n🌳 Doodads (${totalDoodads.toLocaleString()} total, ${doodadTypes.length} unique types):`
    );

    // Show top 20 most common doodads
    const topDoodads = doodadTypes.slice(0, 20);
    for (const doodad of topDoodads) {
      const percentage = ((doodad.count / totalDoodads) * 100).toFixed(1);
      console.log(`   ${doodad.id}: ${doodad.count.toLocaleString()} instances (${percentage}%)`);
    }

    if (doodadTypes.length > 20) {
      console.log(`   ... and ${doodadTypes.length - 20} more types`);
    }
  } else {
    console.log(`\n⚠️  No doodads file found`);
  }

  return {
    mapName: mapInfo.name,
    mapSize: { width: mapInfo.width, height: mapInfo.height },
    tileset: terrain.tileset,
    tilesetName: getTilesetName(terrain.tileset),
    terrainTextures,
    doodadTypes,
    totalDoodads,
    totalTerrainTiles: terrain.groundTiles.length,
  };
}

/**
 * Generate JSON asset manifest
 */
function generateAssetManifest(requirements: AssetRequirements): string {
  const manifest = {
    mapName: requirements.mapName,
    mapSize: requirements.mapSize,
    tileset: {
      code: requirements.tileset,
      name: requirements.tilesetName,
    },
    assets: {
      terrainTextures: requirements.terrainTextures.map((t) => ({
        w3xId: t.id,
        usage: t.count,
        required: true,
        assetPath: null, // To be filled in
        license: null, // To be filled in
      })),
      doodadModels: requirements.doodadTypes.map((d) => ({
        w3xId: d.id,
        usage: d.count,
        required: true,
        assetPath: null, // To be filled in
        license: null, // To be filled in
      })),
    },
    summary: {
      totalTerrainTextures: requirements.terrainTextures.length,
      totalDoodadTypes: requirements.doodadTypes.length,
      totalDoodadInstances: requirements.totalDoodads,
      totalTerrainTiles: requirements.totalTerrainTiles,
    },
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const mapPath = args[0] || 'public/maps/3P Sentinel 01 v3.06.w3x';

  if (!fs.existsSync(mapPath)) {
    console.error(`❌ Map file not found: ${mapPath}`);
    process.exit(1);
  }

  try {
    const requirements = await analyzeMap(mapPath);

    // Generate JSON manifest
    const manifestJson = generateAssetManifest(requirements);

    // Save to file
    const outputPath = 'scripts/asset-requirements.json';
    fs.writeFileSync(outputPath, manifestJson, 'utf-8');

    console.log(`\n✅ Asset requirements saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Map: ${requirements.mapName}`);
    console.log(`   Tileset: ${requirements.tileset} - ${requirements.tilesetName}`);
    console.log(`   Terrain Textures: ${requirements.terrainTextures.length} unique`);
    console.log(`   Doodad Types: ${requirements.doodadTypes.length} unique`);
    console.log(`   Total Doodads: ${requirements.totalDoodads.toLocaleString()}`);
  } catch (error) {
    console.error(`❌ Error analyzing map:`, error);
    process.exit(1);
  }
}

main();
