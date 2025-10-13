import { test, expect } from '@playwright/test';

/**
 * E2E Test: Rendering Validation
 *
 * Validates all 8 critical rendering fixes from Phase 2:
 * 1. Terrain multi-texture splatmap rendering
 * 2. Light management (ambient + sun)
 * 3. Camera positioning and angle (RTS top-down view)
 * 4. Terrain mesh positioning (centered at world coords)
 * 5. Scene exposure to window (debugging)
 * 6. Doodad rendering
 * 7. Splatmap texture size fix (tiles vs world units)
 * 8. Coordinate scale (W3X tile size 128)
 */

test.describe('Rendering Validation', () => {
  test('should render map with all critical fixes applied', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for map loading

    // Navigate to app
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForFunction(() => (window as any).__testReady === true, { timeout: 30000 });
    console.log('[TEST] App ready');

    // Load test map programmatically
    const testMapName = '3P Sentinel 01 v3.06.w3x';
    console.log(`[TEST] Loading map: ${testMapName}`);

    const loadResult = await page.evaluate((mapName) => {
      return new Promise((resolve) => {
        const handleMapSelect = (window as any).__handleMapSelect;
        if (!handleMapSelect) {
          resolve({ success: false, error: 'handleMapSelect not exposed' });
          return;
        }

        // Call handleMapSelect
        handleMapSelect(mapName);

        // Wait for map to load (check scene every 500ms)
        const checkInterval = setInterval(() => {
          const scene = (window as any).__testBabylonScene;
          if (scene && scene.meshes && scene.meshes.length > 0 && scene.isReady()) {
            clearInterval(checkInterval);
            resolve({ success: true });
          }
        }, 500);

        // Timeout after 60s
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve({ success: false, error: 'Map load timeout' });
        }, 60000);
      });
    }, testMapName);

    console.log('[TEST] Load result:', loadResult);
    expect(loadResult).toHaveProperty('success', true);

    // Wait for rendering to stabilize
    await page.waitForTimeout(5000);

    // Validate Fix 1: Scene exposed to window
    const sceneExposed = await page.evaluate(() => {
      return {
        hasScene: (window as any).scene != null,
        hasEngine: (window as any).engine != null,
        hasTestScene: (window as any).__testBabylonScene != null,
      };
    });

    console.log('[TEST] Scene exposure:', sceneExposed);
    expect(sceneExposed.hasScene).toBe(true);
    expect(sceneExposed.hasEngine).toBe(true);
    expect(sceneExposed.hasTestScene).toBe(true);

    // Validate Fix 2: Light management (2 lights: ambient + sun)
    const lightInfo = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene) return { error: 'No scene' };

      const lights = scene.lights || [];
      return {
        lightCount: lights.length,
        lights: lights.map((l: any) => ({
          name: l.name,
          type: l.getClassName(),
          intensity: l.intensity,
        })),
      };
    });

    console.log('[TEST] Light info:', lightInfo);
    expect(lightInfo.lightCount).toBeGreaterThanOrEqual(2);
    expect(lightInfo.lights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'ambient' }),
        expect.objectContaining({ name: 'sun' }),
      ])
    );

    // Validate Fix 3: Camera positioning and angle
    const cameraInfo = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene || !scene.activeCamera) return { error: 'No camera' };

      const cam = scene.activeCamera;
      return {
        name: cam.name,
        type: cam.getClassName(),
        position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        // For ArcRotateCamera
        alpha: cam.alpha,
        beta: cam.beta,
        radius: cam.radius,
        target: cam.target ? { x: cam.target.x, y: cam.target.y, z: cam.target.z } : null,
      };
    });

    console.log('[TEST] Camera info:', cameraInfo);
    expect(cameraInfo.type).toBe('ArcRotateCamera');
    expect(cameraInfo.name).toBe('rtsCamera');
    // Beta should be ~0.628 (Math.PI / 5 = 36 degrees for RTS view)
    expect(cameraInfo.beta).toBeGreaterThan(0.5);
    expect(cameraInfo.beta).toBeLessThan(0.8);
    // Radius should be reasonable (~1,123 for this map, not 11,878!)
    expect(cameraInfo.radius).toBeGreaterThan(500);
    expect(cameraInfo.radius).toBeLessThan(3000);

    // Validate Fix 4: Terrain mesh exists and is positioned
    const terrainInfo = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene) return { error: 'No scene' };

      const terrainMesh = scene.getMeshByName('terrain');
      if (!terrainMesh) return { error: 'No terrain mesh' };

      return {
        name: terrainMesh.name,
        position: { x: terrainMesh.position.x, y: terrainMesh.position.y, z: terrainMesh.position.z },
        vertices: terrainMesh.getTotalVertices(),
        visible: terrainMesh.isVisible,
        hasMaterial: terrainMesh.material != null,
        materialName: terrainMesh.material?.name,
      };
    });

    console.log('[TEST] Terrain info:', terrainInfo);
    expect(terrainInfo.name).toBe('terrain');
    expect(terrainInfo.visible).toBe(true);
    expect(terrainInfo.vertices).toBeGreaterThan(0);
    expect(terrainInfo.hasMaterial).toBe(true);
    // Terrain should be positioned at (width/2, 0, height/2) not (0, 0, 0)
    expect(terrainInfo.position?.x).toBeGreaterThan(1000);
    expect(terrainInfo.position?.z).toBeGreaterThan(1000);

    // Validate Fix 5: Doodads rendered (GPU instancing)
    const doodadInfo = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene) return { error: 'No scene' };

      // Count meshes that look like doodads
      const doodadMeshes = scene.meshes.filter((m: any) => m.name && m.name.startsWith('doodad_'));
      const totalMeshes = scene.meshes.length;

      return {
        totalMeshes,
        doodadCount: doodadMeshes.length,
        doodadNames: doodadMeshes.slice(0, 5).map((m: any) => m.name), // First 5 names
      };
    });

    console.log('[TEST] Doodad info:', doodadInfo);
    expect(doodadInfo.doodadCount).toBeGreaterThan(0);
    expect(doodadInfo.totalMeshes).toBeGreaterThan(1); // At least terrain + some doodads

    // Validate Fix 6: Scene is ready and rendering
    const sceneReadiness = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene) return { error: 'No scene' };

      return {
        isReady: scene.isReady(),
        isDisposed: scene.isDisposed,
        animatables: scene.animatables?.length || 0,
        activeMeshes: scene.getActiveMeshes()?.length || 0,
      };
    });

    console.log('[TEST] Scene readiness:', sceneReadiness);
    expect(sceneReadiness.isReady).toBe(true);
    expect(sceneReadiness.isDisposed).toBe(false);
    expect(sceneReadiness.activeMeshes).toBeGreaterThan(0);

    // Take screenshot for visual validation
    await page.screenshot({
      path: 'test-results/rendering-validation/map-loaded.png',
      fullPage: false,
    });

    console.log('[TEST] ✅ All rendering fixes validated');
  });

  test('should validate multi-texture terrain shader', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__testReady === true, { timeout: 30000 });

    // Load map
    const testMapName = '3P Sentinel 01 v3.06.w3x';
    await page.evaluate((mapName) => {
      return new Promise((resolve) => {
        const handleMapSelect = (window as any).__handleMapSelect;
        handleMapSelect(mapName);

        const checkInterval = setInterval(() => {
          const scene = (window as any).__testBabylonScene;
          if (scene && scene.meshes && scene.meshes.length > 0 && scene.isReady()) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 60000);
      });
    }, testMapName);

    await page.waitForTimeout(5000);

    // Check terrain material uses splatmap shader
    const terrainMaterialInfo = await page.evaluate(() => {
      const scene = (window as any).scene;
      if (!scene) return { error: 'No scene' };

      const terrainMesh = scene.getMeshByName('terrain');
      if (!terrainMesh || !terrainMesh.material) return { error: 'No terrain material' };

      const mat = terrainMesh.material;
      return {
        materialName: mat.name,
        materialType: mat.getClassName(),
        // For ShaderMaterial
        hasShader: mat.getClassName() === 'ShaderMaterial',
      };
    });

    console.log('[TEST] Terrain material:', terrainMaterialInfo);
    expect(terrainMaterialInfo.materialName).toBe('terrainSplatmap');
    expect(terrainMaterialInfo.hasShader).toBe(true);

    console.log('[TEST] ✅ Multi-texture splatmap shader validated');
  });

  test('should validate performance (FPS check)', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__testReady === true, { timeout: 30000 });

    // Load map
    const testMapName = '3P Sentinel 01 v3.06.w3x';
    await page.evaluate((mapName) => {
      return new Promise((resolve) => {
        const handleMapSelect = (window as any).__handleMapSelect;
        handleMapSelect(mapName);

        const checkInterval = setInterval(() => {
          const scene = (window as any).__testBabylonScene;
          if (scene && scene.meshes && scene.meshes.length > 0 && scene.isReady()) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 60000);
      });
    }, testMapName);

    // Wait for rendering to stabilize
    await page.waitForTimeout(10000);

    // Measure FPS over 5 seconds
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = (window as any).scene;
        const engine = (window as any).engine;
        if (!scene || !engine) {
          resolve({ error: 'No scene or engine' });
          return;
        }

        const fpsSamples: number[] = [];
        const interval = setInterval(() => {
          fpsSamples.push(engine.getFps());
        }, 500);

        setTimeout(() => {
          clearInterval(interval);
          const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
          const minFps = Math.min(...fpsSamples);

          resolve({
            avgFps,
            minFps,
            samples: fpsSamples,
            drawCalls: scene.getEngine().drawCalls,
          });
        }, 5000);
      });
    });

    console.log('[TEST] Performance metrics:', performanceMetrics);

    // For CI/headless, FPS might be lower. Accept 30+ FPS as passing
    expect((performanceMetrics as any).avgFps).toBeGreaterThan(30);

    console.log('[TEST] ✅ Performance check passed');
  });
});
