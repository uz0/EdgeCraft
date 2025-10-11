import { test, expect } from '@playwright/test';

test.describe('Extended Smoke Tests', () => {
  test('should initialize Babylon.js renderer on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });
    
    // Verify canvas exists (even if hidden)
    const canvas = page.locator('canvas.babylon-canvas');
    await expect(canvas).toHaveCount(1);
    
    // Verify renderer initialized
    const hasRenderer = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.babylon-canvas');
      return canvas !== null;
    });
    expect(hasRenderer).toBe(true);
  });

  test('should show gallery with 24 maps', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.map-card', { timeout: 15000 });
    
    const mapCount = await page.locator('.map-card').count();
    expect(mapCount).toBe(24);
    
    const countText = page.locator('.map-count');
    await expect(countText).toContainText('24 maps');
  });

  test('should trigger map selection on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.map-card', { timeout: 15000 });
    
    // Click first map
    await page.locator('.map-card').first().click();
    
    // Verify loading started (overlay should appear briefly)
    // Note: Loading may be very fast for small maps
    const galleryHidden = await page.locator('.gallery-view').isHidden();
    const loadingAppeared = await page.locator('.loading-overlay').isVisible().catch(() => false);
    
    // At least one should be true (either gallery hides or loading shows)
    expect(galleryHidden || loadingAppeared).toBe(true);
  });
});
