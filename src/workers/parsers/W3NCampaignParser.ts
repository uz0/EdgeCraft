/**
 * W3N Campaign Parser (Worker Context)
 *
 * Parses Warcraft 3 Campaign (.w3n) files in worker thread.
 * W3N files are MPQ archives containing multiple W3X maps.
 *
 * This runs in a Web Worker, so no DOM access!
 */

import { MPQParser } from '../../formats/mpq/MPQParser';
import { TGADecoder } from '../../engine/rendering/TGADecoder';
import { W3NCampaignLoader } from '../../formats/maps/w3n/W3NCampaignLoader';

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
 * W3N Campaign Parser
 */
export class W3NCampaignParser {
  /**
   * Parse W3N campaign and extract/generate preview
   */
  public async parse(
    campaignBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<PreviewResult> {
    try {
      // Stage 1: Parsing MPQ archive (0-25%)
      onProgress(0, 'parsing', 'Parsing W3N campaign...');
      const mpqParser = new MPQParser(campaignBuffer);
      const mpqResult = mpqParser.parse();

      if (!mpqResult.success || !mpqResult.archive) {
        throw new Error(`Failed to parse W3N: ${mpqResult.error}`);
      }

      onProgress(25, 'parsing', 'W3N campaign parsed');

      // Stage 2: Extract campaign icon (25-50%)
      onProgress(25, 'extracting', 'Searching for campaign icon...');
      const campaignIcon = await this.extractCampaignIcon(mpqParser, campaignBuffer, onProgress);

      if (campaignIcon !== null && campaignIcon !== '') {
        onProgress(100, 'encoding', 'Campaign icon extracted');
        return {
          dataUrl: campaignIcon,
          source: 'embedded',
        };
      }

      // Stage 3: Try to extract preview from nested W3X map (50-75%)
      onProgress(50, 'extracting', 'Searching nested maps...');
      const nestedPreview = await this.extractNestedMapPreview(
        mpqParser,
        campaignBuffer,
        onProgress
      );

      if (nestedPreview !== null && nestedPreview !== '') {
        onProgress(100, 'encoding', 'Nested map preview extracted');
        return {
          dataUrl: nestedPreview,
          source: 'embedded',
        };
      }

      // Stage 4: Generate placeholder (75-100%)
      onProgress(75, 'generating', 'Creating campaign placeholder...');
      const generatedPreview = await this.generateCampaignPreview(campaignBuffer, onProgress);

      return {
        dataUrl: generatedPreview,
        source: 'generated',
      };
    } catch (error) {
      throw new Error(
        `W3N parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract campaign icon (war3campaign.w3f)
   */
  private async extractCampaignIcon(
    mpqParser: MPQParser,
    campaignBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string | null> {
    try {
      onProgress(30, 'extracting', 'Looking for war3campaign.w3f...');

      // Use MPQParser (pure JavaScript, no WASM)
      const fileData = await mpqParser.extractFile('war3campaign.w3f');

      if (!fileData) {
        return null;
      }
      // TODO: Parse .w3f file format and extract icon
      // For now, return null
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract preview from nested W3X map
   *
   * W3N campaigns contain W3X map files.
   * Try to extract preview from first map.
   */
  private async extractNestedMapPreview(
    mpqParser: MPQParser,
    campaignBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string | null> {
    try {
      onProgress(55, 'extracting', 'Listing campaign maps...');

      // List all files in campaign
      const files = mpqParser.listFiles();

      // Find first .w3x or .w3m file
      const mapFile = files.find((f) => f.endsWith('.w3x') || f.endsWith('.w3m'));

      if (mapFile === null || mapFile === undefined) {
        return null;
      }

      onProgress(60, 'extracting', `Extracting nested map: ${mapFile}...`);

      // Extract nested W3X map using MPQParser (pure JavaScript)
      const mapData = await mpqParser.extractFile(mapFile);

      if (!mapData) {
        return null;
      }
      const nestedMpqParser = new MPQParser(mapData.data);
      const nestedResult = nestedMpqParser.parse();

      if (!nestedResult.success) {
        return null;
      }

      // Try to extract preview from nested map
      const previewFiles = ['war3mapPreview.tga', 'war3mapMap.tga'];

      for (const fileName of previewFiles) {
        try {
          const previewData = await nestedMpqParser.extractFile(fileName);
          if (previewData) {
            const decoder = new TGADecoder();
            const dataUrl = await decoder.decodeToDataURL(previewData.data);
            if (dataUrl !== null && dataUrl !== '') {
              return dataUrl;
            }
          }
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate campaign preview placeholder
   */
  private async generateCampaignPreview(
    campaignBuffer: ArrayBuffer,
    onProgress: ProgressCallback
  ): Promise<string> {
    onProgress(80, 'generating', 'Creating campaign preview...');

    try {
      // Parse campaign using W3NCampaignLoader
      const loader = new W3NCampaignLoader();
      const campaignData = await loader.parse(campaignBuffer);

      onProgress(90, 'generating', 'Rendering campaign info...');

      // Create canvas for rendering (OffscreenCanvas in worker!)
      const canvas = new OffscreenCanvas(512, 512);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw campaign-themed preview
      // Background gradient (purple-ish for campaigns)
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#7b2cbf'); // Purple
      gradient.addColorStop(1, '#5a189a'); // Dark purple
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add campaign info text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(campaignData.info.name || 'W3N Campaign', 256, 256);

      ctx.font = '18px sans-serif';
      ctx.fillText('Campaign', 256, 290);

      // Add "W3N" label
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('W3N', 256, 450);

      // Convert to data URL
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const dataUrl = await this.blobToDataUrl(blob);

      return dataUrl;
    } catch (error) {
      // If generation fails, create simple placeholder
      return this.createPlaceholder('W3N Campaign', onProgress);
    }
  }

  /**
   * Create simple placeholder image
   */
  private async createPlaceholder(format: string, onProgress: ProgressCallback): Promise<string> {
    onProgress(95, 'generating', 'Creating placeholder...');

    const canvas = new OffscreenCanvas(512, 512);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Purple background
    ctx.fillStyle = '#7b2cbf';
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
