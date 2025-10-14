/**
 * Type declarations for @wowserhq/stormjs
 *
 * StormJS is StormLib compiled to WebAssembly via Emscripten
 * Provides MPQ archive reading/writing functionality
 */

declare module '@wowserhq/stormjs' {
  /**
   * Emscripten Filesystem API
   */
  export interface FS {
    /**
     * Create a directory
     */
    mkdir(path: string): void;

    /**
     * Write file to virtual filesystem
     */
    writeFile(path: string, data: Uint8Array): void;

    /**
     * Read file from virtual filesystem
     */
    readFile(path: string): Uint8Array;

    /**
     * Delete file from virtual filesystem
     */
    unlink(path: string): void;

    /**
     * Mount a filesystem
     */
    mount(type: unknown, opts: unknown, mountpoint: string): unknown;

    /**
     * Filesystem types
     */
    filesystems: {
      MEMFS: unknown;
      NODEFS: unknown;
    };
  }

  /**
   * MPQ File handle
   */
  export interface MPQFile {
    /**
     * Read file contents
     */
    read(): Uint8Array;

    /**
     * Close file handle
     */
    close(): void;
  }

  /**
   * MPQ Archive handle
   */
  export interface MPQArchive {
    /**
     * Open a file from the archive
     */
    openFile(filename: string): MPQFile;

    /**
     * Close archive handle
     */
    close(): void;
  }

  /**
   * MPQ Archive API
   */
  export interface MPQStatic {
    /**
     * Open an MPQ archive
     * @param path - Path to MPQ file in virtual filesystem
     * @param mode - Open mode ('r' for read, 'w' for write)
     */
    open(path: string, mode: 'r' | 'w'): Promise<MPQArchive>;
  }

  /**
   * StormJS module exports
   */
  export const FS: FS;
  export const MPQ: MPQStatic;
}
