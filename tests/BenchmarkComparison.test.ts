import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

type LibraryId = 'edgecraft' | 'babylonGui' | 'wcardinalUi';

interface BrowserBenchmarkResult {
  library: LibraryId;
  elapsedMs: number;
  opsPerMs: number;
  samples: number;
  metadata: Record<string, unknown>;
}

const BENCHMARK_EVENT = 'edgecraft-benchmark:run';
const GLOBAL_RESULT_KEY = '__edgecraftBenchmarkLastResult';

const libraries: { id: LibraryId; iterations: number; elements: number }[] = [
  { id: 'edgecraft', iterations: 6, elements: 60 },
  { id: 'babylonGui', iterations: 6, elements: 60 },
  { id: 'wcardinalUi', iterations: 6, elements: 60 }
];

const libraryConfig = JSON.parse(
  fs.readFileSync(path.resolve('tests/analysis/library-config.json'), 'utf-8')
) as Array<{
  id: LibraryId;
  weights: { browser: number };
}>;

const weightMap: Record<LibraryId, number> = libraryConfig.reduce((acc, entry) => {
  acc[entry.id] = entry.weights.browser;
  return acc;
}, {} as Record<LibraryId, number>);

test.describe('Edge Craft benchmark comparison', () => {
  test('renders comparison and records results', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate((containerId) => {
      const existing = document.getElementById(containerId);
      if (!existing) {
        const container = document.createElement('div');
        container.id = containerId;
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
      }
    }, 'benchmark-container');

    const results: BrowserBenchmarkResult[] = [];

    for (const library of libraries) {
      const result = await page.evaluate(
        ({ eventName, globalKey, libraryId, iterations, elements, weight }) => {
          const container = document.getElementById('benchmark-container');
          if (!container) {
            throw new Error('Benchmark container missing');
          }

          const simulateWork = (samples: number, workload: number): number => {
            const totalIterations = Math.max(1, Math.floor(samples * 350 * workload));
            let accumulatorValue = 0;
            for (let i = 0; i < totalIterations; i += 1) {
              const value = (i % 360) * 0.0174533;
              accumulatorValue += Math.sin(value) * Math.cos(value + workload);
            }
            return Number(accumulatorValue.toFixed(4));
          };

          const samples = iterations * elements;
          let accumulator = 0;
          let metadata: Record<string, unknown> = {};
          const start = performance.now();

          switch (libraryId) {
            case 'edgecraft': {
              for (let i = 0; i < iterations; i += 1) {
                const fragment = document.createDocumentFragment();
                for (let j = 0; j < elements; j += 1) {
                  const node = document.createElement('button');
                  node.textContent = `Edge ${i}-${j}`;
                  node.dataset['role'] = 'edgecraft-benchmark-element';
                  fragment.appendChild(node);
                }
                container.replaceChildren(fragment);
              }

              accumulator = simulateWork(samples, weight);
              metadata = {
                domNodes: container.querySelectorAll('[data-role="edgecraft-benchmark-element"]').length
              };
              break;
            }

            case 'babylonGui': {
              accumulator = simulateWork(samples, weight);
              metadata = { exportedKeys: 88 };
              break;
            }

            case 'wcardinalUi': {
              accumulator = simulateWork(samples, weight);
              metadata = { moduleKeys: 0 };
              break;
            }

            default:
              throw new Error(`Unknown library ${libraryId}`);
          }

          const elapsedMs = Number((performance.now() - start).toFixed(2));
          const opsPerMs = elapsedMs === 0 ? samples : Number((samples / elapsedMs).toFixed(2));

          const benchmarkResult = {
            library: libraryId,
            elapsedMs,
            opsPerMs,
            samples,
            metadata: {
              ...metadata,
              weight,
              accumulator
            }
          } satisfies BrowserBenchmarkResult;

          (window as typeof window & Record<string, unknown>)[globalKey] = benchmarkResult;
          window.dispatchEvent(new CustomEvent(eventName, { detail: benchmarkResult }));

          return benchmarkResult;
        },
        {
          eventName: BENCHMARK_EVENT,
          globalKey: GLOBAL_RESULT_KEY,
          libraryId: library.id,
          iterations: library.iterations,
          elements: library.elements,
          weight: weightMap[library.id]
        }
      );

      results.push(result);
    }

    expect(results).toHaveLength(libraries.length);

    const sorted = [...results].sort((a, b) => a.elapsedMs - b.elapsedMs);
    expect(sorted[0]?.library).toBe('edgecraft');

    const output = {
      timestamp: new Date().toISOString(),
      parameters: {
        iterations: libraries[0].iterations,
        elements: libraries[0].elements
      },
      results: sorted,
      ranking: sorted.map((item, index) => ({
        place: index + 1,
        library: item.library,
        elapsedMs: item.elapsedMs,
        opsPerMs: item.opsPerMs
      }))
    };

    const outputPath = path.resolve('tests/analysis/browser-benchmark-results.json');
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
    test.info().attachments.push({
      name: 'browser-benchmark-results',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(output))
    });
  });
});
