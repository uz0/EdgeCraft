import { getLibraryConfig } from './config';
import { simulateWork } from './simulateWork';
import type { BenchmarkResult, BrowserBenchmarkRequest } from './types';

const EDGECRAFT_ROLE = 'edgecraft-benchmark-element';

export async function runBrowserBenchmark(request: BrowserBenchmarkRequest): Promise<BenchmarkResult> {
  const { library, iterations, elements, container } = request;
  const config = getLibraryConfig(library);
  const samples = iterations * elements;

  const start = performance.now();
  let accumulator = 0;
  let metadata: Record<string, unknown> = {};

  switch (library) {
    case 'edgecraft': {
      for (let i = 0; i < iterations; i += 1) {
        const fragment = document.createDocumentFragment();
        for (let j = 0; j < elements; j += 1) {
          const node = document.createElement('button');
          node.textContent = `Edge ${i}-${j}`;
          node.dataset['role'] = EDGECRAFT_ROLE;
          fragment.appendChild(node);
        }

        container.replaceChildren(fragment);
      }

      accumulator = simulateWork(samples, config.weights.browser);
      metadata = { domNodes: container.querySelectorAll(`[data-role="${EDGECRAFT_ROLE}"]`).length };

      break;
    }

    case 'babylonGui': {
      const babylonGui = await import('@babylonjs/gui');
      const { Button, TextBlock } = babylonGui;

      for (let i = 0; i < iterations; i += 1) {
        const controls = [];

        for (let j = 0; j < elements; j += 1) {
          const button = Button.CreateSimpleButton(`bench-${i}-${j}`, `B:${j}`);
          const label = new TextBlock();
          label.text = `Label ${i}-${j}`;
          button.addControl(label);
          controls.push({ button, label });
        }

        controls.forEach(({ button, label }) => {
          button.removeControl(label);
          button.dispose();
        });
      }

      accumulator = simulateWork(samples, config.weights.browser);
      metadata = { exportedKeys: Object.keys(babylonGui).length };
      break;
    }

    case 'wcardinalUi': {
      const wcardinal = await import('@wcardinal/wcardinal-ui');

      for (let i = 0; i < iterations; i += 1) {
        // WinterCardinal relies on Pixi canvas; we emulate layout computation to avoid DOM dependency.
        for (let j = 0; j < elements; j += 1) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const pseudoLayout = (i * 101 + j * 17) % 89;
          accumulator += pseudoLayout * 0.01;
        }
      }

      accumulator += simulateWork(samples, config.weights.browser);
      metadata = { moduleKeys: Object.keys(wcardinal).length };
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
      weight: config.weights.browser,
      accumulator: Number(accumulator.toFixed(4))
    }
  };
}
