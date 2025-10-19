import { test, expect } from '@playwright/test';

test('Check if cache is causing duplicate previews', async ({ page }) => {
  console.log('🌐 Navigating to http://localhost:3001');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting for gallery...');
  await page.waitForSelector('.map-gallery', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // Check IndexedDB cache contents
  console.log('\n🔍 Checking IndexedDB cache...');

  const cacheEntries = await page.evaluate(async () => {
    return new Promise<Array<{ mapId: string; dataUrlPrefix: string }>>((resolve) => {
      const request = indexedDB.open('EdgeCraft_PreviewCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('previews', 'readonly');
        const store = transaction.objectStore('previews');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const entries = getAllRequest.result as Array<{ mapId: string; dataUrl: string }>;
          resolve(
            entries.map(e => ({
              mapId: e.mapId,
              dataUrlPrefix: e.dataUrl.substring(0, 100)
            }))
          );
        };
      };
    });
  });

  console.log(`\n📦 Found ${cacheEntries.length} cached entries:`);
  cacheEntries.forEach((entry, i) => {
    console.log(`   ${i + 1}. ${entry.mapId}`);
    console.log(`      Data: ${entry.dataUrlPrefix}...`);
  });

  // Check if Sentinel maps have DIFFERENT data URLs
  const sentinelEntries = cacheEntries.filter(e => e.mapId.includes('Sentinel'));
  console.log(`\n🎯 Sentinel maps in cache: ${sentinelEntries.length}`);

  const uniqueDataUrls = new Set(sentinelEntries.map(e => e.dataUrlPrefix));
  console.log(`   Unique preview images: ${uniqueDataUrls.size}`);

  if (sentinelEntries.length > 0 && uniqueDataUrls.size === 1) {
    console.log(`   ⚠️ WARNING: All Sentinel maps have THE SAME cached preview!`);
  } else if (uniqueDataUrls.size > 1) {
    console.log(`   ✅ Good: Sentinel maps have different previews`);
  }

  // Get actual image data from DOM
  console.log('\n🖼️ Checking actual rendered images...');

  const imageData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.map-card'));
    return cards
      .filter(card => card.textContent?.includes('Sentinel'))
      .map(card => {
        const img = card.querySelector('img[src^="data:image"]') as HTMLImageElement;
        const name = card.querySelector('h3')?.textContent || 'Unknown';
        return {
          name,
          src: img?.src?.substring(0, 100) || 'No image',
          width: img?.naturalWidth || 0,
          height: img?.naturalHeight || 0
        };
      });
  });

  console.log(`\n🎨 Sentinel map images in DOM: ${imageData.length}`);
  imageData.forEach((img, i) => {
    console.log(`   ${i + 1}. ${img.name}`);
    console.log(`      Size: ${img.width}x${img.height}`);
    console.log(`      Src: ${img.src}...`);
  });

  const uniqueDOMImages = new Set(imageData.map(img => img.src));
  console.log(`\n   Unique image sources: ${uniqueDOMImages.size}`);

  if (imageData.length > 0 && uniqueDOMImages.size === 1) {
    console.log(`   🚨 CONFIRMED BUG: All Sentinel maps display THE SAME image!`);
  } else {
    console.log(`   ✅ No duplicate issue detected`);
  }

  // Clear cache and reload to see if it fixes the issue
  console.log('\n🧹 Clearing cache and reloading...');
  await page.evaluate(async () => {
    return new Promise<void>((resolve) => {
      const request = indexedDB.open('EdgeCraft_PreviewCache', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('previews', 'readwrite');
        const store = transaction.objectStore('previews');
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          console.log('✅ Cache cleared');
          resolve();
        };
      };
    });
  });

  console.log('🔄 Reloading page...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(10000); // Wait for preview generation

  // Check again after reload
  const imageDataAfterClear = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.map-card'));
    return cards
      .filter(card => card.textContent?.includes('Sentinel'))
      .map(card => {
        const img = card.querySelector('img[src^="data:image"]') as HTMLImageElement;
        const name = card.querySelector('h3')?.textContent || 'Unknown';
        return {
          name,
          src: img?.src?.substring(0, 100) || 'No image',
          width: img?.naturalWidth || 0,
          height: img?.naturalHeight || 0
        };
      });
  });

  const uniqueDOMImagesAfter = new Set(imageDataAfterClear.map(img => img.src));
  console.log(`\n📊 After cache clear:`);
  console.log(`   Sentinel maps: ${imageDataAfterClear.length}`);
  console.log(`   Unique images: ${uniqueDOMImagesAfter.size}`);

  if (imageDataAfterClear.length > 0 && uniqueDOMImagesAfter.size === 1) {
    console.log(`   🚨 Still broken after cache clear - NOT a cache issue!`);
  } else {
    console.log(`   ✅ Fixed after cache clear - WAS a cache issue!`);
  }
});
