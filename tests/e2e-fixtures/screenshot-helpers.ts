import { Page, expect } from '@playwright/test';

/**
 * Screenshot Helper Utilities
 */

/**
 * Wait for Babylon.js scene to be ready
 */
export async function waitForSceneReady(page: Page): Promise<void> {
  // Wait for engine and scene to be initialized
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas.babylon-canvas');
      return canvas !== null;
    },
    { timeout: 10000 }
  );

  // Wait for scene render loop to start (at least 2 frames)
  await page.waitForTimeout(100);
}

/**
 * Wait for map loading to complete
 */
export async function waitForMapLoaded(page: Page, timeout: number = 60000): Promise<void> {
  // First wait for loading to START (overlay appears)
  try {
    await page.waitForSelector('.loading-overlay', {
      state: 'visible',
      timeout: 5000,
    });
  } catch (e) {
    // If loading overlay doesn't appear, map might already be loaded or there's an error
    console.log('Loading overlay did not appear');
  }

  // Then wait for loading to FINISH (overlay disappears)
  await page.waitForSelector('.loading-overlay', {
    state: 'hidden',
    timeout, // Configurable timeout for large files
  });

  // Wait for canvas to appear
  await page.waitForSelector('canvas.babylon-canvas', {
    state: 'visible',
    timeout: 30000,
  });

  // Wait for error overlay NOT to appear
  const errorOverlay = page.locator('.error-overlay');
  await expect(errorOverlay).toBeHidden();

  // Extra wait for rendering to stabilize
  await page.waitForTimeout(2000);
}

/**
 * Take canvas screenshot
 */
export async function screenshotCanvas(page: Page): Promise<Buffer> {
  const canvas = page.locator('canvas.babylon-canvas');
  await expect(canvas).toBeVisible();

  return await canvas.screenshot({
    type: 'png',
  });
}

/**
 * Get FPS from UI
 */
export async function getFPS(page: Page): Promise<number> {
  const fpsText = await page.locator('.header-stats .stat').first().textContent();
  if (fpsText == null) return 0;
  const match = fpsText.match(/FPS: (\d+)/);
  const fpsString = match?.[1];
  return fpsString != null ? parseInt(fpsString, 10) : 0;
}

/**
 * Select map from gallery by calling handleMapSelect directly
 */
export async function selectMap(page: Page, mapName: string): Promise<void> {
  // Wait for gallery to be visible and maps to be loaded
  await page.waitForSelector('.gallery-view', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('.map-card', { timeout: 15000 });

  // Wait for __testReady flag

  await page.waitForFunction(() => (window as any).__testReady === true, { timeout: 10000 });

  // Extract format from map name
  const format = mapName.endsWith('.w3x')
    ? 'w3x'
    : mapName.endsWith('.w3n')
      ? 'w3n'
      : mapName.endsWith('.SC2Map')
        ? 'sc2map'
        : 'w3x';

  // Call handleMapSelect directly via window
  await page.evaluate(
    ({ name, fmt }) => {
      console.log('[TEST] Calling handleMapSelect directly for:', name);

      const handleMapSelect = (window as any).__handleMapSelect;

      if (!handleMapSelect) {
        throw new Error('handleMapSelect not available on window');
      }

      // Create map metadata
      const map = {
        id: name,
        name,
        format: fmt as 'w3x' | 'w3n' | 'sc2map',
        sizeBytes: 0,
        file: new File([], name),
      };

      console.log('[TEST] Calling handleMapSelect with:', map);

      handleMapSelect(map);
    },
    { name: mapName, fmt: format }
  );

  // Wait a moment for React to process
  await page.waitForTimeout(1000);

  // Wait for gallery to hide (map loading started)
  await page.waitForSelector('.gallery-view', { state: 'hidden', timeout: 15000 });
}
