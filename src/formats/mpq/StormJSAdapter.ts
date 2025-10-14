/**
 * StormJS Adapter - WASM-based MPQ parser using StormLib
 *
 * This adapter wraps @wowserhq/stormjs to handle MPQ files that require
 * proper Huffman decompression. It uses Emscripten's MEMFS to load files
 * into a virtual filesystem for browser usage.
 *
 * Use this adapter when:
 * - MPQParser fails with Huffman decompression errors
 * - Multi-compression files (flags 0x15, 0x97, etc.)
 * - W3N campaign archives
 */

// Dynamic imports to avoid loading WASM unless needed
let StormJS: typeof import('@wowserhq/stormjs') | null = null;
let isInitialized = false;

export interface StormJSExtractResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

/**
 * Adapter for StormLib WASM library
 */
export class StormJSAdapter {
  private static readonly VIRTUAL_MOUNT_PATH = '/stormjs';
  private static readonly VIRTUAL_ARCHIVE_PATH = '/stormjs/archive.mpq';

  /**
   * Initialize StormJS library (lazy-loaded)
   */
  private static async initialize(): Promise<void> {
    if (isInitialized) {
      return;
    }

    try {
      console.log('[StormJSAdapter] Loading StormJS WASM module...');
      StormJS = await import('@wowserhq/stormjs');
      isInitialized = true;
      console.log('[StormJSAdapter] ✅ StormJS loaded successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[StormJSAdapter] ❌ Failed to load StormJS:', errorMsg);
      throw new Error(`Failed to initialize StormJS: ${errorMsg}`);
    }
  }

  /**
   * Check if StormJS is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract a file from MPQ archive using StormLib
   *
   * @param mpqBuffer - MPQ archive data
   * @param fileName - File to extract from archive
   * @returns Extraction result with file data
   */
  public static async extractFile(
    mpqBuffer: ArrayBuffer,
    fileName: string
  ): Promise<StormJSExtractResult> {
    try {
      await this.initialize();

      if (!StormJS) {
        return {
          success: false,
          error: 'StormJS not initialized',
        };
      }

      console.log(`[StormJSAdapter] Extracting "${fileName}" using StormLib...`);

      const { FS, MPQ } = StormJS;

      // Setup virtual filesystem (MEMFS)
      try {
        // Create mount point if it doesn't exist
        try {
          FS.mkdir(this.VIRTUAL_MOUNT_PATH);
        } catch {
          // Directory might already exist
        }

        // Write MPQ data to virtual filesystem
        const uint8Array = new Uint8Array(mpqBuffer);
        FS.writeFile(this.VIRTUAL_ARCHIVE_PATH, uint8Array);

        console.log(`[StormJSAdapter] MPQ file written to MEMFS: ${mpqBuffer.byteLength} bytes`);

        // Open MPQ archive
        const mpq = await MPQ.open(this.VIRTUAL_ARCHIVE_PATH, 'r');

        try {
          // Open and read file from archive
          const file = mpq.openFile(fileName);

          try {
            const fileData = file.read();
            console.log(
              `[StormJSAdapter] ✅ Successfully extracted "${fileName}": ${fileData.length} bytes`
            );

            // Convert Uint8Array to ArrayBuffer
            const arrayBuffer = fileData.buffer.slice(
              fileData.byteOffset,
              fileData.byteOffset + fileData.byteLength
            ) as ArrayBuffer;

            return {
              success: true,
              data: arrayBuffer,
            };
          } finally {
            file.close();
          }
        } finally {
          mpq.close();
        }
      } finally {
        // Cleanup virtual filesystem
        try {
          FS.unlink(this.VIRTUAL_ARCHIVE_PATH);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[StormJSAdapter] ❌ Extraction failed:`, errorMsg);

      return {
        success: false,
        error: `StormLib extraction failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Extract multiple files from MPQ archive
   *
   * @param mpqBuffer - MPQ archive data
   * @param fileNames - Files to extract
   * @returns Map of filename to extraction result
   */
  public static async extractFiles(
    mpqBuffer: ArrayBuffer,
    fileNames: string[]
  ): Promise<Map<string, StormJSExtractResult>> {
    const results = new Map<string, StormJSExtractResult>();

    try {
      await this.initialize();

      if (!StormJS) {
        const error: StormJSExtractResult = {
          success: false,
          error: 'StormJS not initialized',
        };
        fileNames.forEach((name) => results.set(name, error));
        return results;
      }

      const { FS, MPQ } = StormJS;

      // Setup virtual filesystem
      try {
        try {
          FS.mkdir(this.VIRTUAL_MOUNT_PATH);
        } catch {
          // Directory might already exist
        }

        const uint8Array = new Uint8Array(mpqBuffer);
        FS.writeFile(this.VIRTUAL_ARCHIVE_PATH, uint8Array);

        // Open MPQ archive once
        const mpq = await MPQ.open(this.VIRTUAL_ARCHIVE_PATH, 'r');

        try {
          // Extract each file
          for (const fileName of fileNames) {
            try {
              const file = mpq.openFile(fileName);
              try {
                const fileData = file.read();
                const arrayBuffer = fileData.buffer.slice(
                  fileData.byteOffset,
                  fileData.byteOffset + fileData.byteLength
                ) as ArrayBuffer;

                results.set(fileName, {
                  success: true,
                  data: arrayBuffer,
                });
              } finally {
                file.close();
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              results.set(fileName, {
                success: false,
                error: errorMsg,
              });
            }
          }
        } finally {
          mpq.close();
        }
      } finally {
        try {
          FS.unlink(this.VIRTUAL_ARCHIVE_PATH);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorResult: StormJSExtractResult = {
        success: false,
        error: `StormLib batch extraction failed: ${errorMsg}`,
      };
      fileNames.forEach((name) => results.set(name, errorResult));
    }

    return results;
  }
}
