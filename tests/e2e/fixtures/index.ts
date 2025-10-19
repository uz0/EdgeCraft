/**
 * Playwright Test Fixtures for EdgeCraft
 *
 * Provides isolated app instances for each test
 */

import { test as base } from '@playwright/test';
import { EdgeCraftTestApp, EdgeCraftAppConfig } from './EdgeCraftTestApp';

type EdgeCraftFixtures = {
  app: EdgeCraftTestApp;
  appConfig: EdgeCraftAppConfig;
};

/**
 * Extended test with EdgeCraft app fixture
 *
 * Usage:
 * ```typescript
 * test('my test', async ({ app, page }) => {
 *   await app.navigateTo(page);
 *   await app.waitForAppReady(page);
 *   // ... test code
 * });
 * ```
 */
export const test = base.extend<EdgeCraftFixtures>({
  // Allow tests to configure the app
  appConfig: [{ useProductionBuild: false }, { option: true }],

  // Create isolated app instance for each test
  app: async ({ appConfig }, use) => {
    const app = new EdgeCraftTestApp(appConfig);
    await app.start();

    // Provide app to test
    await use(app);

    // Cleanup after test
    await app.stop();
  },
});

export { expect } from '@playwright/test';
