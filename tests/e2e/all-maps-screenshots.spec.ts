import { test, expect } from '@playwright/test';
import { waitForMapLoaded } from '../e2e-fixtures/screenshot-helpers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E Test: Screenshot All Maps
 *
 * Tests rendering of all W3X maps by:
 * 1. Clicking each map in the gallery
 * 2. Waiting for map to load
 * 3. Taking a screenshot
 * 4. Validating rendering
 */

// Get all .w3x map files
const mapsDir = path.join(process.cwd(), 'public', 'maps');
const allW3XMaps = fs
  .readdirSync(mapsDir)
  .filter((file) => file.endsWith('.w3x'))
  .sort();

// Test all maps
const testMaps = allW3XMaps;

console.log(
  `Found ${testMaps.length} maps to test:`,
  testMaps.map((m) => m.substring(0, 30))
);

test.describe('Screenshot All Maps', () => {
  for (const mapName of testMaps) {
    test(`render ${mapName}`, async ({ page }) => {
      // Set longer timeout for map loading
      test.setTimeout(90000);

      // Navigate to app
      await page.goto('/');

      // Wait for gallery to load
      await page.waitForSelector('.map-gallery', { timeout: 15000 });
      await page.waitForTimeout(2000); // Let gallery fully render

      // Find and click the map card
      const mapCard = page.locator(`.map-card`).filter({ hasText: mapName.replace('.w3x', '') });

      // Check if map card exists
      const cardCount = await mapCard.count();
      if (cardCount === 0) {
        console.log(`Warning: Map card not found for ${mapName}`);
        // Skip this test
        test.skip();
        return;
      }

      // Click the map to load it
      await mapCard.first().click();

      // Wait for map to load (using helper function)
      await waitForMapLoaded(page, 60000);

      // Wait for rendering to stabilize
      await page.waitForTimeout(5000);

      // Get scene info
      const sceneInfo = await page.evaluate(() => {
        const scene = (window as any).__testBabylonScene;
        if (!scene) return { error: 'No scene' };

        return {
          meshCount: scene.meshes?.length || 0,
          hasCamera: scene.activeCamera != null,
          isReady: scene.isReady(),
        };
      });

      console.log(`[${mapName}] Scene info:`, sceneInfo);

      // Validate scene
      expect(sceneInfo.meshCount).toBeGreaterThan(0);
      expect(sceneInfo.hasCamera).toBe(true);
      expect(sceneInfo.isReady).toBe(true);

      // Take screenshot
      const sanitizedName = mapName.replace(/[^a-zA-Z0-9]/g, '-');
      await page.screenshot({
        path: `test-results/screenshots/${sanitizedName}`,
        fullPage: false,
      });

      console.log(`✓ ${mapName}: ${sceneInfo.meshCount} meshes rendered`);
    });
  }
});
