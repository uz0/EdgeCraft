import { test } from '@playwright/test';

test('manual debug - check if map loads', async ({ page }) => {
  // Log all console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER]`, msg.text());
  });

  // Log all errors
  page.on('pageerror', (err) => {
    console.error(`[PAGE ERROR]`, err.message);
  });

  await page.goto('http://localhost:3000');

  // Wait for gallery
  await page.waitForSelector('.gallery-view', { timeout: 15000 });
  console.log('Gallery visible');

  // Wait for maps to load
  await page.waitForSelector('.map-card', { timeout: 15000 });
  console.log('Map cards visible');

  // Check state
  const state = await page.evaluate(() => {
    return {
      testReady: (window as any).__testReady,
      hasHandleMapSelect: typeof (window as any).__handleMapSelect === 'function',
      mapCardCount: document.querySelectorAll('.map-card').length
    };
  });
  console.log('State:', state);

  // Try to call handleMapSelect
  try {
    await page.evaluate(() => {
      console.log('[TEST] About to call handleMapSelect');
      const fn = (window as any).__handleMapSelect;
      if (!fn) {
        throw new Error('__handleMapSelect not found');
      }

      const map = {
        id: 'EchoIslesAlltherandom.w3x',
        name: 'EchoIslesAlltherandom.w3x',
        format: 'w3x' as const,
        sizeBytes: 0,
        file: new File([], 'EchoIslesAlltherandom.w3x'),
      };

      console.log('[TEST] Calling function with map:', map);
      fn(map);
      console.log('[TEST] Function called');
    });
    console.log('handleMapSelect called successfully');
  } catch (err) {
    console.error('Error calling handleMapSelect:', err);
  }

  // Wait and check if gallery hides
  await page.waitForTimeout(5000);

  const galleryVisible = await page.locator('.gallery-view').isVisible();
  console.log('Gallery visible after call:', galleryVisible);

  // Keep browser open for inspection
  await page.waitForTimeout(30000);
});
