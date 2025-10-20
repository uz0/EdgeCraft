/**
 * Streaming File Reader for Large Files
 *
 * Enables chunked reading of large files to prevent memory crashes.
 * Designed for reading 100MB+ MPQ archives without loading entire file into memory.
 *
 * @example
 * ```typescript
 * const reader = new StreamingFileReader(file, {
 *   chunkSize: 4 * 1024 * 1024, // 4MB chunks
 * });
 *
 * // Read in chunks
 * for await (const chunk of reader.readChunks()) {
 *   processChunk(chunk.data);
 * }
 *
 * // Or read specific range
 * const header = await reader.readRange(0, 512);
 * ```
 */

/**
 * Configuration for streaming file reader
 */
export interface StreamConfig {
  /** Chunk size in bytes (default: 4MB) */
  chunkSize?: number;

  /** Progress callback (bytesRead, totalBytes) */
  onProgress?: (bytesRead: number, totalBytes: number) => void;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of a chunk read operation
 */
export interface ChunkReadResult {
  /** Chunk data */
  data: Uint8Array;

  /** Chunk offset in file */
  offset: number;

  /** Is this the final chunk */
  isLast: boolean;
}

/**
 * Streaming file reader for large files
 *
 * Uses File.slice() and ArrayBuffer to read files in chunks,
 * preventing browser memory crashes with large files (100MB+).
 */
export class StreamingFileReader {
  private file: File;
  private config: Required<Omit<StreamConfig, 'signal'>> & { signal?: AbortSignal };
  private position: number = 0;

  constructor(file: File, config?: StreamConfig) {
    this.file = file;
    this.config = {
      chunkSize: config?.chunkSize ?? 4 * 1024 * 1024, // 4MB default
      onProgress: config?.onProgress ?? ((): void => {}),
      signal: config?.signal,
    };
  }

  /**
   * Read file in chunks using async generator
   *
   * @yields ChunkReadResult for each chunk
   * @throws Error if stream is aborted via signal
   */
  public async *readChunks(): AsyncGenerator<ChunkReadResult> {
    const totalBytes = this.file.size;

    while (this.position < totalBytes) {
      // Check for cancellation
      if (this.config.signal?.aborted === true) {
        throw new Error('Stream aborted');
      }

      const chunkSize = Math.min(this.config.chunkSize, totalBytes - this.position);
      const blob = this.file.slice(this.position, this.position + chunkSize);
      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      yield {
        data,
        offset: this.position,
        isLast: this.position + chunkSize >= totalBytes,
      };

      this.position += chunkSize;
      this.config.onProgress(this.position, totalBytes);
    }
  }

  /**
   * Read specific byte range from file
   *
   * This is the key method for streaming MPQ parsing - allows reading
   * header, hash table, and block table without loading entire archive.
   *
   * @param offset - Byte offset to start reading
   * @param length - Number of bytes to read
   * @returns Uint8Array containing requested data
   * @throws Error if range exceeds file size
   */
  public async readRange(offset: number, length: number): Promise<Uint8Array> {
    if (offset < 0 || length < 0) {
      throw new Error('Offset and length must be non-negative');
    }

    if (offset + length > this.file.size) {
      throw new Error(
        `Range exceeds file size: requested ${offset}-${offset + length}, file size ${this.file.size}`
      );
    }

    // Check for cancellation
    if (this.config.signal?.aborted === true) {
      throw new Error('Stream aborted');
    }

    const blob = this.file.slice(offset, offset + length);
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Get total file size
   */
  public getSize(): number {
    return this.file.size;
  }

  /**
   * Get current read position (for chunk reading)
   */
  public getPosition(): number {
    return this.position;
  }

  /**
   * Reset read position to start
   */
  public reset(): void {
    this.position = 0;
  }
}
