import { test } from '@playwright/test';

test('List all map names from gallery', async ({ page }) => {
  // Navigate to map gallery
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for the map gallery to render
  await page.waitForSelector('.map-card', { timeout: 60000 });

  // Get all map names
  const mapNames = await page.locator('.map-card-name').allTextContents();

  console.log('\n\n📋 ALL MAP NAMES IN GALLERY:\n');
  console.log('─'.repeat(80));
  mapNames.forEach((name, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${name}`);
  });
  console.log('─'.repeat(80));
  console.log(`\nTotal: ${mapNames.length} maps\n`);
});
