/**
 * Map Preview Extractor - Extracts or generates map preview images
 *
 * Tries to extract embedded preview from map file first,
 * falls back to MapPreviewGenerator if not found.
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from './TGADecoder';
import { MapPreviewGenerator } from './MapPreviewGenerator';
import type { RawMapData } from '../../formats/maps/types';

export interface ExtractOptions {
  /** Preferred preview size */
  width?: number;
  height?: number;

  /** Force regeneration (ignore embedded preview) */
  forceGenerate?: boolean;
}

export interface ExtractResult {
  success: boolean;
  dataUrl?: string;
  source: 'embedded' | 'generated' | 'error';
  error?: string;
  extractTimeMs: number;
}

/**
 * Extract or generate map preview images
 *
 * Tries to extract embedded preview from map file first,
 * falls back to MapPreviewGenerator if not found.
 */
export class MapPreviewExtractor {
  private tgaDecoder: TGADecoder;
  private previewGenerator: MapPreviewGenerator;

  // Known preview file names by format
  private static readonly W3X_PREVIEW_FILES = [
    'war3mapPreview.tga',
    'war3mapMap.tga',
    'war3mapMap.blp', // Future: BLP support
  ];

  private static readonly SC2_PREVIEW_FILES = ['PreviewImage.tga', 'Minimap.tga'];

  constructor() {
    this.tgaDecoder = new TGADecoder();
    this.previewGenerator = new MapPreviewGenerator();
  }

  /**
   * Extract or generate preview for a map
   *
   * @param file - Map file (W3X/W3N/SC2Map)
   * @param mapData - Parsed map data (for fallback generation)
   * @param options - Extraction options
   */
  public async extract(
    file: File,
    mapData: RawMapData,
    options?: ExtractOptions
  ): Promise<ExtractResult> {
    const startTime = performance.now();

    try {
      // Skip embedded extraction if forced generation
      if (!options?.forceGenerate) {
        // Try extracting embedded preview
        const embeddedResult = await this.extractEmbedded(file, mapData.format);

        if (embeddedResult.success && embeddedResult.dataUrl) {
          return {
            ...embeddedResult,
            source: 'embedded',
            extractTimeMs: performance.now() - startTime,
          };
        }
      }

      // Fallback: Generate preview from map data
      console.log(`No embedded preview found for ${file.name}, generating...`);
      const generatedResult = await this.previewGenerator.generatePreview(mapData, {
        width: options?.width,
        height: options?.height,
      });

      if (generatedResult.success && generatedResult.dataUrl) {
        return {
          success: true,
          dataUrl: generatedResult.dataUrl,
          source: 'generated',
          extractTimeMs: performance.now() - startTime,
        };
      }

      return {
        success: false,
        source: 'error',
        error: 'Failed to extract or generate preview',
        extractTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        extractTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Extract embedded preview from map archive
   */
  private async extractEmbedded(
    file: File,
    format: 'w3x' | 'w3m' | 'w3n' | 'scm' | 'scx' | 'sc2map'
  ): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    try {
      // Parse MPQ archive
      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        return { success: false, error: 'Failed to parse MPQ archive' };
      }

      // Determine preview file names based on format
      const previewFiles =
        format === 'sc2map'
          ? MapPreviewExtractor.SC2_PREVIEW_FILES
          : MapPreviewExtractor.W3X_PREVIEW_FILES;

      // Try each preview file name
      for (const fileName of previewFiles) {
        const fileData = await mpqParser.extractFile(fileName);

        if (fileData) {
          console.log(`Found embedded preview: ${fileName}`);

          // Decode TGA to data URL
          const dataUrl = this.tgaDecoder.decodeToDataURL(fileData.data);

          if (dataUrl) {
            return { success: true, dataUrl };
          }
        }
      }

      return { success: false, error: 'No preview files found in archive' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.previewGenerator.disposeEngine();
  }
}
