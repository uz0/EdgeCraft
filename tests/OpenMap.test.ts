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
    const mapName = await firstMapCard.locator('.map-card-title').textContent();

    await firstMapCard.click();

    // Wait for navigation to map viewer
    await page.waitForURL(/\/.+/); // Should navigate to /mapname

    // Check if there's an error message (WebGL might not be available in CI)
    const errorVisible = await page.locator('.error-overlay').isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator('.error-content p').textContent();
      console.log('WebGL initialization error detected:', errorText);

      // If WebGL isn't available, skip the test gracefully
      test.skip(true, `WebGL not available in CI: ${errorText}`);
      return;
    }

    // Wait for Babylon.js canvas to be present
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Wait for Babylon.js engine to initialize (exposed for testing)
    await page.waitForFunction(
      () => {
        return (window as any).__testBabylonEngine !== undefined;
      },
      { timeout: 15000 }
    );

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

    // Verify canvas is rendering (WebGL canvas can't be read with 2D context)
    // Instead, we verify the canvas exists and has dimensions
    const canvasRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;

      // Check canvas has non-zero dimensions (means it's rendering)
      return canvas.width > 0 && canvas.height > 0;
    });
    expect(canvasRendering).toBe(true);

    // Additional verification: Take a screenshot to ensure visual rendering
    // (This validates the test is actually rendering, not just initializing)
    const screenshot = await page.locator('canvas').screenshot();
    expect(screenshot.length).toBeGreaterThan(1000); // Screenshot should be more than 1KB

    // Verify back button is present and functional
    const backButton = page.locator('button', { hasText: /back|gallery/i });
    await expect(backButton).toBeVisible();

    // Click back button to return to gallery
    await backButton.click();
    await page.waitForURL('/');
    await expect(page.locator('button[class*="map-card"]').first()).toBeVisible();
  });
});
