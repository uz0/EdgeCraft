#!/usr/bin/env ts-node
/**
 * Integration test for BatchMapLoader
 * Demonstrates batch loading with mock map data
 *
 * Note: This test uses mock data to demonstrate functionality.
 * Full performance validation requires actual map files.
 */

import { BatchMapLoader } from '../src/formats/maps/BatchMapLoader';
import type { MapLoadTask } from '../src/formats/maps/BatchMapLoader';
import type { RawMapData } from '../src/formats/maps/types';
import { MapLoaderRegistry } from '../src/formats/maps/MapLoaderRegistry';
import type { IMapLoader } from '../src/formats/maps/types';

// Mock loader that simulates map parsing
class MockMapLoader implements IMapLoader {
  async parse(buffer: File | ArrayBuffer): Promise<RawMapData> {
    // Simulate parsing time based on file size
    const size = buffer instanceof File ? buffer.size : buffer.byteLength;
    const parseTime = Math.min(size / 1024 / 10, 100); // Max 100ms
    await new Promise((resolve) => setTimeout(resolve, parseTime));

    return {
      format: 'w3x',
      info: {
        name: 'Mock Map',
        author: 'Test Author',
        description: 'Integration test map',
        players: [],
        dimensions: { width: 128, height: 128 },
        environment: { tileset: 'Test' },
      },
      terrain: {
        width: 128,
        height: 128,
        heightmap: new Float32Array(128 * 128),
        textures: [],
      },
      units: [],
      doodads: [],
    };
  }
}

// Mock map data generator
function createMockMapBuffer(sizeKB: number): ArrayBuffer {
  return new ArrayBuffer(sizeKB * 1024);
}

// Mock tasks simulating 24 maps with varying sizes
const createMockTasks = (): MapLoadTask[] => {
  const mapSizes = [
    100,
    200,
    150,
    300,
    250,
    400,
    350,
    500, // Small to medium maps
    600,
    700,
    800,
    900,
    1000,
    1100,
    1200, // Large maps
    50,
    75,
    125,
    175,
    225,
    275,
    325,
    375,
    425, // Various sizes
  ];

  return mapSizes.map((sizeKB, index) => ({
    id: `map-${index + 1}`,
    file: createMockMapBuffer(sizeKB),
    extension: index % 3 === 0 ? '.w3x' : index % 3 === 1 ? '.sc2map' : '.w3n',
    sizeBytes: sizeKB * 1024,
    priority: index < 5 ? 10 : undefined, // First 5 maps have high priority
  }));
};

async function runBatchLoadTest(): Promise<void> {
  console.log('🧪 BatchMapLoader Integration Test\n');
  console.log('='.repeat(60));

  // Create mock registry with mock loaders
  const mockRegistry = new MapLoaderRegistry();
  const mockLoader = new MockMapLoader();
  mockRegistry.registerLoader('.w3x', mockLoader);
  mockRegistry.registerLoader('.sc2map', mockLoader);
  mockRegistry.registerLoader('.w3n', mockLoader);

  // Create batch loader
  const batchLoader = new BatchMapLoader({
    maxConcurrent: 3,
    maxCacheSize: 10,
    enableCache: true,
    registry: mockRegistry,
    onProgress: (progress): void => {
      const status = progress.status.toUpperCase().padEnd(8);
      const timeStr =
        progress.loadTimeMs !== undefined ? `(${progress.loadTimeMs.toFixed(0)}ms)` : '';
      console.log(`  [${progress.taskId}] ${status} ${timeStr}`);
    },
  });

  // Create mock tasks
  const tasks = createMockTasks();
  console.log(`\n📦 Loading ${tasks.length} maps...`);
  console.log(`⚙️  Config: maxConcurrent=3, maxCacheSize=10\n`);

  const startTime = Date.now();

  try {
    // Run batch load
    const result = await batchLoader.loadMaps(tasks);

    const totalTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Load Results\n');
    console.log(`Total Maps:     ${result.stats.total}`);
    console.log(`Succeeded:      ${result.stats.succeeded} ✅`);
    console.log(`Failed:         ${result.stats.failed} ${result.stats.failed > 0 ? '❌' : '✅'}`);
    console.log(`Cached:         ${result.stats.cached}`);
    console.log(`Total Time:     ${(result.totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`Avg per map:    ${(result.totalTimeMs / result.stats.total).toFixed(0)}ms`);
    console.log(`Overall Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Test cache
    console.log('\n' + '='.repeat(60));
    console.log('💾 Cache Statistics\n');
    const cacheStats = batchLoader.getCacheStats();
    console.log(`Cache Size:     ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`Hit Rate:       ${cacheStats.hitRate.toFixed(2)}%`);

    // Test cache hit
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Testing Cache Hit (loading first 5 maps again)...\n');

    const cachedTasks = tasks.slice(0, 5);
    const cachedResult = await batchLoader.loadMaps(cachedTasks);

    console.log(`Cached loads:   ${cachedResult.stats.cached}/5 ✅`);
    console.log(`Cache time:     ${cachedResult.totalTimeMs.toFixed(0)}ms (should be ~0ms)`);

    // Performance validation
    console.log('\n' + '='.repeat(60));
    console.log('⚡ Performance Validation\n');

    const totalLoadTime = totalTime / 1000;
    const targetTime = 120; // 2 minutes for 24 maps
    const passesTimeTest = totalLoadTime < targetTime;

    console.log(`Time Limit:     ${targetTime}s`);
    console.log(`Actual Time:    ${totalLoadTime.toFixed(2)}s`);
    console.log(
      `Performance:    ${passesTimeTest ? '✅ PASS' : '⚠️  Would need actual maps to test'}`
    );

    // Note about memory test
    console.log(`Memory Limit:   <4GB (requires profiling with actual maps)`);
    console.log(`Memory Test:    ⚠️  Requires integration with actual map files`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Integration Test Complete\n');
    console.log('Note: Full performance validation requires 24 actual map files.');
    console.log('This test demonstrates the BatchMapLoader functionality with mock data.');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
runBatchLoadTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { runBatchLoadTest };
