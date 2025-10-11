#!/usr/bin/env tsx

/**
 * Generate map-list.json from maps directory
 *
 * Scans the /maps folder and creates a JSON file listing all available maps
 * with metadata (name, format, size, path).
 *
 * Usage: npm run generate-map-list
 */

import { readdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';

interface MapEntry {
  name: string;
  format: 'w3x' | 'w3n' | 'sc2map' | 'scm';
  sizeBytes: number;
  path: string;
}

const SUPPORTED_EXTENSIONS = ['.w3x', '.w3n', '.SC2Map', '.scm'];

async function generateMapList(): Promise<void> {
  const mapsDir = join(__dirname, '../maps');
  const outputPath = join(__dirname, '../public/maps/map-list.json');

  console.log('🔍 Scanning maps directory:', mapsDir);

  try {
    const files = await readdir(mapsDir);
    const maps: MapEntry[] = [];

    for (const file of files) {
      const ext = SUPPORTED_EXTENSIONS.find((e) => file.endsWith(e));
      if (!ext) continue;

      const filePath = join(mapsDir, file);
      const stats = await stat(filePath);

      // Determine format from extension
      let format: MapEntry['format'];
      if (ext === '.w3x') format = 'w3x';
      else if (ext === '.w3n') format = 'w3n';
      else if (ext === '.SC2Map') format = 'sc2map';
      else if (ext === '.scm') format = 'scm';
      else continue;

      maps.push({
        name: file,
        format,
        sizeBytes: stats.size,
        path: `/maps/${file}`,
      });

      console.log(`  ✅ ${file} (${format}) - ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
    }

    // Sort by name
    maps.sort((a, b) => a.name.localeCompare(b.name));

    // Write to public/maps/map-list.json
    await writeFile(outputPath, JSON.stringify(maps, null, 2), 'utf-8');

    console.log(`\n✅ Generated map-list.json with ${maps.length} maps`);
    console.log(`📁 Output: ${outputPath}`);

    // Summary by format
    const summary = maps.reduce(
      (acc, m) => {
        acc[m.format] = (acc[m.format] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📊 Summary:');
    Object.entries(summary).forEach(([format, count]) => {
      console.log(`  ${format.toUpperCase()}: ${count}`);
    });
  } catch (error) {
    console.error('❌ Failed to generate map list:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  generateMapList();
}

export { generateMapList };
