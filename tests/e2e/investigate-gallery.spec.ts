import { test, expect } from '@playwright/test';

test('Investigate gallery - capture console logs and screenshots', async ({ page }) => {
  // Capture console messages
  const consoleLogs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);

    // Specifically look for map loading/preview generation messages
    if (text.includes('MapPreview') || text.includes('Loading') || text.includes('Failed') || text.includes('Error')) {
      console.log(`🔍 [${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  // Navigate to gallery
  console.log('📱 Opening gallery at http://localhost:3000');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for gallery to load
  await page.waitForSelector('.map-gallery', { timeout: 30000 });
  console.log('✅ Gallery loaded');

  // Take full page screenshot
  await page.screenshot({ path: 'gallery-full.png', fullPage: true });
  console.log('📸 Screenshot saved: gallery-full.png');

  // Count map cards
  const mapCards = await page.locator('.map-card').count();
  console.log(`\n📊 Found ${mapCards} map cards`);

  // Check each map card for images
  for (let i = 0; i < mapCards; i++) {
    const card = page.locator('.map-card').nth(i);
    const mapName = await card.locator('.map-name').textContent();
    const hasImage = await card.locator('img').count() > 0;
    const imageSrc = hasImage ? await card.locator('img').getAttribute('src') : 'NO IMAGE';

    console.log(`\n${i + 1}. ${mapName}`);
    console.log(`   Has image: ${hasImage}`);
    console.log(`   Image src: ${imageSrc}`);

    if (!hasImage || imageSrc === 'NO IMAGE' || imageSrc?.includes('placeholder')) {
      console.log(`   ⚠️ Missing preview image`);
    }
  }

  // Print relevant console logs
  console.log('\n\n🔍 Relevant Console Logs:');
  consoleLogs
    .filter(log =>
      log.includes('MapPreview') ||
      log.includes('Loading') ||
      log.includes('Failed') ||
      log.includes('Error') ||
      log.includes('ADPCM') ||
      log.includes('StormJS')
    )
    .forEach(log => console.log(log));

  // Print errors
  if (errors.length > 0) {
    console.log('\n\n❌ Page Errors:');
    errors.forEach(err => console.log(err));
  }

  // Wait a bit for any async operations
  await page.waitForTimeout(5000);
});
