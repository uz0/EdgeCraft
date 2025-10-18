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
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface ExtractOptions {
  /** Preferred preview size */
  width?: number;
  height?: number;

  /** Force regeneration (ignore embedded preview) */
  forceGenerate?: boolean;

  /** Only try to extract embedded preview, skip generation (fast mode for gallery) */
  extractOnly?: boolean;
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

  private static readonly W3N_CAMPAIGN_PREVIEW_FILES = [
    'war3campaignPreview.tga',
    'war3campaignMap.tga',
  ];

  private static readonly SC2_PREVIEW_FILES = ['PreviewImage.tga', 'Minimap.tga'];

  constructor() {
    this.tgaDecoder = new TGADecoder();
    this.previewGenerator = new MapPreviewGenerator();
  }

  /**
   * Check if data looks like a valid TGA file header
   * TGA format: https://www.fileformat.info/format/tga/egff.htm
   */
  private isTGAHeader(data: Uint8Array): boolean {
    if (data.length < 18) return false; // TGA header is 18 bytes

    const idLength = data[0] ?? 0; // 0-255
    const colorMapType = data[1] ?? 0; // 0 or 1
    const imageType = data[2] ?? 0; // 1-11, commonly 2 (uncompressed) or 10 (RLE)
    const width = (data[12] ?? 0) | ((data[13] ?? 0) << 8); // little-endian
    const height = (data[14] ?? 0) | ((data[15] ?? 0) << 8); // little-endian
    const pixelDepth = data[16] ?? 0; // 24 or 32 for RGB/RGBA

    // Validate TGA header
    const isValidColorMapType = colorMapType === 0 || colorMapType === 1;
    const isValidImageType =
      imageType === 1 ||
      imageType === 2 ||
      imageType === 3 ||
      imageType === 9 ||
      imageType === 10 ||
      imageType === 11;
    const isValidDimensions = width > 0 && width <= 4096 && height > 0 && height <= 4096;
    const isValidPixelDepth = pixelDepth === 24 || pixelDepth === 32 || pixelDepth === 8;
    const isValidIdLength = idLength < 256;

    return (
      isValidColorMapType &&
      isValidImageType &&
      isValidDimensions &&
      isValidPixelDepth &&
      isValidIdLength
    );
  }

  /**
   * Find and extract TGA files by scanning block table (fallback when listfile fails)
   * Useful for W3N campaigns where nested W3X archives may have corrupted/encrypted listfiles
   */
  private async findTGAByBlockScan(parser: MPQParser): Promise<ArrayBuffer | null> {
    const archive = parser['archive']; // Access private property
    if (!archive?.blockTable) {
      return null;
    }

    // Look for files that might be TGA files (reasonable size for preview images)
    const candidates = archive.blockTable
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => {
        const exists = (block.flags & 0x80000000) !== 0;
        const size = block.uncompressedSize;
        // TGA previews are typically 50KB-2MB (128x128 to 512x512, 32-bit)
        const isReasonableSize = size > 10000 && size < 3000000;
        return exists && isReasonableSize;
      })
      .sort((a, b) => b.block.uncompressedSize - a.block.uncompressedSize); // Largest first
    // Check each candidate
    for (const { block, index } of candidates.slice(0, 20)) {
      // Check top 20
      try {
        // Extract the file by index
        const fileData = await parser.extractFileByIndex(index);
        if (!fileData) continue;

        // Check if it's a TGA file
        const header = new Uint8Array(fileData.data, 0, Math.min(18, fileData.data.byteLength));
        if (this.isTGAHeader(header)) {
          return fileData.data;
        }
      } catch (error) {
        console.warn(`[MapPreviewExtractor] Failed to check block ${index}:`, error);
        continue;
      }
    }
    return null;
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
    console.log(`[MapPreviewExtractor] 🎬 Starting extraction for: ${file.name}`);

    try {
      // Skip embedded extraction if forced generation
      if (!options?.forceGenerate) {
        // Try extracting embedded preview
        console.log(`[MapPreviewExtractor] 🔍 Attempting embedded extraction for: ${file.name}`);
        const embedStart = performance.now();
        const embeddedResult = await this.extractEmbedded(file, mapData.format);
        const embedTime = performance.now() - embedStart;
        console.log(
          `[MapPreviewExtractor] ⏱️ Embedded extraction took ${embedTime.toFixed(0)}ms for: ${file.name}`
        );

        if (embeddedResult.success && embeddedResult.dataUrl) {
          console.log(
            `[MapPreviewExtractor] ✅ Successfully extracted embedded preview for: ${file.name} (${embedTime.toFixed(0)}ms)`
          );
          return {
            ...embeddedResult,
            source: 'embedded',
            extractTimeMs: performance.now() - startTime,
          };
        }
        console.log(
          `[MapPreviewExtractor] ⚠️ No embedded preview found, falling back to generation for: ${file.name}`
        );
      }

      // If extractOnly mode, skip generation
      if (options?.extractOnly) {
        console.log(
          `[MapPreviewExtractor] ⏭️ Extract-only mode: skipping generation for: ${file.name}`
        );
        return {
          success: false,
          source: 'error',
          error: 'No embedded preview found (extract-only mode)',
          extractTimeMs: performance.now() - startTime,
        };
      }

      // Fallback: Generate preview from map data
      console.log(`[MapPreviewExtractor] 🎨 Generating preview from map data for: ${file.name}`);
      const genStart = performance.now();
      const generatedResult = await this.previewGenerator.generatePreview(mapData, {
        width: options?.width,
        height: options?.height,
      });
      const genTime = performance.now() - genStart;
      console.log(
        `[MapPreviewExtractor] ⏱️ Preview generation took ${genTime.toFixed(0)}ms for: ${file.name}`
      );

      if (generatedResult.success && generatedResult.dataUrl) {
        const totalTime = performance.now() - startTime;
        console.log(
          `[MapPreviewExtractor] ✅ Successfully generated preview for: ${file.name} (total: ${totalTime.toFixed(0)}ms)`
        );
        return {
          success: true,
          dataUrl: generatedResult.dataUrl,
          source: 'generated',
          extractTimeMs: totalTime,
        };
      }
      console.error(`[MapPreviewExtractor] ❌ Failed to generate preview for: ${file.name}`);
      return {
        success: false,
        source: 'error',
        error: 'Failed to extract or generate preview',
        extractTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const totalTime = performance.now() - startTime;
      console.error(
        `[MapPreviewExtractor] ❌ EXCEPTION for: ${file.name} after ${totalTime.toFixed(0)}ms, error:`,
        errorMsg
      );
      return {
        success: false,
        source: 'error',
        error: errorMsg,
        extractTimeMs: totalTime,
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
    // Special handling for W3N campaigns (nested archives)
    if (format === 'w3n') {
      try {
        const mpqParser = new MPQParser(buffer);
        const mpqResult = mpqParser.parse();
        if (mpqResult.success && mpqResult.archive) {
          // FIRST: Try to extract campaign preview from OUTER W3N archive
          console.log(
            `[MapPreviewExtractor] 🔍 Checking outer W3N archive for campaign preview...`
          );
          for (const fileName of MapPreviewExtractor.W3N_CAMPAIGN_PREVIEW_FILES) {
            const previewData = await mpqParser.extractFile(fileName);
            if (previewData) {
              const dataUrl = this.tgaDecoder.decodeToDataURL(previewData.data);
              if (dataUrl) {
                console.log(
                  `[MapPreviewExtractor] ✅ Found campaign preview in outer archive: ${fileName}`
                );
                return { success: true, dataUrl };
              }
            }
          }
          console.log(
            `[MapPreviewExtractor] ⚠️ No campaign preview in outer archive, checking nested W3X maps...`
          );

          // SECOND: Find embedded .w3x files in the block table
          const blockTable = mpqResult.archive.blockTable;
          // Log first few blocks for debugging
          // Try to extract files that might be W3X maps
          // W3N campaigns typically have files at specific positions
          // We'll try the largest files (likely to be W3X maps)
          const largeFiles = blockTable
            .map((block, index) => ({ block, index }))
            .filter(({ block }) => block.compressedSize > 100000) // W3X maps are at least 100KB compressed
            .sort((a, b) => b.block.compressedSize - a.block.compressedSize);
          for (const { index } of largeFiles.slice(0, 5)) {
            // Try first 5 large files
            try {
              // Extract by block index (we don't know the filename)
              const blockData = await mpqParser.extractFileByIndex(index);

              if (!blockData) {
                continue;
              }
              // Check if it's a valid MPQ (W3X) by looking for MPQ magic
              const view = new DataView(blockData.data);
              const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
              const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;
              const magic1024 = view.byteLength >= 1028 ? view.getUint32(1024, true) : 0;
              const hasMPQMagic =
                magic0 === 0x1a51504d || // 'MPQ\x1A'
                magic512 === 0x1a51504d || // Offset 512
                magic1024 === 0x1a51504d; // Offset 1024

              if (hasMPQMagic) {
                // Parse the nested W3X archive
                const nestedParser = new MPQParser(blockData.data);
                const nestedResult = nestedParser.parse();
                if (nestedResult.success) {
                  // Try to extract preview from nested W3X
                  // First try filename-based extraction
                  let tgaData: ArrayBuffer | null = null;
                  for (const fileName of MapPreviewExtractor.W3X_PREVIEW_FILES) {
                    const previewData = await nestedParser.extractFile(fileName);

                    if (previewData) {
                      tgaData = previewData.data;
                      break;
                    } else {
                    }
                  }

                  // If filename-based extraction failed, try block scanning
                  if (!tgaData) {
                    tgaData = await this.findTGAByBlockScan(nestedParser);
                  }

                  // If we found TGA data, try to decode it
                  if (tgaData) {
                    const dataUrl = this.tgaDecoder.decodeToDataURL(tgaData);

                    if (dataUrl) {
                      return { success: true, dataUrl };
                    } else {
                    }
                  } else {
                  }
                }
              } else {
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(
                `[MapPreviewExtractor] W3N: ❌ Failed to extract block ${index}:`,
                errorMsg
              );
              // Continue to next file
            }
          }
        } else {
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[MapPreviewExtractor] W3N extraction failed:`, errorMsg);
        // Fall through to generation fallback
      }

      // If we couldn't extract from W3N, return error (generation fallback will be used by caller)
      return { success: false, error: 'Failed to extract preview from W3N campaign' };
    }

    // Determine preview file names based on format
    const previewFiles =
      format === 'sc2map'
        ? MapPreviewExtractor.SC2_PREVIEW_FILES
        : MapPreviewExtractor.W3X_PREVIEW_FILES;

    // Try MPQParser first (faster, pure TypeScript)
    try {
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (mpqResult.success && mpqResult.archive) {
        // Try each preview file name
        let tgaData: ArrayBuffer | null = null;
        for (const fileName of previewFiles) {
          const fileData = await mpqParser.extractFile(fileName);

          if (fileData) {
            tgaData = fileData.data;
            break;
          }
        }

        // If filename-based extraction failed, try block scanning
        if (!tgaData && format !== 'sc2map') {
          // Only for W3X maps (SC2 maps have more reliable listfiles)
          tgaData = await this.findTGAByBlockScan(mpqParser);
        }

        // If we found TGA data, decode it
        if (tgaData) {
          const dataUrl = this.tgaDecoder.decodeToDataURL(tgaData);
          if (dataUrl) {
            return { success: true, dataUrl };
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
        // Try StormJS adapter as fallback
        try {
          const isStormJSAvailable = await StormJSAdapter.isAvailable();

          if (isStormJSAvailable) {
            for (const fileName of previewFiles) {
              const result = await StormJSAdapter.extractFile(buffer, fileName);

              if (result.success && result.data) {
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
