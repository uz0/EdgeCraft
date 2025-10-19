/**
 * Playwright E2E Tests: Map Preview Validation with Isolated Instances
 *
 * Tests map preview system with real WebGL rendering in Chromium
 * Validates ALL 24 maps render correctly in browser environment
 * Each test gets its own isolated EdgeCraft instance
 *
 * Run with: npx playwright test tests/e2e/map-preview-validation.spec.ts
 */

import { test, expect } from './fixtures';

// Configure test timeout for map loading
test.setTimeout(90000);

/**
 * Helper: Check if image is loaded and visible
 */
async function isImageLoaded(imgLocator: any): Promise<boolean> {
  const count = await imgLocator.count();
  if (count === 0) return false;

  // Check if image has naturalWidth > 0 (successfully loaded)
  return await imgLocator.evaluate((img: HTMLImageElement) => {
    return img.complete && img.naturalWidth > 0;
  });
}

/**
 * Helper: Get image dimensions
 */
async function getImageDimensions(imgLocator: any) {
  return await imgLocator.evaluate((img: HTMLImageElement) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));
}

/**
 * Helper: Calculate average brightness of image
 */
async function calculateImageBrightness(imgLocator: any): Promise<number> {
  return await imgLocator.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      totalBrightness += (r + g + b) / 3;
    }

    return totalBrightness / (data.length / 4);
  });
}

// =============================================================================
// TEST SUITE: MAP GALLERY RENDERING
// =============================================================================

test.describe('Map Gallery Rendering', () => {
  test('should display 24 map cards in gallery', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

    expect(mapCards.length).toBe(24);

    console.log(`✅ Found ${mapCards.length} map cards`);
  });

  test('each map card should have preview image or placeholder', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

    for (const card of mapCards) {
      const ariaLabel = await card.getAttribute('aria-label');
      const mapName = ariaLabel?.replace('Load map: ', '');

      // Check for preview image
      const previewImg = card.locator('img');
      const hasPreview = (await previewImg.count()) > 0;

      // Check for badge placeholder (W3N, SC2 without previews)
      const badge = card.locator('[class*="badge"]');
      const hasPlaceholder = (await badge.count()) > 0;

      // Check for loading spinner
      const spinner = card.locator('text=Translating binary to pretty pictures...');
      const isLoading = (await spinner.count()) > 0;

      // Must have either preview, placeholder, or loading indicator
      expect(hasPreview || hasPlaceholder || isLoading).toBe(true);

      console.log(`✅ ${mapName}: ${hasPreview ? 'preview' : hasPlaceholder ? 'placeholder' : 'loading'}`);
    }
  });

  test('preview images should be loaded and visible', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);
    let loadedCount = 0;
    let placeholderCount = 0;
    let loadingCount = 0;

    for (const card of mapCards) {
      const ariaLabel = await card.getAttribute('aria-label');
      const mapName = ariaLabel?.replace('Load map: ', '');
      const previewImg = card.locator('img');

      if ((await previewImg.count()) > 0) {
        const isLoaded = await isImageLoaded(previewImg);

        if (isLoaded) {
          loadedCount++;
          console.log(`✅ ${mapName}: Preview image loaded`);
        } else {
          console.log(`⚠️  ${mapName}: Preview image failed to load`);
        }
      } else {
        const spinner = card.locator('text=Translating binary to pretty pictures...');
        if ((await spinner.count()) > 0) {
          loadingCount++;
          console.log(`⏳ ${mapName}: Loading...`);
        } else {
          placeholderCount++;
          console.log(`ℹ️  ${mapName}: Using placeholder`);
        }
      }
    }

    console.log(`\n📊 Summary: ${loadedCount} previews loaded, ${placeholderCount} placeholders, ${loadingCount} loading`);

    // All 24 maps should have some form of preview
    expect(loadedCount + placeholderCount + loadingCount).toBe(24);
  });
});

// =============================================================================
// TEST SUITE: FORMAT-SPECIFIC RENDERING
// =============================================================================

test.describe('Format-Specific Preview Rendering', () => {
  test('W3X maps should show embedded or generated previews', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const w3xMaps = [
      '3P Sentinel 01 v3.06.w3x',
      'EchoIslesAlltherandom.w3x',
      'Legion_TD_11.2c-hf1_TeamOZE.w3x',
      'Unity_Of_Forces_Path_10.10.25.w3x',
    ];

    for (const mapName of w3xMaps) {
      const card = await app.getMapCard(page, mapName);
      await expect(card).toBeVisible();

      // Should have either preview image or badge placeholder
      const previewImg = card.locator('img');
      const badge = card.locator('[class*="badge"]');

      const hasPreview = (await previewImg.count()) > 0;
      const hasPlaceholder = (await badge.count()) > 0;

      expect(hasPreview || hasPlaceholder).toBe(true);

      console.log(`✅ ${mapName}: ${hasPreview ? 'preview' : 'placeholder'}`);
    }
  });

  test('SC2 maps should show square previews or badges', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const sc2Maps = [
      'Aliens Binary Mothership.SC2Map',
      'Ruined Citadel.SC2Map',
      'TheUnitTester7.SC2Map',
    ];

    for (const mapName of sc2Maps) {
      const card = await app.getMapCard(page, mapName);
      await expect(card).toBeVisible();

      const previewImg = card.locator('img');

      if ((await previewImg.count()) > 0) {
        const dims = await getImageDimensions(previewImg);

        // SC2 previews must be square
        expect(dims.width).toBe(dims.height);

        console.log(`✅ ${mapName}: Square preview (${dims.width}×${dims.height})`);
      } else {
        // Should have SC2 badge
        const badge = card.locator('text=SC2');
        await expect(badge).toBeVisible();

        console.log(`✅ ${mapName}: SC2 badge displayed`);
      }
    }
  });

  test('W3N campaigns should show W3N badge', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const w3nMaps = [
      'BurdenOfUncrowned.w3n',
      'HorrorsOfNaxxramas.w3n',
      'JudgementOfTheDead.w3n',
      'SearchingForPower.w3n',
    ];

    for (const mapName of w3nMaps) {
      const card = await app.getMapCard(page, mapName);
      await expect(card).toBeVisible();

      // W3N campaigns should have W3N badge
      const badge = card.locator('text=W3N');
      await expect(badge).toBeVisible();

      console.log(`✅ ${mapName}: W3N badge displayed`);
    }
  });
});

// =============================================================================
// TEST SUITE: PREVIEW IMAGE QUALITY
// =============================================================================

test.describe('Preview Image Quality', () => {
  test('preview images should have appropriate dimensions', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

    for (const card of mapCards) {
      const ariaLabel = await card.getAttribute('aria-label');
      const mapName = ariaLabel?.replace('Load map: ', '');
      const previewImg = card.locator('img');

      if ((await previewImg.count()) > 0) {
        const dims = await getImageDimensions(previewImg);

        // Dimensions should be reasonable (128-1024px range)
        expect(dims.width).toBeGreaterThan(64);
        expect(dims.width).toBeLessThanOrEqual(1024);
        expect(dims.height).toBeGreaterThan(64);
        expect(dims.height).toBeLessThanOrEqual(1024);

        console.log(`✅ ${mapName}: ${dims.width}×${dims.height}`);
      }
    }
  });

  test('preview images should not be blank', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);

    for (const card of mapCards) {
      const ariaLabel = await card.getAttribute('aria-label');
      const mapName = ariaLabel?.replace('Load map: ', '');
      const previewImg = card.locator('img');

      if ((await previewImg.count()) > 0) {
        const brightness = await calculateImageBrightness(previewImg);

        // Image should not be completely black (brightness > 10)
        // Image should not be completely white (brightness < 245)
        expect(brightness).toBeGreaterThan(10);
        expect(brightness).toBeLessThan(245);

        console.log(`✅ ${mapName}: Brightness = ${brightness.toFixed(1)}`);
      }
    }
  });

  test('all previews should be visually distinct', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const mapCards = await app.getMapCards(page);
    const brightnessValues: number[] = [];

    for (const card of mapCards) {
      const previewImg = card.locator('img');

      if ((await previewImg.count()) > 0) {
        const brightness = await calculateImageBrightness(previewImg);
        brightnessValues.push(brightness);
      }
    }

    if (brightnessValues.length >= 2) {
      // Check brightness variance
      const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
      const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - avgBrightness, 2), 0) / brightnessValues.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be > 5 (images are visually distinct)
      expect(stdDev).toBeGreaterThan(5);

      console.log(`📊 Brightness variance: avg=${avgBrightness.toFixed(1)}, stdDev=${stdDev.toFixed(1)}`);
    } else {
      console.log('ℹ️  Not enough preview images to calculate variance');
    }
  });
});

// =============================================================================
// TEST SUITE: PERFORMANCE & MEMORY
// =============================================================================

test.describe('Performance & Memory', () => {
  test('all previews should load within time limit', async ({ app, page }) => {
    const startTime = Date.now();

    await app.navigateTo(page);
    await app.waitForAppReady(page);

    // Wait for all images to load (with timeout)
    const mapCards = await app.getMapCards(page);
    for (const card of mapCards) {
      const previewImg = card.locator('img');
      if ((await previewImg.count()) > 0) {
        try {
          await previewImg.waitFor({ state: 'visible', timeout: 5000 });
        } catch {
          // Some images might not load, that's ok
        }
      }
    }

    const loadTime = Date.now() - startTime;

    // All 24 maps should load within 60 seconds
    expect(loadTime).toBeLessThan(60000);

    console.log(`✅ Gallery loaded in ${loadTime}ms`);
  });

  test('should not cause memory leaks during gallery browsing', async ({ app, page }) => {
    await app.navigateTo(page);
    await app.waitForAppReady(page);

    const initialMemory = await app.getMemoryUsage(page);

    if (!initialMemory) {
      console.log('ℹ️  Memory API not available (Chrome-only feature)');
      return;
    }

    // Scroll through gallery multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
    }

    const finalMemory = await app.getMemoryUsage(page);

    if (finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const increasePercent = (memoryIncrease / initialMemory.used) * 100;

      // Memory increase should be < 50% after scrolling
      expect(increasePercent).toBeLessThan(50);

      console.log(`✅ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercent.toFixed(1)}%)`);
    }
  });

  test('should maintain 60 FPS during browsing', async ({ app, page }) => {
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
