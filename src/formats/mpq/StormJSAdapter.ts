/* eslint-disable */
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

// Dynamic script loading to avoid WASM/CommonJS issues
let StormLibModule: any = null;
let StormJSWrappers: { FS: any; MPQ: any; File: any } | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let isInitializing = false;
let initFailureCount = 0;
const MAX_INIT_FAILURES = 3;

// Shared WASM binary (decoded once, shared across workers)
// This is ArrayBuffer, not WebAssembly.Module, because Emscripten factory expects raw bytes
let preDecodedWasmBinary: ArrayBuffer | null = null;

// Pre-compiled WASM module (compiled once in main thread, shared to workers)
// This is WebAssembly.Module - workers just instantiate (fast, ~100ms) instead of compile (slow, ~5-10s)
let precompiledWasmModule: WebAssembly.Module | null = null;

// Global WASM compilation lock - ensures only ONE worker compiles WASM at a time
// This is CRITICAL to prevent event loop deadlock from parallel compilation
let wasmCompilationLock: Promise<void> | null = null;

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
   * Set pre-compiled WASM module (shared from main thread to workers)
   * This allows workers to skip compilation (slow, ~5-10s) and only instantiate (fast, ~100ms).
   *
   * @param wasmModule - Pre-compiled WebAssembly.Module from main thread
   */
  public static setPrecompiledWasmModule(wasmModule: WebAssembly.Module): void {
    precompiledWasmModule = wasmModule;
  }

  /**
   * Set pre-decoded WASM binary (shared across workers)
   * This allows workers to skip fetch and base64 decode, only compile.
   *
   * @param wasmBinary - Pre-decoded WASM ArrayBuffer from main thread
   */
  public static setDecodedWasmBinary(wasmBinary: ArrayBuffer): void {
    preDecodedWasmBinary = wasmBinary;
  }

  /**
   * Decode WASM binary (to be called once in main thread)
   * Returns ArrayBuffer that can be transferred to workers via postMessage
   *
   * The WASM is embedded as base64 data URI inside the stormlib.js file.
   * We extract it, decode it, and return the raw bytes.
   *
   * @returns Decoded WASM as ArrayBuffer
   */
  public static async decodeWasmBinary(): Promise<ArrayBuffer> {
    try {
      const isDev = import.meta.env.DEV;
      const jsPath = isDev
        ? '/vendor/stormjs/stormlib.debug.js'
        : '/vendor/stormjs/stormlib.release.js';
      // Fetch the JavaScript file containing embedded WASM
      const response = await fetch(jsPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch StormLib JS: ${response.status} ${response.statusText}`);
      }

      const jsText = await response.text();

      // Extract base64 WASM data from: var wasmBinaryFile = 'data:application/octet-stream;base64,AGFzb...'
      const match = jsText.match(
        /wasmBinaryFile\s*=\s*['"]data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)['"]/
      );
      if (!match || !match[1]) {
        throw new Error('Failed to find embedded WASM data in StormLib JS');
      }

      const base64Data = match[1]; // Non-null assertion: we just checked this exists
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('[StormJSAdapter] ❌ Failed to decode WASM binary:', error);
      throw error;
    }
  }

  /**
   * Load a script dynamically (supports main thread, classic workers, and module workers)
   */
  private static async loadScript(src: string): Promise<void> {
    // Check if we're in a worker context
    const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

    if (isWorker) {
      // Module workers: Use fetch() + eval() to load non-module scripts
      // This is the only reliable way to load global scripts in ES module workers
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const code = await response.text();

        // Execute in global scope using indirect eval (creates globals in worker)
        // Using (0, eval) instead of eval ensures it runs in global scope
        (0, eval)(code);
        return;
      } catch (error) {
        throw new Error(`Failed to load script in worker: ${src}. Error: ${error}`);
      }
    } else {
      // Main thread: use DOM
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    }
  }

  /**
   * Initialize StormJS library (lazy-loaded from vendor directory)
   *
   * SINGLETON PATTERN: Only initializes once, all concurrent calls wait for same promise
   */
  private static async initialize(): Promise<void> {
    // Check if we've failed too many times
    if (initFailureCount >= MAX_INIT_FAILURES) {
      throw new Error(
        `StormJS initialization failed ${initFailureCount} times, giving up to prevent infinite retries`
      );
    }

    // Return existing initialization promise if already in progress
    if (initPromise) {
      return initPromise;
    }

    if (isInitialized) {
      return;
    }

    // Prevent multiple concurrent initialization attempts
    if (isInitializing) {
      console.warn(
        '[StormJSAdapter] ⚠️ Race condition detected: initialization flag set but no promise. Waiting 100ms...'
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (isInitialized) return;
      if (initPromise) return initPromise;
    }

    isInitializing = true;

    // Track release lock function at function level for use in try/catch/finally
    let currentReleaseLock: (() => void) | null = null;

    initPromise = (async () => {
      try {
        // No artificial delay needed - WorkerPoolManager spawns workers sequentially
        // with 5-second delays to prevent parallel WASM compilation

        // Load StormLib WASM module from vendor directory
        const isDev = import.meta.env.DEV;
        const stormLibPath = isDev
          ? '/vendor/stormjs/stormlib.debug.js'
          : '/vendor/stormjs/stormlib.release.js';
        // Add timeout for script loading
        await Promise.race([
          this.loadScript(stormLibPath),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Script load timeout after 10s')), 10000)
          ),
        ]);

        // Get StormLib factory function (works in both main thread and workers)
        const globalScope = typeof window !== 'undefined' ? window : self;
        const StormLibFactory = (globalScope as any).StormLib;
        if (!StormLibFactory) {
          throw new Error('StormLib global not found after script load');
        }
        // CRITICAL: Wait for any ongoing WASM compilation to finish
        // This PREVENTS parallel WASM compilation which causes event loop deadlock
        if (wasmCompilationLock) {
          await wasmCompilationLock;
        }

        // Acquire lock: All other workers will wait for this promise
        wasmCompilationLock = new Promise<void>((resolve) => {
          currentReleaseLock = resolve;
        });
        // Call factory to get module instance with timeout
        // Priority: pre-compiled module > pre-decoded binary > fetch+decode+compile
        if (precompiledWasmModule) {
          // BEST: Pre-compiled module - only instantiate (fast, ~100ms)
          const factoryResult = StormLibFactory({ wasmModule: precompiledWasmModule });
          // Wrap in Promise.resolve() to ensure it's a real Promise (Emscripten returns thenable, not Promise)
          const factoryPromise = Promise.resolve(factoryResult).then((result: any) => {
            return result;
          });
          const moduleOrPromise = await Promise.race([
            factoryPromise,
            new Promise((_, reject) =>
              setTimeout(() => {
                console.error('[StormJSAdapter] ⏱️ TIMEOUT: Factory instantiation exceeded 60s');
                reject(new Error('Factory instantiation timeout after 60s'));
              }, 60000)
            ),
          ]);
          StormLibModule = moduleOrPromise.then ? await moduleOrPromise : moduleOrPromise;
        } else if (preDecodedWasmBinary) {
          const factoryResult = StormLibFactory({ wasmBinary: preDecodedWasmBinary });
          // Wrap in Promise.resolve() to ensure it's a real Promise (Emscripten returns thenable, not Promise)
          const factoryPromise = Promise.resolve(factoryResult).then((result: any) => {
            return result;
          });
          const moduleOrPromise = await Promise.race([
            factoryPromise,
            new Promise((_, reject) =>
              setTimeout(() => {
                console.error('[StormJSAdapter] ⏱️ TIMEOUT: Factory instantiation exceeded 60s');
                reject(new Error('Factory instantiation timeout after 60s'));
              }, 60000)
            ),
          ]);
          StormLibModule = moduleOrPromise.then ? await moduleOrPromise : moduleOrPromise;
        } else {
          const factoryResult = StormLibFactory();
          // Wrap in Promise.resolve() to ensure it's a real Promise (Emscripten returns thenable, not Promise)
          const factoryPromise = Promise.resolve(factoryResult).then((result: any) => {
            return result;
          });
          const moduleOrPromise = await Promise.race([
            factoryPromise,
            new Promise((_, reject) =>
              setTimeout(() => {
                console.error('[StormJSAdapter] ⏱️ TIMEOUT: Factory initialization exceeded 60s');
                reject(new Error('Factory initialization timeout after 60s'));
              }, 60000)
            ),
          ]);
          StormLibModule = moduleOrPromise.then ? await moduleOrPromise : moduleOrPromise;
        }

        // Debug: Log what properties are available on the actual module
        // Ensure FS is initialized (Emscripten MEMFS)
        if (!StormLibModule.FS) {
          console.error(
            '[StormJSAdapter] FS not found. Available properties:',
            Object.keys(StormLibModule).join(', ')
          );
          throw new Error('StormLib FS (Emscripten filesystem) not available');
        }

        // Create mount point for virtual filesystem
        try {
          StormLibModule.FS.mkdir(this.VIRTUAL_MOUNT_PATH);
        } catch (err) {
          // Directory might already exist, that's fine
        }

        // Create simple wrappers for MPQ functionality
        // We bypass the broken CommonJS wrapper and use StormLib directly
        const createMPQWrapper = () => {
          return {
            open: async (path: string, mode: string) => {
              const handle = StormLibModule._SFileOpenArchive(
                StormLibModule.allocateUTF8(path),
                0,
                mode === 'r' ? 0x00000100 : 0,
                0
              );

              if (!handle) {
                throw new Error(`Failed to open MPQ archive: ${path}`);
              }

              return {
                openFile: (filename: string) => {
                  const fileHandle = StormLibModule._SFileOpenFileEx(
                    handle,
                    StormLibModule.allocateUTF8(filename),
                    0,
                    0
                  );

                  if (!fileHandle) {
                    throw new Error(`Failed to open file: ${filename}`);
                  }

                  return {
                    read: () => {
                      const size = StormLibModule._SFileGetFileSize(fileHandle, 0);
                      const buffer = StormLibModule._malloc(size);
                      const bytesRead = StormLibModule._SFileReadFile(
                        fileHandle,
                        buffer,
                        size,
                        0,
                        0
                      );

                      if (bytesRead !== size) {
                        StormLibModule._free(buffer);
                        throw new Error(`Failed to read file completely`);
                      }

                      const data = new Uint8Array(
                        StormLibModule.HEAPU8.buffer,
                        buffer,
                        size
                      ).slice(); // Copy the data

                      StormLibModule._free(buffer);
                      return data;
                    },
                    close: () => {
                      StormLibModule._SFileCloseFile(fileHandle);
                    },
                  };
                },
                close: () => {
                  StormLibModule._SFileCloseArchive(handle);
                },
              };
            },
          };
        };

        StormJSWrappers = {
          FS: StormLibModule.FS,
          MPQ: createMPQWrapper(),
          File: null, // Not needed for our use case
        };

        isInitialized = true;
        isInitializing = false;
        initFailureCount = 0; // Reset failure count on success
        // Release WASM compilation lock
        if (currentReleaseLock) {
          (currentReleaseLock as () => void)();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[StormJSAdapter] ❌ Failed to load StormJS:', errorMsg);

        // Release WASM compilation lock even on error
        if (currentReleaseLock) {
          (currentReleaseLock as () => void)();
        }

        // Track failures and reset state
        initFailureCount++;
        isInitializing = false;
        initPromise = null; // Reset so we can retry (up to MAX_INIT_FAILURES)

        throw new Error(
          `Failed to initialize StormJS (attempt ${initFailureCount}/${MAX_INIT_FAILURES}): ${errorMsg}`
        );
      }
    })();

    return initPromise;
  }

  /**
   * Check if StormJS is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error(
        '[StormJSAdapter] ❌ StormJS not available:',
        error instanceof Error ? error.message : String(error)
      );
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

      if (!StormJSWrappers) {
        return {
          success: false,
          error: 'StormJS not initialized',
        };
      }
      const { FS, MPQ } = StormJSWrappers;

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
        // Open MPQ archive
        const mpq = await MPQ.open(this.VIRTUAL_ARCHIVE_PATH, 'r');

        try {
          // Open and read file from archive
          const file = mpq.openFile(fileName);

          try {
            const fileData = file.read();
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

      if (!StormJSWrappers) {
        const error: StormJSExtractResult = {
          success: false,
          error: 'StormJS not initialized',
        };
        fileNames.forEach((name) => results.set(name, error));
        return results;
      }

      const { FS, MPQ } = StormJSWrappers;

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
