import { test } from '@playwright/test';

/**
 * Debug test - Directly verify event mechanism
 */
test('should trigger test:loadMap event', async ({ page }) => {
  test.setTimeout(60000);

  // Add console listener
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('.gallery-view', { timeout: 15000 });

  // Wait for maps to load
  await page.waitForSelector('.map-card', { timeout: 15000 });

  // Check if we can see any console logs
  const result = await page.evaluate(() => {
    console.log('[TEST] About to dispatch event');

    const event = new CustomEvent('test:loadMap', {
      detail: {
        name: 'EchoIslesAlltherandom.w3x',
        path: '/maps/EchoIslesAlltherandom.w3x',
        format: 'w3x',
      },
    });

    window.dispatchEvent(event);
    console.log('[TEST] Event dispatched');

    return 'event dispatched';
  });

  console.log('[TEST RESULT]', result);

  // Wait to see if gallery hides
  await page.waitForTimeout(5000);

  const galleryVisible = await page.locator('.gallery-view').isVisible();
  console.log('[TEST] Gallery still visible?', galleryVisible);

  const loadingVisible = await page
    .locator('.loading-overlay')
    .isVisible()
    .catch(() => false);
  console.log('[TEST] Loading overlay visible?', loadingVisible);
});
