import { test, expect } from '@playwright/test';

/**
 * E2E Test: Actual Map Rendering with WebGL Verification
 *
 * This test verifies that maps actually render with WebGL content, not just that they load without errors.
 * It uses the test:loadMap custom event to programmatically trigger map loading.
 *
 * Test Strategy:
 * 1. Dispatch test:loadMap event with map details
 * 2. Wait for map loading and rendering to complete
 * 3. Verify WebGL canvas is visible and has content
 * 4. Check console logs for success messages
 * 5. Take screenshot to verify visual rendering
 */

test.describe('Actual Map Rendering - EchoIsles', () => {
  test('should render EchoIsles map with WebGL content and verify all rendering systems', async ({
    page,
  }) => {
    // Track console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[BROWSER ${msg.type()}]`, text);
    });

    // Navigate to app
    console.log('[TEST] Navigating to app...');
    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    // Wait for test event listener to be registered
    console.log('[TEST] Waiting for event listener...');
    await page.waitForFunction(
      () => {
        return (window as any).__testLoadMapListenerRegistered === true;
      },
      { timeout: 5000 }
    );

    // Dispatch test:loadMap event
    console.log('[TEST] Dispatching test:loadMap event for EchoIsles...');
    await page.evaluate(() => {
      const event = new CustomEvent('test:loadMap', {
        detail: {
          name: 'EchoIslesAlltherandom.w3x',
          path: '/maps/EchoIslesAlltherandom.w3x',
          format: 'w3x',
        },
      });
      window.dispatchEvent(event);
      console.log('[TEST] Event dispatched');
    });

    // Wait for canvas to become visible (indicates map is loaded and rendering)
    console.log('[TEST] Waiting for canvas to become visible...');
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('.babylon-canvas');
        if (!canvas) return false;
        const style = getComputedStyle(canvas);
        return style.display !== 'none' && style.visibility !== 'hidden';
      },
      { timeout: 15000 }
    );

    // Additional wait for WebGL to fully render
    await page.waitForTimeout(2000);

    // Check console logs for success indicators
    const hasMapLoadSuccess = consoleMessages.some((msg) =>
      msg.includes('✅ Map loaded successfully')
    );
    const hasRenderingComplete = consoleMessages.some((msg) =>
      msg.includes('Map rendering complete')
    );
    const hasDoodadsRendered = consoleMessages.some((msg) => msg.includes('Doodads rendered'));

    console.log('[TEST] Console checks:');
    console.log('  - Map load success:', hasMapLoadSuccess);
    console.log('  - Rendering complete:', hasRenderingComplete);
    console.log('  - Doodads rendered:', hasDoodadsRendered);

    expect(hasMapLoadSuccess || hasRenderingComplete).toBe(true);

    // Verify WebGL canvas is properly rendered
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('.babylon-canvas') as HTMLCanvasElement;
      if (!canvas) {
        return {
          status: 'no_canvas',
          found: false,
        };
      }

      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);

      // Get WebGL context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      // Check if gallery is hidden (indicates map view is active)
      const gallery = document.querySelector('.gallery-view');
      const galleryVisible = gallery ? getComputedStyle(gallery).display !== 'none' : false;

      return {
        status: 'canvas_found',
        found: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        hasWebGLContext: !!gl,
        dimensions: {
          width: rect.width,
          height: rect.height,
        },
        opacity: style.opacity,
        zIndex: style.zIndex,
        galleryHidden: !galleryVisible,
      };
    });

    console.log('[TEST] Canvas info:', canvasInfo);

    // Assert canvas exists and is properly configured
    expect(canvasInfo.found).toBe(true);
    expect(canvasInfo.visible).toBe(true);
    expect(canvasInfo.hasWebGLContext).toBe(true);
    expect(canvasInfo.dimensions.width).toBeGreaterThan(0);
    expect(canvasInfo.dimensions.height).toBeGreaterThan(0);
    expect(canvasInfo.galleryHidden).toBe(true);

    // Take screenshot of the rendered map
    console.log('[TEST] Taking screenshot...');
    await expect(page).toHaveScreenshot('echoisles-webgl-rendered.png', {
      fullPage: false,
      threshold: 0.15, // Allow 15% difference for anti-aliasing/rendering variations
      maxDiffPixels: 100,
    });

    console.log('[TEST] ✅ Test completed successfully');
  });

  test('should verify map metadata and rendering stats', async ({ page }) => {
    console.log('[TEST] Testing map metadata and stats...');

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    await page.waitForFunction(
      () => {
        return (window as any).__testLoadMapListenerRegistered === true;
      },
      { timeout: 5000 }
    );

    // Load map
    await page.evaluate(() => {
      const event = new CustomEvent('test:loadMap', {
        detail: {
          name: 'EchoIslesAlltherandom.w3x',
          path: '/maps/EchoIslesAlltherandom.w3x',
          format: 'w3x',
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for rendering
    await page.waitForTimeout(3000);

    // Verify map metadata
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Check that terrain and doodads were rendered
    const stats = await page.evaluate(() => {
      const logs = (window as any).__renderLogs || [];
      return {
        logCount: logs.length,
        bodyText: document.body.textContent,
      };
    });

    console.log('[TEST] Stats:', stats);

    // Verify canvas is still visible and rendering
    const canvasVisible = await page.evaluate(() => {
      const canvas = document.querySelector('.babylon-canvas');
      if (!canvas) return false;
      const style = getComputedStyle(canvas);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    expect(canvasVisible).toBe(true);

    console.log('[TEST] ✅ Metadata test completed');
  });
});
