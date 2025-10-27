interface BLPConfig {
  width: number;
  height: number;
  content: 0 | 1;
  alphaBits: 0 | 1 | 4 | 8;
  type?: number;
  hasMipmaps?: boolean;
  mipmapLevels?: number;
}

export function createBLPHeader(config: BLPConfig): ArrayBuffer {
  const BLP1_MAGIC = 0x31504c42;
  const header = new ArrayBuffer(160);
  const view = new DataView(header);

  view.setUint32(0, BLP1_MAGIC, true);
  view.setUint32(4, config.content, true);
  view.setUint32(8, config.alphaBits, true);
  view.setUint32(12, config.width, true);
  view.setUint32(16, config.height, true);
  view.setUint32(20, config.type ?? 0, true);
  view.setUint32(24, config.hasMipmaps === true ? 1 : 0, true);

  const mipmapLevels = config.mipmapLevels ?? 1;
  let currentWidth = config.width;
  let currentHeight = config.height;
  let currentOffset = config.content === 0 ? 160 : 1180;

  for (let i = 0; i < 16; i++) {
    if (i < mipmapLevels) {
      const pixelCount = currentWidth * currentHeight;
      let size = 0;

      if (config.content === 1) {
        size = pixelCount;
        if (config.alphaBits > 0) {
          size += Math.ceil((pixelCount * config.alphaBits) / 8);
        }
      } else {
        size = 100;
      }

      view.setUint32(28 + i * 4, currentOffset, true);
      view.setUint32(92 + i * 4, size, true);

      currentOffset += size;
      currentWidth = Math.max(currentWidth >> 1, 1);
      currentHeight = Math.max(currentHeight >> 1, 1);
    } else {
      view.setUint32(28 + i * 4, 0, true);
      view.setUint32(92 + i * 4, 0, true);
    }
  }

  if (config.content === 0) {
    view.setUint32(156, 0, true);
  }

  return header;
}

export function createPaletteBLP(
  width: number,
  height: number,
  alphaBits: 0 | 1 | 4 | 8,
  mipmapLevels: number = 1
): ArrayBuffer {
  const header = createBLPHeader({
    width,
    height,
    content: 1,
    alphaBits,
    hasMipmaps: mipmapLevels > 1,
    mipmapLevels,
  });

  const palette = new Uint8Array(1024);
  for (let i = 0; i < 256; i++) {
    palette[i * 4 + 0] = i;
    palette[i * 4 + 1] = 255 - i;
    palette[i * 4 + 2] = (i + 128) % 256;
    palette[i * 4 + 3] = 255;
  }

  let totalSize = 156 + 1024;
  let currentWidth = width;
  let currentHeight = height;

  for (let level = 0; level < mipmapLevels; level++) {
    const pixelCount = currentWidth * currentHeight;
    totalSize += pixelCount;
    if (alphaBits > 0) {
      totalSize += Math.ceil((pixelCount * alphaBits) / 8);
    }
    currentWidth = Math.max(currentWidth >> 1, 1);
    currentHeight = Math.max(currentHeight >> 1, 1);
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new Uint8Array(buffer);

  view.set(new Uint8Array(header), 0);
  view.set(palette, 156);

  let offset = 1180;
  currentWidth = width;
  currentHeight = height;

  for (let level = 0; level < mipmapLevels; level++) {
    const pixelCount = currentWidth * currentHeight;

    for (let i = 0; i < pixelCount; i++) {
      view[offset + i] = i % 256;
    }

    if (alphaBits > 0) {
      const alphaOffset = offset + pixelCount;
      const alphaBytes = Math.ceil((pixelCount * alphaBits) / 8);

      for (let i = 0; i < alphaBytes; i++) {
        view[alphaOffset + i] = 0xff;
      }
    }

    offset += pixelCount;
    if (alphaBits > 0) {
      offset += Math.ceil((pixelCount * alphaBits) / 8);
    }

    currentWidth = Math.max(currentWidth >> 1, 1);
    currentHeight = Math.max(currentHeight >> 1, 1);
  }

  return buffer;
}

export function createInvalidBLP(type: 'wrongMagic' | 'truncated' | 'tooSmall'): ArrayBuffer {
  if (type === 'wrongMagic') {
    const buffer = new ArrayBuffer(160);
    const view = new DataView(buffer);
    view.setUint32(0, 0x12345678, true);
    return buffer;
  }

  if (type === 'truncated') {
    return new ArrayBuffer(100);
  }

  if (type === 'tooSmall') {
    return new ArrayBuffer(10);
  }

  return new ArrayBuffer(0);
}

export function createMinimalBLP(): ArrayBuffer {
  return createPaletteBLP(1, 1, 0, 1);
}

export function createNonSquareBLP(): ArrayBuffer {
  return createPaletteBLP(256, 128, 0, 1);
}

export interface PixelComparison {
  match: boolean;
  diffPixels: number;
  maxError: number;
  differences: Array<{
    index: number;
    expected: [number, number, number, number];
    actual: [number, number, number, number];
  }>;
}

export function comparePixels(
  actual: Uint8ClampedArray,
  expected: Uint8ClampedArray,
  tolerance: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }
): PixelComparison {
  if (actual.length !== expected.length) {
    return {
      match: false,
      diffPixels: actual.length / 4,
      maxError: 255,
      differences: [],
    };
  }

  let diffPixels = 0;
  let maxError = 0;
  const differences: PixelComparison['differences'] = [];

  for (let i = 0; i < actual.length; i += 4) {
    const rDiff = Math.abs((actual[i] ?? 0) - (expected[i] ?? 0));
    const gDiff = Math.abs((actual[i + 1] ?? 0) - (expected[i + 1] ?? 0));
    const bDiff = Math.abs((actual[i + 2] ?? 0) - (expected[i + 2] ?? 0));
    const aDiff = Math.abs((actual[i + 3] ?? 0) - (expected[i + 3] ?? 0));

    const pixelError = Math.max(rDiff, gDiff, bDiff, aDiff);
    maxError = Math.max(maxError, pixelError);

    if (rDiff > tolerance.r || gDiff > tolerance.g || bDiff > tolerance.b || aDiff > tolerance.a) {
      diffPixels++;
      if (differences.length < 10) {
        differences.push({
          index: i / 4,
          expected: [
            expected[i] ?? 0,
            expected[i + 1] ?? 0,
            expected[i + 2] ?? 0,
            expected[i + 3] ?? 0,
          ],
          actual: [actual[i] ?? 0, actual[i + 1] ?? 0, actual[i + 2] ?? 0, actual[i + 3] ?? 0],
        });
      }
    }
  }

  return {
    match: diffPixels === 0,
    diffPixels,
    maxError,
    differences,
  };
}
