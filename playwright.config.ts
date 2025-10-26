import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Edge Craft E2E Tests
 *
 * Specialized for WebGL/Babylon.js rendering tests with screenshot comparison.
 * Based on: https://github.com/BarthPaleologue/BabylonPlaywrightExample
 */
export default defineConfig({
  // Test directory - E2E tests in tests/ root only
  testDir: './tests',

  // ONLY match specific E2E test files (not Jest unit tests)
  testMatch: ['MapGallery.test.ts', 'OpenMap.test.ts', 'BenchmarkComparison.test.ts'],

  // Baseline screenshots directory
  snapshotDir: './tests/e2e-screenshots',

  // Timeout for each test (WebGL rendering can be slow)
  timeout: 120000, // 120 seconds (2 minutes for large maps)

  // Expect timeout for assertions
  expect: {
    timeout: 30000, // 30 seconds for long operations
    toMatchSnapshot: {
      // Allow 5% pixel difference for anti-aliasing variations
      threshold: 0.05,
      maxDiffPixels: 100,
    },
  },

  // Fail fast on CI, continue locally
  fullyParallel: false, // Disable parallel to avoid WebGL context conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,

  // Parallel workers (1 for WebGL stability)
  workers: 1,

  // Reporter configuration
  reporter: process.env.CI ? [['list']] : [['line']],

  // Shared settings for all tests
  use: {
    // Base URL for tests (port 3000 is Vite's default)
    baseURL: 'http://localhost:3000',

    // Screenshot on failure for debugging
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Viewport size (1920x1080 for consistent screenshots)
    viewport: { width: 1920, height: 1080 },

    // Action timeout
    actionTimeout: 30000,

    // Navigation timeout (map loading can be slow)
    navigationTimeout: 60000,
  },

  // Configure Vite dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000', // Port 3000 is Vite's default
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    stdout: 'pipe', // Log server output for debugging
    stderr: 'pipe',
    env: {
      VITE_OPEN_BROWSER: 'false'
    }
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable WebGL
        launchOptions: {
          args: ['--enable-webgl', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
        },
      },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     launchOptions: {
    //       firefoxUserPrefs: {
    //         'webgl.force-enabled': true,
    //       },
    //     },
    //   },
    // },

    // Note: WebKit/Safari has known WebGL issues on macOS 13
    // Use macOS 14+ for WebKit testing
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
