/**
 * BLP (Blizzard Picture) image format decoder
 * Supports: BLP1 (WC3 Classic) and BLP2 (WC3 Reforged)
 *
 * BLP1: JPEG compression or palette-indexed
 * BLP2: DXT compression or raw BGRA
 *
 * References:
 * - https://warcraft.wiki.gg/wiki/BLP_files
 * - https://www.hiveworkshop.com/threads/blp-specifications-wc3.279306/
 *
 * Note: Complex compression (JPEG, DXT) requires external libraries
 * This implementation supports palette and raw formats only
 */

export interface BLPHeader {
  magic: string; // 'BLP1' or 'BLP2'
  version: number; // BLP version
  compression: number; // Compression type
  alphaBits: number; // Alpha channel bit depth
  width: number;
  height: number;
  hasMipmaps: boolean;
  mipmapOffsets: number[];
  mipmapLengths: number[];
}

export interface BLPDecodeResult {
  success: boolean;
  width?: number;
  height?: number;
  data?: Uint8ClampedArray; // RGBA format
  error?: string;
}

export class BLPDecoder {
  /**
   * Decode BLP file to RGBA ImageData
   * @param buffer - BLP file ArrayBuffer
   * @returns Decoded image data
   */
  public decode(buffer: ArrayBuffer): BLPDecodeResult {
    try {
      const view = new DataView(buffer);
      const header = this.readHeader(view);

      // Validate header
      if (!this.isValidHeader(header)) {
        return { success: false, error: 'Invalid BLP header' };
      }
      // Decode based on version and compression
      let imageData: Uint8ClampedArray;

      if (header.magic === 'BLP1') {
        imageData = this.decodeBLP1(view, header);
      } else if (header.magic === 'BLP2') {
        imageData = this.decodeBLP2(view, header);
      } else {
        return { success: false, error: `Unsupported BLP version: ${header.magic}` };
      }

      return {
        success: true,
        width: header.width,
        height: header.height,
        data: imageData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decode BLP and convert to data URL
   * @param buffer - BLP file ArrayBuffer
   * @param maxSize - Maximum width/height (default: 512, safe for previews)
   * @returns Data URL (base64 PNG)
   */
  public decodeToDataURL(buffer: ArrayBuffer, maxSize: number = 512): string | null {
    const result = this.decode(buffer);

    if (!result.success || !result.data || !result.width || !result.height) {
      console.error(`[BLPDecoder] Decode failed: ${result.error}`);
      return null;
    }

    // Check if this is a BLP1 JPEG data URL marker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if ((result.data as any)._blp1JpegDataURL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const dataURL = (result.data as any)._blp1JpegDataURL;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`[BLPDecoder] ✅ Returning BLP1 JPEG data URL (${dataURL.length} chars)`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return dataURL;
    }

    // Calculate target dimensions (scale to safe size for previews)
    let targetWidth = result.width;
    let targetHeight = result.height;
    const maxDim = Math.max(result.width, result.height);

    if (maxDim > maxSize) {
      const scale = maxSize / maxDim;
      targetWidth = Math.floor(result.width * scale);
      targetHeight = Math.floor(result.height * scale);
    }

    // Create canvas and render
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If no scaling needed, use putImageData directly
    if (targetWidth === result.width && targetHeight === result.height) {
      const imageData = ctx.createImageData(result.width, result.height);
      imageData.data.set(result.data);
      ctx.putImageData(imageData, 0, 0);
    } else {
      // Create temp canvas for scaling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = result.width;
      tempCanvas.height = result.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      const imageData = tempCtx.createImageData(result.width, result.height);
      imageData.data.set(result.data);
      tempCtx.putImageData(imageData, 0, 0);

      // Scale to target size
      ctx.drawImage(tempCanvas, 0, 0, result.width, result.height, 0, 0, targetWidth, targetHeight);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Read BLP header from DataView
   */
  private readHeader(view: DataView): BLPHeader {
    // Read magic number (4 bytes)
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    if (magic === 'BLP1') {
      return this.readBLP1Header(view);
    } else if (magic === 'BLP2') {
      return this.readBLP2Header(view);
    } else {
      throw new Error(`Unknown BLP magic: ${magic}`);
    }
  }

  /**
   * Read BLP1 header (WC3 Classic)
   *
   * BLP1 header structure (148 bytes total):
   * 0x00: magic "BLP1" (4 bytes)
   * 0x04: compression type (4 bytes) - 0=JPEG, 1=palette
   * 0x08: alpha bits (4 bytes)
   * 0x0C: width (4 bytes)
   * 0x10: height (4 bytes)
   * 0x14: picture type flags (4 bytes)
   * 0x18: picture subtype / has mipmaps (4 bytes)
   * 0x1C: mipmap offsets array (16 × 4 = 64 bytes, ends at 0x5C)
   * 0x5C: mipmap lengths array (16 × 4 = 64 bytes, ends at 0x9C)
   * 0x9C: palette data starts (256 × 4 = 1024 bytes)
   */
  private readBLP1Header(view: DataView): BLPHeader {
    return {
      magic: 'BLP1',
      version: 1,
      compression: view.getUint32(4, true), // 0 = JPEG, 1 = palette
      alphaBits: view.getUint32(8, true),
      width: view.getUint32(12, true),
      height: view.getUint32(16, true),
      hasMipmaps: view.getUint32(24, true) !== 0, // Offset 0x18 = byte 24
      mipmapOffsets: Array.from({ length: 16 }, (_, i) => view.getUint32(28 + i * 4, true)), // Offset 0x1C = byte 28
      mipmapLengths: Array.from({ length: 16 }, (_, i) => view.getUint32(92 + i * 4, true)), // Offset 0x5C = byte 92
    };
  }

  /**
   * Read BLP2 header (WC3 Reforged)
   */
  private readBLP2Header(view: DataView): BLPHeader {
    return {
      magic: 'BLP2',
      version: view.getUint32(4, true), // Usually 1
      compression: view.getUint8(8), // 1 = raw, 2 = DXTC, 3 = A8R8G8B8
      alphaBits: view.getUint8(9),
      width: view.getUint32(12, true),
      height: view.getUint32(16, true),
      hasMipmaps: view.getUint8(11) !== 0,
      mipmapOffsets: Array.from({ length: 16 }, (_, i) => view.getUint32(20 + i * 4, true)),
      mipmapLengths: Array.from({ length: 16 }, (_, i) => view.getUint32(84 + i * 4, true)),
    };
  }

  /**
   * Validate BLP header
   */
  private isValidHeader(header: BLPHeader): boolean {
    if (header.magic !== 'BLP1' && header.magic !== 'BLP2') {
      return false;
    }

    if (header.width <= 0 || header.height <= 0) {
      return false;
    }

    if (header.width > 4096 || header.height > 4096) {
      return false;
    }

    return true;
  }

  /**
   * Decode BLP1 data
   */
  private decodeBLP1(view: DataView, header: BLPHeader): Uint8ClampedArray {
    if (header.compression === 0) {
      // JPEG compression - use browser's native JPEG decoder
      return this.decodeBLP1JPEG(view, header);
    } else if (header.compression === 1) {
      // Palette-indexed
      return this.decodeBLP1Paletted(view, header);
    } else {
      throw new Error(`Unknown BLP1 compression: ${header.compression}`);
    }
  }

  /**
   * Decode BLP2 data
   */
  private decodeBLP2(view: DataView, header: BLPHeader): Uint8ClampedArray {
    if (header.compression === 1) {
      // RAW1 - Palette-indexed
      return this.decodeBLP2Paletted(view, header);
    } else if (header.compression === 2) {
      // DXTC - DXT1/DXT3/DXT5 compression - not supported yet
      throw new Error(
        'BLP2 DXT compression not yet supported. Requires DXT decompression library. Will fallback to terrain generation.'
      );
    } else if (header.compression === 3) {
      // RAW3 - Raw BGRA
      return this.decodeBLP2RawBGRA(view, header);
    } else {
      throw new Error(`Unknown BLP2 compression: ${header.compression}`);
    }
  }

  /**
   * Decode BLP1 JPEG data
   * BLP1 JPEG uses a shared JPEG header stored at offset 0x98 (152)
   * Each mipmap shares this header and only stores the image data portion
   *
   * NOTE: This returns a special marker that signals the caller to use
   * the browser's native JPEG decoder asynchronously
   */
  private decodeBLP1JPEG(view: DataView, header: BLPHeader): Uint8ClampedArray {
    // BLP1 JPEG format:
    // - JPEG header starts at offset 156 and continues to the first mipmap offset
    // - Mipmap data continues the JPEG stream (no SOI marker, starts with SOF0)
    // - We need to extract the entire JPEG as one continuous stream

    // Get first mipmap data
    const mipmapOffset = header.mipmapOffsets[0] ?? 0;
    const mipmapLength = header.mipmapLengths[0] ?? 0;

    if (mipmapOffset === 0 || mipmapLength === 0) {
      throw new Error(`Invalid mipmap data in BLP1 JPEG`);
    }

    // JPEG header starts at offset 156 (after 16 mipmap offsets + 16 mipmap lengths)
    const jpegHeaderOffset = 156;
    const jpegHeaderSize = mipmapOffset - jpegHeaderOffset;

    console.log(
      `[BLPDecoder] BLP1 JPEG: headerOffset=${jpegHeaderOffset}, headerSize=${jpegHeaderSize}, mipmapOffset=${mipmapOffset}, mipmapLength=${mipmapLength}`
    );

    // Reconstruct full JPEG by combining header + mipmap data
    const jpegData = new Uint8Array(jpegHeaderSize + mipmapLength);

    // Copy JPEG header (from offset 156 to first mipmap)
    const headerBytes = new Uint8Array(
      view.buffer,
      view.byteOffset + jpegHeaderOffset,
      jpegHeaderSize
    );
    jpegData.set(headerBytes, 0);

    // Copy mipmap image data
    const imageBytes = new Uint8Array(view.buffer, view.byteOffset + mipmapOffset, mipmapLength);
    jpegData.set(imageBytes, jpegHeaderSize);

    // Convert to base64 data URL that can be used directly in <img> tags
    // Use chunk-based encoding to avoid "Maximum call stack size exceeded" with large arrays
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < jpegData.length; i += chunkSize) {
      const chunk = jpegData.subarray(i, Math.min(i + chunkSize, jpegData.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    const dataURL = `data:image/jpeg;base64,${base64}`;

    // Store the data URL in a special property that decodeToDataURL can detect
    const marker = new Uint8ClampedArray(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (marker as any)._blp1JpegDataURL = dataURL;
    return marker;
  }

  /**
   * Decode BLP1 palette-indexed data
   */
  private decodeBLP1Paletted(view: DataView, header: BLPHeader): Uint8ClampedArray {
    // BLP1 palette is 256 entries × 4 bytes (BGRA), starts after header
    const paletteOffset = 156; // After header and mipmap info
    const palette: number[][] = [];

    for (let i = 0; i < 256; i++) {
      const offset = paletteOffset + i * 4;
      const b = view.getUint8(offset);
      const g = view.getUint8(offset + 1);
      const r = view.getUint8(offset + 2);
      const a = view.getUint8(offset + 3);
      palette.push([r, g, b, a]);
    }

    // Get first mipmap data
    const dataOffset = header.mipmapOffsets[0] ?? 0;
    const dataLength = header.mipmapLengths[0] ?? 0;

    if (dataOffset === 0 || dataLength === 0) {
      throw new Error('Invalid mipmap data');
    }

    const imageSize = header.width * header.height * 4; // RGBA
    const imageData = new Uint8ClampedArray(imageSize);

    // Decode indexed pixels
    for (let i = 0; i < header.width * header.height; i++) {
      const paletteIndex = view.getUint8(dataOffset + i);
      const color = palette[paletteIndex] ?? [0, 0, 0, 255];

      imageData[i * 4] = color[0]!; // R
      imageData[i * 4 + 1] = color[1]!; // G
      imageData[i * 4 + 2] = color[2]!; // B
      imageData[i * 4 + 3] = color[3]!; // A
    }

    return imageData;
  }

  /**
   * Decode BLP2 palette-indexed data (RAW1)
   */
  private decodeBLP2Paletted(view: DataView, header: BLPHeader): Uint8ClampedArray {
    // BLP2 palette is similar to BLP1
    const paletteOffset = 148; // After BLP2 header
    const palette: number[][] = [];

    for (let i = 0; i < 256; i++) {
      const offset = paletteOffset + i * 4;
      const b = view.getUint8(offset);
      const g = view.getUint8(offset + 1);
      const r = view.getUint8(offset + 2);
      const a = view.getUint8(offset + 3);
      palette.push([r, g, b, a]);
    }

    // Get first mipmap data
    const dataOffset = header.mipmapOffsets[0] ?? 0;
    const dataLength = header.mipmapLengths[0] ?? 0;

    if (dataOffset === 0 || dataLength === 0) {
      throw new Error('Invalid mipmap data');
    }

    const imageSize = header.width * header.height * 4; // RGBA
    const imageData = new Uint8ClampedArray(imageSize);

    // Decode indexed pixels
    for (let i = 0; i < header.width * header.height; i++) {
      const paletteIndex = view.getUint8(dataOffset + i);
      const color = palette[paletteIndex] ?? [0, 0, 0, 255];

      imageData[i * 4] = color[0]!; // R
      imageData[i * 4 + 1] = color[1]!; // G
      imageData[i * 4 + 2] = color[2]!; // B
      imageData[i * 4 + 3] = color[3]!; // A
    }

    return imageData;
  }

  /**
   * Decode BLP2 raw BGRA data (RAW3)
   */
  private decodeBLP2RawBGRA(view: DataView, header: BLPHeader): Uint8ClampedArray {
    // Get first mipmap data
    const dataOffset = header.mipmapOffsets[0] ?? 0;
    const dataLength = header.mipmapLengths[0] ?? 0;

    if (dataOffset === 0 || dataLength === 0) {
      throw new Error('Invalid mipmap data');
    }

    const imageSize = header.width * header.height * 4; // RGBA
    const imageData = new Uint8ClampedArray(imageSize);

    // BLP2 stores as BGRA, convert to RGBA
    for (let i = 0; i < header.width * header.height; i++) {
      const offset = dataOffset + i * 4;
      const b = view.getUint8(offset);
      const g = view.getUint8(offset + 1);
      const r = view.getUint8(offset + 2);
      const a = view.getUint8(offset + 3);

      imageData[i * 4] = r;
      imageData[i * 4 + 1] = g;
      imageData[i * 4 + 2] = b;
      imageData[i * 4 + 3] = a;
    }

    return imageData;
  }
}
