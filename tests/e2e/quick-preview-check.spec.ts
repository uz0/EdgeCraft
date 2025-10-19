import { test, expect } from '@playwright/test';

test('Quick preview check with console logs', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  // Navigate to gallery
  console.log('🌐 Navigating to http://localhost:3001');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

  // Wait for gallery to load
  console.log('⏳ Waiting for map gallery...');
  await page.waitForSelector('.map-gallery', { timeout: 30000 });

  // Wait a bit for images to load
  await page.waitForTimeout(5000);

  // Take full gallery screenshot
  console.log('📸 Taking full gallery screenshot...');
  await page.screenshot({
    path: 'tests/e2e/investigation-output/full-gallery.png',
    fullPage: true
  });

  // Count loaded images
  const imageCount = await page.locator('.map-card img[src^="data:image"]').count();
  const placeholderCount = await page.locator('.map-card-placeholder').count();
  const totalCards = await page.locator('.map-card').count();

  console.log(`\n📊 GALLERY STATUS:`);
  console.log(`   Total map cards: ${totalCards}`);
  console.log(`   Images loaded: ${imageCount}`);
  console.log(`   Placeholders: ${placeholderCount}`);
  console.log(`   Images NOT loaded: ${totalCards - imageCount - placeholderCount}`);

  // Check first few images for actual content
  console.log(`\n🔍 CHECKING IMAGE CONTENT:`);
  const images = await page.locator('.map-card img[src^="data:image"]').all();
  for (let i = 0; i < Math.min(5, images.length); i++) {
    const img = images[i];
    const src = await img.getAttribute('src');
    const width = await img.evaluate(el => (el as HTMLImageElement).naturalWidth);
    const height = await img.evaluate(el => (el as HTMLImageElement).naturalHeight);
    const alt = await img.getAttribute('alt');

    // Check if image is actually visible
    const isVisible = await img.isVisible();
    const opacity = await img.evaluate(el => window.getComputedStyle(el).opacity);

    console.log(`   Image ${i + 1}: ${alt}`);
    console.log(`      Dimensions: ${width}x${height}`);
    console.log(`      Visible: ${isVisible}, Opacity: ${opacity}`);
    console.log(`      Data URL length: ${src?.substring(0, 50)}...`);
  }

  // Check for TGA decoder errors
  console.log(`\n🐛 CONSOLE ERRORS (${consoleErrors.length} total):`);
  const tgaErrors = consoleErrors.filter(e => e.includes('TGA') || e.includes('tga'));
  const previewErrors = consoleErrors.filter(e => e.includes('preview') || e.includes('Preview'));

  if (tgaErrors.length > 0) {
    console.log(`   TGA-related errors: ${tgaErrors.length}`);
    tgaErrors.slice(0, 3).forEach(e => console.log(`      - ${e}`));
  }

  if (previewErrors.length > 0) {
    console.log(`   Preview-related errors: ${previewErrors.length}`);
    previewErrors.slice(0, 3).forEach(e => console.log(`      - ${e}`));
  }

  // Sample all console messages
  console.log(`\n📋 ALL CONSOLE MESSAGES (first 20):`);
  consoleMessages.slice(0, 20).forEach(msg => console.log(`   ${msg}`));

  // Take individual screenshots of first 5 loaded images
  console.log(`\n📸 Taking individual preview screenshots...`);
  for (let i = 0; i < Math.min(5, images.length); i++) {
    const card = await page.locator('.map-card').nth(i);
    await card.screenshot({
      path: `tests/e2e/investigation-output/preview-${i + 1}.png`
    });
  }

  console.log(`\n✅ Investigation complete!`);
  console.log(`   Screenshots saved to: tests/e2e/investigation-output/`);
});
