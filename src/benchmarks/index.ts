import { listBenchmarkLibraries, getLibraryConfig } from './config';
import { runBrowserBenchmark } from './runBrowserBenchmark';

export { listBenchmarkLibraries, getLibraryConfig } from './config';
export { runBrowserBenchmark } from './runBrowserBenchmark';
export { runNodeBenchmark } from './runNodeBenchmark';
export type {
  BenchmarkLibraryConfig,
  BenchmarkLibraryId,
  BenchmarkRequest,
  BenchmarkResult,
  BrowserBenchmarkRequest,
} from './types';

declare global {
  interface Window {
    __edgecraftBenchmarkExports?: {
      runBrowserBenchmark: typeof runBrowserBenchmark;
      listBenchmarkLibraries: typeof listBenchmarkLibraries;
      getLibraryConfig: typeof getLibraryConfig;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__edgecraftBenchmarkExports = {
    runBrowserBenchmark,
    listBenchmarkLibraries,
    getLibraryConfig,
  };
}
