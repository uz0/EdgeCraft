/**
 * SC2 Map Parser (Worker Context)
 *
 * Parses StarCraft 2 (.SC2Map) maps in worker thread.
 * Extracts embedded preview images OR generates terrain previews.
 *
 * This runs in a Web Worker, so no DOM access!
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from '../../engine/rendering/TGADecoder';
import { SC2MapLoader } from '../../formats/maps/sc2/SC2MapLoader';

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
 * SC2 Map Parser
 */
export class SC2MapParser {
  /**
   * Parse SC2 map and extract/generate preview
   */
  public async parse(mapBuffer: ArrayBuffer, onProgress: ProgressCallback): Promise<PreviewResult> {
    try {
      // Stage 1: Parsing MPQ archive (0-25%)
      onProgress(0, 'parsing', 'Parsing SC2 archive...');
      const mpqParser = new MPQParser(mapBuffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        throw new Error(`Failed to parse MPQ: ${mpqResult.error}`);
      }

      onProgress(25, 'parsing', 'SC2 archive parsed');

      // Stage 2: Extract embedded preview (25-50%)
      onProgress(25, 'extracting', 'Searching for SC2 preview...');
      const embeddedPreview = await this.extractEmbeddedPreview(mpqParser, onProgress);

      if (embeddedPreview !== null && embeddedPreview !== '') {
        onProgress(100, 'encoding', 'SC2 preview extracted');
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
      throw new Error(
        `SC2 parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract embedded preview image from MPQ
   *
   * SC2 maps use:
   * - PreviewImage.tga (primary)
   * - Minimap.tga (fallback)
   *
   * CRITICAL: SC2 previews MUST be square (width === height)
   */
  private async extractEmbeddedPreview(
    mpqParser: MPQParser,
    onProgress: ProgressCallback
  ): Promise<string | null> {
    const previewFiles = ['PreviewImage.tga', 'Minimap.tga'];

    for (const fileName of previewFiles) {
      try {
        onProgress(30, 'extracting', `Trying ${fileName}...`);

        const fileData = await mpqParser.extractFile(fileName);
        if (!fileData) {
          continue; // File not found, try next
        }

        // Decode TGA
        onProgress(40, 'extracting', `Decoding TGA: ${fileName}...`);
        const decoder = new TGADecoder();
        const dataUrl = await decoder.decodeToDataURL(fileData.data);

        if (dataUrl !== null && dataUrl !== '') {
          // Validate square requirement for SC2
          const isSquare = await this.validateSquare(dataUrl);
          if (!isSquare) {
            console.warn(`[SC2MapParser] Preview ${fileName} is not square, trying next file`);
            continue;
          }

          return dataUrl;
        }
      } catch (error) {
        // Continue to next file
        continue;
      }
    }

    return null; // No embedded preview found
  }

  /**
   * Validate that image is square (width === height)
   */
  private async validateSquare(dataUrl: string): Promise<boolean> {
    return new Promise((resolve): void => {
      const img = new Image();
      img.onload = (): void => {
        resolve(img.width === img.height);
      };
      img.onerror = (): void => resolve(false);
      img.src = dataUrl;
    });
  }

  /**
   * Generate terrain preview using map data
   */
  private async generateTerrainPreview(
    mapBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string> {
    onProgress(60, 'generating', 'Parsing SC2 map data...');

    try {
      // Parse map using SC2MapLoader
      const loader = new SC2MapLoader();
      const mapData = await loader.parse(mapBuffer);

      onProgress(80, 'generating', 'Creating SC2 preview...');

      // Create canvas for rendering (OffscreenCanvas in worker!)
      const canvas = new OffscreenCanvas(512, 512);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw SC2-themed fallback preview
      // Background gradient (space-like)
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
      gradient.addColorStop(0, '#1a1a2e'); // Dark blue center
      gradient.addColorStop(1, '#0f0f1e'); // Almost black edges
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add map info text
      ctx.fillStyle = '#00d4ff'; // Cyan (SC2 theme)
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mapData.info.name || 'StarCraft 2 Map', 256, 256);

      ctx.font = '18px sans-serif';
      ctx.fillText(`${mapData.terrain.width}×${mapData.terrain.height}`, 256, 290);

      ctx.fillText(`${mapData.info.players.length} players`, 256, 320);

      // Add "SC2" label
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.fillText('SC2', 256, 450);

      onProgress(90, 'encoding', 'Converting to data URL...');

      // Convert to blob then data URL
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const dataUrl = await this.blobToDataUrl(blob);

      return dataUrl;
    } catch (error) {
      // If terrain generation fails, create a simple placeholder
      return this.createPlaceholder('SC2', onProgress);
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

    // Dark blue background (SC2 theme)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 512);

    // Cyan text
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(format, 256, 256);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const dataUrl = await this.blobToDataUrl(blob);

    return dataUrl;
  }

  /**
   * Convert Blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject): void => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
