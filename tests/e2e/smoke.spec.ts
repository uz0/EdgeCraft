import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load homepage with map gallery', async ({ page }) => {
    await page.goto('/');

    // Verify gallery loads
    await page.waitForSelector('.gallery-view', { timeout: 15000 });
    await expect(page.locator('.gallery-view')).toBeVisible();

    // Verify maps are displayed
    await page.waitForSelector('.map-card', { timeout: 15000 });
    const mapCards = page.locator('.map-card');
    const count = await mapCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify map count display
    const mapCount = page.locator('.map-count');
    await expect(mapCount).toContainText('24 maps');
  });

  test('should filter maps by search', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.map-card', { timeout: 15000 });

    // Type in search
    const searchInput = page.locator('input[placeholder="Search maps..."]');
    await searchInput.fill('Sentinel');
    await page.waitForTimeout(500);

    // Verify filtered results
    const mapCards = page.locator('.map-card');
    const count = await mapCards.count();
    expect(count).toBe(7); // 7 Sentinel maps
  });

  test('should filter maps by format', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.map-card', { timeout: 15000 });

    // Select W3N format
    const formatFilter = page.locator('select[aria-label="Filter by format"]');
    await formatFilter.selectOption('w3n');
    await page.waitForTimeout(500);

    // Verify only W3N maps shown
    const mapCards = page.locator('.map-card');
    const count = await mapCards.count();
    expect(count).toBe(7); // 7 W3N campaigns
  });

  test('should take screenshot of gallery', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.map-card', { timeout: 15000 });

    await expect(page).toHaveScreenshot('gallery.png', {
      fullPage: true,
      threshold: 0.05,
    });
  });
});
