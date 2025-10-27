/**
 * Map Preview Extractor - Extracts map preview images from MPQ archives
 *
 * Flow:
 * 1. Try to extract war3mapPreview.tga from MPQ
 * 2. Fallback to war3mapMap.tga if preview not found
 * 3. Fallback to war3mapMap.blp if TGA not found
 * 4. Fallback to war3mapMap.b00 if BLP not found
 * 5. Generate transparent placeholder if no image found
 *
 * NO generation - only extraction from MPQ + placeholder fallback
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from './TGADecoder';
import { BLPDecoder } from '../../formats/images/BLPDecoder';

export interface ExtractOptions {
  width?: number;
  height?: number;
}

export interface ExtractResult {
  success: boolean;
  dataUrl?: string;
  source:
    | 'war3mapPreview.tga'
    | 'war3mapMap.tga'
    | 'war3mapMap.blp'
    | 'war3mapMap.b00'
    | 'placeholder'
    | 'error';
  error?: string;
  extractTimeMs: number;
}

export class MapPreviewExtractor {
  private tgaDecoder: TGADecoder;
  private blpDecoder: BLPDecoder;

  private static readonly PREVIEW_FILES_PRIORITY = [
    'war3mapPreview.tga',
    'war3mapMap.tga',
    'war3mapMap.blp',
    'war3mapMap.b00',
  ];

  private static readonly SC2_PREVIEW_FILES = ['PreviewImage.tga', 'Minimap.tga'];

  constructor() {
    this.tgaDecoder = new TGADecoder();
    this.blpDecoder = new BLPDecoder();
  }

  public async extract(
    file: File,
    format: 'w3x' | 'w3m' | 'w3n' | 'scm' | 'scx' | 'sc2map',
    options?: ExtractOptions
  ): Promise<ExtractResult> {
    const startTime = performance.now();

    try {
      const buffer = await file.arrayBuffer();

      if (format === 'w3n') {
        return await this.extractFromW3N(buffer, startTime);
      }

      const previewFiles =
        format === 'sc2map'
          ? MapPreviewExtractor.SC2_PREVIEW_FILES
          : MapPreviewExtractor.PREVIEW_FILES_PRIORITY;

      const result = await this.extractFromMPQ(buffer, previewFiles, startTime);

      if (result.success) {
        return result;
      }

      return this.generatePlaceholder(options?.width ?? 256, options?.height ?? 256, startTime);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        source: 'error',
        error: errorMsg,
        extractTimeMs: performance.now() - startTime,
      };
    }
  }

  private async extractFromW3N(buffer: ArrayBuffer, startTime: number): Promise<ExtractResult> {
    try {
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        return this.generatePlaceholder(256, 256, startTime);
      }

      const blockTable = mpqResult.archive.blockTable;

      const largeFiles = blockTable
        .map((block, index) => ({ block, index }))
        .filter(({ block }) => block.compressedSize > 100000)
        .sort((a, b) => b.block.compressedSize - a.block.compressedSize);

      for (const { index } of largeFiles.slice(0, 5)) {
        try {
          const blockData = await mpqParser.extractFileByIndex(index);
          if (!blockData) continue;

          const view = new DataView(blockData.data);
          const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
          const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;
          const magic1024 = view.byteLength >= 1028 ? view.getUint32(1024, true) : 0;

          const hasMPQMagic =
            magic0 === 0x1a51504d || magic512 === 0x1a51504d || magic1024 === 0x1a51504d;

          if (hasMPQMagic) {
            const nestedParser = new MPQParser(blockData.data);
            const nestedResult = nestedParser.parse();

            if (nestedResult.success) {
              const extractResult = await this.extractFromMPQ(
                blockData.data,
                MapPreviewExtractor.PREVIEW_FILES_PRIORITY,
                startTime
              );

              if (extractResult.success) {
                return extractResult;
              }
            }
          }
        } catch {
          continue;
        }
      }

      return this.generatePlaceholder(256, 256, startTime);
    } catch {
      return this.generatePlaceholder(256, 256, startTime);
    }
  }

  private async extractFromMPQ(
    buffer: ArrayBuffer,
    previewFiles: string[],
    startTime: number
  ): Promise<ExtractResult> {
    try {
      const mpqParser = new MPQParser(buffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        return {
          success: false,
          source: 'error',
          error: 'Failed to parse MPQ archive',
          extractTimeMs: performance.now() - startTime,
        };
      }

      for (const fileName of previewFiles) {
        try {
          const fileData = await mpqParser.extractFile(fileName);
          if (!fileData) continue;

          const dataUrl = this.decodeImageData(fileData.data, fileName);

          if (dataUrl !== null) {
            return {
              success: true,
              dataUrl,
              source: fileName as ExtractResult['source'],
              extractTimeMs: performance.now() - startTime,
            };
          }
        } catch {
          continue;
        }
      }

      const blockScanResult = await this.findImageByBlockScan(mpqParser);
      if (blockScanResult) {
        return {
          success: true,
          dataUrl: blockScanResult.dataUrl,
          source: blockScanResult.source,
          extractTimeMs: performance.now() - startTime,
        };
      }

      return {
        success: false,
        source: 'error',
        error: 'No preview files found in MPQ',
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

  private decodeImageData(data: ArrayBuffer, fileName: string): string | null {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'tga':
      case 'b00':
        return this.tgaDecoder.decodeToDataURL(data);

      case 'blp':
        return this.blpDecoder.decodeToDataURL(data);

      default:
        return null;
    }
  }

  private async findImageByBlockScan(
    parser: MPQParser
  ): Promise<{ dataUrl: string; source: ExtractResult['source'] } | null> {
    const archive = parser['archive'];
    if (!archive?.blockTable) {
      return null;
    }

    const candidates = archive.blockTable
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => {
        const exists = (block.flags & 0x80000000) !== 0;
        const size = block.uncompressedSize;
        const isReasonableSize = size > 10000 && size < 3000000;
        return exists && isReasonableSize;
      })
      .sort((a, b) => b.block.uncompressedSize - a.block.uncompressedSize);

    for (const { index } of candidates.slice(0, 20)) {
      try {
        const fileData = await parser.extractFileByIndex(index);
        if (!fileData) continue;

        const header = new Uint8Array(fileData.data, 0, Math.min(18, fileData.data.byteLength));
        if (this.isTGAHeader(header)) {
          const dataUrl = this.tgaDecoder.decodeToDataURL(fileData.data);
          if (dataUrl !== null) {
            return { dataUrl, source: 'war3mapMap.tga' };
          }
        }

        if (this.isBLPHeader(header)) {
          const dataUrl = this.blpDecoder.decodeToDataURL(fileData.data);
          if (dataUrl !== null) {
            return { dataUrl, source: 'war3mapMap.blp' };
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private isTGAHeader(data: Uint8Array): boolean {
    if (data.length < 18) return false;

    const idLength = data[0] ?? 0;
    const colorMapType = data[1] ?? 0;
    const imageType = data[2] ?? 0;
    const width = (data[12] ?? 0) | ((data[13] ?? 0) << 8);
    const height = (data[14] ?? 0) | ((data[15] ?? 0) << 8);
    const pixelDepth = data[16] ?? 0;

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

  private isBLPHeader(data: Uint8Array): boolean {
    if (data.length < 4) return false;

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0, true);

    return magic === 0x31504c42;
  }

  private generatePlaceholder(width: number, height: number, startTime: number): ExtractResult {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return {
          success: false,
          source: 'error',
          error: 'Failed to create canvas context',
          extractTimeMs: performance.now() - startTime,
        };
      }

      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/png');

      return {
        success: true,
        dataUrl,
        source: 'placeholder',
        extractTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        source: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate placeholder',
        extractTimeMs: performance.now() - startTime,
      };
    }
  }

  public dispose(): void {
    // Nothing to dispose - decoders are stateless
  }
}
