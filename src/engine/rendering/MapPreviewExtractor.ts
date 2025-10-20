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
    console.log(`[MapPreviewExtractor] Scanning block table for TGA files...`);

    const archive = parser['archive']; // Access private property
    if (!archive?.blockTable) {
      console.log(`[MapPreviewExtractor] No block table available`);
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

    console.log(`[MapPreviewExtractor] Found ${candidates.length} candidate blocks for TGA files`);

    // Check each candidate
    for (const { block, index } of candidates.slice(0, 20)) {
      // Check top 20
      try {
        console.log(
          `[MapPreviewExtractor] Checking block ${index} (${block.uncompressedSize} bytes)...`
        );

        // Extract the file by index
        const fileData = await parser.extractFileByIndex(index);
        if (!fileData) continue;

        // Check if it's a TGA file
        const header = new Uint8Array(fileData.data, 0, Math.min(18, fileData.data.byteLength));
        if (this.isTGAHeader(header)) {
          console.log(`[MapPreviewExtractor] ✅ Found TGA file at block ${index}!`);
          return fileData.data;
        }
      } catch (error) {
        console.warn(`[MapPreviewExtractor] Failed to check block ${index}:`, error);
        continue;
      }
    }

    console.log(`[MapPreviewExtractor] No TGA files found in block scan`);
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
    console.log(`[MapPreviewExtractor] extract() called for: ${file.name}`);

    try {
      // Skip embedded extraction if forced generation
      if (options?.forceGenerate !== true) {
        // Try extracting embedded preview
        console.log(`[MapPreviewExtractor] Trying embedded extraction for: ${file.name}`);
        const embeddedResult = await this.extractEmbedded(file, mapData.format);

        if (
          embeddedResult.success &&
          embeddedResult.dataUrl != null &&
          embeddedResult.dataUrl !== ''
        ) {
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

      if (
        generatedResult.success &&
        generatedResult.dataUrl != null &&
        generatedResult.dataUrl !== ''
      ) {
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
    console.log(
      `[MapPreviewExtractor] 🔍 extractEmbedded START: file="${file.name}", format="${format}"`
    );

    const buffer = await file.arrayBuffer();
    console.log(`[MapPreviewExtractor] Buffer loaded: ${buffer.byteLength} bytes for ${file.name}`);

    // Special handling for W3N campaigns (nested archives)
    console.log(`[MapPreviewExtractor] Format check: "${format}" === "w3n" is ${format === 'w3n'}`);

    if (format === 'w3n') {
      console.log(`[MapPreviewExtractor] 🎯 W3N CAMPAIGN DETECTED: ${file.name}`);
      console.log(`[MapPreviewExtractor] W3N buffer size: ${buffer.byteLength} bytes`);

      try {
        console.log(`[MapPreviewExtractor] W3N: Creating MPQParser...`);
        const mpqParser = new MPQParser(buffer);

        console.log(`[MapPreviewExtractor] W3N: Parsing MPQ archive...`);
        const mpqResult = mpqParser.parse();

        console.log(`[MapPreviewExtractor] W3N: Parse result:`, {
          success: mpqResult.success,
          hasArchive: !!mpqResult.archive,
          error: mpqResult.error,
        });

        if (mpqResult.success && mpqResult.archive) {
          // Find embedded .w3x files in the block table
          const blockTable = mpqResult.archive.blockTable;
          console.log(`[MapPreviewExtractor] W3N has ${blockTable.length} files in block table`);

          // Log first few blocks for debugging
          console.log(
            `[MapPreviewExtractor] W3N first 5 blocks:`,
            blockTable.slice(0, 5).map((b, i) => ({
              index: i,
              compressedSize: b.compressedSize,
              uncompressedSize: b.uncompressedSize,
              flags: `0x${b.flags.toString(16)}`,
            }))
          );

          // Try to extract files that might be W3X maps
          // W3N campaigns typically have files at specific positions
          // We'll try the largest files (likely to be W3X maps)
          const largeFiles = blockTable
            .map((block, index) => ({ block, index }))
            .filter(({ block }) => block.compressedSize > 100000) // W3X maps are at least 100KB compressed
            .sort((a, b) => b.block.compressedSize - a.block.compressedSize);

          console.log(`[MapPreviewExtractor] W3N found ${largeFiles.length} large files (>100KB)`);
          console.log(
            `[MapPreviewExtractor] W3N top 5 large files:`,
            largeFiles.slice(0, 5).map(({ block, index }) => ({
              index,
              compressedSize: block.compressedSize,
              uncompressedSize: block.uncompressedSize,
            }))
          );

          for (const { index } of largeFiles.slice(0, 5)) {
            // Try first 5 large files
            console.log(`[MapPreviewExtractor] W3N: Trying to extract block ${index}...`);

            try {
              // Extract by block index (we don't know the filename)
              console.log(`[MapPreviewExtractor] W3N: Calling extractFileByIndex(${index})...`);
              const blockData = await mpqParser.extractFileByIndex(index);

              if (!blockData) {
                console.log(`[MapPreviewExtractor] W3N: Block ${index} returned null, skipping`);
                continue;
              }

              console.log(
                `[MapPreviewExtractor] W3N: Extracted block ${index}: ${blockData.data.byteLength} bytes`
              );

              // Check if it's a valid MPQ (W3X) by looking for MPQ magic
              const view = new DataView(blockData.data);
              const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
              const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;
              const magic1024 = view.byteLength >= 1028 ? view.getUint32(1024, true) : 0;

              console.log(`[MapPreviewExtractor] W3N: Block ${index} magic numbers:`, {
                '@0': `0x${magic0.toString(16)}`,
                '@512': `0x${magic512.toString(16)}`,
                '@1024': `0x${magic1024.toString(16)}`,
              });

              const hasMPQMagic =
                magic0 === 0x1a51504d || // 'MPQ\x1A'
                magic512 === 0x1a51504d || // Offset 512
                magic1024 === 0x1a51504d; // Offset 1024

              if (hasMPQMagic) {
                console.log(`[MapPreviewExtractor] W3N: ✅ Found embedded W3X at block ${index}!`);

                // Parse the nested W3X archive
                console.log(`[MapPreviewExtractor] W3N: Parsing nested W3X...`);
                const nestedParser = new MPQParser(blockData.data);
                const nestedResult = nestedParser.parse();

                console.log(`[MapPreviewExtractor] W3N: Nested parse result:`, {
                  success: nestedResult.success,
                  error: nestedResult.error,
                  fileCount: nestedResult.archive?.blockTable.length,
                });

                if (nestedResult.success) {
                  // Try to extract preview from nested W3X
                  console.log(
                    `[MapPreviewExtractor] W3N: Looking for preview files in nested W3X...`
                  );

                  // First try filename-based extraction
                  let tgaData: ArrayBuffer | null = null;
                  for (const fileName of MapPreviewExtractor.W3X_PREVIEW_FILES) {
                    console.log(`[MapPreviewExtractor] W3N: Trying to extract ${fileName}...`);
                    const previewData = await nestedParser.extractFile(fileName);

                    if (previewData) {
                      console.log(
                        `[MapPreviewExtractor] W3N: ✅ Extracted ${fileName} (${previewData.data.byteLength} bytes)`
                      );
                      tgaData = previewData.data;
                      break;
                    } else {
                      console.log(`[MapPreviewExtractor] W3N: ${fileName} not found in nested W3X`);
                    }
                  }

                  // If filename-based extraction failed, try block scanning
                  if (!tgaData) {
                    console.log(
                      `[MapPreviewExtractor] W3N: Filename-based extraction failed, trying block scan...`
                    );
                    tgaData = await this.findTGAByBlockScan(nestedParser);
                  }

                  // If we found TGA data, try to decode it
                  if (tgaData != null) {
                    console.log(`[MapPreviewExtractor] W3N: Decoding TGA...`);
                    const dataUrl = this.tgaDecoder.decodeToDataURL(tgaData);

                    if (dataUrl != null && dataUrl !== '') {
                      console.log(
                        `[MapPreviewExtractor] W3N: ✅ Successfully decoded TGA to data URL!`
                      );
                      return { success: true, dataUrl };
                    } else {
                      console.log(`[MapPreviewExtractor] W3N: ❌ TGA decode returned null`);
                    }
                  } else {
                    console.log(
                      `[MapPreviewExtractor] W3N: ❌ No preview files found in nested W3X block ${index}`
                    );
                  }
                }
              } else {
                console.log(`[MapPreviewExtractor] W3N: Block ${index} is not an MPQ archive`);
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

          console.log(
            `[MapPreviewExtractor] W3N: ❌ No valid W3X preview found after checking ${largeFiles.length} files`
          );
        } else {
          console.log(`[MapPreviewExtractor] W3N: ❌ MPQ parse failed or no archive`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[MapPreviewExtractor] W3N extraction failed:`, errorMsg);
        // Fall through to generation fallback
      }

      // If we couldn't extract from W3N, return error (generation fallback will be used by caller)
      console.log(`[MapPreviewExtractor] W3N: Returning failure, will try generation fallback`);
      return { success: false, error: 'Failed to extract preview from W3N campaign' };
    }

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
        let tgaData: ArrayBuffer | null = null;
        for (const fileName of previewFiles) {
          const fileData = await mpqParser.extractFile(fileName);

          if (fileData) {
            console.log(`[MapPreviewExtractor] ✅ MPQParser extracted: ${fileName}`);
            tgaData = fileData.data;
            break;
          }
        }

        // If filename-based extraction failed, try block scanning
        if (!tgaData && format !== 'sc2map') {
          // Only for W3X maps (SC2 maps have more reliable listfiles)
          console.log(
            `[MapPreviewExtractor] Filename-based extraction failed, trying block scan...`
          );
          tgaData = await this.findTGAByBlockScan(mpqParser);
        }

        // If we found TGA data, decode it
        if (tgaData != null) {
          const dataUrl = this.tgaDecoder.decodeToDataURL(tgaData);
          if (dataUrl != null && dataUrl !== '') {
            return { success: true, dataUrl };
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[MapPreviewExtractor] MPQParser failed: ${errorMsg}`);
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
