/**
 * Extract Warcraft 3 Game Data from CASC (HiveWorkshop)
 *
 * This script extracts all game data from SLK files and transforms it into
 * our warcraft_manifest.json structure. This creates a "dump file" of
 * Blizzard's copyrighted resources, making it clear what needs replacement.
 *
 * Usage: npm run extract:gamedata
 */

import { MappedData } from '../src/vendor/mdx-m3-viewer/src/utils/mappeddata';
import * as fs from 'fs/promises';
import * as path from 'path';

const CASC_BASE_URL = 'https://www.hiveworkshop.com/casc-contents?path=';

interface CliffTypeEntry {
  cliffID: string;
  name: string;
  cliffModelDir: string;
  texDir: string;
  texFile: string;
  groundTile: string;
}

interface TerrainEntry {
  tileID: string;
  name: string;
  dir: string;
  file: string;
  comment: string;
}

interface DoodadEntry {
  doodadID: string;
  name: string;
  dir: string;
  file: string;
  category: string;
}

interface GameDataManifest {
  version: string;
  description: string;
  lastUpdated: string;
  source: string;
  license: string;
  cliffTypes: Record<string, CliffTypeEntry>;
  terrain: Record<string, TerrainEntry>;
  doodads: Record<string, DoodadEntry>;
  units: Record<string, Record<string, unknown>>;
  destructables: Record<string, Record<string, unknown>>;
}

async function fetchSLKFile(cascPath: string): Promise<string> {
  const url = `${CASC_BASE_URL}${encodeURIComponent(cascPath)}`;
  console.log(`Fetching: ${cascPath}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${cascPath}: ${response.statusText}`);
  }

  return await response.text();
}

async function extractCliffTypes(): Promise<Record<string, CliffTypeEntry>> {
  const slkText = await fetchSLKFile('war3.w3mod:_balance/terrainart/clifftypes.slk');
  const mappedData = new MappedData();
  mappedData.load(slkText);

  const cliffTypes: Record<string, CliffTypeEntry> = {};

  for (const [cliffID, row] of Object.entries(mappedData.map)) {
    const entry: CliffTypeEntry = {
      cliffID,
      name: row.string('name') ?? cliffID,
      cliffModelDir: row.string('cliffModelDir') ?? '',
      texDir: row.string('texDir') ?? '',
      texFile: row.string('texFile') ?? '',
      groundTile: row.string('groundTile') ?? '',
    };

    cliffTypes[cliffID] = entry;
  }

  return cliffTypes;
}

async function extractTerrainData(): Promise<Record<string, TerrainEntry>> {
  const slkText = await fetchSLKFile('war3.w3mod:_balance/terrainart/terrain.slk');
  const mappedData = new MappedData();
  mappedData.load(slkText);

  const terrain: Record<string, TerrainEntry> = {};

  for (const [tileID, row] of Object.entries(mappedData.map)) {
    terrain[tileID] = {
      tileID,
      name: row.string('name') ?? tileID,
      dir: row.string('dir') ?? '',
      file: row.string('file') ?? '',
      comment: row.string('comment') ?? '',
    };
  }

  return terrain;
}

async function extractDoodadsData(): Promise<Record<string, DoodadEntry>> {
  const slkText = await fetchSLKFile('war3.w3mod:_balance/doodads/doodads.slk');
  const mappedData = new MappedData();
  mappedData.load(slkText);

  const doodads: Record<string, DoodadEntry> = {};

  for (const [doodadID, row] of Object.entries(mappedData.map)) {
    doodads[doodadID] = {
      doodadID,
      name: row.string('name') ?? doodadID,
      dir: row.string('dir') ?? '',
      file: row.string('file') ?? '',
      category: row.string('category') ?? '',
    };
  }

  return doodads;
}

async function main(): Promise<void> {
  console.log('🎮 Extracting Warcraft 3 Game Data from CASC...\n');

  const gameData: GameDataManifest = {
    version: '1.0.0',
    description:
      'Warcraft 3 Game Data extracted from Blizzard CASC archives. This is a temporary dump file of copyrighted resources that will be replaced with original content.',
    lastUpdated: new Date().toISOString().split('T')[0],
    source: 'Blizzard Entertainment (via HiveWorkshop CASC)',
    license: 'BLIZZARD_COPYRIGHTED - TO BE REPLACED',
    cliffTypes: {},
    terrain: {},
    doodads: {},
    units: {},
    destructables: {},
  };

  try {
    console.log('📦 Extracting CliffTypes.slk...');
    gameData.cliffTypes = await extractCliffTypes();
    console.log(`✅ Extracted ${Object.keys(gameData.cliffTypes).length} cliff types\n`);

    console.log('🏔️  Extracting Terrain.slk...');
    gameData.terrain = await extractTerrainData();
    console.log(`✅ Extracted ${Object.keys(gameData.terrain).length} terrain types\n`);

    console.log('🌳 Extracting Doodads.slk...');
    gameData.doodads = await extractDoodadsData();
    console.log(`✅ Extracted ${Object.keys(gameData.doodads).length} doodad types\n`);

    const outputPath = path.join(__dirname, '../public/assets/warcraft_game_data.json');
    await fs.writeFile(outputPath, JSON.stringify(gameData, null, 2), 'utf-8');

    console.log(`\n✅ Game data extracted successfully!`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`\n⚠️  REMINDER: This file contains Blizzard's copyrighted game data.`);
    console.log(`   All references must be replaced with original content.`);
  } catch (error) {
    console.error('\n❌ Error extracting game data:', error);
    process.exit(1);
  }
}

void main();
