import { test } from '@playwright/test';

test('check app state before event dispatch', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.gallery-view', { timeout: 15000 });
  await page.waitForSelector('.map-card', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => {
    // Check window flag
    const hasListener = (window as any).__testLoadMapListenerRegistered;

    // Count map cards
    const mapCards = document.querySelectorAll('.map-card');

    return {
      hasListener,
      mapCardCount: mapCards.length,
      mapNames: Array.from(mapCards)
        .slice(0, 5)
        .map((card) => {
          const nameEl = card.querySelector('.map-card-name');
          return nameEl?.textContent;
        }),
    };
  });

  console.log('App state:', JSON.stringify(state, null, 2));
});
