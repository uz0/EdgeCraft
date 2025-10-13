/**
 * Map Preview Extractor - Extracts or generates map preview images
 *
 * Tries to extract embedded preview from map file first,
 * falls back to MapPreviewGenerator if not found.
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { StormJSAdapter } from '../../formats/mpq/StormJSAdapter';
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
    console.log(`[MapPreviewExtractor] extract() called for: ${file.name}`);

    try {
      // Skip embedded extraction if forced generation
      if (!options?.forceGenerate) {
        // Try extracting embedded preview
        console.log(`[MapPreviewExtractor] Trying embedded extraction for: ${file.name}`);
        const embeddedResult = await this.extractEmbedded(file, mapData.format);

        if (embeddedResult.success && embeddedResult.dataUrl) {
          console.log(
            `[MapPreviewExtractor] ✅ Embedded extraction SUCCESS for: ${file.name}, dataUrl length: ${embeddedResult.dataUrl.length}`
          );
          return {
            ...embeddedResult,
            source: 'embedded',
            extractTimeMs: performance.now() - startTime,
          };
        }
        console.log(`[MapPreviewExtractor] Embedded extraction failed: ${embeddedResult.error}`);
      }

      // Fallback: Generate preview from map data
      console.log(`[MapPreviewExtractor] Generating preview for: ${file.name}`);
      const generatedResult = await this.previewGenerator.generatePreview(mapData, {
        width: options?.width,
        height: options?.height,
      });

      if (generatedResult.success && generatedResult.dataUrl) {
        console.log(
          `[MapPreviewExtractor] ✅ Generation SUCCESS for: ${file.name}, dataUrl length: ${generatedResult.dataUrl.length}, first 50 chars: ${generatedResult.dataUrl.substring(0, 50)}`
        );
        return {
          success: true,
          dataUrl: generatedResult.dataUrl,
          source: 'generated',
          extractTimeMs: performance.now() - startTime,
        };
      }

      console.log(
        `[MapPreviewExtractor] ❌ Generation FAILED for: ${file.name}, error: ${generatedResult.error}`
      );
      return {
        success: false,
        source: 'error',
        error: 'Failed to extract or generate preview',
        extractTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MapPreviewExtractor] ❌ EXCEPTION for: ${file.name}, error:`, errorMsg);
      return {
        success: false,
        source: 'error',
        error: errorMsg,
        extractTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * Extract embedded preview from map archive
   *
   * Tries MPQParser first, falls back to StormJS (WASM) if Huffman errors occur
   */
  private async extractEmbedded(
    file: File,
    format: 'w3x' | 'w3m' | 'w3n' | 'scm' | 'scx' | 'sc2map'
  ): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    const buffer = await file.arrayBuffer();

    // Determine preview file names based on format
    const previewFiles =
      format === 'sc2map'
        ? MapPreviewExtractor.SC2_PREVIEW_FILES
        : MapPreviewExtractor.W3X_PREVIEW_FILES;

    // Try MPQParser first (faster, pure TypeScript)
    try {
      console.log(`[MapPreviewExtractor] Trying MPQParser for ${file.name}...`);
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (mpqResult.success && mpqResult.archive) {
        // Try each preview file name
        for (const fileName of previewFiles) {
          const fileData = await mpqParser.extractFile(fileName);

          if (fileData) {
            console.log(`[MapPreviewExtractor] ✅ MPQParser extracted: ${fileName}`);

            // Decode TGA to data URL
            const dataUrl = this.tgaDecoder.decodeToDataURL(fileData.data);

            if (dataUrl) {
              return { success: true, dataUrl };
            }
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[MapPreviewExtractor] MPQParser failed: ${errorMsg}`);

      // Check if this is a decompression error (Huffman, ZLIB, PKZIP, etc.)
      const isDecompressionError =
        errorMsg.includes('Huffman') ||
        errorMsg.includes('Invalid distance') ||
        errorMsg.includes('ZLIB') ||
        errorMsg.includes('PKZIP') ||
        errorMsg.includes('decompression') ||
        errorMsg.includes('unknown compression method') ||
        errorMsg.includes('incorrect header check');

      if (isDecompressionError) {
        console.log(
          `[MapPreviewExtractor] Detected decompression error, falling back to StormJS (WASM)...`
        );

        // Try StormJS adapter as fallback
        try {
          const isStormJSAvailable = await StormJSAdapter.isAvailable();

          if (isStormJSAvailable) {
            for (const fileName of previewFiles) {
              const result = await StormJSAdapter.extractFile(buffer, fileName);

              if (result.success && result.data) {
                console.log(`[MapPreviewExtractor] ✅ StormJS extracted: ${fileName}`);

                // Decode TGA to data URL
                const dataUrl = this.tgaDecoder.decodeToDataURL(result.data);

                if (dataUrl) {
                  return { success: true, dataUrl };
                }
              }
            }
          } else {
            console.warn('[MapPreviewExtractor] StormJS not available');
          }
        } catch (stormError) {
          console.error(
            '[MapPreviewExtractor] StormJS fallback failed:',
            stormError instanceof Error ? stormError.message : String(stormError)
          );
        }
      }
    }

    return {
      success: false,
      error: 'No preview files found or extraction failed',
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.previewGenerator.disposeEngine();
  }
}
