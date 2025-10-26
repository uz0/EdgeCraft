export interface BenchmarkRequest {
  library: BenchmarkLibraryId;
  iterations: number;
  elements: number;
}

export interface BrowserBenchmarkRequest extends BenchmarkRequest {
  container: HTMLElement;
}

export interface BenchmarkResult {
  library: BenchmarkLibraryId;
  elapsedMs: number;
  samples: number;
  opsPerMs: number;
  metadata: Record<string, unknown>;
}

export type BenchmarkLibraryId = 'edgecraft' | 'babylonGui' | 'wcardinalUi';

export interface BenchmarkLibraryConfig {
  id: BenchmarkLibraryId;
  name: string;
  weights: {
    browser: number;
    node: number;
  };
  license: string;
  notes: string;
}
