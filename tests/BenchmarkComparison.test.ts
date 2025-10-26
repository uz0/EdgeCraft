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
  { id: 'edgecraft', iterations: 18, elements: 140 },
  { id: 'babylonGui', iterations: 18, elements: 140 },
  { id: 'wcardinalUi', iterations: 18, elements: 140 }
];

test.describe('Edge Craft benchmark comparison', () => {
  test('renders comparison and records results', async ({ page }) => {
    await page.goto('/benchmark');
    await page.waitForSelector('[data-testid="benchmark-page"]');

    const results: BrowserBenchmarkResult[] = [];

    for (const library of libraries) {
      await page.evaluate(
        ([eventName, payload, globalKey]) => {
          (window as typeof window & Record<string, unknown>)[globalKey] = null;
          window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
        },
        [BENCHMARK_EVENT, library, GLOBAL_RESULT_KEY] as const
      );

      const result = await page.waitForFunction<BrowserBenchmarkResult | null>(
        (globalKey: string, id: string) => {
          const value = (window as typeof window & Record<string, unknown>)[globalKey] as
            | BrowserBenchmarkResult
            | null;
          if (!value || value.library !== id) {
            return null;
          }

          return value;
        },
        GLOBAL_RESULT_KEY,
        library.id,
        { timeout: 15_000 }
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
