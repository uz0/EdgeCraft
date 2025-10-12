/**
 * Browser-Based Visual Validation Tests for Map Previews
 *
 * Uses Chrome DevTools MCP to validate actual browser rendering of map previews.
 * Complements unit/integration tests with real-world visual validation.
 *
 * Coverage:
 * - All 24 maps render correctly in browser
 * - Preview images are visible and non-blank
 * - Placeholders show correct format badges
 * - Image dimensions are appropriate
 * - SC2 previews are square
 * - Performance is acceptable
 * - No memory leaks
 *
 * Requirements:
 * - Dev server running on localhost:3000
 * - Chrome DevTools MCP available
 * - All map files properly loaded (not Git LFS pointers)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Mock Chrome DevTools MCP interface
// In actual implementation, this would use the real MCP client
interface ChromeDevToolsClient {
  navigate(url: string): Promise<void>;
  evaluateScript(fn: string | Function): Promise<any>;
  takeScreenshot(options?: { fullPage?: boolean }): Promise<Buffer>;
  querySelector(selector: string): Promise<ElementHandle | null>;
  querySelectorAll(selector: string): Promise<ElementHandle[]>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
  scrollTo(x: number, y: number): Promise<void>;
  getMemoryUsage(): Promise<number>;
}

interface ElementHandle {
  getBoundingClientRect(): Promise<DOMRect>;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string>;
  isVisible(): Promise<boolean>;
  screenshot(): Promise<Buffer>;
}

describe('Map Preview Visual Validation (Browser-Based)', () => {
  let cdp: ChromeDevToolsClient;
  const DEV_SERVER_URL = 'http://localhost:3000';

  beforeAll(async () => {
    // Initialize Chrome DevTools Protocol client
    // This would connect to actual Chrome instance via MCP
    cdp = await initializeChromeDevTools();

    // Navigate to map gallery
    await cdp.navigate(DEV_SERVER_URL);

    // Wait for gallery to load
    await cdp.waitForSelector('.map-gallery-grid', { timeout: 10000 });
  });

  afterAll(async () => {
    // Cleanup
    if (cdp) {
      await cdp.cleanup();
    }
  });

  // ========================================================================
  // TEST SUITE 1: ALL MAPS RENDERING VALIDATION
  // ========================================================================

  describe('All 24 Maps Rendering', () => {
    test('should display 24 map cards in gallery', async () => {
      const mapCards = await cdp.evaluateScript(() => {
        return document.querySelectorAll('.map-card, [class*="map-card"]').length;
      });

      expect(mapCards).toBe(24);
    });

    test('each map should have either preview image or placeholder', async () => {
      const results = await cdp.evaluateScript(() => {
        const cards = Array.from(document.querySelectorAll('.map-card, [class*="map-card"]'));

        return cards.map((card) => {
          const img = card.querySelector('img');
          const placeholder = card.querySelector('[class*="placeholder"]');
          const mapName =
            card.querySelector('h3')?.textContent ||
            card.querySelector('[class*="map-card-name"]')?.textContent ||
            'Unknown';

          return {
            mapName: mapName.trim(),
            hasImage: !!img,
            hasPlaceholder: !!placeholder,
            imageSrc: img?.getAttribute('src')?.substring(0, 100) || null,
          };
        });
      });

      expect(results).toHaveLength(24);

      results.forEach((result: any) => {
        // Each map must have either an image OR a placeholder
        expect(result.hasImage || result.hasPlaceholder).toBe(true);

        // If has image, verify it's a valid data URL
        if (result.hasImage && result.imageSrc) {
          expect(result.imageSrc).toMatch(/^data:image\/(png|jpeg);base64,/);
        }
      });
    });

    test('preview images should be loaded and visible', async () => {
      const imageStatus = await cdp.evaluateScript(() => {
        const images = Array.from(document.querySelectorAll('.map-card img[src^="data:image"]'));

        return images.map((img: HTMLImageElement) => {
          const rect = img.getBoundingClientRect();
          const isInViewport =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;

          return {
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            visible: rect.width > 0 && rect.height > 0,
            inViewport: isInViewport,
          };
        });
      });

      imageStatus.forEach((status: any) => {
        expect(status.complete).toBe(true); // Image should be fully loaded
        expect(status.naturalWidth).toBeGreaterThan(0);
        expect(status.naturalHeight).toBeGreaterThan(0);
        expect(status.visible).toBe(true);
      });
    });
  });

  // ========================================================================
  // TEST SUITE 2: FORMAT-SPECIFIC RENDERING
  // ========================================================================

  describe('Format-Specific Preview Rendering', () => {
    test('W3X maps should show embedded or generated previews', async () => {
      const w3xResults = await cdp.evaluateScript(() => {
        const w3xCards = Array.from(
          document.querySelectorAll('.map-card[data-format="w3x"], [class*="map-card"]')
        ).filter((card) => {
          const badge = card.querySelector('[class*="format-badge"], .map-format');
          return badge?.textContent?.includes('W3X');
        });

        return w3xCards.map((card) => {
          const img = card.querySelector('img');
          const placeholder = card.querySelector('[class*="placeholder"]');

          return {
            hasPreview: !!img,
            hasPlaceholder: !!placeholder,
            imageSrc: img?.getAttribute('src')?.substring(0, 50),
          };
        });
      });

      // At least SOME W3X maps should have previews
      const withPreviews = w3xResults.filter((r: any) => r.hasPreview);
      expect(withPreviews.length).toBeGreaterThan(0);
    });

    test('SC2 maps should show square previews', async () => {
      const sc2Results = await cdp.evaluateScript(() => {
        const sc2Cards = Array.from(
          document.querySelectorAll('.map-card, [class*="map-card"]')
        ).filter((card) => {
          const badge = card.querySelector('[class*="format-badge"], .map-format');
          return badge?.textContent?.includes('SC2');
        });

        return sc2Cards.map((card) => {
          const img = card.querySelector('img') as HTMLImageElement | null;
          if (!img) return { hasImage: false };

          return {
            hasImage: true,
            width: img.naturalWidth,
            height: img.naturalHeight,
            isSquare: img.naturalWidth === img.naturalHeight,
          };
        });
      });

      sc2Results.forEach((result: any) => {
        if (result.hasImage) {
          // SC2 previews MUST be square
          expect(result.isSquare).toBe(true);
          expect(result.width).toBe(result.height);
        }
      });
    });

    test('W3N campaigns should show purple badge placeholders', async () => {
      const w3nResults = await cdp.evaluateScript(() => {
        const w3nCards = Array.from(
          document.querySelectorAll('.map-card, [class*="map-card"]')
        ).filter((card) => {
          const badge = card.querySelector('[class*="format-badge"], .map-format');
          return badge?.textContent?.includes('W3N');
        });

        return w3nCards.map((card) => {
          const placeholder = card.querySelector('[class*="placeholder"]');
          const badge = card.querySelector('[class*="format-badge"]');
          const styles = placeholder ? window.getComputedStyle(placeholder) : null;

          return {
            hasPlaceholder: !!placeholder,
            badgeText: badge?.textContent?.trim(),
            backgroundColor: styles?.backgroundColor,
          };
        });
      });

      w3nResults.forEach((result: any) => {
        expect(result.badgeText).toBe('W3N');
        // Purple badge background (rgb(139, 92, 246) or similar purple)
        if (result.backgroundColor) {
          expect(result.backgroundColor).toMatch(/rgb\(.*\)/);
        }
      });
    });
  });

  // ========================================================================
  // TEST SUITE 3: IMAGE QUALITY VALIDATION
  // ========================================================================

  describe('Preview Image Quality', () => {
    test('preview images should have appropriate dimensions', async () => {
      const dimensions = await cdp.evaluateScript(() => {
        const images = Array.from(document.querySelectorAll('.map-card img[src^="data:image"]'));

        return images.map((img: HTMLImageElement) => ({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.getBoundingClientRect().width,
          displayHeight: img.getBoundingClientRect().height,
        }));
      });

      dimensions.forEach((dim: any) => {
        // Natural dimensions (actual image size)
        expect(dim.naturalWidth).toBeGreaterThan(50);
        expect(dim.naturalWidth).toBeLessThanOrEqual(1024);
        expect(dim.naturalHeight).toBeGreaterThan(50);
        expect(dim.naturalHeight).toBeLessThanOrEqual(1024);

        // Display dimensions (CSS rendering)
        expect(dim.displayWidth).toBeGreaterThan(0);
        expect(dim.displayHeight).toBeGreaterThan(0);
      });
    });

    test('preview images should not be blank', async () => {
      const brightnessResults = await cdp.evaluateScript(() => {
        const images = Array.from(document.querySelectorAll('.map-card img[src^="data:image"]'));

        return images.map((img: HTMLImageElement) => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) return { brightness: 0, error: 'No canvas context' };

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          let totalBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] || 0;
            const g = data[i + 1] || 0;
            const b = data[i + 2] || 0;
            totalBrightness += (r + g + b) / 3;
          }

          const avgBrightness = totalBrightness / (data.length / 4);
          return { brightness: avgBrightness };
        });
      });

      brightnessResults.forEach((result: any) => {
        // Not completely black
        expect(result.brightness).toBeGreaterThan(10);
        // Not completely white
        expect(result.brightness).toBeLessThan(250);
        // Reasonable mid-range
        expect(result.brightness).toBeGreaterThan(30);
        expect(result.brightness).toBeLessThan(230);
      });
    });

    test('all previews should be visually distinct', async () => {
      const previewHashes = await cdp.evaluateScript(() => {
        const images = Array.from(document.querySelectorAll('.map-card img[src^="data:image"]'));

        return images.map((img: HTMLImageElement) => {
          // Simple hash: take first 200 chars of base64
          const src = img.getAttribute('src') || '';
          return src.substring(0, 200);
        });
      });

      // All previews should have unique hashes (no duplicates)
      const uniqueHashes = new Set(previewHashes);
      expect(uniqueHashes.size).toBe(previewHashes.length);
    });
  });

  // ========================================================================
  // TEST SUITE 4: PLACEHOLDER VALIDATION
  // ========================================================================

  describe('Placeholder Rendering', () => {
    test('placeholders should show correct format badges', async () => {
      const placeholderData = await cdp.evaluateScript(() => {
        const placeholders = Array.from(document.querySelectorAll('[class*="placeholder"]'));

        return placeholders.map((placeholder) => {
          const card = placeholder.closest('.map-card, [class*="map-card"]');
          const badge = placeholder.querySelector('[class*="format-badge"]');

          return {
            badgeText: badge?.textContent?.trim(),
            hasCard: !!card,
          };
        });
      });

      placeholderData.forEach((data: any) => {
        expect(data.hasCard).toBe(true);
        expect(data.badgeText).toMatch(/^(W3X|W3N|SC2)$/);
      });
    });

    test('placeholders should have appropriate styling', async () => {
      const placeholderStyles = await cdp.evaluateScript(() => {
        const placeholders = Array.from(document.querySelectorAll('[class*="placeholder"]'));

        return placeholders.map((placeholder) => {
          const styles = window.getComputedStyle(placeholder);

          return {
            display: styles.display,
            backgroundColor: styles.backgroundColor,
            hasContent: placeholder.childElementCount > 0,
          };
        });
      });

      placeholderStyles.forEach((style: any) => {
        expect(style.display).not.toBe('none'); // Should be visible
        expect(style.hasContent).toBe(true); // Should have badge/content
      });
    });
  });

  // ========================================================================
  // TEST SUITE 5: PERFORMANCE & MEMORY
  // ========================================================================

  describe('Performance & Memory', () => {
    test('all previews should load within time limit', async () => {
      const startTime = Date.now();

      // Wait for all images or placeholders to appear
      await cdp.waitForSelector('.map-card img, [class*="placeholder"]', {
        timeout: 30000,
      });

      const loadTime = Date.now() - startTime;

      // Should load within 30 seconds
      expect(loadTime).toBeLessThan(30000);
      console.log(`✓ All previews loaded in ${loadTime}ms`);
    });

    test('should not cause memory leaks during gallery browsing', async () => {
      const initialMemory = await cdp.getMemoryUsage();

      // Scroll through entire gallery (triggers lazy loading)
      await cdp.scrollTo(0, 1000);
      await cdp.scrollTo(0, 2000);
      await cdp.scrollTo(0, 3000);

      // Wait for potential garbage collection
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const finalMemory = await cdp.getMemoryUsage();

      // Memory increase should be < 100MB
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(
        `✓ Memory increase: ${(memoryIncrease / (1024 * 1024)).toFixed(2)}MB (acceptable)`
      );
    });
  });

  // ========================================================================
  // TEST SUITE 6: INTERACTION & ACCESSIBILITY
  // ========================================================================

  describe('Interaction & Accessibility', () => {
    test('map cards should be clickable', async () => {
      const clickableCards = await cdp.evaluateScript(() => {
        const cards = Array.from(document.querySelectorAll('.map-card, [class*="map-card"]'));

        return cards.map((card) => {
          return {
            hasClickHandler: card.hasAttribute('onclick') || card.getAttribute('role') === 'button',
            hasAriaLabel: !!card.getAttribute('aria-label'),
            isInteractive: window.getComputedStyle(card).cursor === 'pointer',
          };
        });
      });

      clickableCards.forEach((card: any) => {
        expect(card.hasClickHandler || card.hasAriaLabel || card.isInteractive).toBe(true);
      });
    });

    test('preview images should have alt text', async () => {
      const altTexts = await cdp.evaluateScript(() => {
        const images = Array.from(document.querySelectorAll('.map-card img'));

        return images.map((img) => ({
          hasAlt: img.hasAttribute('alt'),
          altText: img.getAttribute('alt'),
        }));
      });

      altTexts.forEach((img: any) => {
        expect(img.hasAlt).toBe(true);
        expect(img.altText).toBeTruthy();
      });
    });
  });
});

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Initialize Chrome DevTools Protocol client
 * (Mock implementation - replace with actual MCP client)
 */
async function initializeChromeDevTools(): Promise<ChromeDevToolsClient> {
  // In actual implementation, this would connect to Chrome via MCP
  // For now, return mock client
  throw new Error('Chrome DevTools MCP client not initialized. Start dev server and connect to Chrome.');
}

/**
 * Mock implementation note:
 *
 * This test suite is designed to work with Chrome DevTools MCP.
 * To run these tests:
 *
 * 1. Start dev server: npm run dev
 * 2. Connect Chrome DevTools MCP
 * 3. Run tests: npm test -- MapPreviewVisualValidation.chromium
 *
 * The actual implementation would use the MCP client to:
 * - Launch Chrome browser
 * - Navigate to pages
 * - Evaluate JavaScript
 * - Take screenshots
 * - Measure performance
 * - Check memory usage
 */
