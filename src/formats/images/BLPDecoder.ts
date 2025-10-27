import { JpegImage } from './jpg.js';

interface BLPHeader {
  magic: number;
  content: number;
  alphaBits: number;
  width: number;
  height: number;
  type: number;
  hasMipmaps: boolean;
  mipmapOffsets: Uint32Array;
  mipmapSizes: Uint32Array;
}

interface DecodedBLP {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  mipmapCount: number;
}

export class BLPDecoder {
  private static readonly BLP1_MAGIC = 0x31504c42;
  private static readonly HEADER_SIZE = 156;
  private static readonly PALETTE_SIZE = 1024;

  private header: BLPHeader | null = null;
  private palette: Uint8Array | null = null;
  private jpgHeader: Uint8Array | null = null;
  private fileData: Uint8Array | null = null;

  public decodeToDataURL(buffer: ArrayBuffer): string | null {
    try {
      const result = this.decode(buffer);
      if (!result) {
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = result.width;
      canvas.height = result.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      const imageData = ctx.createImageData(result.width, result.height);
      imageData.data.set(result.data);
      ctx.putImageData(imageData, 0, 0);

      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  public decode(buffer: ArrayBuffer, mipmapLevel: number = 0): DecodedBLP | null {
    if (!this.load(buffer)) {
      return null;
    }

    return this.getMipmap(mipmapLevel);
  }

  private load(buffer: ArrayBuffer): boolean {
    if (buffer === null || buffer === undefined || buffer.byteLength < BLPDecoder.HEADER_SIZE) {
      return false;
    }

    const header = new Int32Array(buffer, 0, 40);

    if (header[0] !== BLPDecoder.BLP1_MAGIC) {
      return false;
    }

    this.header = {
      magic: header[0] ?? 0,
      content: header[1] ?? 0,
      alphaBits: header[2] ?? 0,
      width: header[3] ?? 0,
      height: header[4] ?? 0,
      type: header[5] ?? 0,
      hasMipmaps: (header[6] ?? 0) !== 0,
      mipmapOffsets: new Uint32Array(16),
      mipmapSizes: new Uint32Array(16),
    };

    for (let i = 0; i < 16; i++) {
      const offset = header[7 + i];
      const size = header[23 + i];
      this.header.mipmapOffsets[i] = offset ?? 0;
      this.header.mipmapSizes[i] = size ?? 0;
    }

    this.fileData = new Uint8Array(buffer);

    if (this.header.content === 0) {
      const jpgHeaderSize = header[39];
      if (jpgHeaderSize !== undefined && jpgHeaderSize > 0) {
        this.jpgHeader = this.fileData.subarray(160, 160 + jpgHeaderSize);
      }
    } else if (this.header.content === 1) {
      this.palette = this.fileData.subarray(
        BLPDecoder.HEADER_SIZE,
        BLPDecoder.HEADER_SIZE + BLPDecoder.PALETTE_SIZE
      );
    }

    return true;
  }

  private getMipmap(level: number): DecodedBLP | null {
    if (!this.header || !this.fileData) {
      return null;
    }

    if (level < 0 || level >= 16) {
      return null;
    }

    const offset = this.header.mipmapOffsets[level] ?? 0;
    const size = this.header.mipmapSizes[level] ?? 0;

    if (size === 0 || offset === 0) {
      return null;
    }

    const width = Math.max(this.header.width >> level, 1);
    const height = Math.max(this.header.height >> level, 1);

    let data: Uint8ClampedArray | null = null;

    if (this.header.content === 0) {
      data = this.decodeJPEGMipmap(offset, size, width, height);
    } else if (this.header.content === 1) {
      data = this.decodePaletteMipmap(offset, width, height);
    }

    if (!data) {
      return null;
    }

    return {
      width,
      height,
      data,
      mipmapCount: this.countMipmaps(),
    };
  }

  private decodeJPEGMipmap(
    offset: number,
    size: number,
    _width: number,
    _height: number
  ): Uint8ClampedArray | null {
    if (!this.jpgHeader || !this.fileData) {
      return null;
    }

    const jpegData = new Uint8Array(this.jpgHeader.length + size);
    jpegData.set(this.jpgHeader);
    jpegData.set(this.fileData.subarray(offset, offset + size), this.jpgHeader.length);

    const jpegImage = new JpegImage();
    jpegImage.parse(jpegData);

    const imageData = new ImageData(jpegImage.width, jpegImage.height);
    jpegImage.getData(imageData);

    return imageData.data;
  }

  private decodePaletteMipmap(
    offset: number,
    width: number,
    height: number
  ): Uint8ClampedArray | null {
    if (!this.palette || !this.fileData || !this.header) {
      return null;
    }

    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);

    for (let i = 0; i < pixelCount; i++) {
      const paletteIndex = this.fileData[offset + i];
      if (paletteIndex === undefined) {
        continue;
      }
      const pi = paletteIndex * 4;

      const r = this.palette[pi + 2];
      const g = this.palette[pi + 1];
      const b = this.palette[pi + 0];

      data[i * 4 + 0] = r !== undefined ? r : 0;
      data[i * 4 + 1] = g !== undefined ? g : 0;
      data[i * 4 + 2] = b !== undefined ? b : 0;
      data[i * 4 + 3] = 255;
    }

    if (this.header.alphaBits > 0) {
      const alphaOffset = offset + pixelCount;
      const bitStream = new BitStream(this.fileData, alphaOffset);
      const scaler = ((1 << 8) - 1) / ((1 << this.header.alphaBits) - 1);

      for (let i = 0; i < pixelCount; i++) {
        const alphaValue = bitStream.readBits(this.header.alphaBits);
        data[i * 4 + 3] = Math.round(alphaValue * scaler);
      }
    }

    return data;
  }

  private countMipmaps(): number {
    if (!this.header) {
      return 0;
    }

    let count = 0;
    for (let i = 0; i < 16; i++) {
      const size = this.header.mipmapSizes[i] ?? 0;
      if (size > 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}

class BitStream {
  private data: Uint8Array;
  private index: number = 0;
  private bitBuffer: number = 0;
  private bits: number = 0;

  constructor(data: Uint8Array, offset: number) {
    this.data = data;
    this.index = offset;
  }

  public readBits(numBits: number): number {
    while (this.bits < numBits) {
      if (this.index >= this.data.length) {
        return 0;
      }
      const byte = this.data[this.index];
      if (byte !== undefined) {
        this.bitBuffer |= byte << this.bits;
        this.bits += 8;
      }
      this.index++;
    }

    const result = this.bitBuffer & ((1 << numBits) - 1);
    this.bitBuffer >>= numBits;
    this.bits -= numBits;

    return result;
  }
}
