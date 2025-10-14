/**
 * Test helpers for visual regression testing
 *
 * Provides utilities to generate deterministic mock images for testing
 * the visual regression infrastructure without requiring a full WebGL context.
 */

/**
 * Generate a deterministic test image as a data URL
 *
 * Creates a simple gradient image with text overlay to make it visually distinguishable
 * and deterministic for snapshot testing.
 *
 * @param width - Image width
 * @param height - Image height
 * @param identifier - Unique identifier to embed in the image
 * @param seed - Seed for deterministic "random" patterns
 * @returns Base64 data URL
 */
export function generateMockPreviewImage(
  width: number,
  height: number,
  identifier: string,
  seed: number = 0
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Create deterministic gradient based on seed
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const hue1 = (seed * 137.5) % 360; // Golden angle for good distribution
  const hue2 = (hue1 + 180) % 360;

  gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
  gradient.addColorStop(1, `hsl(${hue2}, 70%, 30%)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add deterministic pattern based on seed
  ctx.strokeStyle = `hsla(${(seed * 45) % 360}, 50%, 80%, 0.3)`;
  ctx.lineWidth = 2;

  const step = 20 + (seed % 10) * 2;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Add text identifier for visual distinction
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillText(identifier, width / 2, height / 2);

  // Add dimensions
  ctx.font = '16px monospace';
  ctx.fillText(`${width}x${height}`, width / 2, height / 2 + 40);

  return canvas.toDataURL('image/png');
}

/**
 * Generate a mock terrain heightmap pattern as an image
 *
 * Creates a terrain-like pattern for testing terrain preview generation.
 *
 * @param width - Terrain width
 * @param height - Terrain height
 * @param pattern - Pattern type (flat, hills, mountains)
 * @returns Base64 data URL
 */
export function generateMockTerrainImage(
  width: number,
  height: number,
  pattern: 'flat' | 'hills' | 'mountains'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Base terrain color
  const baseColors = {
    flat: { r: 100, g: 150, b: 100 },
    hills: { r: 120, g: 140, b: 90 },
    mountains: { r: 140, g: 130, b: 120 },
  };

  const baseColor = baseColors[pattern];

  // Create image data
  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      let height = 0;

      switch (pattern) {
        case 'flat':
          height = 0.5;
          break;
        case 'hills':
          height = (Math.sin(x / 10) * Math.cos(y / 10) + 1) / 2;
          break;
        case 'mountains':
          height =
            (Math.sin(x / 5) * Math.cos(y / 5) + Math.sin(x / 20) * Math.cos(y / 20) + 2) / 3;
          break;
      }

      const variation = height * 100;

      imageData.data[idx] = baseColor.r + variation;
      imageData.data[idx + 1] = baseColor.g + variation;
      imageData.data[idx + 2] = baseColor.b + variation;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(pattern.toUpperCase(), width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Simple hash function to generate deterministic seed from string
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
