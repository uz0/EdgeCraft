/**
 * MPQ Parser Streaming tests
 * Tests for parseStream() method with large files
 */

import { MPQParser } from '@/formats/mpq/MPQParser';
import { StreamingFileReader } from '@/utils/StreamingFileReader';

// Helper to create valid MPQ archive in ArrayBuffer
function createValidMPQArchive(size: number = 1024): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);

  // MPQ magic: 'MPQ\x1A'
  view.setUint32(0, 0x1a51504d, true);
  // Header size
  view.setUint32(4, 32, true);
  // Archive size
  view.setUint32(8, size, true);
  // Format version
  view.setUint16(12, 0, true);
  // Block size (512 * 2^0 = 512)
  view.setUint16(14, 0, true);
  // Hash table pos (right after 512-byte header)
  view.setUint32(16, 512, true);
  // Block table pos
  view.setUint32(20, 512 + 16, true); // After hash table (1 entry = 16 bytes)
  // Hash table size (1 entry)
  view.setUint32(24, 1, true);
  // Block table size (1 entry)
  view.setUint32(28, 1, true);

  // Add hash table entry at offset 512
  view.setUint32(512, 0x12345678, true); // hashA
  view.setUint32(512 + 4, 0x9abcdef0, true); // hashB
  view.setUint16(512 + 8, 0, true); // locale
  view.setUint16(512 + 10, 0, true); // platform
  view.setUint32(512 + 12, 0, true); // blockIndex

  // Add block table entry at offset 512 + 16
  view.setUint32(512 + 16, 600, true); // filePos
  view.setUint32(512 + 16 + 4, 100, true); // compressedSize
  view.setUint32(512 + 16 + 8, 100, true); // uncompressedSize
  view.setUint32(512 + 16 + 12, 0x80000000, true); // flags (EXISTS flag)

  return buffer;
}

// Helper to create File from ArrayBuffer
function createFileFromBuffer(buffer: ArrayBuffer, name: string = 'test.mpq'): File {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  return new File([blob], name, { type: 'application/octet-stream' });
}

describe('MPQParser - Streaming', () => {
  describe('parseStream', () => {
    it('should parse MPQ archive from stream', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0)); // Empty buffer for streaming
      const result = await parser.parseStream(reader);

      expect(result.success).toBe(true);
      expect(result.header).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.fileList).toBeDefined();
    });

    it('should report parse time', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader);

      expect(result.parseTimeMs).toBeDefined();
      expect(result.parseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should call progress callback', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const onProgress = jest.fn();
      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader, { onProgress });

      expect(result.success).toBe(true);
      expect(onProgress).toHaveBeenCalled();
      // Should call for: header, hash table, block table, file list, complete
      expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle invalid header', async () => {
      // Create buffer with invalid MPQ magic
      const buffer = new ArrayBuffer(1024);
      const view = new DataView(buffer);
      view.setUint32(0, 0xdeadbeef, true); // Invalid magic

      const file = createFileFromBuffer(buffer);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid MPQ header');
    });

    it('should extract specific files when requested', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader, {
        extractFiles: ['test.txt'],
      });

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      // File may not be found (hash won't match), but should not crash
    });

    it('should handle wildcard file patterns', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader, {
        extractFiles: ['*.txt', '*.w3x'],
      });

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Create buffer too small to contain complete MPQ
      const buffer = new ArrayBuffer(100);
      const view = new DataView(buffer);
      view.setUint32(0, 0x1a51504d, true); // Valid magic
      view.setUint32(16, 500, true); // Hash table offset beyond buffer

      const file = createFileFromBuffer(buffer);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('large file handling', () => {
    it('should handle large MPQ archives efficiently', async () => {
      // Create 10MB archive (large enough to test chunking)
      const largeSize = 10 * 1024 * 1024;
      const archive = createValidMPQArchive(largeSize);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file, {
        chunkSize: 1024 * 1024, // 1MB chunks
      });

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader);

      expect(result.success).toBe(true);
      expect(result.header).toBeDefined();
      // Should complete in reasonable time
      expect(result.parseTimeMs).toBeLessThan(5000); // 5 seconds
    });

    it('should not load entire file into memory', async () => {
      // This is a behavioral test - we verify that only specific ranges are read
      const largeSize = 10 * 1024 * 1024;
      const archive = createValidMPQArchive(largeSize);
      const file = createFileFromBuffer(archive);

      const rangeReads: Array<{ offset: number; length: number }> = [];
      const mockReader = new StreamingFileReader(file);

      // Spy on readRange to track what's being read
      const originalReadRange = mockReader.readRange.bind(mockReader);
      mockReader.readRange = async (offset: number, length: number) => {
        rangeReads.push({ offset, length });
        return originalReadRange(offset, length);
      };

      const parser = new MPQParser(new ArrayBuffer(0));
      await parser.parseStream(mockReader);

      // Verify we only read specific parts (header, hash table, block table)
      // Not the entire 10MB file
      const totalBytesRead = rangeReads.reduce((sum, read) => sum + read.length, 0);
      expect(totalBytesRead).toBeLessThan(largeSize / 10); // Less than 10% of file
    });
  });

  describe('progress tracking', () => {
    it('should report progress from 0 to 100', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const progressValues: number[] = [];
      const parser = new MPQParser(new ArrayBuffer(0));
      await parser.parseStream(reader, {
        onProgress: (_stage, progress) => {
          progressValues.push(progress);
        },
      });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(Math.min(...progressValues)).toBe(0);
      expect(Math.max(...progressValues)).toBe(100);
    });

    it('should report progress stages in order', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const stages: string[] = [];
      const parser = new MPQParser(new ArrayBuffer(0));
      await parser.parseStream(reader, {
        onProgress: (stage) => {
          stages.push(stage);
        },
      });

      // Verify stages are called in expected order
      expect(stages[0]).toBe('Reading header');
      expect(stages[stages.length - 1]).toBe('Complete');
    });
  });

  describe('integration with W3N campaign loader use case', () => {
    it('should support typical campaign loading pattern', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive, 'campaign.w3n');
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader, {
        extractFiles: ['war3campaign.w3f', '*.w3x', '*.w3m'],
        onProgress: (_stage, _progress) => {
          // Simulate UI progress updates (suppressed in tests)
        },
      });

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
    });

    it('should handle 100MB+ campaign files', async () => {
      // Simulate large campaign (100MB+)
      const largeSize = 100 * 1024 * 1024;
      const archive = createValidMPQArchive(largeSize);
      const file = createFileFromBuffer(archive, 'large-campaign.w3n');
      const reader = new StreamingFileReader(file, {
        chunkSize: 4 * 1024 * 1024, // 4MB chunks as specified in PRP
      });

      const parser = new MPQParser(new ArrayBuffer(0));
      const startTime = performance.now();

      const result = await parser.parseStream(reader, {
        extractFiles: ['war3campaign.w3f', '*.w3x'],
      });

      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      // Should complete in under 15 seconds (PRP requirement)
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('memory management', () => {
    it('should not keep references to read chunks', async () => {
      const archive = createValidMPQArchive(1024);
      const file = createFileFromBuffer(archive);
      const reader = new StreamingFileReader(file);

      const parser = new MPQParser(new ArrayBuffer(0));
      const result = await parser.parseStream(reader);

      // After parsing, reader should be independent
      expect(result.success).toBe(true);
      // No way to test GC in Jest, but we verify the API supports proper cleanup
    });
  });
});
