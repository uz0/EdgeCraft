#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🔍 Quick Map Load Test\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Capture ALL console logs
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER] ${text}`);
  });

  try {
    console.log('📂 Loading http://localhost:3001/...');
    await page.goto('http://localhost:3001/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗺️  Clicking first map...');
    await page.click('.map-card');

    console.log('⏳ Waiting 20 seconds for map to load...\n');
    await new Promise(resolve => setTimeout(resolve, 20000));

    console.log('\n✅ Capturing scene state...');
    const sceneState = await page.evaluate(() => {
      const scene = window.__BABYLON_SCENE;
      if (!scene) return { error: 'No scene' };

      const meshes = scene.meshes || [];
      return {
        totalMeshes: meshes.length,
        terrain: meshes.find(m => m.name === 'terrain') ? 'FOUND' : 'MISSING',
        units: meshes.filter(m => m.name?.startsWith('unit_')).length,
        doodads: meshes.filter(m => m.name?.startsWith('doodad_')).length,
      };
    });

    console.log('\n========== SCENE STATE ==========');
    console.log(JSON.stringify(sceneState, null, 2));
    console.log('=================================\n');

    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('✅ Screenshot saved: test-screenshot.png');

    console.log('\nKeeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest();
