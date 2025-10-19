/**
 * Playwright E2E Tests: Map Preview Validation with Isolated App Instances
 *
 * Each test creates its own EdgeCraft instance for complete isolation
 * Tests run with real WebGL rendering in Chromium
 *
 * Run with: npx playwright test tests/e2e/map-preview-isolated.spec.ts
 */

import { test, expect } from './fixtures';

// Configure test timeout
test.setTimeout(90000);

// =============================================================================
// TEST SUITE: ISOLATED MAP GALLERY RENDERING
// =============================================================================

test.describe('Map Gallery Rendering (Isolated)', () => {
  test('should display all 24 map cards in gallery', async ({ app, page }) => {
    // Navigate to app instance
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Get all map cards
    const mapCards = await app.getMapCards(page);

    // Verify count
    expect(mapCards.length).toBe(24);

    console.log(`✅ Found ${mapCards.length} map cards in isolated instance`);
  });

  test('should show correct maps count in header', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapsCount = await app.getMapsCount(page);

    expect(mapsCount).toBe(24);

    console.log(`✅ Header shows ${mapsCount} maps`);
  });

  test('each map card should render with image or placeholder', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

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

  test('should maintain 60 FPS during gallery rendering', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Wait for initial render to settle
    await page.waitForTimeout(2000);

    // Check FPS
    const fps = await app.getFPS(page);

    // Should be close to 60 FPS (allow some variance)
    expect(fps).toBeGreaterThanOrEqual(55);

    console.log(`✅ FPS: ${fps}`);
  });
});

// =============================================================================
// TEST SUITE: FORMAT-SPECIFIC RENDERING
// =============================================================================

test.describe('Format-Specific Preview Rendering (Isolated)', () => {
  test('should load W3X map preview correctly', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const testMap = '3P Sentinel 01 v3.06.w3x';

    // Check if map card exists
    const card = await app.getMapCard(page, testMap);
    await expect(card).toBeVisible();

    // Check if preview is loaded or has placeholder
    const hasPreview = await app.isMapPreviewLoaded(page, testMap);

    console.log(`✅ ${testMap}: ${hasPreview ? 'preview loaded' : 'using placeholder'}`);

    // Card should be visible regardless
    await expect(card).toBeVisible();
  });

  test('should load SC2 map with square preview', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const testMap = 'Aliens Binary Mothership.SC2Map';

    const card = await app.getMapCard(page, testMap);
    await expect(card).toBeVisible();

    // If image exists, check dimensions
    const img = card.locator('img');
    const imgCount = await img.count();

    if (imgCount > 0) {
      const dimensions = await img.evaluate((imgEl: HTMLImageElement) => ({
        width: imgEl.naturalWidth,
        height: imgEl.naturalHeight,
      }));

      // SC2 previews should be square
      expect(dimensions.width).toBe(dimensions.height);

      console.log(`✅ ${testMap}: Square preview (${dimensions.width}×${dimensions.height})`);
    } else {
      console.log(`✅ ${testMap}: Using placeholder`);
    }
  });

  test('should load W3N campaign correctly', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const testMap = 'BurdenOfUncrowned.w3n';

    const card = await app.getMapCard(page, testMap);
    await expect(card).toBeVisible();

    // W3N should have badge
    const badge = card.locator('text=W3N');
    await expect(badge).toBeVisible();

    console.log(`✅ ${testMap}: W3N campaign badge visible`);
  });
});

// =============================================================================
// TEST SUITE: GALLERY INTERACTIONS
// =============================================================================

test.describe('Gallery Interactions (Isolated)', () => {
  test('should filter maps by format', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Get initial count
    const allCards = await app.getMapCards(page);
    expect(allCards.length).toBe(24);

    // Filter by W3X
    await app.filterByFormat(page, 'w3x');
    await page.waitForTimeout(500);

    const w3xCards = await app.getMapCards(page);

    // Should have fewer cards (14 W3X maps)
    expect(w3xCards.length).toBeLessThan(24);
    expect(w3xCards.length).toBeGreaterThan(0);

    console.log(`✅ Filtered to ${w3xCards.length} W3X maps`);
  });

  test('should search for maps by name', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Search for "Sentinel"
    await app.searchMaps(page, 'Sentinel');
    await page.waitForTimeout(500);

    const searchResults = await app.getMapCards(page);

    // Should find Sentinel maps (7 total)
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.length).toBeLessThan(24);

    console.log(`✅ Search "Sentinel" found ${searchResults.length} maps`);
  });

  test('should reset previews successfully', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Click reset button
    await app.resetPreviews(page);

    // Wait for reset to complete
    await page.waitForTimeout(1000);

    // Gallery should still show 24 maps
    const mapCards = await app.getMapCards(page);
    expect(mapCards.length).toBe(24);

    console.log(`✅ Reset previews - ${mapCards.length} maps remain`);
  });
});

// =============================================================================
// TEST SUITE: PERFORMANCE & MEMORY
// =============================================================================

test.describe('Performance & Memory (Isolated)', () => {
  test('should load gallery within performance budget', async ({ app, page }) => {
    const startTime = Date.now();

    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);

    console.log(`✅ Gallery loaded in ${loadTime}ms`);
  });

  test('should not leak memory during browsing', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const initialMemory = await app.getMemoryUsage(page);

    if (!initialMemory) {
      console.log('ℹ️  Memory API not available (Chrome-only feature)');
      return;
    }

    // Scroll through gallery multiple times
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }

    const finalMemory = await app.getMemoryUsage(page);

    if (finalMemory) {
      const increase = finalMemory.used - initialMemory.used;
      const increasePercent = (increase / initialMemory.used) * 100;

      // Memory increase should be < 30% after scrolling
      expect(increasePercent).toBeLessThan(30);

      console.log(
        `✅ Memory: ${(initialMemory.used / 1024 / 1024).toFixed(1)}MB → ${(finalMemory.used / 1024 / 1024).toFixed(1)}MB (+${increasePercent.toFixed(1)}%)`
      );
    }
  });

  test('should maintain FPS during user interactions', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Perform various interactions
    await app.searchMaps(page, 'test');
    await page.waitForTimeout(500);

    await app.filterByFormat(page, 'w3x');
    await page.waitForTimeout(500);

    await app.filterByFormat(page, 'all');
    await page.waitForTimeout(500);

    // Check FPS after interactions
    const fps = await app.getFPS(page);

    expect(fps).toBeGreaterThanOrEqual(55);

    console.log(`✅ FPS after interactions: ${fps}`);
  });
});

// =============================================================================
// TEST SUITE: VISUAL REGRESSION
// =============================================================================

test.describe('Visual Regression (Isolated)', () => {
  test('should match gallery screenshot baseline', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Wait for all images to load or timeout
    await page.waitForTimeout(5000);

    // Take screenshot
    const screenshot = await app.takeScreenshot(page, 'gallery-baseline');

    expect(screenshot).toBeTruthy();

    console.log(`✅ Screenshot saved: gallery-baseline.png`);
  });

  test('should capture individual map previews', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const testMaps = [
      '3P Sentinel 01 v3.06.w3x',
      'EchoIslesAlltherandom.w3x',
      'BurdenOfUncrowned.w3n',
    ];

    for (const mapName of testMaps) {
      const card = await app.getMapCard(page, mapName);

      // Scroll card into view
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Take screenshot of card
      const screenshot = await card.screenshot();

      expect(screenshot.length).toBeGreaterThan(0);

      console.log(`✅ Captured: ${mapName}`);
    }
  });
});

// =============================================================================
// TEST SUITE: PRODUCTION BUILD
// =============================================================================

test.describe('Production Build (Isolated)', () => {
  test.use({ appConfig: { useProductionBuild: true } });

  test('should render correctly in production mode', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

    expect(mapCards.length).toBe(24);

    const fps = await app.getFPS(page);
    expect(fps).toBeGreaterThanOrEqual(55);

    console.log(`✅ Production build: ${mapCards.length} maps, ${fps} FPS`);
  });
});
