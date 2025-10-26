import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listBenchmarkLibraries, runBrowserBenchmark } from '../benchmarks';
import type { BenchmarkLibraryId, BenchmarkResult } from '../benchmarks';
import './BenchmarkPage.css';

interface BenchmarkSummary {
  history: BenchmarkResult[];
  last?: BenchmarkResult;
}

const BENCHMARK_EVENT = 'edgecraft-benchmark:run';
const BENCHMARK_COMPLETE_EVENT = 'edgecraft-benchmark:completed';

export const BenchmarkPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<BenchmarkSummary>({ history: [] });
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const ciMode = query.get('mode') === 'ci';
  const libraryMetadata = useMemo(() => listBenchmarkLibraries(), []);

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

      setSummary((prev) => ({
        history: [...prev.history, result],
        last: result,
      }));

      (window as typeof window & Record<string, unknown>)['__edgecraftBenchmarkLastResult'] =
        result;
      window.dispatchEvent(new CustomEvent(BENCHMARK_COMPLETE_EVENT, { detail: result }));
    };

    window.addEventListener(BENCHMARK_EVENT, (event: Event) => {
      void handler(event);
    });
    return (): void => {
      window.removeEventListener(BENCHMARK_EVENT, (event: Event) => {
        void handler(event);
      });
      global['__edgecraftBenchmarkReady'] = false;
    };
  }, []);

  return (
    <main className="BenchmarkPage" data-testid="benchmark-page">
      <section>
        <h1>Edge Craft Benchmark Harness</h1>
        {!ciMode && (
          <>
            <p className="BenchmarkPage__intro">
              Dispatch a <code>{BENCHMARK_EVENT}</code> custom event with <code>library</code>,{' '}
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
