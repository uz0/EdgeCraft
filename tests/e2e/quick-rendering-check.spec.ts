import { test, expect } from '@playwright/test';

/**
 * Quick Rendering Check
 *
 * Fast validation of all 8 critical rendering fixes
 */

test('quick rendering validation', async ({ page }) => {
  test.setTimeout(90000);

  console.log('🚀 Starting quick rendering validation');

  // Navigate and wait for app
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__testReady === true, { timeout: 30000 });
  console.log('✅ App ready');

  // Load test map
  const testMap = '3P Sentinel 01 v3.06.w3x';
  console.log(`📦 Loading: ${testMap}`);

  await page.evaluate((mapName) => {
    (window as any).__handleMapSelect(mapName);
  }, testMap);

  // Wait for scene to load
  await page.waitForFunction(
    () => {
      const scene = (window as any).__testBabylonScene;
      return scene && scene.meshes && scene.meshes.length > 0 && scene.isReady();
    },
    { timeout: 60000 }
  );

  console.log('✅ Map loaded');

  // Wait for rendering to stabilize
  await page.waitForTimeout(5000);

  // Collect all validation data
  const validationData = await page.evaluate(() => {
    const scene = (window as any).scene;
    if (!scene) return { error: 'No scene' };

    const terrain = scene.getMeshByName('terrain');
    const camera = scene.activeCamera;

    return {
      // Fix 1: Scene Exposure
      sceneExposed: {
        hasScene: (window as any).scene != null,
        hasEngine: (window as any).engine != null,
        hasTestScene: (window as any).__testBabylonScene != null,
      },

      // Fix 2: Light Management
      lights: {
        count: scene.lights?.length || 0,
        names: scene.lights?.map((l: any) => l.name) || [],
        details: scene.lights?.map((l: any) => ({
          name: l.name,
          type: l.getClassName(),
          intensity: l.intensity,
        })) || [],
      },

      // Fix 3: Camera
      camera: camera
        ? {
            name: camera.name,
            type: camera.getClassName(),
            beta: camera.beta,
            radius: camera.radius,
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            target: camera.target
              ? {
                  x: camera.target.x,
                  y: camera.target.y,
                  z: camera.target.z,
                }
              : null,
          }
        : null,

      // Fix 4 & 5: Terrain
      terrain: terrain
        ? {
            name: terrain.name,
            position: {
              x: terrain.position.x,
              y: terrain.position.y,
              z: terrain.position.z,
            },
            vertices: terrain.getTotalVertices(),
            visible: terrain.isVisible,
            material: {
              name: terrain.material?.name,
              type: terrain.material?.getClassName(),
            },
          }
        : null,

      // Fix 6: Doodads
      doodads: {
        totalMeshes: scene.meshes?.length || 0,
        doodadCount: scene.meshes?.filter((m: any) => m.name?.startsWith('doodad_')).length || 0,
      },

      // Fix 7: Scene Readiness
      scene: {
        isReady: scene.isReady(),
        isDisposed: scene.isDisposed,
        activeMeshes: scene.getActiveMeshes()?.length || 0,
      },

      // Fix 8: Performance
      fps: (window as any).engine?.getFps() || 0,
    };
  });

  // Log all data
  console.log('\n📊 VALIDATION RESULTS\n');
  console.log(JSON.stringify(validationData, null, 2));

  // Validate Fix 1: Scene Exposure
  console.log('\n🔍 Fix 1: Scene Exposure');
  expect(validationData.sceneExposed?.hasScene).toBe(true);
  expect(validationData.sceneExposed?.hasEngine).toBe(true);
  console.log('✅ PASS');

  // Validate Fix 2: Light Management
  console.log('\n🔍 Fix 2: Light Management');
  expect(validationData.lights?.count).toBeGreaterThanOrEqual(2);
  expect(validationData.lights?.names).toContain('ambient');
  expect(validationData.lights?.names).toContain('sun');
  console.log(`✅ PASS (${validationData.lights?.count} lights)`);

  // Validate Fix 3: Camera
  console.log('\n🔍 Fix 3: Camera Positioning');
  expect(validationData.camera?.type).toBe('ArcRotateCamera');
  expect(validationData.camera?.name).toBe('rtsCamera');
  expect(validationData.camera?.beta).toBeGreaterThan(0.5);
  expect(validationData.camera?.beta).toBeLessThan(0.8);
  expect(validationData.camera?.radius).toBeGreaterThan(500);
  expect(validationData.camera?.radius).toBeLessThan(3000);
  console.log(
    `✅ PASS (beta=${validationData.camera?.beta.toFixed(3)}, radius=${validationData.camera?.radius.toFixed(0)})`
  );

  // Validate Fix 4: Terrain Positioning
  console.log('\n🔍 Fix 4: Terrain Positioning');
  expect(validationData.terrain?.name).toBe('terrain');
  expect(validationData.terrain?.visible).toBe(true);
  expect(validationData.terrain?.position?.x).toBeGreaterThan(1000);
  expect(validationData.terrain?.position?.z).toBeGreaterThan(1000);
  console.log(
    `✅ PASS (pos=[${validationData.terrain?.position?.x.toFixed(0)}, ${validationData.terrain?.position?.z.toFixed(0)}])`
  );

  // Validate Fix 5: Splatmap Shader
  console.log('\n🔍 Fix 5: Splatmap Shader');
  expect(validationData.terrain?.material?.name).toBe('terrainSplatmap');
  expect(validationData.terrain?.material?.type).toBe('ShaderMaterial');
  console.log('✅ PASS');

  // Validate Fix 6: Doodads
  console.log('\n🔍 Fix 6: Doodad Rendering');
  expect(validationData.doodads?.doodadCount).toBeGreaterThan(0);
  console.log(`✅ PASS (${validationData.doodads?.doodadCount} doodads)`);

  // Validate Fix 7: Scene Readiness
  console.log('\n🔍 Fix 7: Scene Readiness');
  expect(validationData.scene?.isReady).toBe(true);
  expect(validationData.scene?.isDisposed).toBe(false);
  expect(validationData.scene?.activeMeshes).toBeGreaterThan(0);
  console.log(`✅ PASS (${validationData.scene?.activeMeshes} active meshes)`);

  // Validate Fix 8: Performance
  console.log('\n🔍 Fix 8: Performance');
  expect(validationData.fps).toBeGreaterThan(20); // Lower threshold for CI
  console.log(`✅ PASS (${validationData.fps.toFixed(1)} FPS)`);

  // Take screenshot
  await page.screenshot({
    path: 'test-results/quick-rendering-check.png',
    fullPage: false,
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL 8 FIXES VALIDATED');
  console.log('='.repeat(60) + '\n');
});
