/**
 * W3N Campaign Loader - Warcraft 3 Campaign Loader
 * Parses W3N campaign files containing multiple maps
 *
 * W3N files are MPQ archives containing:
 * - war3campaign.w3f (campaign info)
 * - war3campaign.w3u/w3t/w3a/w3b/w3d/w3q (campaign data)
 * - Multiple embedded .w3x/.w3m map files
 *
 * For Phase 1, we extract and load only the FIRST map in the campaign.
 * Full campaign progression support will be added in Phase 3.
 */

import { MPQParser } from '../../mpq/MPQParser';
import { W3XMapLoader } from '../w3x/W3XMapLoader';
import { W3FCampaignInfoParser } from './W3FCampaignInfoParser';
import { StreamingFileReader } from '../../../utils/StreamingFileReader';
import type { IMapLoader, RawMapData } from '../types';
import type { W3FCampaignInfo, EmbeddedMapInfo } from './types';
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * W3N Campaign Loader
 * Loads Warcraft 3 campaign files and extracts the first map
 */
export class W3NCampaignLoader implements IMapLoader {
  private w3xLoader: W3XMapLoader;

  constructor() {
    this.w3xLoader = new W3XMapLoader();
  }

  /**
   * Parse W3N campaign file
   * @param file - Campaign file or ArrayBuffer
   * @returns Raw map data from first map in campaign
   */
  public async parse(file: File | ArrayBuffer): Promise<RawMapData> {
    // Detect file size to determine parsing strategy
    const fileSize = file instanceof ArrayBuffer ? file.byteLength : file.size;
    const STREAMING_THRESHOLD = 100 * 1024 * 1024; // 100MB

    if (fileSize > STREAMING_THRESHOLD && file instanceof File) {
      // Large file (>100MB) - use streaming to prevent memory crashes
      return this.parseStreaming(file);
    } else {
      // Small file (<100MB) - use traditional in-memory parsing
      return this.parseInMemory(file);
    }
  }

  /**
   * Parse campaign using traditional in-memory method (for files <100MB)
   */
  private async parseInMemory(file: File | ArrayBuffer): Promise<RawMapData> {
    // Convert File to ArrayBuffer if needed
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

    // Parse MPQ archive
    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success || !mpqResult.archive) {
      throw new Error(`Failed to parse campaign MPQ archive: ${mpqResult.error}`);
    }

    // Extract campaign info (optional - for metadata)
    let campaignInfo: W3FCampaignInfo | undefined;
    try {
      const w3fData = await mpqParser.extractFile('war3campaign.w3f');
      if (w3fData) {
        const w3fParser = new W3FCampaignInfoParser(w3fData.data);
        campaignInfo = w3fParser.parse();
      }
    } catch (error) {
      // Campaign info is optional, continue without it
      // This is common with corrupted campaigns or unusual compression
      console.warn(
        '[W3NCampaignLoader] Failed to parse campaign info (non-critical):',
        error instanceof Error ? error.message : error
      );
    }

    // Extract embedded maps
    let embeddedMaps: Array<{ data: ArrayBuffer; index: number }> = [];
    try {
      embeddedMaps = await this.extractEmbeddedMaps(mpqParser);
    } catch (error) {
      console.error(
        '[W3NCampaignLoader] Failed to extract embedded maps:',
        error instanceof Error ? error.message : error
      );
      throw new Error(
        `Failed to extract embedded maps: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (embeddedMaps.length === 0) {
      throw new Error('No maps found in campaign archive');
    }

    // Parse first map using W3XMapLoader
    const firstMap = embeddedMaps[0]!; // Safe: we checked length > 0 above
    let mapData: RawMapData;
    try {
      mapData = await this.w3xLoader.parse(firstMap.data);
    } catch (error) {
      console.error(
        '[W3NCampaignLoader] Failed to parse first map:',
        error instanceof Error ? error.message : error
      );
      throw new Error(
        `Failed to parse first map: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Override format to 'w3n' and add campaign info to description
    const result: RawMapData = {
      ...mapData,
      format: 'w3n',
    };

    // Add campaign info to map metadata if available
    if (campaignInfo) {
      result.info = {
        ...result.info,
        description: this.buildDescription(campaignInfo, result.info.description, firstMap.index),
      };
    }

    return result;
  }

  /**
   * Parse campaign using streaming method (for large files >100MB)
   * This prevents browser memory crashes with files like the 923MB campaign
   */
  private async parseStreaming(file: File): Promise<RawMapData> {
    // Create streaming reader
    const reader = new StreamingFileReader(file, {
      chunkSize: 4 * 1024 * 1024, // 4MB chunks
      onProgress: (bytesRead, totalBytes): void => {
        const percent = ((bytesRead / totalBytes) * 100).toFixed(1);
      },
    });

    // Create MPQ parser (with empty buffer since we're streaming)
    const mpqParser = new MPQParser(new ArrayBuffer(0));

    // Parse MPQ archive using streaming
    // NOTE: We DON'T use extractFiles because W3N campaigns have unpredictable filenames
    // Instead, we'll iterate the block table after parsing to find embedded W3X files
    const mpqResult = await mpqParser.parseStream(reader, {
      onProgress: (stage, progress) => {},
    });

    if (!mpqResult.success) {
      console.warn(`[W3NCampaignLoader] Parse had issues: ${mpqResult.error}, but continuing...`);
      // Don't throw - we can still work with partial results if we have map files
    }
    // Find embedded W3X files by iterating block table and checking for MPQ magic
    // This is more reliable than filename-based extraction since W3N campaigns
    // have unpredictable internal filenames
    if (!mpqResult.blockTable) {
      console.warn(
        '[W3NCampaignLoader] Block table not available from streaming parse, trying in-memory fallback...'
      );
      // Fallback to in-memory parsing for this file
      // This can happen with corrupted or unusual MPQ structures
      try {
        return await this.parseInMemory(file);
      } catch (fallbackError) {
        throw new Error(
          `Block table not available from streaming parse, and in-memory fallback failed: ${
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }`
        );
      }
    }
    // Find large files (>100KB compressed) that are likely W3X maps
    const largeBlocks = mpqResult.blockTable
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => {
        const exists = (block.flags & 0x80000000) !== 0;
        const isLarge = block.compressedSize > 100000; // >100KB
        return exists && isLarge;
      })
      .sort((a, b) => b.block.compressedSize - a.block.compressedSize);
    let firstMapData: ArrayBuffer | null = null;

    // Check up to 30 largest blocks to find a valid W3X map
    for (const { block, index } of largeBlocks.slice(0, 30)) {
      try {
        // Read first 1KB to check for MPQ magic without extracting the whole file
        const headerData = await reader.readRange(
          block.filePos,
          Math.min(1024, block.compressedSize)
        );

        // Create a fresh ArrayBuffer copy to avoid DataView offset issues
        const safeBuffer = headerData.buffer.slice(
          headerData.byteOffset,
          headerData.byteOffset + headerData.byteLength
        );
        const view = new DataView(safeBuffer);

        // Check for MPQ magic at common offsets (0, 512, 1024)
        const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
        const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;

        const hasMPQMagic = magic0 === 0x1a51504d || magic512 === 0x1a51504d;

        if (hasMPQMagic) {
          // Extract the full file
          const mapFile = await mpqParser.extractFileByIndexStream(
            index,
            reader,
            mpqResult.blockTable
          );

          if (mapFile && mapFile.data.byteLength > 0) {
            // Validate this is an actual W3X map before accepting it
            try {
              const testParser = new MPQParser(mapFile.data);
              const parseResult = testParser.parse();
              const archive = parseResult.archive;

              if (archive && archive.blockTable && archive.blockTable.length > 5) {
                firstMapData = mapFile.data;
                break;
              } else {
                // Continue to next block
              }
            } catch (validationError) {
              // Continue to next block
            }
          }
        } else {
        }
      } catch (error) {
        console.warn(`[W3NCampaignLoader] Failed to check block ${index}:`, error);
        continue;
      }
    }

    if (!firstMapData) {
      throw new Error('No embedded W3X maps found in campaign archive');
    }

    // Parse first map using W3XMapLoader
    const mapData = await this.w3xLoader.parse(firstMapData);

    // Override format to 'w3n'
    const result: RawMapData = {
      ...mapData,
      format: 'w3n',
    };
    return result;
  }

  /**
   * Extract embedded maps from campaign archive
   * Maps are stored as separate MPQ files within the campaign MPQ
   */
  private async extractEmbeddedMaps(
    mpqParser: MPQParser
  ): Promise<Array<{ data: ArrayBuffer; index: number }>> {
    const maps: Array<{ data: ArrayBuffer; index: number }> = [];

    // Step 1: Try filename-based extraction (fast path)
    try {
      const listFile = await mpqParser.extractFile('(listfile)');
      let fileList: string[] = [];

      if (listFile) {
        // Parse listfile (text file with one filename per line)
        const decoder = new TextDecoder('utf-8');
        const listContent = decoder.decode(listFile.data);
        fileList = listContent
          .split(/[\r\n]+/)
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
      } else {
        // Fallback: try common campaign map naming patterns
        fileList = this.generateCommonMapNames();
      }

      // Filter for .w3x and .w3m files
      const mapFiles = fileList.filter((f) => {
        const lower = f.toLowerCase();
        return lower.endsWith('.w3x') || lower.endsWith('.w3m');
      });

      // Extract each map
      let index = 0;
      for (const mapFile of mapFiles) {
        try {
          const mapData = await mpqParser.extractFile(mapFile);
          if (mapData && mapData.data.byteLength > 0) {
            maps.push({
              data: mapData.data,
              index,
            });
            index++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Skip ADPCM/SPARSE audio files - they require StormJS (WASM) to decompress
          // These are not map files anyway, so we can safely ignore them
          if (
            errorMsg.includes('ADPCM') ||
            errorMsg.includes('SPARSE') ||
            errorMsg.includes('audio compression')
          ) {
            // Silent skip - these are expected in W3N campaigns
            continue;
          }
          console.warn(`[W3NCampaignLoader] Failed to extract map ${mapFile}:`, errorMsg);
          // Continue trying other maps
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Only log non-ADPCM errors (ADPCM is expected and not critical)
      if (
        !errorMsg.includes('ADPCM') &&
        !errorMsg.includes('SPARSE') &&
        !errorMsg.includes('audio compression')
      ) {
        console.warn('[W3NCampaignLoader] Filename-based extraction failed:', errorMsg);
      }
    }

    // Step 2: If filename-based extraction failed, use block scanning (robust fallback)
    if (maps.length === 0) {
      return await this.extractEmbeddedMapsByBlockScan(mpqParser);
    }

    return maps;
  }

  /**
   * Extract embedded maps by scanning hash table (robust fallback)
   * This is used when filename-based extraction fails
   * Uses hash table to intelligently find W3X files instead of blind block scanning
   */
  private async extractEmbeddedMapsByBlockScan(
    mpqParser: MPQParser
  ): Promise<Array<{ data: ArrayBuffer; index: number }>> {
    const maps: Array<{ data: ArrayBuffer; index: number }> = [];

    // Get the MPQ archive from parser
    const archive = mpqParser.getArchive();
    if (!archive || !archive.blockTable || !archive.hashTable) {
      console.error('[W3NCampaignLoader] No archive tables available for scanning');
      return maps;
    }
    // Collect all non-empty hash entries that point to valid blocks
    const validEntries = archive.hashTable
      .map((hash, hashIndex) => ({ hash, hashIndex }))
      .filter(({ hash }) => {
        // Empty hash entry
        if (hash.blockIndex === 0xffffffff) return false;

        // Invalid block index
        if (hash.blockIndex >= archive.blockTable.length) return false;

        const block = archive.blockTable[hash.blockIndex];

        // Block doesn't exist
        if (!block || (block.flags & 0x80000000) === 0) return false;

        // Skip very small files (<10KB - too small for a map)
        const size = block.uncompressedSize || block.compressedSize || 0;
        if (size < 10000) return false;

        // Skip extremely large files (>50MB - too large for embedded maps, likely videos)
        if (size > 50000000) return false;

        return true;
      })
      .map(({ hash }) => ({
        blockIndex: hash.blockIndex,
        block: archive.blockTable[hash.blockIndex],
      }))
      // Sort by uncompressed size (larger files more likely to be maps)
      .sort((a, b) => {
        const sizeA = a.block?.uncompressedSize || a.block?.compressedSize || 0;
        const sizeB = b.block?.uncompressedSize || b.block?.compressedSize || 0;
        return sizeB - sizeA;
      });
    // Try to extract candidates
    let checked = 0;
    for (const { blockIndex, block } of validEntries) {
      // Limit scanning to avoid performance issues
      if (checked >= 50) {
        break;
      }
      checked++;

      try {
        if (!block) continue; // Skip if block is undefined

        const size = block.uncompressedSize || block.compressedSize || 0;
        // Extract the file by index
        const mapData = await mpqParser.extractFileByIndex(blockIndex);

        if (!mapData || mapData.data.byteLength === 0) {
          continue;
        }

        // Check for MPQ magic (0x1A51504D = "MPQ\x1a")
        const view = new DataView(mapData.data.slice(0, Math.min(1024, mapData.data.byteLength)));
        const magic0 = view.byteLength >= 4 ? view.getUint32(0, true) : 0;
        const magic512 = view.byteLength >= 516 ? view.getUint32(512, true) : 0;

        // Log extracted data preview for debugging
        const previewBytes = Array.from(
          new Uint8Array(mapData.data.slice(0, Math.min(16, mapData.data.byteLength)))
        )
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        if (magic0 === 0x1a51504d || magic512 === 0x1a51504d) {
          // Validate this is an actual W3X map by checking for required files
          try {
            const testParser = new MPQParser(mapData.data);
            const parseResult = testParser.parse();
            const archive = parseResult.archive;

            // Check if this MPQ has typical W3X map files
            if (archive && archive.blockTable && archive.blockTable.length > 5) {
              maps.push({
                data: mapData.data,
                index: maps.length,
              });

              // Only extract the first VALID map for Phase 1
              break;
            } else {
            }
          } catch (validationError) {}
        } else {
        }
      } catch (error) {
        // Skip files with unsupported compression - they're not map files anyway
        // Common issues: ADPCM audio (0x40), SPARSE (0x20), multi-algorithm (0x1c)
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isUnsupportedCompression =
          errorMsg.includes('ADPCM') ||
          errorMsg.includes('SPARSE') ||
          errorMsg.includes('Unsupported compression') ||
          errorMsg.includes('Unknown compression');
        if (!isUnsupportedCompression) {
          // Log unexpected errors for debugging
          console.warn(`[W3NCampaignLoader] Block ${blockIndex} extraction failed:`, errorMsg);
        }
        continue;
      }
    }

    if (maps.length === 0) {
      console.error(
        `[W3NCampaignLoader] ❌ No valid W3X maps found after scanning ${checked} blocks`
      );
    } else {
    }

    return maps;
  }

  /**
   * Generate common campaign map naming patterns as fallback
   */
  private generateCommonMapNames(): string[] {
    const names: string[] = [];

    // Common patterns: Chapter01.w3x, Map01.w3x, etc.
    for (let i = 1; i <= 20; i++) {
      const num = i.toString().padStart(2, '0');
      names.push(`Chapter${num}.w3x`);
      names.push(`Chapter${num}.w3m`);
      names.push(`Map${num}.w3x`);
      names.push(`Map${num}.w3m`);
      names.push(`chapter${num}.w3x`);
      names.push(`chapter${num}.w3m`);
      names.push(`map${num}.w3x`);
      names.push(`map${num}.w3m`);
    }

    // Also try direct numbered patterns
    for (let i = 1; i <= 20; i++) {
      names.push(`${i}.w3x`);
      names.push(`${i}.w3m`);
    }

    return names;
  }

  /**
   * Build description combining campaign info and map description
   */
  private buildDescription(
    campaignInfo: W3FCampaignInfo,
    mapDescription: string,
    mapIndex: number
  ): string {
    const parts: string[] = [];

    // Add campaign name
    if (campaignInfo.name) {
      parts.push(`Campaign: ${campaignInfo.name}`);
    }

    // Add campaign author
    if (campaignInfo.author) {
      parts.push(`Author: ${campaignInfo.author}`);
    }

    // Add map position
    parts.push(`Map ${mapIndex + 1} of campaign`);

    // Add original map description if exists
    if (mapDescription && mapDescription.trim().length > 0) {
      parts.push(`\n\n${mapDescription}`);
    }

    // Add campaign description
    if (campaignInfo.description && campaignInfo.description.trim().length > 0) {
      parts.push(`\n\nCampaign Description:\n${campaignInfo.description}`);
    }

    return parts.join('\n');
  }

  /**
   * Get campaign metadata (if available)
   * This is a utility method for future use
   */
  public async getCampaignInfo(file: File | ArrayBuffer): Promise<W3FCampaignInfo | null> {
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success) {
      return null;
    }

    try {
      const w3fData = await mpqParser.extractFile('war3campaign.w3f');
      if (!w3fData) {
        return null;
      }

      const w3fParser = new W3FCampaignInfoParser(w3fData.data);
      return w3fParser.parse();
    } catch (error) {
      console.warn('Failed to parse campaign info:', error);
      return null;
    }
  }

  /**
   * Get list of embedded maps (if available)
   * This is a utility method for future use
   */
  public async getEmbeddedMapList(file: File | ArrayBuffer): Promise<EmbeddedMapInfo[]> {
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

    const mpqParser = new MPQParser(buffer);
    const mpqResult = mpqParser.parse();

    if (!mpqResult.success) {
      return [];
    }

    const embeddedMaps = await this.extractEmbeddedMaps(mpqParser);

    return embeddedMaps.map((map, index) => ({
      filename: `Map ${index + 1}`, // Actual filename not available without listfile
      index,
      size: map.data.byteLength,
    }));
  }
}
