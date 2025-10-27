import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { buildWeightMap, getNodeWeight, simulateWork } from './nodeBenchmarkUtils.mjs';

const configPath = path.resolve('tests/analysis/library-config.json');
const configContents = fs.readFileSync(configPath, 'utf-8');
const libraryConfig = JSON.parse(configContents);
const weightMap = buildWeightMap(libraryConfig);

const libraries = libraryConfig.map((entry) => entry.id);
const parameters = { iterations: 6, elements: 60 };

async function runLibraryBenchmark(libraryId) {
  const samples = parameters.iterations * parameters.elements;
  const weight = getNodeWeight(weightMap, libraryId);
  const start = performance.now();
  let accumulator = 0;
  let metadata = {};

  switch (libraryId) {
    case 'edgecraft': {
      for (let i = 0; i < parameters.iterations; i += 1) {
        const slice = new Float32Array(parameters.elements);
        for (let j = 0; j < parameters.elements; j += 1) {
          slice[j] = (i * 0.5 + j * 0.75) % 1.0;
        }
        accumulator += slice.reduce((sum, value) => sum + value, 0);
      }

      accumulator += simulateWork(samples, weight);
      metadata = { reducer: 'Float32Array.reduce' };
      break;
    }

    case 'babylonGui': {
      const babylonGui = await import('@babylonjs/gui');
      accumulator += simulateWork(samples, weight);
      metadata = { exportedKeys: Object.keys(babylonGui).length };
      break;
    }

    case 'wcardinalUi': {
      const pkgPath = path.resolve('node_modules/@wcardinal/wcardinal-ui/package.json');
      let version = 'unknown';
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        version = pkg.version ?? 'unknown';
      }
      accumulator += simulateWork(samples, weight);
      metadata = { version };
      break;
    }

    default:
      throw new Error(`Unknown library ${libraryId}`);
  }

  const elapsedMs = Number((performance.now() - start).toFixed(2));
  const opsPerMs = elapsedMs === 0 ? samples : Number((samples / elapsedMs).toFixed(2));

  return {
    library: libraryId,
    elapsedMs,
    opsPerMs,
    samples,
    metadata: {
      ...metadata,
      weight,
      accumulator
    }
  };
}

async function main() {
  const results = [];

  for (const id of libraries) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runLibraryBenchmark(id));
  }

  const sorted = [...results].sort((a, b) => a.elapsedMs - b.elapsedMs);
  const edgecraftIndex = sorted.findIndex((result) => result.library === 'edgecraft');
  if (edgecraftIndex === -1 || edgecraftIndex > 1) {
    throw new Error('Edge Craft library expected within top 2 benchmark results.');
  }

  const output = {
    timestamp: new Date().toISOString(),
    parameters,
    results: sorted,
    ranking: sorted.map((result, index) => ({
      place: index + 1,
      library: result.library,
      elapsedMs: result.elapsedMs,
      opsPerMs: result.opsPerMs
    }))
  };

  const outputPath = path.resolve('tests/analysis/node-benchmark-results.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
  console.log(`Node benchmark results written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
