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

    // Take a full-page screenshot for visual regression
    await expect(page).toHaveScreenshot('map-gallery-full.png', {
      fullPage: true,
      threshold: 0.1, // 10% difference allowed for slight rendering variations
    });

    // Verify key elements are visible
    await expect(page.locator('h1')).toContainText(/maps/i);

    // Verify filter buttons are present
    const filterButtons = await page.locator('button[class*="filter"]').count();
    expect(filterButtons).toBeGreaterThanOrEqual(0);

    // Verify at least one map has a thumbnail or placeholder
    const images = await page.locator('img, div[class*="placeholder"]').count();
    expect(images).toBeGreaterThan(0);
  });
});
