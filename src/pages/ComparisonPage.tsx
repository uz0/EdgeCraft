import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BenchmarkResult } from '../benchmarks';
import { BENCHMARK_COMPLETE_EVENT, BENCHMARK_STORAGE_KEY } from '../benchmarks/events';
import { readBenchmarkHistory } from '../utils/benchmarkStorage';
import './ComparisonPage.css';

const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatOps = (value: number): string => `${value.toFixed(2)} ops/ms`;

export const ComparisonPage: React.FC = () => {
  const [history, setHistory] = useState<BenchmarkResult[]>(() => readBenchmarkHistory());

  useEffect(() => {
    const refreshHistory = (): void => {
      setHistory(readBenchmarkHistory());
    };

    const handleCompleted = (): void => {
      refreshHistory();
    };

    const handleStorage = (event: StorageEvent): void => {
      if (event.key === BENCHMARK_STORAGE_KEY) {
        refreshHistory();
      }
    };

    window.addEventListener(BENCHMARK_COMPLETE_EVENT, handleCompleted as EventListener);
    window.addEventListener('storage', handleStorage);

    return (): void => {
      window.removeEventListener(BENCHMARK_COMPLETE_EVENT, handleCompleted as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.elapsedMs - b.elapsedMs),
    [history]
  );

  const aggregate = useMemo(() => {
    if (sortedHistory.length === 0) {
      return null;
    }

    const totalElapsed = sortedHistory.reduce((sum, result) => sum + result.elapsedMs, 0);
    const totalOps = sortedHistory.reduce((sum, result) => sum + result.opsPerMs, 0);

    const best = sortedHistory[0]!;

    return {
      count: sortedHistory.length,
      best,
      averageElapsed: totalElapsed / sortedHistory.length,
      averageOps: totalOps / sortedHistory.length,
    };
  }, [sortedHistory]);

  return (
    <main className="ComparisonPage" data-testid="comparison-page">
      <header className="ComparisonPage__header">
        <h1>Benchmark Comparison</h1>
        <p>
          This dashboard summarizes local browser benchmark runs. Execute new measurements on the{' '}
          <Link to="/benchmark">benchmark harness</Link> and return here to review standings.
        </p>
      </header>

      {aggregate ? (
        <section className="ComparisonPage__summary" aria-label="Benchmark summary">
          <div>
            <span className="ComparisonPage__summary-label">Runs Recorded</span>
            <strong>{aggregate.count}</strong>
          </div>
          <div>
            <span className="ComparisonPage__summary-label">Average Duration</span>
            <strong>{formatMs(aggregate.averageElapsed)}</strong>
          </div>
          <div>
            <span className="ComparisonPage__summary-label">Average Throughput</span>
            <strong>{formatOps(aggregate.averageOps)}</strong>
          </div>
          <div>
            <span className="ComparisonPage__summary-label">Fastest Library</span>
            <strong>{aggregate.best.library}</strong>
          </div>
        </section>
      ) : null}

      {sortedHistory.length === 0 ? (
        <section className="ComparisonPage__empty" aria-live="polite">
          <p>
            No benchmark history found. Trigger a run from the benchmark harness to populate this
            table.
          </p>
        </section>
      ) : (
        <section className="ComparisonPage__table" aria-label="Benchmark standings">
          <table>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Library</th>
                <th scope="col">Elapsed</th>
                <th scope="col">Ops / ms</th>
                <th scope="col">Samples</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((entry, index) => (
                <tr key={`${entry.library}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{entry.library}</td>
                  <td>{formatMs(entry.elapsedMs)}</td>
                  <td>{formatOps(entry.opsPerMs)}</td>
                  <td>{entry.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
};
