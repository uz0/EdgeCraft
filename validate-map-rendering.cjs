#!/usr/bin/env node

/**
 * Validate map rendering using Puppeteer
 * Tests that entities and terrain are rendering correctly
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function validateMapRendering() {
  console.log('Starting browser...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`);

    // Print important logs in real-time
    if (text.includes('COORDINATE DEBUG') ||
        text.includes('terrain') ||
        text.includes('Rendered') ||
        text.includes('ERROR') ||
        text.includes('positioned')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:3001/...');
    await page.goto('http://localhost:3001/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for React to mount
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Waiting for UI to load...');
    await page.waitForSelector('button', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click "Gallery View" button if not already on that view
    console.log('Switching to Gallery View...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const galleryBtn = buttons.find(b => b.textContent?.includes('Gallery View'));
      if (galleryBtn) {
        galleryBtn.click();
      }
    });

    // Wait for gallery to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take initial screenshot
    await page.screenshot({ path: 'screenshot-01-gallery.png' });
    console.log('✅ Screenshot saved: screenshot-01-gallery.png');

    console.log('Clicking first map card...');
    // Find and click the first map card by using CSS selector
    await page.click('.map-card');
    console.log('Map card clicked, waiting for view to change...');

    // Wait for view to change (map viewer should appear)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for map rendering to complete (check for Babylon scene)
    await page.waitForFunction(
      () => {
        return window.__BABYLON_SCENE !== undefined && window.__BABYLON_SCENE !== null;
      },
      { timeout: 60000, polling: 500 }
    ).catch(() => {
      console.log('Timeout waiting for Babylon scene, continuing anyway...');
    });

    // Wait a bit more for rendering to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of rendered map
    await page.screenshot({ path: 'screenshot-02-map-loaded.png', fullPage: false });
    console.log('✅ Screenshot saved: screenshot-02-map-loaded.png');

    // Capture scene state via JavaScript
    const sceneInfo = await page.evaluate(() => {
      const scene = window.__BABYLON_SCENE;
      if (!scene) {
        return { error: 'No Babylon.js scene found' };
      }

      const meshes = scene.meshes || [];
      const terrain = meshes.find(m => m.name === 'terrain');
      const units = meshes.filter(m => m.name?.startsWith('unit_'));
      const doodads = meshes.filter(m => m.name?.startsWith('doodad_'));

      return {
        totalMeshes: meshes.length,
        terrain: terrain ? {
          name: terrain.name,
          position: { x: terrain.position.x, y: terrain.position.y, z: terrain.position.z },
          visible: terrain.isVisible,
          boundingBox: {
            min: {
              x: terrain.getBoundingInfo().minimum.x,
              y: terrain.getBoundingInfo().minimum.y,
              z: terrain.getBoundingInfo().minimum.z
            },
            max: {
              x: terrain.getBoundingInfo().maximum.x,
              y: terrain.getBoundingInfo().maximum.y,
              z: terrain.getBoundingInfo().maximum.z
            }
          }
        } : null,
        unitCount: units.length,
        doodadCount: doodads.length,
        firstUnit: units[0] ? {
          name: units[0].name,
          position: { x: units[0].position.x, y: units[0].position.y, z: units[0].position.z },
          visible: units[0].isVisible
        } : null,
        firstDoodad: doodads[0] ? {
          name: doodads[0].name,
          position: { x: doodads[0].position.x, y: doodads[0].position.y, z: doodads[0].position.z },
          visible: doodads[0].isVisible,
          thinInstanceCount: doodads[0].thinInstanceCount
        } : null
      };
    });

    console.log('\n========== SCENE STATE ==========');
    console.log(JSON.stringify(sceneInfo, null, 2));
    console.log('=================================\n');

    // Save full console logs
    fs.writeFileSync('console-logs.txt', consoleLogs.join('\n'));
    console.log('✅ Console logs saved: console-logs.txt');

    // Validate results
    console.log('\n========== VALIDATION RESULTS ==========');

    let hasErrors = false;

    if (!sceneInfo.terrain) {
      console.error('❌ ERROR: No terrain mesh found!');
      hasErrors = true;
    } else {
      console.log('✅ Terrain mesh found:', sceneInfo.terrain.name);
      console.log(`   Position: (${sceneInfo.terrain.position.x.toFixed(1)}, ${sceneInfo.terrain.position.y.toFixed(1)}, ${sceneInfo.terrain.position.z.toFixed(1)})`);

      if (sceneInfo.terrain.position.x !== 0 || sceneInfo.terrain.position.z !== 0) {
        console.warn(`⚠️  WARNING: Terrain not at origin! Position: (${sceneInfo.terrain.position.x}, ${sceneInfo.terrain.position.y}, ${sceneInfo.terrain.position.z})`);
      }
    }

    if (sceneInfo.unitCount === 0) {
      console.error('❌ ERROR: No units found!');
      hasErrors = true;
    } else {
      console.log(`✅ Units found: ${sceneInfo.unitCount}`);
      if (sceneInfo.firstUnit) {
        console.log(`   First unit: ${sceneInfo.firstUnit.name}`);
        console.log(`   Position: (${sceneInfo.firstUnit.position.x.toFixed(1)}, ${sceneInfo.firstUnit.position.y.toFixed(1)}, ${sceneInfo.firstUnit.position.z.toFixed(1)})`);
        console.log(`   Visible: ${sceneInfo.firstUnit.visible}`);
      }
    }

    if (sceneInfo.doodadCount === 0) {
      console.error('❌ ERROR: No doodad meshes found!');
      hasErrors = true;
    } else {
      console.log(`✅ Doodad meshes found: ${sceneInfo.doodadCount}`);
      if (sceneInfo.firstDoodad) {
        console.log(`   First doodad: ${sceneInfo.firstDoodad.name}`);
        console.log(`   Position: (${sceneInfo.firstDoodad.position.x.toFixed(1)}, ${sceneInfo.firstDoodad.position.y.toFixed(1)}, ${sceneInfo.firstDoodad.position.z.toFixed(1)})`);
        console.log(`   Thin instances: ${sceneInfo.firstDoodad.thinInstanceCount || 0}`);
        console.log(`   Visible: ${sceneInfo.firstDoodad.visible}`);
      }
    }

    console.log('========================================\n');

    if (hasErrors) {
      console.error('❌ VALIDATION FAILED - Errors detected in scene!');
    } else {
      console.log('✅ VALIDATION PASSED - Scene looks good!');
    }

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('Error during validation:', error);

    // Save error screenshot
    await page.screenshot({ path: 'screenshot-error.png' });
    console.log('Error screenshot saved: screenshot-error.png');

    throw error;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

validateMapRendering().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
