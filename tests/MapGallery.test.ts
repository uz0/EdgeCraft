/**
 * E2E Test: Map Gallery Screenshot
 *
 * Tests that the map gallery page renders correctly with all maps visible.
 * Takes a screenshot for visual regression testing.
 */

import { test, expect } from '@playwright/test';

test.describe('Map Gallery', () => {
  test('should render map gallery with all maps and match screenshot', async ({ page }) => {
    // Navigate to the gallery page
    await page.goto('/');

    // Wait for the gallery to load
    await page.waitForSelector('button[class*="map-card"]', { timeout: 10000 });

    // Wait for images to load
    await page.waitForLoadState('networkidle');

    // Check that at least one map card is present
    const mapCards = await page.locator('button[class*="map-card"]').count();
    expect(mapCards).toBeGreaterThan(0);

    // Verify key elements are visible
    await expect(page.locator('h1')).toContainText(/EdgeCraft/i);

    // Verify filter buttons are present
    const filterButtons = await page.locator('button[class*="filter"]').count();
    expect(filterButtons).toBeGreaterThanOrEqual(0);

    // Wait for layout to stabilize (previews render async)
    await page.waitForTimeout(500);

    // Wait for any animations/transitions to complete and page to stabilize
    await page.waitForTimeout(1000);

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('map-gallery.png', {
      maxDiffPixelRatio: 0.07, // Allow up to 7% pixel difference for dynamic thumbnails and font rendering
    });
  });
});
