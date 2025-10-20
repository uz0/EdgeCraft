/**
 * E2E Test: Open Map
 *
 * Tests that clicking on a map in the gallery opens the map viewer
 * and successfully loads and renders the map with Babylon.js.
 */

import { test, expect } from '@playwright/test';

test.describe('Open Map', () => {
  test('should open map viewer and render map with Babylon.js', async ({ page }) => {
    // Navigate to the gallery
    await page.goto('/');

    // Wait for map cards to load
    await page.waitForSelector('button[class*="map-card"]', { timeout: 10000 });

    // Click on the first map card
    const firstMapCard = page.locator('button[class*="map-card"]').first();
    const mapName = await firstMapCard.locator('.map-card-name').textContent();

    await firstMapCard.click();

    // Wait for navigation to map viewer
    await page.waitForURL(/\/.+/); // Should navigate to /mapname

    // Wait for Babylon.js canvas to be present
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Wait for Babylon.js engine to initialize (exposed for testing)
    await page.waitForFunction(() => {
      return (window as any).__testBabylonEngine !== undefined;
    }, { timeout: 15000 });

    // Verify the engine is running
    const engineInitialized = await page.evaluate(() => {
      const engine = (window as any).__testBabylonEngine;
      return engine !== undefined && engine !== null;
    });
    expect(engineInitialized).toBe(true);

    // Verify scene is created
    const sceneExists = await page.evaluate(() => {
      const scene = (window as any).__testBabylonScene;
      return scene !== undefined && scene !== null;
    });
    expect(sceneExists).toBe(true);

    // Wait longer for map parsing and rendering to complete in CI
    await page.waitForTimeout(5000);

    // Check that FPS is reasonable (> 5 FPS indicates rendering is working)
    // Lower threshold for CI environment which is slower than local
    const fps = await page.evaluate(() => {
      const engine = (window as any).__testBabylonEngine;
      if (!engine || typeof engine.getFps !== 'function') return 0;
      return engine.getFps();
    });
    expect(fps).toBeGreaterThan(5);

    // Verify canvas is not blank (has drawn something)
    const canvasNotBlank = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Get image data from center of canvas
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const imageData = ctx.getImageData(centerX - 10, centerY - 10, 20, 20);

      // Check if at least some pixels are not transparent black (0,0,0,0)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
          return true; // Found a non-blank pixel
        }
      }
      return false;
    });
    expect(canvasNotBlank).toBe(true);

    // Verify back button is present and functional
    const backButton = page.locator('button', { hasText: /back|gallery/i });
    await expect(backButton).toBeVisible();

    // Click back button to return to gallery
    await backButton.click();
    await page.waitForURL('/');
    await expect(page.locator('button[class*="map-card"]')).toBeVisible();
  });
});
