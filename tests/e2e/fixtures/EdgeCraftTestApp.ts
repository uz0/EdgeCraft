/**
 * EdgeCraft Test Application Factory
 *
 * Creates isolated EdgeCraft instances for E2E testing
 * Each test gets its own app instance with proper lifecycle management
 */

import { Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { createServer, ViteDevServer } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EdgeCraftAppConfig {
  port?: number;
  useProductionBuild?: boolean;
  baseDir?: string;
}

export class EdgeCraftTestApp {
  private server: ViteDevServer | null = null;
  private process: ChildProcess | null = null;
  private port: number;
  private baseDir: string;
  private useProductionBuild: boolean;

  constructor(config: EdgeCraftAppConfig = {}) {
    this.port = config.port ?? this.findAvailablePort();
    this.baseDir = config.baseDir ?? path.resolve(__dirname, '../../../');
    this.useProductionBuild = config.useProductionBuild ?? false;
  }

  /**
   * Find an available port for this test instance
   */
  private findAvailablePort(): number {
    // Use random port in range 4000-9000 to avoid conflicts
    return 4000 + Math.floor(Math.random() * 5000);
  }

  /**
   * Start the EdgeCraft application instance
   */
  async start(): Promise<string> {
    if (this.useProductionBuild) {
      return await this.startProductionServer();
    } else {
      return await this.startDevServer();
    }
  }

  /**
   * Start Vite dev server for this test instance
   */
  private async startDevServer(): Promise<string> {
    console.log(`[EdgeCraftTestApp] Starting dev server on port ${this.port}...`);

    this.server = await createServer({
      root: this.baseDir,
      server: {
        port: this.port,
        strictPort: true,
        host: 'localhost',
      },
      configFile: path.join(this.baseDir, 'vite.config.ts'),
      logLevel: 'error', // Reduce noise in test output
    });

    await this.server.listen();

    const url = `http://localhost:${this.port}`;
    console.log(`[EdgeCraftTestApp] ✅ Dev server ready at ${url}`);

    return url;
  }

  /**
   * Start production build server
   */
  private async startProductionServer(): Promise<string> {
    console.log(`[EdgeCraftTestApp] Starting production server on port ${this.port}...`);

    // Build the app first
    await this.buildApp();

    // Start preview server
    this.process = spawn('npx', ['vite', 'preview', '--port', this.port.toString()], {
      cwd: this.baseDir,
      stdio: 'pipe',
    });

    // Wait for server to be ready
    await this.waitForServer();

    const url = `http://localhost:${this.port}`;
    console.log(`[EdgeCraftTestApp] ✅ Production server ready at ${url}`);

    return url;
  }

  /**
   * Build the application
   */
  private async buildApp(): Promise<void> {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.baseDir,
        stdio: 'pipe',
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServer(maxAttempts = 30): Promise<void> {
    const url = `http://localhost:${this.port}`;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Server failed to start on port ${this.port} after ${maxAttempts} attempts`);
  }

  /**
   * Stop the EdgeCraft application instance
   */
  async stop(): Promise<void> {
    console.log(`[EdgeCraftTestApp] Stopping server on port ${this.port}...`);

    if (this.server) {
      await this.server.close();
      this.server = null;
    }

    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    console.log(`[EdgeCraftTestApp] ✅ Server stopped`);
  }

  /**
   * Navigate page to this app instance
   */
  async navigateTo(page: Page, path: string = '/'): Promise<void> {
    const url = `http://localhost:${this.port}${path}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  /**
   * Get the base URL for this instance
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Wait for EdgeCraft to be fully initialized
   */
  async waitForAppReady(page: Page, timeout = 60000): Promise<void> {
    const startTime = Date.now();

    // Wait for React root to mount
    await page.waitForSelector('#root', { timeout, state: 'attached' });

    // Give React time to render
    await page.waitForTimeout(1000);

    // Wait for map gallery to render (check for map cards with a more lenient wait)
    try {
      await page.waitForSelector('button[aria-label^="Load map"]', {
        timeout: timeout - (Date.now() - startTime),
        state: 'visible'
      });
    } catch (error) {
      // If buttons don't appear, log page content for debugging
      const content = await page.content();
      console.error('[EdgeCraftTestApp] Page content:', content.substring(0, 500));
      throw error;
    }

    console.log(`[EdgeCraftTestApp] ✅ App ready (took ${Date.now() - startTime}ms)`);
  }

  /**
   * Get all map cards from the gallery
   */
  async getMapCards(page: Page) {
    return await page.locator('button[aria-label^="Load map"]').all();
  }

  /**
   * Get map card by name
   */
  async getMapCard(page: Page, mapName: string) {
    return page.locator(`button[aria-label="Load map: ${mapName}"]`);
  }

  /**
   * Click on a map to load it
   */
  async loadMap(page: Page, mapName: string): Promise<void> {
    const card = await this.getMapCard(page, mapName);
    await card.click();
  }

  /**
   * Get current FPS counter value
   */
  async getFPS(page: Page): Promise<number> {
    const fpsText = await page.locator('text=/FPS: \\d+/').textContent();
    if (!fpsText) return 0;

    const match = fpsText.match(/FPS: (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get total maps count from header
   */
  async getMapsCount(page: Page): Promise<number> {
    const countText = await page.locator('text=/Maps: \\d+/').textContent();
    if (!countText) return 0;

    const match = countText.match(/Maps: (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Reset all map previews
   */
  async resetPreviews(page: Page): Promise<void> {
    const resetButton = page.locator('button:has-text("Reset Previews")');
    await resetButton.click();
  }

  /**
   * Search for maps
   */
  async searchMaps(page: Page, query: string): Promise<void> {
    const searchInput = page.locator('input[placeholder="Search maps..."]');
    await searchInput.fill(query);
  }

  /**
   * Filter by format
   */
  async filterByFormat(page: Page, format: 'w3x' | 'w3n' | 'sc2map' | 'all'): Promise<void> {
    const filterSelect = page.locator('select:has-option:text("All Formats")');

    const formatMap = {
      w3x: 'Warcraft 3 Maps (.w3x)',
      w3n: 'Warcraft 3 Campaigns (.w3n)',
      sc2map: 'StarCraft 2 (.sc2map)',
      all: 'All Formats',
    };

    await filterSelect.selectOption({ label: formatMap[format] });
  }

  /**
   * Get screenshot of current state
   */
  async takeScreenshot(page: Page, name: string): Promise<Buffer> {
    return await page.screenshot({
      path: path.join(this.baseDir, 'test-results', `${name}.png`),
      fullPage: true,
    });
  }

  /**
   * Check if a map preview is loaded
   */
  async isMapPreviewLoaded(page: Page, mapName: string): Promise<boolean> {
    const card = await this.getMapCard(page, mapName);
    const img = card.locator('img');
    const imgCount = await img.count();

    if (imgCount === 0) {
      return false; // Using placeholder
    }

    // Check if image has loaded
    return await img.evaluate((imgElement: HTMLImageElement) => {
      return imgElement.complete && imgElement.naturalWidth > 0;
    });
  }

  /**
   * Get memory usage from performance API
   */
  async getMemoryUsage(page: Page): Promise<{ used: number; total: number } | null> {
    return await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
        };
      }
      return null;
    });
  }
}

/**
 * Factory function to create EdgeCraft test instances
 */
export async function createEdgeCraftApp(config?: EdgeCraftAppConfig): Promise<EdgeCraftTestApp> {
  const app = new EdgeCraftTestApp(config);
  await app.start();
  return app;
}
