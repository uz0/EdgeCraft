/**
 * E2E Test: Verify WASM Binary Extraction and Worker Distribution
 *
 * This test verifies that:
 * 1. Main thread extracts base64 WASM from embedded JavaScript
 * 2. WASM binary is decoded to ArrayBuffer
 * 3. ArrayBuffer is distributed to all workers
 * 4. Workers receive and set the WASM binary
 * 5. No memory issues or worker timeouts occur
 */

import { test, expect } from '@playwright/test';

test.describe('WASM Optimization System', () => {
  test('should extract WASM binary and distribute to workers', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errorMessages: string[] = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[Browser Console] ${text}`);
    });

    // Capture errors
    page.on('pageerror', (error) => {
      const errorText = error.message;
      errorMessages.push(errorText);
      console.error(`[Browser Error] ${errorText}`);
    });

    // Navigate to the application
    console.log('Navigating to http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Wait for worker pool initialization (up to 30 seconds)
    console.log('Waiting for WASM binary extraction and worker distribution...');
    await page.waitForTimeout(5000);

    // Verify console logs
    console.log('\n--- CONSOLE LOG ANALYSIS ---\n');

    // 1. Verify WASM binary decoding started
    const decodingStarted = consoleMessages.some(msg =>
      msg.includes('[WorkerPoolManager] 🔄 Pre-decoding StormJS WASM binary')
    );
    console.log(`✓ WASM decoding started: ${decodingStarted ? '✅' : '❌'}`);
    expect(decodingStarted).toBe(true);

    // 2. Verify StormLib JS loaded
    const stormLibLoaded = consoleMessages.some(msg =>
      msg.includes('[StormJSAdapter] Loading StormLib JS from:')
    );
    console.log(`✓ StormLib JS loaded: ${stormLibLoaded ? '✅' : '❌'}`);
    expect(stormLibLoaded).toBe(true);

    // 3. Verify base64 WASM found
    const wasmFound = consoleMessages.some(msg =>
      msg.includes('[StormJSAdapter] Found embedded WASM data')
    );
    console.log(`✓ Embedded WASM found: ${wasmFound ? '✅' : '❌'}`);
    expect(wasmFound).toBe(true);

    // 4. Verify WASM binary decoded successfully
    const wasmDecoded = consoleMessages.some(msg =>
      msg.includes('[StormJSAdapter] ✅ WASM binary decoded successfully')
    );
    console.log(`✓ WASM binary decoded: ${wasmDecoded ? '✅' : '❌'}`);
    expect(wasmDecoded).toBe(true);

    // 5. Verify WASM binary distributed to workers
    const wasmDistributed = consoleMessages.some(msg =>
      msg.includes('[WorkerPoolManager] ✅ WASM binary decoded') &&
      msg.includes('distributing to workers')
    );
    console.log(`✓ WASM distributed to workers: ${wasmDistributed ? '✅' : '❌'}`);
    expect(wasmDistributed).toBe(true);

    // 6. Verify workers received WASM binary (should see 3 workers)
    const workerReceivedCount = consoleMessages.filter(msg =>
      msg.includes('[PreviewWorker] Received WASM binary from main thread')
    ).length;
    console.log(`✓ Workers received WASM: ${workerReceivedCount}/3 ${workerReceivedCount === 3 ? '✅' : '❌'}`);
    expect(workerReceivedCount).toBe(3);

    // 7. Extract WASM binary size from logs
    const wasmSizeMatch = consoleMessages.find(msg =>
      msg.includes('[StormJSAdapter] ✅ WASM binary decoded successfully')
    )?.match(/\((\d+)KB\)/);

    if (wasmSizeMatch) {
      const wasmSizeKB = parseInt(wasmSizeMatch[1], 10);
      console.log(`✓ WASM binary size: ${wasmSizeKB}KB ${wasmSizeKB > 500 && wasmSizeKB < 2000 ? '✅' : '❌'}`);
      expect(wasmSizeKB).toBeGreaterThan(500);
      expect(wasmSizeKB).toBeLessThan(2000);
    }

    // 8. Verify no errors occurred
    console.log(`✓ No errors: ${errorMessages.length === 0 ? '✅' : '❌'}`);
    if (errorMessages.length > 0) {
      console.error('\nErrors found:');
      errorMessages.forEach(err => console.error(`  - ${err}`));
    }
    expect(errorMessages.length).toBe(0);

    // 9. Check for worker timeout warnings
    const workerTimeouts = consoleMessages.filter(msg =>
      msg.includes('Worker crashed') || msg.includes('Task timeout')
    );
    console.log(`✓ No worker timeouts: ${workerTimeouts.length === 0 ? '✅' : '❌'}`);
    expect(workerTimeouts.length).toBe(0);

    console.log('\n--- TEST COMPLETED SUCCESSFULLY ---\n');

    // Print full console log for debugging
    console.log('\n--- FULL CONSOLE LOG ---\n');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });
  });

  test('should not exceed memory limits', async ({ page }) => {
    console.log('Testing memory usage...');

    // Navigate to the application
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Wait for WASM loading
    await page.waitForTimeout(5000);

    // Get memory usage metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance && performance.memory) {
        const mem = performance.memory as {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
        return {
          usedMB: Math.floor(mem.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.floor(mem.totalJSHeapSize / 1024 / 1024),
          limitMB: Math.floor(mem.jsHeapSizeLimit / 1024 / 1024),
        };
      }
      return null;
    });

    if (metrics) {
      console.log(`\n--- MEMORY USAGE ---`);
      console.log(`Used: ${metrics.usedMB}MB`);
      console.log(`Total: ${metrics.totalMB}MB`);
      console.log(`Limit: ${metrics.limitMB}MB`);

      // Verify memory usage is reasonable (should be well under 4GB)
      expect(metrics.usedMB).toBeLessThan(2000); // Less than 2GB
      console.log(`✓ Memory usage acceptable: ${metrics.usedMB}MB < 2000MB ✅`);
    } else {
      console.log('⚠️ performance.memory API not available');
    }
  });
});
