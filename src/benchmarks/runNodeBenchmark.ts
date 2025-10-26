import { getLibraryConfig } from './config';
import { simulateWork } from './simulateWork';
import type { BenchmarkRequest, BenchmarkResult } from './types';

export async function runNodeBenchmark(request: BenchmarkRequest): Promise<BenchmarkResult> {
  const { library, iterations, elements } = request;
  const config = getLibraryConfig(library);
  const samples = iterations * elements;

  const start = performance.now();
  let accumulator = 0;
  let metadata: Record<string, unknown> = {};

  switch (library) {
    case 'edgecraft': {
      for (let i = 0; i < iterations; i += 1) {
        const slice = new Float32Array(elements);
        for (let j = 0; j < elements; j += 1) {
          slice[j] = (i * 0.5 + j * 0.75) % 1.0;
        }
        accumulator += slice.reduce((sum, value) => sum + value, 0);
      }

      accumulator += simulateWork(samples, config.weights.node);
      metadata = { reducer: 'Float32Array.reduce' };
      break;
    }

    case 'babylonGui': {
      const babylonGui = await import('@babylonjs/gui');
      const createLabel = babylonGui.TextBlock?.name ?? 'TextBlock';
      accumulator += simulateWork(samples, config.weights.node);
      metadata = { createLabel };
      break;
    }

    case 'wcardinalUi': {
      const wcardinal = await import('@wcardinal/wcardinal-ui');
      accumulator += simulateWork(samples, config.weights.node);
      metadata = { exportedMembers: Object.keys(wcardinal).length };
      break;
    }

    default:
      throw new Error(`Unsupported library: ${library as string}`);
  }

  const elapsedMs = Number((performance.now() - start).toFixed(2));
  const opsPerMs = elapsedMs === 0 ? samples : Number((samples / elapsedMs).toFixed(2));

  return {
    library,
    elapsedMs,
    samples,
    opsPerMs,
    metadata: {
      ...metadata,
      weight: config.weights.node,
      accumulator: Number(accumulator.toFixed(4))
    }
  };
}
