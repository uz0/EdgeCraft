import { test, expect } from '@playwright/test';

test.describe('Debug Event Listener', () => {
  test('should have event listener registered', async ({ page }) => {
    // Enable console logging
    page.on('console', (msg) => {
      console.log(`[BROWSER ${msg.type()}]`, msg.text());
    });

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });
    await page.waitForSelector('.map-card', { timeout: 15000 });

    // Wait a bit for useEffects to run
    await page.waitForTimeout(2000);

    // Check if listener is registered
    const hasListener = await page.evaluate(() => {
      return (window as any).__testLoadMapListenerRegistered;
    });

    console.log('Event listener registered:', hasListener);
    expect(hasListener).toBe(true);
  });

  test('should dispatch event and log it', async ({ page }) => {
    // Enable console logging
    page.on('console', (msg) => {
      console.log(`[BROWSER ${msg.type()}]`, msg.text());
    });

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });
    await page.waitForSelector('.map-card', { timeout: 15000 });

    // Wait a bit for useEffects to run
    await page.waitForTimeout(2000);

    // Dispatch the event
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

    // Wait to see if event was handled
    await page.waitForTimeout(3000);

    // Check if gallery is still visible or hidden
    const galleryVisible = await page.locator('.gallery-view').isVisible();
    console.log('Gallery still visible:', galleryVisible);

    // If it worked, gallery should be hidden
    expect(galleryVisible).toBe(false);
  });
});
