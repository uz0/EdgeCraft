import { test, expect } from '@playwright/test';

/**
 * E2E Test: Simple Map Rendering
 *
 * Verifies ACTUAL map rendering by checking:
 * 1. Canvas properly resized to match display size
 * 2. Actual 3D content rendered (color variation > threshold)
 * 3. WebGL pixels contain varied content (not just solid color)
 */
test.describe('Simple Map Rendering', () => {
  test('should render EchoIsles map with actual 3D content', async ({ page }) => {
    // Track console messages for debugging
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error' || text.includes('ERROR') || text.includes('Failed')) {
        console.log(`[BROWSER ${msg.type()}]`, text);
      }
    });

    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    // Wait for test infrastructure to be ready
    await page.waitForFunction(() => {
      return (window as any).__testLoadMapListenerRegistered === true;
    }, { timeout: 5000 });

    // Dispatch event to load map
    await page.evaluate(() => {
      console.log('[TEST] Dispatching test:loadMap event for EchoIsles');
      const event = new CustomEvent('test:loadMap', {
        detail: {
          name: 'EchoIslesAlltherandom.w3x',
          path: '/maps/EchoIslesAlltherandom.w3x',
          format: 'w3x'
        }
      });
      window.dispatchEvent(event);
    });

    // Wait for map to load and render
    await page.waitForFunction(() => {
      // Check for success message in console
      const body = document.body.textContent || '';
      return body.includes('Map loaded successfully') || body.includes('Map rendering complete');
    }, { timeout: 15000 }).catch(() => {
      console.log('[TEST] Timeout waiting for success message, checking logs...');
    });

    // Wait additional time for rendering to stabilize
    await page.waitForTimeout(2000);

    // Verify ACTUAL 3D content is rendered
    const canvasAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('.babylon-canvas') as HTMLCanvasElement;
      if (!canvas) return { error: 'Canvas not found' };

      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) return { error: 'No WebGL context' };

      // Read pixels from WebGL
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Count unique colors
      const colorSet = new Set<string>();
      for (let i = 0; i < pixels.length; i += 4) {
        const color = `${pixels[i]},${pixels[i+1]},${pixels[i+2]}`;
        colorSet.add(color);
      }

      // Sample center pixel
      const centerIdx = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
      const centerColor = [pixels[centerIdx], pixels[centerIdx + 1], pixels[centerIdx + 2]];

      // Check if canvas is properly sized (not default 300x150)
      const isProperlySized = width > 300 && height > 150;

      return {
        found: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        hasWebGLContext: true,
        canvasWidth: width,
        canvasHeight: height,
        displayWidth: rect.width,
        displayHeight: rect.height,
        uniqueColors: colorSet.size,
        centerColor: centerColor,
        isProperlySized: isProperlySized
      };
    });

    console.log('[TEST] Canvas analysis:', canvasAnalysis);

    // Check for success message in console
    const hasSuccessMessage = consoleMessages.some(msg =>
      msg.includes('Map loaded successfully') ||
      msg.includes('Map rendering complete')
    );
    console.log('[TEST] Has success message:', hasSuccessMessage);

    // Assert canvas is properly set up
    expect(canvasAnalysis.found).toBe(true);
    expect(canvasAnalysis.visible).toBe(true);
    expect(canvasAnalysis.hasWebGLContext).toBe(true);

    // CRITICAL: Canvas must be properly resized (not default 300x150)
    expect(canvasAnalysis.canvasWidth).toBeGreaterThan(300);
    expect(canvasAnalysis.canvasHeight).toBeGreaterThan(150);

    // CRITICAL: Must have actual rendered content (>20 unique colors)
    // Note: Placeholder meshes produce ~30-50 colors, full 3D models would be >100
    expect(canvasAnalysis.uniqueColors).toBeGreaterThan(20);

    // Take screenshot of rendered map
    await expect(page).toHaveScreenshot('echoisles-rendered.png', {
      fullPage: false,
      threshold: 0.3, // Increased to tolerate FPS-induced rendering variance
    });
  });

  test('should render 3P Sentinel map', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForSelector('.gallery-view', { timeout: 15000 });

    await page.waitForFunction(() => {
      return (window as any).__testLoadMapListenerRegistered === true;
    }, { timeout: 5000 });

    // Load 3P Sentinel 01
    await page.evaluate(() => {
      const event = new CustomEvent('test:loadMap', {
        detail: {
          name: '3P Sentinel 01 v3.06.w3x',
          path: '/maps/3P Sentinel 01 v3.06.w3x',
          format: 'w3x'
        }
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(5000); // Increased wait for larger map

    // Debug: Check scene state before screenshot
    const sceneDebug = await page.evaluate(() => {
      const win = window as any;
      const engine = win.__testBabylonEngine;
      const scene = win.__testBabylonScene;

      if (!scene) return { error: 'No scene found' };

      // Check mesh states
      const meshStates = scene.meshes.map((m: any) => ({
        name: m.name,
        enabled: m.isEnabled(),
        visible: m.isVisible,
        hasInstances: m.thinInstanceCount > 0,
        instanceCount: m.thinInstanceCount || 0
      }));

      const enabledMeshes = meshStates.filter((m: any) => m.enabled);
      const disabledMeshes = meshStates.filter((m: any) => !m.enabled);

      // Get terrain mesh details
      const terrainMesh = scene.getMeshByName('terrain');
      const camera = scene.activeCamera;

      return {
        activeMeshes: scene.getActiveMeshes().length,
        totalMeshes: scene.meshes.length,
        enabledMeshes: enabledMeshes.length,
        disabledMeshes: disabledMeshes.length,
        disabledMeshNames: disabledMeshes.slice(0, 10).map((m: any) => m.name), // First 10
        terrainMesh: meshStates.find((m: any) => m.name === 'terrain'),
        terrainPosition: terrainMesh ? {
          x: terrainMesh.position.x,
          y: terrainMesh.position.y,
          z: terrainMesh.position.z
        } : null,
        terrainBoundingBox: terrainMesh ? {
          min: terrainMesh.getBoundingInfo().boundingBox.minimumWorld,
          max: terrainMesh.getBoundingInfo().boundingBox.maximumWorld
        } : null,
        cameraPosition: camera ? {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        } : null,
        cameraTarget: camera && camera.target ? {
          x: camera.target.x,
          y: camera.target.y,
          z: camera.target.z
        } : null,
        lights: scene.lights.length,
        cameras: scene.cameras.length,
        clearColor: scene.clearColor ? {
          r: scene.clearColor.r,
          g: scene.clearColor.g,
          b: scene.clearColor.b,
          a: scene.clearColor.a
        } : null,
        isReady: scene.isReady(),
        activeCamera: scene.activeCamera ? scene.activeCamera.name : null
      };
    });

    console.log('\n=== Scene Debug Info ===');
    console.log(JSON.stringify(sceneDebug, null, 2));
    console.log('========================\n');

    // Verify actual 3D rendering
    const canvasAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('.babylon-canvas') as HTMLCanvasElement;
      if (!canvas) return { found: false };

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const style = getComputedStyle(canvas);

      if (!gl) return { found: true, hasWebGL: false };

      // Count unique colors
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const colorSet = new Set<string>();
      for (let i = 0; i < pixels.length; i += 4) {
        colorSet.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
      }

      // Sample some colors for debugging
      const sampleColors = [];
      for (let i = 0; i < Math.min(10, pixels.length / 4); i++) {
        const idx = Math.floor((pixels.length / 4 / 10) * i) * 4;
        sampleColors.push(`RGB(${pixels[idx]},${pixels[idx+1]},${pixels[idx+2]},${pixels[idx+3]})`);
      }

      return {
        found: true,
        visible: style.display !== 'none',
        hasWebGLContext: true,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        uniqueColors: colorSet.size,
        sampleColors: sampleColors,
        allColors: Array.from(colorSet).slice(0, 20), // First 20 unique colors
        isProperlySized: canvas.width > 300 && canvas.height > 150
      };
    });

    // Log console errors (excluding ESLint warnings)
    const nonESLintErrors = consoleErrors.filter(err => !err.includes('[ESLint]'));
    console.log('\n=== Browser Console Errors/Warnings ===');
    nonESLintErrors.forEach(err => console.log(err));
    console.log(`Total errors/warnings: ${nonESLintErrors.length}`);
    console.log('=======================================\n');

    // Log rendering messages (terrain + doodads)
    const renderingMessages = consoleMessages.filter(msg =>
      msg.includes('[TerrainRenderer]') ||
      msg.includes('[MapRendererCore]') ||
      msg.includes('Camera initialized') ||
      msg.includes('[W3XMapLoader] Tileset:') ||
      msg.includes('doodad') ||
      msg.includes('Doodad') ||
      msg.includes('Rendering')
    );
    console.log('\n=== Rendering Messages ===');
    renderingMessages.forEach(msg => console.log(msg));
    console.log(`Found ${renderingMessages.length} rendering messages`);
    console.log('==========================\n');

    // Log canvas pixel analysis
    console.log('\n=== Canvas Pixel Analysis ===');
    console.log(`Unique colors: ${canvasAnalysis.uniqueColors}`);
    console.log(`Sample colors: ${canvasAnalysis.sampleColors?.join(', ')}`);
    console.log(`All unique colors: ${canvasAnalysis.allColors?.join(', ')}`);
    console.log('==============================\n');

    expect(canvasAnalysis.found).toBe(true);
    expect(canvasAnalysis.visible).toBe(true);
    expect(canvasAnalysis.hasWebGLContext).toBe(true);
    expect(canvasAnalysis.canvasWidth).toBeGreaterThan(300);
    expect(canvasAnalysis.canvasHeight).toBeGreaterThan(150);
    expect(canvasAnalysis.uniqueColors).toBeGreaterThan(20);

    await expect(page).toHaveScreenshot('sentinel-rendered.png', {
      fullPage: false,
      threshold: 0.3, // Increased to tolerate FPS-induced rendering variance
    });
  });
});
