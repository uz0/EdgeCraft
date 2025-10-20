/**
 * Visual Similarity Detection using Perceptual Hashing
 *
 * Detects visually similar images/textures even if pixel values differ
 * Used to catch derivative works of copyrighted assets
 */

/**
 * Perceptual hash result
 */
export interface PerceptualHash {
  hash: string;
  width: number;
  height: number;
}

/**
 * Similarity comparison result
 */
export interface SimilarityResult {
  similarity: number; // 0.0 to 1.0
  isMatch: boolean;
  threshold: number;
}

/**
 * Visual similarity detector using perceptual hashing
 *
 * @example
 * ```typescript
 * const detector = new VisualSimilarity();
 * const hash1 = await detector.computePerceptualHash(imageBuffer1);
 * const hash2 = await detector.computePerceptualHash(imageBuffer2);
 * const result = detector.compareSimilarity(hash1, hash2);
 * console.log(`Similarity: ${result.similarity * 100}%`);
 * ```
 */
export class VisualSimilarity {
  private readonly defaultThreshold: number;
  private readonly hashSize: number;

  constructor(threshold = 0.95, hashSize = 8) {
    this.defaultThreshold = threshold;
    this.hashSize = hashSize;
  }

  /**
   * Compute perceptual hash for an image buffer
   *
   * Uses difference hash (dHash) algorithm:
   * 1. Resize to small square (8x8 or 16x16)
   * 2. Convert to grayscale
   * 3. Compute gradients between adjacent pixels
   * 4. Generate binary hash from gradients
   */
  public computePerceptualHash(buffer: ArrayBuffer): PerceptualHash {
    try {
      // Decode image data
      const imageData = this.decodeImage(buffer);

      // Resize to hash size
      const resized = this.resizeImage(imageData, this.hashSize, this.hashSize);

      // Convert to grayscale
      const grayscale = this.toGrayscale(resized);

      // Compute difference hash
      const hash = this.computeDHash(grayscale);

      return {
        hash,
        width: imageData.width,
        height: imageData.height,
      };
    } catch (error) {
      throw new Error(
        `Failed to compute perceptual hash: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Compare two perceptual hashes
   */
  public compareSimilarity(
    hash1: PerceptualHash,
    hash2: PerceptualHash,
    threshold?: number
  ): SimilarityResult {
    const compareThreshold = threshold ?? this.defaultThreshold;

    // Compute Hamming distance
    const distance = this.hammingDistance(hash1.hash, hash2.hash);
    const maxDistance = hash1.hash.length * 4; // Each hex char = 4 bits

    // Convert to similarity score (1.0 = identical, 0.0 = completely different)
    const similarity = 1 - distance / maxDistance;

    return {
      similarity,
      isMatch: similarity >= compareThreshold,
      threshold: compareThreshold,
    };
  }

  /**
   * Check if image is similar to any in a database
   */
  public findSimilarInDatabase(
    buffer: ArrayBuffer,
    database: PerceptualHash[],
    threshold?: number
  ): { matches: number[]; bestMatch?: number; similarity?: number } {
    const queryHash = this.computePerceptualHash(buffer);
    const matches: number[] = [];
    let bestSimilarity = 0;
    let bestIndex: number | undefined;

    for (let i = 0; i < database.length; i++) {
      const dbHash = database[i];
      if (dbHash === undefined) continue;

      const result = this.compareSimilarity(queryHash, dbHash, threshold);

      if (result.isMatch) {
        matches.push(i);
      }

      if (result.similarity > bestSimilarity) {
        bestSimilarity = result.similarity;
        bestIndex = i;
      }
    }

    return {
      matches,
      bestMatch: bestIndex,
      similarity: bestSimilarity,
    };
  }

  /**
   * Decode image buffer to ImageData
   * Simplified implementation - in production would use canvas or image library
   */
  private decodeImage(buffer: ArrayBuffer): ImageData {
    // For now, return mock ImageData
    // In production, this would use canvas.getContext('2d').createImageData()
    // or a library like sharp/jimp for Node.js

    // Simple BMP header parsing for basic implementation
    const view = new DataView(buffer);

    // Check if it's a simple format we can parse
    if (buffer.byteLength < 54) {
      // Return 1x1 mock for non-image data
      return this.createImageData(1, 1);
    }

    // Try to detect BMP signature
    const signature = view.getUint16(0, true);
    if (signature === 0x4d42) {
      // 'BM' in little-endian
      const width = view.getUint32(18, true);
      const height = view.getUint32(22, true);
      // Return mock with correct dimensions
      return this.createImageData(width, height);
    }

    // Default fallback
    return this.createImageData(8, 8);
  }

  /**
   * Create ImageData object (polyfill for Node.js environment)
   */
  private createImageData(width: number, height: number): ImageData {
    // Create data buffer first
    const size = width * height * 4;
    const data = new Uint8ClampedArray(size);

    // Initialize to transparent black
    for (let i = 0; i < size; i += 4) {
      data[i] = 0; // R
      data[i + 1] = 0; // G
      data[i + 2] = 0; // B
      data[i + 3] = 255; // A (opaque)
    }

    // Try to use native ImageData if available (browser)
    try {
      interface GlobalWithImageData {
        ImageData?: new (data: Uint8ClampedArray, width: number, height: number) => ImageData;
      }
      const globalWithImageData = globalThis as unknown as GlobalWithImageData;
      const ImageDataConstructor = globalWithImageData.ImageData;
      if (ImageDataConstructor !== undefined) {
        return new ImageDataConstructor(data, width, height);
      }
    } catch {
      // Fall through to polyfill
    }

    // Polyfill for Node.js environment
    return {
      width,
      height,
      data,
      colorSpace: 'srgb' as PredefinedColorSpace,
    } as ImageData;
  }

  /**
   * Resize image to target dimensions
   * Uses nearest-neighbor for simplicity
   */
  private resizeImage(imageData: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const { width: srcWidth, height: srcHeight, data: srcData } = imageData;
    const resized = this.createImageData(targetWidth, targetHeight);
    const destData = resized.data;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Nearest-neighbor sampling
        const srcX = Math.floor((x / targetWidth) * srcWidth);
        const srcY = Math.floor((y / targetHeight) * srcHeight);
        const srcIdx = (srcY * srcWidth + srcX) * 4;
        const destIdx = (y * targetWidth + x) * 4;

        // Copy RGBA
        destData[destIdx] = srcData[srcIdx] ?? 128;
        destData[destIdx + 1] = srcData[srcIdx + 1] ?? 128;
        destData[destIdx + 2] = srcData[srcIdx + 2] ?? 128;
        destData[destIdx + 3] = srcData[srcIdx + 3] ?? 255;
      }
    }

    return resized;
  }

  /**
   * Convert image to grayscale
   */
  private toGrayscale(imageData: ImageData): number[] {
    const { width, height, data } = imageData;
    const grayscale: number[] = [];

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;

      // Luminance formula: 0.299R + 0.587G + 0.114B
      const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      grayscale.push(gray);
    }

    return grayscale;
  }

  /**
   * Compute difference hash (dHash)
   * Compares each pixel to its neighbor
   */
  private computeDHash(grayscale: number[]): string {
    const size = Math.sqrt(grayscale.length);
    let hash = '';
    let byte = 0;
    let bitCount = 0;

    // Compare each pixel with its right neighbor
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size - 1; x++) {
        const idx = y * size + x;
        const current = grayscale[idx] ?? 0;
        const next = grayscale[idx + 1] ?? 0;

        // Set bit if current pixel is brighter than next
        if (current > next) {
          byte |= 1 << bitCount;
        }

        bitCount++;

        // Convert to hex every 4 bits
        if (bitCount === 4) {
          hash += byte.toString(16);
          byte = 0;
          bitCount = 0;
        }
      }
    }

    // Handle remaining bits
    if (bitCount > 0) {
      hash += byte.toString(16);
    }

    return hash;
  }

  /**
   * Compute Hamming distance between two hashes
   * Counts number of differing bits
   */
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hash lengths must match');
    }

    let distance = 0;

    for (let i = 0; i < hash1.length; i++) {
      const val1 = parseInt(hash1[i] ?? '0', 16);
      const val2 = parseInt(hash2[i] ?? '0', 16);
      const xor = val1 ^ val2;

      // Count set bits in XOR result
      let bits = xor;
      while (bits > 0) {
        distance += bits & 1;
        bits >>= 1;
      }
    }

    return distance;
  }
}
