import type { BenchmarkResult } from '../benchmarks';
import { BENCHMARK_STORAGE_KEY } from '../benchmarks/events';

const isBrowserEnvironment = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isBenchmarkResult = (value: unknown): value is BenchmarkResult => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as BenchmarkResult;
  return (
    typeof candidate.library === 'string' &&
    typeof candidate.elapsedMs === 'number' &&
    typeof candidate.samples === 'number' &&
    typeof candidate.opsPerMs === 'number' &&
    typeof candidate.metadata === 'object'
  );
};

const parseHistory = (raw: string): BenchmarkResult[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isBenchmarkResult);
  } catch {
    return [];
  }
};

export const readBenchmarkHistory = (): BenchmarkResult[] => {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BENCHMARK_STORAGE_KEY);
    if (raw === null || raw === '') {
      return [];
    }

    return parseHistory(raw);
  } catch {
    return [];
  }
};

export const writeBenchmarkHistory = (history: BenchmarkResult[]): void => {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage write failures (quota, privacy settings, etc.)
  }
};
