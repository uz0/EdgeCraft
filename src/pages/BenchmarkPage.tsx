import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listBenchmarkLibraries, runBrowserBenchmark } from '../benchmarks';
import type { BenchmarkLibraryId, BenchmarkResult } from '../benchmarks';
import {
  BENCHMARK_COMPLETE_EVENT,
  BENCHMARK_RUN_EVENT,
  BENCHMARK_STORAGE_KEY,
} from '../benchmarks/events';
import { readBenchmarkHistory, writeBenchmarkHistory } from '../utils/benchmarkStorage';
import './BenchmarkPage.css';

interface BenchmarkSummary {
  history: BenchmarkResult[];
  last?: BenchmarkResult;
}

export const BenchmarkPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<BenchmarkSummary>(() => {
    const history = readBenchmarkHistory();
    return {
      history,
      last: history.length > 0 ? history[history.length - 1] : undefined,
    };
  });
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const ciMode = query.get('mode') === 'ci';
  const libraryMetadata = useMemo(() => listBenchmarkLibraries(), []);

  useEffect(() => {
    if (ciMode) {
      return;
    }

    const handleStorage = (event: StorageEvent): void => {
      if (event.key === BENCHMARK_STORAGE_KEY) {
        const history = readBenchmarkHistory();
        setSummary({
          history,
          last: history.length > 0 ? history[history.length - 1] : undefined,
        });
      }
    };

    window.addEventListener('storage', handleStorage);
    return (): void => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [ciMode]);

  useEffect(() => {
    const global = window as typeof window & Record<string, unknown>;
    global['__edgecraftBenchmarkLastResult'] = null;
    global['__edgecraftBenchmarkReady'] = true;

    const handler = async (event: Event): Promise<void> => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const { library, iterations, elements } = event.detail as {
        library: BenchmarkLibraryId;
        iterations: number;
        elements: number;
      };

      if (!containerRef.current) {
        throw new Error('Benchmark container not ready.');
      }

      const result = await runBrowserBenchmark({
        library,
        iterations,
        elements,
        container: containerRef.current,
      });

      setSummary((prev): BenchmarkSummary => {
        const nextHistory = [...prev.history, result];
        if (!ciMode) {
          writeBenchmarkHistory(nextHistory);
        }
        return {
          history: nextHistory,
          last: result,
        };
      });

      (window as typeof window & Record<string, unknown>)['__edgecraftBenchmarkLastResult'] =
        result;
      window.dispatchEvent(new CustomEvent(BENCHMARK_COMPLETE_EVENT, { detail: result }));
    };

    const listener = (event: Event): void => {
      void handler(event);
    };

    window.addEventListener(BENCHMARK_RUN_EVENT, listener);
    return (): void => {
      window.removeEventListener(BENCHMARK_RUN_EVENT, listener);
      global['__edgecraftBenchmarkReady'] = false;
    };
  }, [ciMode]);

  return (
    <main className="BenchmarkPage" data-testid="benchmark-page">
      <section>
        <h1>Edge Craft Benchmark Harness</h1>
        {!ciMode && (
          <>
            <p className="BenchmarkPage__intro">
              Dispatch a <code>{BENCHMARK_RUN_EVENT}</code> custom event with <code>library</code>,{' '}
              <code>iterations</code>, and <code>elements</code> to execute comparisons inside the
              live scene. Results are emitted using <code>{BENCHMARK_COMPLETE_EVENT}</code>.
            </p>
            <ul className="BenchmarkPage__library-list">
              {libraryMetadata.map((library) => (
                <li key={library.id}>
                  <strong>{library.name}</strong> — {library.license} — browser weight{' '}
                  {library.weights.browser}, node weight {library.weights.node}
                </li>
              ))}
            </ul>
          </>
        )}
        {!ciMode && (
          <p data-testid="benchmark-last-result">
            {summary.last
              ? `Last run (${summary.last.library}): ${summary.last.elapsedMs}ms for ${summary.last.samples} samples (${summary.last.opsPerMs} ops/ms)`
              : 'Awaiting benchmark dispatch...'}
          </p>
        )}
      </section>

      <section className="BenchmarkPage__stage" data-testid="benchmark-stage">
        <div
          ref={containerRef}
          aria-label="Benchmark container"
          data-testid="benchmark-container"
        />
      </section>

      {!ciMode && (
        <section className="BenchmarkPage__history" data-testid="benchmark-history">
          <h2>Run History</h2>
          {summary.history.length === 0 ? (
            <p>No benchmarks executed in this session.</p>
          ) : (
            <ol>
              {summary.history.map((result, index) => (
                <li key={`${result.library}-${index}`}>
                  <span>{result.library}</span> — <span>{result.elapsedMs}ms</span> —{' '}
                  <span>{result.opsPerMs} ops/ms</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
};
