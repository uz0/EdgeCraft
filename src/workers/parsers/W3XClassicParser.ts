/**
 * W3X Classic Map Parser (Worker Context)
 *
 * Parses Warcraft 3 Classic (.w3x) maps in worker thread.
 * Extracts embedded preview images OR generates terrain previews.
 *
 * This runs in a Web Worker, so no DOM access!
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from '../../engine/rendering/TGADecoder';
import { BLPDecoder } from '../../engine/rendering/BLPDecoder';
import { W3XMapLoader } from '../../formats/maps/w3x/W3XMapLoader';

export interface PreviewResult {
  dataUrl: string;
  source: 'embedded' | 'generated';
}

type ProgressCallback = (
  progress: number,
  stage: 'parsing' | 'extracting' | 'generating' | 'encoding',
  message: string
) => void;

/**
 * W3X Classic Map Parser
 */
export class W3XClassicParser {
  /**
   * Parse W3X map and extract/generate preview
   */
  public async parse(mapBuffer: ArrayBuffer, onProgress: ProgressCallback): Promise<PreviewResult> {
    try {
      // Stage 1: Parsing MPQ archive (0-25%)
      onProgress(0, 'parsing', 'Parsing MPQ archive...');
      const mpqParser = new MPQParser(mapBuffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        throw new Error(`Failed to parse MPQ: ${mpqResult.error}`);
      }

      onProgress(25, 'parsing', 'MPQ archive parsed');

      // Stage 2: Extract embedded preview (25-50%)
      onProgress(25, 'extracting', 'Searching for embedded preview...');
      const embeddedPreview = await this.extractEmbeddedPreview(mpqParser, mapBuffer, onProgress);

      if (embeddedPreview) {
        onProgress(100, 'encoding', 'Embedded preview extracted');
        return {
          dataUrl: embeddedPreview,
          source: 'embedded',
        };
      }

      // Stage 3: Generate terrain preview (50-100%)
      onProgress(50, 'generating', 'No embedded preview, generating terrain...');
      const generatedPreview = await this.generateTerrainPreview(mapBuffer, onProgress);

      return {
        dataUrl: generatedPreview,
        source: 'generated',
      };
    } catch (error) {
      // eslint-disable-line no-empty
      throw new Error(
        `W3X parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract embedded preview image from MPQ
   */
  private async extractEmbeddedPreview(
    mpqParser: MPQParser,
    mapBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string | null> {
    const previewFiles = [
      'war3mapPreview.tga',
      'war3mapMap.tga',
      'war3mapPreview.blp',
      'war3mapMap.blp',
    ];

    console.log('[W3XClassicParser] 🔍 Attempting to extract embedded preview...');

    for (const fileName of previewFiles) {
      try {
        onProgress(30, 'extracting', `Trying ${fileName}...`);
        console.log(`[W3XClassicParser] 📄 Trying: ${fileName}`);

        // Use MPQParser (pure JavaScript, no WASM)
        const fileData = await mpqParser.extractFile(fileName);

        if (!fileData) {
          console.log(`[W3XClassicParser] ⚠️ ${fileName} not found in archive`);
          continue;
        }

        console.log(
          `[W3XClassicParser] ✅ ${fileName} extracted: ${fileData.data.byteLength} bytes`
        );

        // Decode TGA
        if (fileName.endsWith('.tga')) {
          onProgress(40, 'extracting', `Decoding TGA: ${fileName}...`);
          console.log(`[W3XClassicParser] 🎨 Decoding TGA: ${fileName}...`);
          const decoder = new TGADecoder();
          const dataUrl = await decoder.decodeToDataURL(fileData.data);

          console.log(
            `[W3XClassicParser] TGA decode result: ${dataUrl ? `SUCCESS (${dataUrl.length} chars)` : 'FAILED (null)'}`
          );

          if (dataUrl) {
            console.log(`[W3XClassicParser] 🎉 Returning TGA preview!`);
            return dataUrl;
          }
        }

        // Decode BLP
        if (fileName.endsWith('.blp')) {
          onProgress(40, 'extracting', `Decoding BLP: ${fileName}...`);
          console.log(`[W3XClassicParser] 🎨 Decoding BLP: ${fileName}...`);
          const decoder = new BLPDecoder();
          const dataUrl = decoder.decodeToDataURL(fileData.data);

          console.log(
            `[W3XClassicParser] BLP decode result: ${dataUrl ? `SUCCESS (${dataUrl.length} chars)` : 'FAILED (null)'}`
          );

          if (dataUrl) {
            console.log(`[W3XClassicParser] 🎉 Returning BLP preview!`);
            return dataUrl;
          }
        }
      } catch (error) {
        // eslint-disable-line no-empty
        // Log error and continue to next preview file
        console.error(`[W3XClassicParser] ❌ Error extracting ${fileName}:`, error);
        continue;
      }
    }

    console.log('[W3XClassicParser] ⚠️ No embedded preview found, will generate terrain preview');
    return null; // No embedded preview found
  }

  /**
   * Generate terrain preview using map data
   *
   * NOTE: This is a simplified version since we can't use Babylon.js in workers.
   * We'll create a fallback placeholder image with map info.
   */
  private async generateTerrainPreview(
    mapBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string> {
    onProgress(60, 'generating', 'Parsing map data...');

    try {
      // Parse map using W3XMapLoader
      const loader = new W3XMapLoader();
      const mapData = await loader.parse(mapBuffer);

      onProgress(80, 'generating', 'Creating preview image...');

      // Create canvas for rendering (OffscreenCanvas in worker!)
      const canvas = new OffscreenCanvas(512, 512);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Render actual terrain preview from heightmap
      this.renderTerrainToCanvas(ctx, mapData.terrain, 512, 512);

      // Add map name overlay (subtle)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 470, 512, 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mapData.info.name || 'Warcraft 3 Map', 256, 495);

      ctx.font = '14px sans-serif';
      ctx.fillText(
        `${mapData.terrain.width}×${mapData.terrain.height} • ${mapData.info.players.length} players`,
        256,
        512 - 8
      );

      onProgress(90, 'encoding', 'Converting to data URL...');

      // Convert to blob then data URL
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const dataUrl = await this.blobToDataUrl(blob);

      return dataUrl;
    } catch (error) {
      // eslint-disable-line no-empty
      // If terrain generation fails, create a simple placeholder
      return this.createPlaceholder('W3X Classic', onProgress);
    }
  }

  /**
   * Create simple placeholder image
   */
  private async createPlaceholder(format: string, onProgress: ProgressCallback): Promise<string> {
    onProgress(90, 'generating', 'Creating placeholder...');

    const canvas = new OffscreenCanvas(512, 512);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Blue background
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, 512, 512);

    // White text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(format, 256, 256);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const dataUrl = await this.blobToDataUrl(blob);

    return dataUrl;
  }

  /**
   * Render terrain heightmap to canvas as a top-down preview
   */
  private renderTerrainToCanvas(
    ctx: OffscreenCanvasRenderingContext2D,
    terrain: {
      width: number;
      height: number;
      heightmap: Float32Array;
      textures?: Array<{ id: string }>;
    },
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const { width, height, heightmap } = terrain;

    // Create ImageData for direct pixel manipulation
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const pixels = imageData.data;

    // Find min/max height for normalization
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    for (let i = 0; i < heightmap.length; i++) {
      const h = heightmap[i] ?? 0;
      if (h < minHeight) minHeight = h;
      if (h > maxHeight) maxHeight = h;
    }
    const heightRange = maxHeight - minHeight || 1;

    // Base terrain color (grass green)
    const baseR = 74;
    const baseG = 124;
    const baseB = 89;

    // Render each pixel
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        // Map canvas pixel to terrain coordinate
        const terrainX = Math.floor((x / canvasWidth) * width);
        const terrainY = Math.floor((y / canvasHeight) * height);
        const terrainIndex = terrainY * width + terrainX;

        // Get height value (normalized 0-1)
        const heightValue = heightmap[terrainIndex] ?? 0;
        const normalizedHeight = (heightValue - minHeight) / heightRange;

        // Calculate shading based on height (hillshading effect)
        // Lower areas darker, higher areas lighter
        const shadeFactor = 0.5 + normalizedHeight * 0.5; // 0.5 to 1.0

        // Apply height-based shading to base color
        const r = Math.floor(baseR * shadeFactor);
        const g = Math.floor(baseG * shadeFactor);
        const b = Math.floor(baseB * shadeFactor);

        // Set pixel (RGBA)
        const pixelIndex = (y * canvasWidth + x) * 4;
        pixels[pixelIndex] = r;
        pixels[pixelIndex + 1] = g;
        pixels[pixelIndex + 2] = b;
        pixels[pixelIndex + 3] = 255; // Alpha
      }
    }

    // Draw to canvas
    ctx.putImageData(imageData, 0, 0);

    // Optional: Add subtle grid lines for scale
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 64;
    for (let x = 0; x < canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  /**
   * Convert Blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
