/**
 * MPQ Parser tests
 */

import { MPQParser } from '@/formats/mpq/MPQParser';

describe('MPQParser', () => {
  it('should create parser instance', () => {
    const buffer = new ArrayBuffer(1024);
    const parser = new MPQParser(buffer);
    expect(parser).toBeDefined();
  });

  it('should reject invalid MPQ magic number', async () => {
    const buffer = new ArrayBuffer(1024);
    const parser = new MPQParser(buffer);

    const result = await parser.parse();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid MPQ header');
  });

  it('should parse valid MPQ header', async () => {
    // Create minimal valid MPQ header
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    // MPQ magic: 'MPQ\x1A'
    view.setUint32(0, 0x1a51504d, true);
    // Header size
    view.setUint32(4, 32, true);
    // Archive size
    view.setUint32(8, 512, true);
    // Format version
    view.setUint16(12, 0, true);
    // Block size (512 * 2^0 = 512)
    view.setUint16(14, 0, true);
    // Hash table pos
    view.setUint32(16, 32, true);
    // Block table pos
    view.setUint32(20, 64, true);
    // Hash table size
    view.setUint32(24, 0, true);
    // Block table size
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    const result = await parser.parse();

    expect(result.success).toBe(true);
    expect(result.archive).toBeDefined();
    expect(result.archive?.header).toBeDefined();
  });

  it('should list files', async () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    // Create valid MPQ header
    view.setUint32(0, 0x1a51504d, true);
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    await parser.parse();

    const files = parser.listFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it('should get archive info', async () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);

    // Create valid MPQ header
    view.setUint32(0, 0x1a51504d, true);
    view.setUint32(4, 32, true);
    view.setUint32(8, 512, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 32, true);
    view.setUint32(20, 64, true);
    view.setUint32(24, 0, true);
    view.setUint32(28, 0, true);

    const parser = new MPQParser(buffer);
    await parser.parse();

    const info = parser.getInfo();
    expect(info).toBeDefined();
    expect(info).toHaveProperty('fileCount');
    expect(info).toHaveProperty('archiveSize');
  });

  it('should return null info before parsing', () => {
    const buffer = new ArrayBuffer(1024);
    const parser = new MPQParser(buffer);

    const info = parser.getInfo();
    expect(info).toBeNull();
  });
});
