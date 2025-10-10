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
      console.log(`Large campaign detected (${(fileSize / 1024 / 1024).toFixed(1)} MB), using streaming mode`);
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
      const w3fData = mpqParser.extractFile('war3campaign.w3f');
      if (w3fData) {
        const w3fParser = new W3FCampaignInfoParser(w3fData.data);
        campaignInfo = w3fParser.parse();
      }
    } catch (error) {
      // Campaign info is optional, continue without it
      console.warn('Failed to parse campaign info:', error);
    }

    // Extract embedded maps
    const embeddedMaps = this.extractEmbeddedMaps(mpqParser);

    if (embeddedMaps.length === 0) {
      throw new Error('No maps found in campaign archive');
    }

    // Parse first map using W3XMapLoader
    const firstMap = embeddedMaps[0]!; // Safe: we checked length > 0 above
    const mapData = await this.w3xLoader.parse(firstMap.data);

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
      onProgress: (bytesRead, totalBytes) => {
        const percent = ((bytesRead / totalBytes) * 100).toFixed(1);
        console.log(`Loading campaign: ${percent}%`);
      },
    });

    // Create MPQ parser (with empty buffer since we're streaming)
    const mpqParser = new MPQParser(new ArrayBuffer(0));

    // Parse MPQ archive using streaming
    const mpqResult = await mpqParser.parseStream(reader, {
      extractFiles: ['war3campaign.w3f', '*.w3x', '*.w3m'], // Only extract what we need
      onProgress: (stage, progress) => {
        console.log(`${stage}: ${progress.toFixed(1)}%`);
      },
    });

    if (!mpqResult.success) {
      throw new Error(`Failed to parse campaign MPQ archive: ${mpqResult.error}`);
    }

    console.log(`Campaign parsed in ${mpqResult.parseTimeMs?.toFixed(0)}ms`);

    // Extract campaign info (optional - for metadata)
    let campaignInfo: W3FCampaignInfo | undefined;
    try {
      const w3fData = mpqResult.files.find((f) => f.name === 'war3campaign.w3f');
      if (w3fData) {
        const w3fParser = new W3FCampaignInfoParser(w3fData.data);
        campaignInfo = w3fParser.parse();
      }
    } catch (error) {
      // Campaign info is optional, continue without it
      console.warn('Failed to parse campaign info:', error);
    }

    // Find first map file (w3x or w3m)
    const firstMapFile = mpqResult.files.find((f) => {
      const lower = f.name.toLowerCase();
      return lower.endsWith('.w3x') || lower.endsWith('.w3m');
    });

    if (!firstMapFile) {
      throw new Error('No maps found in campaign archive');
    }

    // Parse first map using W3XMapLoader
    const mapData = await this.w3xLoader.parse(firstMapFile.data);

    // Override format to 'w3n' and add campaign info to description
    const result: RawMapData = {
      ...mapData,
      format: 'w3n',
    };

    // Add campaign info to map metadata if available
    if (campaignInfo) {
      result.info = {
        ...result.info,
        description: this.buildDescription(campaignInfo, result.info.description, 0),
      };
    }

    return result;
  }

  /**
   * Extract embedded maps from campaign archive
   * Maps are stored as separate MPQ files within the campaign MPQ
   */
  private extractEmbeddedMaps(mpqParser: MPQParser): Array<{ data: ArrayBuffer; index: number }> {
    const maps: Array<{ data: ArrayBuffer; index: number }> = [];

    // Try to extract (listfile) to get list of all files
    const listFile = mpqParser.extractFile('(listfile)');
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
        const mapData = mpqParser.extractFile(mapFile);
        if (mapData && mapData.data.byteLength > 0) {
          maps.push({
            data: mapData.data,
            index,
          });
          index++;
        }
      } catch (error) {
        console.warn(`Failed to extract map ${mapFile}:`, error);
        // Continue trying other maps
      }
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
      const w3fData = mpqParser.extractFile('war3campaign.w3f');
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

    const embeddedMaps = this.extractEmbeddedMaps(mpqParser);

    return embeddedMaps.map((map, index) => ({
      filename: `Map ${index + 1}`, // Actual filename not available without listfile
      index,
      size: map.data.byteLength,
    }));
  }
}
