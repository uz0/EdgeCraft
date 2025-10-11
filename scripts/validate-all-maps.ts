#!/usr/bin/env tsx

/**
 * Validate All Maps - Load and Parse Test
 *
 * Tests that all maps in the /maps directory can be successfully loaded
 * and parsed by their respective loaders.
 *
 * Usage: npm run validate-all-maps
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { MapLoaderRegistry } from '../src/formats/maps/MapLoaderRegistry';

interface ValidationResult {
  mapName: string;
  format: string;
  loadSuccess: boolean;
  loadTimeMs: number;
  error?: string;
  mapWidth?: number;
  mapHeight?: number;
}

const SUPPORTED_EXTENSIONS = ['.w3x', '.w3n', '.SC2Map', '.scm'];

async function validateAllMaps(): Promise<void> {
  const mapsDir = join(__dirname, '../maps');
  console.log('🔍 Validating all maps in:', mapsDir);
  console.log('');

  const results: ValidationResult[] = [];
  let successCount = 0;
  let failCount = 0;

  try {
    const files = await readdir(mapsDir);

    for (const file of files) {
      const ext = SUPPORTED_EXTENSIONS.find((e) => file.toLowerCase().endsWith(e.toLowerCase()));
      if (ext === undefined || ext === null) continue;

      console.log(`📁 Testing: ${file}`);

      const startTime = performance.now();
      const filePath = join(mapsDir, file);

      try {
        // Read file buffer
        const buffer = await readFile(filePath);

        // Get appropriate loader
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const loader = MapLoaderRegistry.getLoader(ext.toLowerCase());

        if (loader === null || loader === undefined) {
          throw new Error(`No loader registered for extension: ${ext}`);
        }

        // Parse map
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const mapData = await loader.parse(buffer.buffer as ArrayBuffer);

        const loadTimeMs = performance.now() - startTime;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const width = mapData.info?.width;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const height = mapData.info?.height;

        results.push({
          mapName: file,
          format: ext.replace('.', '').toUpperCase(),
          loadSuccess: true,
          loadTimeMs,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          mapWidth: width,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          mapHeight: height,
        });

        successCount++;
        const dimensionStr =
          width !== undefined && height !== undefined ? `(${width}x${height})` : '';
        console.log(`  ✅ SUCCESS - ${loadTimeMs.toFixed(0)}ms ${dimensionStr}`);
      } catch (error) {
        const loadTimeMs = performance.now() - startTime;

        results.push({
          mapName: file,
          format: ext.replace('.', '').toUpperCase(),
          loadSuccess: false,
          loadTimeMs,
          error: error instanceof Error ? error.message : String(error),
        });

        failCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ FAILED - ${errorMsg}`);
      }

      console.log('');
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Maps: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
    console.log('');

    // Group by format
    const byFormat = results.reduce(
      (acc, r) => {
        if (acc[r.format] === undefined) acc[r.format] = { total: 0, success: 0 };
        acc[r.format].total++;
        if (r.loadSuccess) acc[r.format].success++;
        return acc;
      },
      {} as Record<string, { total: number; success: number }>
    );

    console.log('By Format:');
    Object.entries(byFormat).forEach(([format, stats]) => {
      console.log(`  ${format}: ${stats.success}/${stats.total} successful`);
    });
    console.log('');

    // Show failures
    if (failCount > 0) {
      console.log('Failed Maps:');
      results
        .filter((r) => !r.loadSuccess)
        .forEach((r) => {
          console.log(`  ❌ ${r.mapName} (${r.format})`);
          console.log(`     Error: ${r.error}`);
        });
      console.log('');
    }

    // Average load time
    const avgLoadTime =
      results.filter((r) => r.loadSuccess).reduce((sum, r) => sum + r.loadTimeMs, 0) / successCount;
    console.log(`Average Load Time: ${avgLoadTime.toFixed(0)}ms`);
    console.log('═══════════════════════════════════════════════════════');

    // Exit with error if any failed
    if (failCount > 0) {
      console.error(`\n❌ ${failCount} map(s) failed validation`);
      process.exit(1);
    } else {
      console.log('\n✅ All maps validated successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  void validateAllMaps();
}

export { validateAllMaps };
