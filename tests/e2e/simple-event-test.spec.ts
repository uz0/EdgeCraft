import { test, expect } from '@playwright/test';

test.describe('Simple Event Test', () => {
  test('should trigger map load via event', async ({ page }) => {
    // Enable all console logs
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (text.includes('[APP]') || text.includes('[TEST]') || text.includes('[handleMapSelect]')) {
        console.log(`[BROWSER ${type}]`, text);
      }
    });

    await page.goto('/');

    // Wait for gallery and maps
    await page.waitForSelector('.gallery-view', { timeout: 15000 });
    await page.waitForSelector('.map-card', { timeout: 15000 });

    // Wait extra time for all useEffects to complete
    await page.waitForTimeout(3000);

    // Dispatch event
    await page.evaluate(() => {
      console.log('[TEST] About to dispatch event');
      const event = new CustomEvent('test:loadMap', {
        detail: {
          name: 'EchoIslesAlltherandom.w3x',
          path: '/maps/EchoIslesAlltherandom.w3x',
          format: 'w3x'
        }
      });
      window.dispatchEvent(event);
      console.log('[TEST] Event dispatched');
    });

    // Wait to see logs
    await page.waitForTimeout(5000);

    // Check if gallery is hidden
    const isGalleryVisible = await page.locator('.gallery-view').isVisible();
    console.log('Gallery visible after event:', isGalleryVisible);

    // For now, just report the state
    expect(isGalleryVisible).toBe(false);
  });
});
