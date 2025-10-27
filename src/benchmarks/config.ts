import rawLibraryConfig from '../../tests/analysis/library-config.json' assert { type: 'json' };
import type { BenchmarkLibraryConfig, BenchmarkLibraryId } from './types';

const LIBRARY_CONFIG: BenchmarkLibraryConfig[] = rawLibraryConfig as BenchmarkLibraryConfig[];

export function getLibraryConfig(library: BenchmarkLibraryId): BenchmarkLibraryConfig {
  const config = LIBRARY_CONFIG.find((item) => item.id === library);
  if (!config) {
    throw new Error(`Unknown benchmark library: ${library}`);
  }

  return config;
}

export function listBenchmarkLibraries(): BenchmarkLibraryConfig[] {
  return LIBRARY_CONFIG.slice();
}
