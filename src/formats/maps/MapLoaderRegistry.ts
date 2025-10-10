/**
 * Map Loader Registry
 * Main entry point for loading maps from various formats
 */

import { W3XMapLoader } from './w3x/W3XMapLoader';
import { W3NCampaignLoader } from './w3n/W3NCampaignLoader';
import { SCMMapLoader } from './scm/SCMMapLoader';
import { SC2MapLoader } from './sc2/SC2MapLoader';
import { EdgeStoryConverter } from './edgestory/EdgeStoryConverter';
import type { IMapLoader, RawMapData } from './types';
import type { EdgeStoryMap } from './edgestory/EdgeStoryFormat';

/**
 * Map load options
 */
export interface MapLoadOptions {
  /**
   * Convert to .edgestory format
   * @default true
   */
  convertToEdgeStory?: boolean;

  /**
   * Validate assets for copyright compliance
   * @default true
   */
  validateAssets?: boolean;

  /**
   * Progress callback
   */
  onProgress?: (stage: string, progress: number) => void;
}

/**
 * Map load result
 */
export interface MapLoadResult {
  /**
   * Raw map data from source format
   */
  rawMap: RawMapData;

  /**
   * Converted EdgeStory map (if convertToEdgeStory=true)
   */
  edgeStoryMap?: EdgeStoryMap;

  /**
   * Load statistics
   */
  stats: {
    loadTime: number; // milliseconds
    fileSize: number; // bytes
    unitCount: number;
    doodadCount: number;
    terrainSize: { width: number; height: number };
  };
}

/**
 * Map Loader Registry
 * Registers and manages loaders for different map formats
 */
export class MapLoaderRegistry {
  private loaders: Map<string, IMapLoader>;
  private converter: EdgeStoryConverter;

  constructor() {
    this.loaders = new Map();
    this.converter = new EdgeStoryConverter();

    // Register default loaders
    this.registerDefaultLoaders();
  }

  /**
   * Register default map loaders
   */
  private registerDefaultLoaders(): void {
    // Warcraft 3 map formats
    const w3xLoader = new W3XMapLoader();
    this.loaders.set('.w3x', w3xLoader);
    this.loaders.set('.w3m', w3xLoader);

    // Warcraft 3 campaign format
    const w3nLoader = new W3NCampaignLoader();
    this.loaders.set('.w3n', w3nLoader);

    // StarCraft 1 formats
    const scmLoader = new SCMMapLoader();
    this.loaders.set('.scm', scmLoader);
    this.loaders.set('.scx', scmLoader);

    // StarCraft 2 formats
    const sc2Loader = new SC2MapLoader();
    this.loaders.set('.sc2map', sc2Loader);
    this.loaders.set('.sc2mod', sc2Loader); // SC2 mods use same format
  }

  /**
   * Register a custom map loader
   * @param extension - File extension (e.g., '.w3x')
   * @param loader - Map loader implementation
   */
  public registerLoader(extension: string, loader: IMapLoader): void {
    this.loaders.set(extension.toLowerCase(), loader);
  }

  /**
   * Load a map from file
   * @param file - Map file
   * @param options - Load options
   * @returns Map load result
   */
  public async loadMap(file: File, options: MapLoadOptions = {}): Promise<MapLoadResult> {
    const startTime = performance.now();

    // Default options
    const opts: Required<MapLoadOptions> = {
      convertToEdgeStory: options.convertToEdgeStory ?? true,
      validateAssets: options.validateAssets ?? true,
      onProgress: options.onProgress || ((): void => {}),
    };

    // Get file extension
    const extension = this.getExtension(file.name);
    const loader = this.loaders.get(extension);

    if (!loader) {
      throw new Error(`Unsupported map format: ${extension}`);
    }

    // Parse map
    opts.onProgress('Parsing map file', 0);
    const rawMap = await loader.parse(file);
    opts.onProgress('Parsing map file', 50);

    // Convert to EdgeStory if requested
    let edgeStoryMap: EdgeStoryMap | undefined;
    if (opts.convertToEdgeStory) {
      opts.onProgress('Converting to EdgeStory format', 50);
      edgeStoryMap = this.converter.convert(rawMap);
      opts.onProgress('Converting to EdgeStory format', 100);
    }

    const endTime = performance.now();

    // Calculate stats
    const stats = {
      loadTime: endTime - startTime,
      fileSize: file.size,
      unitCount: rawMap.units.length,
      doodadCount: rawMap.doodads.length,
      terrainSize: {
        width: rawMap.terrain.width,
        height: rawMap.terrain.height,
      },
    };

    return {
      rawMap,
      edgeStoryMap,
      stats,
    };
  }

  /**
   * Load a map from ArrayBuffer
   * @param buffer - Map data
   * @param extension - File extension (e.g., '.w3x')
   * @param options - Load options
   * @returns Map load result
   */
  public async loadMapFromBuffer(
    buffer: ArrayBuffer,
    extension: string,
    options: MapLoadOptions = {}
  ): Promise<MapLoadResult> {
    const startTime = performance.now();

    // Default options
    const opts: Required<MapLoadOptions> = {
      convertToEdgeStory: options.convertToEdgeStory ?? true,
      validateAssets: options.validateAssets ?? true,
      onProgress: options.onProgress || ((): void => {}),
    };

    // Get loader
    const ext = extension.toLowerCase();
    const loader = this.loaders.get(ext);

    if (!loader) {
      throw new Error(`Unsupported map format: ${ext}`);
    }

    // Parse map
    opts.onProgress('Parsing map file', 0);
    const rawMap = await loader.parse(buffer);
    opts.onProgress('Parsing map file', 50);

    // Convert to EdgeStory if requested
    let edgeStoryMap: EdgeStoryMap | undefined;
    if (opts.convertToEdgeStory) {
      opts.onProgress('Converting to EdgeStory format', 50);
      edgeStoryMap = this.converter.convert(rawMap);
      opts.onProgress('Converting to EdgeStory format', 100);
    }

    const endTime = performance.now();

    // Calculate stats
    const stats = {
      loadTime: endTime - startTime,
      fileSize: buffer.byteLength,
      unitCount: rawMap.units.length,
      doodadCount: rawMap.doodads.length,
      terrainSize: {
        width: rawMap.terrain.width,
        height: rawMap.terrain.height,
      },
    };

    return {
      rawMap,
      edgeStoryMap,
      stats,
    };
  }

  /**
   * Get list of supported file extensions
   * @returns Array of supported extensions
   */
  public getSupportedFormats(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Check if format is supported
   * @param extension - File extension
   * @returns True if supported
   */
  public isFormatSupported(extension: string): boolean {
    return this.loaders.has(extension.toLowerCase());
  }

  /**
   * Export EdgeStory map to JSON
   * @param map - EdgeStory map
   * @returns JSON string
   */
  public exportEdgeStoryToJSON(map: EdgeStoryMap): string {
    return this.converter.exportToJSON(map);
  }

  /**
   * Export EdgeStory map to binary
   * @param map - EdgeStory map
   * @returns ArrayBuffer
   */
  public exportEdgeStoryToBinary(map: EdgeStoryMap): ArrayBuffer {
    return this.converter.exportToBinary(map);
  }

  /**
   * Get file extension from filename
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
  }
}
