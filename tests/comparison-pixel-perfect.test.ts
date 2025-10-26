import { test, expect, Page } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPARISON_URL = 'http://localhost:3000/comparison';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'comparison');
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const WAIT_AFTER_CAMERA_CHANGE = 2000;

interface CameraPreset {
  name: string;
  buttonSelector: string;
  description: string;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'top-view',
    buttonSelector: 'button:has-text("Top View")',
    description: 'Top-down view of terrain',
  },
  {
    name: 'side-view',
    buttonSelector: 'button:has-text("Side View")',
    description: 'Side profile view',
  },
  {
    name: '45-view',
    buttonSelector: 'button:has-text("45° View")',
    description: '45-degree angled view',
  },
  {
    name: 'terrain',
    buttonSelector: 'button:has-text("Terrain")',
    description: 'Close-up view of terrain tiles',
  },
];

async function waitForRenderersReady(page: Page): Promise<void> {
  await page.getByText('Our Renderer').waitFor({ timeout: 10000 });
  await page.getByText('mdx-m3-viewer').waitFor({ timeout: 10000 });

  await page.waitForFunction(
    () => {
      const allText = document.body.textContent || '';
      const hasFPS = allText.includes('FPS:') && allText.match(/FPS:\s*\d+/g);
      return hasFPS && hasFPS.length >= 2;
    },
    { timeout: 10000 }
  );
}

async function waitForCliffLoading(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).__cliffLoadingComplete === true;
    },
    { timeout: 30000 }
  );

  await page.waitForTimeout(5000);
}

async function hideFPSPanels(page: Page): Promise<void> {
  await page.evaluate(() => {
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach((div) => {
      const textContent = div.textContent || '';
      if (
        textContent.includes('FPS:') ||
        textContent.includes('Renderer') ||
        textContent.includes('viewer')
      ) {
        const computedStyle = window.getComputedStyle(div);
        if (computedStyle.position === 'absolute' && computedStyle.zIndex === '10') {
          (div as HTMLElement).style.visibility = 'hidden';
        }
      }
    });
  });
}

async function showFPSPanels(page: Page): Promise<void> {
  await page.evaluate(() => {
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach((div) => {
      const textContent = div.textContent || '';
      if (
        textContent.includes('FPS:') ||
        textContent.includes('Renderer') ||
        textContent.includes('viewer')
      ) {
        const computedStyle = window.getComputedStyle(div);
        if (computedStyle.position === 'absolute' && computedStyle.zIndex === '10') {
          (div as HTMLElement).style.visibility = 'visible';
        }
      }
    });
  });
}

async function captureRendererScreenshot(
  page: Page,
  side: 'left' | 'right',
  outputPath: string
): Promise<void> {
  await hideFPSPanels(page);

  await page.waitForTimeout(100);

  const canvas =
    side === 'left' ? await page.locator('canvas').first() : await page.locator('canvas').nth(1);

  const boundingBox = await canvas.boundingBox();
  if (!boundingBox) {
    throw new Error(`Could not get bounding box for ${side} canvas`);
  }

  await page.screenshot({
    path: outputPath,
    clip: {
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
    },
  });

  await showFPSPanels(page);
}

function extractPixelSamples(
  img: PNG,
  label: string
): Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> {
  const { width, height } = img;
  const samples: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> = [];

  const samplePoints = [
    { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
    { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) },
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.6) },
    { x: Math.floor(width * 0.7), y: Math.floor(height * 0.4) },
  ];

  for (const point of samplePoints) {
    const idx = (width * point.y + point.x) << 2;
    samples.push({
      x: point.x,
      y: point.y,
      r: img.data[idx]!,
      g: img.data[idx + 1]!,
      b: img.data[idx + 2]!,
      a: img.data[idx + 3]!,
    });
  }

  console.log(`\n${label} pixel samples:`);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    console.log(`  [${i}] (${s.x}, ${s.y}): RGB(${s.r}, ${s.g}, ${s.b}) A=${s.a}`);
  }

  return samples;
}

function compareImages(
  img1Path: string,
  img2Path: string,
  diffPath: string
): { match: boolean; diffPixels: number; totalPixels: number; diffPercentage: number } {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  console.log('\n=== Pixel-by-Pixel Color Analysis ===');
  const leftSamples = extractPixelSamples(img1, 'Our Renderer (Left)');
  const rightSamples = extractPixelSamples(img2, 'mdx-m3-viewer (Right)');

  console.log('\n=== Color Difference Analysis ===');
  for (let i = 0; i < leftSamples.length; i++) {
    const left = leftSamples[i]!;
    const right = rightSamples[i]!;
    const rDiff = Math.abs(left.r - right.r);
    const gDiff = Math.abs(left.g - right.g);
    const bDiff = Math.abs(left.b - right.b);
    const avgDiff = (rDiff + gDiff + bDiff) / 3;

    console.log(`  Sample ${i} diff: R=${rDiff} G=${gDiff} B=${bDiff} (avg=${avgDiff.toFixed(1)})`);
  }

  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  return {
    match: diffPixels === 0,
    diffPixels,
    totalPixels,
    diffPercentage,
  };
}

async function verifyCameraPositions(page: Page): Promise<{
  babylonPos: { x: number; y: number; z: number };
  mdxPos: [number, number, number];
  expectedBabylon: { x: number; y: number; z: number };
  positionMatch: boolean;
}> {
  const result = await page.evaluate(() => {
    const camera = (window as any).babylonCamera;
    const mdxCamera = (window as any).simpleOrbitCamera;

    if (!camera || !mdxCamera) {
      throw new Error('Cameras not found');
    }

    const babylonPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    const mdxPos: [number, number, number] = [
      mdxCamera.position[0],
      mdxCamera.position[1],
      mdxCamera.position[2],
    ];

    const expectedBabylon = {
      x: mdxCamera.position[0],
      y: mdxCamera.position[2],
      z: mdxCamera.position[1],
    };

    const positionMatch =
      Math.abs(babylonPos.x - expectedBabylon.x) < 0.1 &&
      Math.abs(babylonPos.y - expectedBabylon.y) < 0.1 &&
      Math.abs(babylonPos.z - expectedBabylon.z) < 0.1;

    return { babylonPos, mdxPos, expectedBabylon, positionMatch };
  });

  return result;
}

test.describe('Renderer Comparison - Pixel Perfect Camera Matching', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  for (const preset of CAMERA_PRESETS) {
    test(`Camera positions should match exactly for ${preset.name}`, async ({ page }) => {
      await page.goto(COMPARISON_URL);
      await waitForRenderersReady(page);
      await waitForCliffLoading(page);

      await page.click(preset.buttonSelector);
      await page.waitForTimeout(WAIT_AFTER_CAMERA_CHANGE);

      const cameraData = await verifyCameraPositions(page);

      expect(cameraData.positionMatch, `Camera positions should match for ${preset.name}`).toBe(
        true
      );

      console.log(`✓ ${preset.name} camera positions match:`);
      console.log(
        `  Babylon: [${cameraData.babylonPos.x.toFixed(2)}, ${cameraData.babylonPos.y.toFixed(2)}, ${cameraData.babylonPos.z.toFixed(2)}]`
      );
      console.log(
        `  MDX (Z-up): [${cameraData.mdxPos[0].toFixed(2)}, ${cameraData.mdxPos[1].toFixed(2)}, ${cameraData.mdxPos[2].toFixed(2)}]`
      );
      console.log(
        `  Expected Babylon: [${cameraData.expectedBabylon.x.toFixed(2)}, ${cameraData.expectedBabylon.y.toFixed(2)}, ${cameraData.expectedBabylon.z.toFixed(2)}]`
      );
    });

    test(`Visual comparison for ${preset.name}`, async ({ page }) => {
      await page.goto(COMPARISON_URL);
      await waitForRenderersReady(page);
      await waitForCliffLoading(page);

      await page.click(preset.buttonSelector);
      await page.waitForTimeout(WAIT_AFTER_CAMERA_CHANGE);

      const leftScreenshotPath = path.join(SCREENSHOT_DIR, `${preset.name}-left.png`);
      const rightScreenshotPath = path.join(SCREENSHOT_DIR, `${preset.name}-right.png`);
      const diffScreenshotPath = path.join(SCREENSHOT_DIR, `${preset.name}-diff.png`);

      await captureRendererScreenshot(page, 'left', leftScreenshotPath);
      await captureRendererScreenshot(page, 'right', rightScreenshotPath);

      const comparison = compareImages(leftScreenshotPath, rightScreenshotPath, diffScreenshotPath);

      console.log(`\n${preset.name} Visual Comparison:`);
      console.log(`  Diff pixels: ${comparison.diffPixels} / ${comparison.totalPixels}`);
      console.log(`  Diff percentage: ${comparison.diffPercentage.toFixed(2)}%`);
      console.log(`  Screenshots saved to: ${SCREENSHOT_DIR}`);

      expect(comparison.diffPercentage).toBe(0);
    });
  }

  test('All camera presets should cycle correctly', async ({ page }) => {
    await page.goto(COMPARISON_URL);
    await waitForRenderersReady(page);
    await waitForCliffLoading(page);

    const results: Array<{
      preset: string;
      positionMatch: boolean;
      diffPercentage: number;
    }> = [];

    for (const preset of CAMERA_PRESETS) {
      await page.click(preset.buttonSelector);
      await page.waitForTimeout(WAIT_AFTER_CAMERA_CHANGE);

      const cameraData = await verifyCameraPositions(page);

      const leftPath = path.join(SCREENSHOT_DIR, `cycle-${preset.name}-left.png`);
      const rightPath = path.join(SCREENSHOT_DIR, `cycle-${preset.name}-right.png`);
      const diffPath = path.join(SCREENSHOT_DIR, `cycle-${preset.name}-diff.png`);

      await captureRendererScreenshot(page, 'left', leftPath);
      await captureRendererScreenshot(page, 'right', rightPath);

      const comparison = compareImages(leftPath, rightPath, diffPath);

      results.push({
        preset: preset.name,
        positionMatch: cameraData.positionMatch,
        diffPercentage: comparison.diffPercentage,
      });
    }

    console.log('\nCamera Cycle Test Results:');
    results.forEach((result) => {
      console.log(`  ${result.preset}:`);
      console.log(`    Position Match: ${result.positionMatch ? '✓' : '✗'}`);
      console.log(`    Visual Diff: ${result.diffPercentage.toFixed(2)}%`);
    });

    results.forEach((result) => {
      expect(result.positionMatch, `${result.preset} position should match`).toBe(true);
    });
  });
});
