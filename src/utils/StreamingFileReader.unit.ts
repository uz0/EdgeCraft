/**
 * StreamingFileReader tests
 */

import { StreamingFileReader } from './StreamingFileReader';

// Helper function to create mock File
function createMockFile(size: number, name: string = 'test.bin'): File {
  // Create ArrayBuffer with test data
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  // Fill with sequential bytes for testing
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  return new File([blob], name, { type: 'application/octet-stream' });
}

describe('StreamingFileReader', () => {
  describe('constructor', () => {
    it('should create reader with default config', () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      expect(reader).toBeDefined();
      expect(reader.getSize()).toBe(1024);
    });

    it('should create reader with custom chunk size', () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file, {
        chunkSize: 512,
      });

      expect(reader).toBeDefined();
      expect(reader.getSize()).toBe(1024);
    });

    it('should create reader with progress callback', () => {
      const file = createMockFile(1024);
      const onProgress = jest.fn();

      const reader = new StreamingFileReader(file, {
        onProgress,
      });

      expect(reader).toBeDefined();
    });
  });

  describe('getSize', () => {
    it('should return correct file size', () => {
      const file = createMockFile(2048);
      const reader = new StreamingFileReader(file);

      expect(reader.getSize()).toBe(2048);
    });
  });

  describe('getPosition', () => {
    it('should return initial position as 0', () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      expect(reader.getPosition()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset position to 0', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file, { chunkSize: 256 });

      // Read chunks until position is updated
      let chunkCount = 0;
      for await (const _chunk of reader.readChunks()) {
        chunkCount++;
        if (chunkCount === 2) {
          // After consuming 2 chunks, position should be updated for the first chunk
          // (position updates happen after yield, so 2nd chunk's update is pending)
          break;
        }
      }

      // Position should be 256 (first chunk processed, second chunk read but not yet position-updated)
      expect(reader.getPosition()).toBe(256);

      reader.reset();
      expect(reader.getPosition()).toBe(0);
    });
  });

  describe('readRange', () => {
    it('should read specific byte range', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      const data = await reader.readRange(0, 100);

      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(100);
      // Verify data content
      for (let i = 0; i < 100; i++) {
        expect(data[i]).toBe(i % 256);
      }
    });

    it('should read range from middle of file', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      const data = await reader.readRange(500, 100);

      expect(data.length).toBe(100);
      // Verify data content starts at offset 500
      for (let i = 0; i < 100; i++) {
        expect(data[i]).toBe((500 + i) % 256);
      }
    });

    it('should throw error if range exceeds file size', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      await expect(reader.readRange(0, 2000)).rejects.toThrow('Range exceeds file size');
    });

    it('should throw error if offset is negative', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      await expect(reader.readRange(-10, 100)).rejects.toThrow('non-negative');
    });

    it('should throw error if length is negative', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      await expect(reader.readRange(0, -100)).rejects.toThrow('non-negative');
    });

    it('should handle reading to end of file', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file);

      const data = await reader.readRange(1000, 24);

      expect(data.length).toBe(24);
    });
  });

  describe('readChunks', () => {
    it('should read file in chunks', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file, { chunkSize: 256 });

      const chunks: Uint8Array[] = [];
      for await (const chunk of reader.readChunks()) {
        chunks.push(chunk.data);
      }

      expect(chunks.length).toBe(4); // 1024 / 256 = 4 chunks
      chunks.forEach((chunk) => {
        expect(chunk.length).toBe(256);
      });
    });

    it('should handle non-divisible file sizes', async () => {
      const file = createMockFile(1000);
      const reader = new StreamingFileReader(file, { chunkSize: 256 });

      const chunks: Uint8Array[] = [];
      for await (const chunk of reader.readChunks()) {
        chunks.push(chunk.data);
      }

      expect(chunks.length).toBe(4); // ceil(1000 / 256) = 4 chunks
      expect(chunks[0]?.length).toBe(256);
      expect(chunks[1]?.length).toBe(256);
      expect(chunks[2]?.length).toBe(256);
      expect(chunks[3]?.length).toBe(232); // Remaining bytes
    });

    it('should provide correct chunk metadata', async () => {
      const file = createMockFile(512);
      const reader = new StreamingFileReader(file, { chunkSize: 256 });

      const metadata: Array<{ offset: number; isLast: boolean }> = [];
      for await (const chunk of reader.readChunks()) {
        metadata.push({ offset: chunk.offset, isLast: chunk.isLast });
      }

      expect(metadata).toEqual([
        { offset: 0, isLast: false },
        { offset: 256, isLast: true },
      ]);
    });

    it('should call progress callback', async () => {
      const file = createMockFile(512);
      const onProgress = jest.fn();
      const reader = new StreamingFileReader(file, {
        chunkSize: 256,
        onProgress,
      });

      for await (const _chunk of reader.readChunks()) {
        // Consume chunks
      }

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(256, 512);
      expect(onProgress).toHaveBeenCalledWith(512, 512);
    });

    it('should handle empty file', async () => {
      const file = createMockFile(0);
      const reader = new StreamingFileReader(file);

      const chunks: Uint8Array[] = [];
      for await (const chunk of reader.readChunks()) {
        chunks.push(chunk.data);
      }

      expect(chunks.length).toBe(0);
    });

    it('should handle file smaller than chunk size', async () => {
      const file = createMockFile(100);
      const reader = new StreamingFileReader(file, { chunkSize: 1024 });

      const chunks: Uint8Array[] = [];
      for await (const chunk of reader.readChunks()) {
        chunks.push(chunk.data);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0]?.length).toBe(100);
    });
  });

  describe('abort signal', () => {
    it('should abort readRange when signal is aborted', async () => {
      const file = createMockFile(1024);
      const controller = new AbortController();
      const reader = new StreamingFileReader(file, {
        signal: controller.signal,
      });

      controller.abort();

      await expect(reader.readRange(0, 100)).rejects.toThrow('Stream aborted');
    });

    it('should abort readChunks when signal is aborted', async () => {
      const file = createMockFile(1024);
      const controller = new AbortController();
      const reader = new StreamingFileReader(file, {
        chunkSize: 256,
        signal: controller.signal,
      });

      const iterator = reader.readChunks();

      // Read first chunk
      const first = await iterator.next();
      expect(first.value).toBeDefined();

      // Abort before second chunk
      controller.abort();

      // Attempt to read next chunk
      await expect(iterator.next()).rejects.toThrow('Stream aborted');
    });
  });

  describe('large file simulation', () => {
    it('should handle large file with many chunks', async () => {
      const largeSize = 10 * 1024 * 1024; // 10MB
      const file = createMockFile(largeSize);
      const reader = new StreamingFileReader(file, {
        chunkSize: 1024 * 1024, // 1MB chunks
      });

      let chunkCount = 0;
      let totalBytesRead = 0;

      for await (const chunk of reader.readChunks()) {
        chunkCount++;
        totalBytesRead += chunk.data.length;
      }

      expect(chunkCount).toBe(10);
      expect(totalBytesRead).toBe(largeSize);
    });

    it('should read specific header from large file', async () => {
      const largeSize = 10 * 1024 * 1024; // 10MB
      const file = createMockFile(largeSize);
      const reader = new StreamingFileReader(file);

      // Read only first 512 bytes (like MPQ header)
      const header = await reader.readRange(0, 512);

      expect(header.length).toBe(512);
      // Verify we only read what we needed, not the entire file
      expect(reader.getPosition()).toBe(0); // readRange doesn't update position
    });
  });

  describe('data integrity', () => {
    it('should read entire file through chunks with correct data', async () => {
      const file = createMockFile(1024);
      const reader = new StreamingFileReader(file, { chunkSize: 256 });

      const allData: number[] = [];
      for await (const chunk of reader.readChunks()) {
        allData.push(...Array.from(chunk.data));
      }

      expect(allData.length).toBe(1024);
      // Verify data integrity
      for (let i = 0; i < 1024; i++) {
        expect(allData[i]).toBe(i % 256);
      }
    });
  });
});
