import { test, expect } from '@playwright/test';
import { selectMap, waitForMapLoaded } from '../e2e-fixtures/screenshot-helpers';

/**
 * Map Rendering E2E Tests
 *
 * Tests actual map rendering with Babylon.js and canvas screenshots
 */
test.describe('Map Rendering', () => {
  test('should render tiny W3X map - EchoIsles', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    // Use selectMap helper with FULL filename (including extension)
    await selectMap(page, 'EchoIslesAlltherandom.w3x');

    // Wait for map to load and render
    await waitForMapLoaded(page, 60000);

    // Verify canvas is visible
    const canvas = page.locator('canvas.babylon-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify no error overlay
    await expect(page.locator('.error-overlay')).toBeHidden();

    // Take screenshot of rendered map
    await expect(canvas).toHaveScreenshot('render-w3x-tiny-echoisles.png', {
      threshold: 0.05,
      maxDiffPixels: 200,
    });
  });

  test('should render small W3X map - Footmen Frenzy', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    // Use selectMap helper with FULL filename
    await selectMap(page, 'Footmen Frenzy 1.9f.w3x');

    // Wait for map to load and render
    await waitForMapLoaded(page, 60000);

    // Verify rendering
    const canvas = page.locator('canvas.babylon-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error-overlay')).toBeHidden();

    // Take screenshot
    await expect(canvas).toHaveScreenshot('render-w3x-small-footmen-frenzy.png', {
      threshold: 0.05,
      maxDiffPixels: 200,
    });
  });

  test('should render SC2 map - Ruined Citadel', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    // Use selectMap helper with FULL filename
    await selectMap(page, 'Ruined Citadel.SC2Map');

    // Wait for map to load and render
    await waitForMapLoaded(page, 60000);

    // Verify rendering
    const canvas = page.locator('canvas.babylon-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error-overlay')).toBeHidden();

    // Take screenshot
    await expect(canvas).toHaveScreenshot('render-sc2-ruined-citadel.png', {
      threshold: 0.05,
      maxDiffPixels: 200,
    });
  });
});
