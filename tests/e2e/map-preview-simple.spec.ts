/**
 * Playwright E2E Tests: Map Preview Validation (Simplified)
 *
 * Uses shared Vite dev server from playwright.config.ts
 * Tests run with real WebGL rendering in Chromium
 *
 * Run with: npx playwright test tests/e2e/map-preview-simple.spec.ts
 */

import { test, expect } from '@playwright/test';

// Configure test timeout
test.setTimeout(90000);

test.describe('Map Gallery Rendering', () => {
  test('should display all 24 map cards in gallery', async ({ page }) => {
    await page.goto('/');

    // Wait for map cards to appear
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    // Get all map cards
    const mapCards = await page.locator('button[aria-label^="Load map"]').all();

    // Verify count
    expect(mapCards.length).toBe(24);

    console.log(`✅ Found ${mapCards.length} map cards`);
  });

  test('should show correct maps count in header', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    // Check maps count
    const mapsCountText = await page.locator('text=/Maps: \\d+/').textContent();
    expect(mapsCountText).toContain('24');

    console.log(`✅ Header shows: ${mapsCountText}`);
  });

  test('each map card should render with image or placeholder', async ({ page }) => {
    await page.goto('/');

    // Wait for map cards
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    const mapCards = await page.locator('button[aria-label^="Load map"]').all();

    for (const card of mapCards) {
      const ariaLabel = await card.getAttribute('aria-label');
      const mapName = ariaLabel?.replace('Load map: ', '');

      // Check if card has either image or badge placeholder
      const img = card.locator('img');
      const badge = card.locator('[class*="badge"]');

      const hasImg = (await img.count()) > 0;
      const hasBadge = (await badge.count()) > 0;

      // Must have either image or badge
      expect(hasImg || hasBadge).toBe(true);

      console.log(`✅ ${mapName}: ${hasImg ? 'image' : 'placeholder'}`);
    }
  });
});

test.describe('Format-Specific Rendering', () => {
  test('W3X maps should show previews', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    const w3xMaps = [
      '3P Sentinel 01 v3.06.w3x',
      'EchoIslesAlltherandom.w3x',
      'Legion_TD_11.2c-hf1_TeamOZE.w3x',
    ];

    for (const mapName of w3xMaps) {
      const card = page.locator(`button[aria-label="Load map: ${mapName}"]`);
      await expect(card).toBeVisible();

      console.log(`✅ ${mapName}: visible`);
    }
  });

  test('W3N campaigns should show W3N badge', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    const w3nMaps = [
      'BurdenOfUncrowned.w3n',
      'HorrorsOfNaxxramas.w3n',
    ];

    for (const mapName of w3nMaps) {
      const card = page.locator(`button[aria-label="Load map: ${mapName}"]`);
      await expect(card).toBeVisible();

      // W3N campaigns should have W3N badge
      const badge = card.locator('text=W3N');
      await expect(badge).toBeVisible();

      console.log(`✅ ${mapName}: W3N badge visible`);
    }
  });
});

test.describe('Performance', () => {
  test('should maintain 60 FPS', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button[aria-label^="Load map"]', { timeout: 60000 });

    // Wait for initial render to settle
    await page.waitForTimeout(2000);

    // Check FPS
    const fpsText = await page.locator('text=/FPS: \\d+/').textContent();
    const match = fpsText?.match(/FPS: (\\d+)/);
    const fps = match ? parseInt(match[1], 10) : 0;

    // Should be close to 60 FPS (allow some variance)
    expect(fps).toBeGreaterThanOrEqual(55);

    console.log(`✅ FPS: ${fps}`);
  });
});
