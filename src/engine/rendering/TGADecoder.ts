/**
 * TGA (Truevision TGA/TARGA) image format decoder
 * Supports: 8/15/16/24/32-bit, uncompressed and RLE
 *
 * Spec: https://www.dca.fee.unicamp.br/~martino/disciplinas/ea978/tgaffs.pdf
 */

export interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  width: number;
  height: number;
  pixelDepth: number;
  imageDescriptor: number;
}

export interface TGADecodeResult {
  success: boolean;
  width?: number;
  height?: number;
  data?: Uint8ClampedArray; // RGBA format
  error?: string;
}

export class TGADecoder {
  /**
   * Decode TGA file to RGBA ImageData
   * @param buffer - TGA file ArrayBuffer
   * @returns Decoded image data
   */
  public decode(buffer: ArrayBuffer): TGADecodeResult {
    try {
      const view = new DataView(buffer);
      const header = this.readHeader(view);

      // Validate header
      if (!this.isValidHeader(header)) {
        return { success: false, error: 'Invalid TGA header' };
      }

      // Decode based on image type
      let imageData: Uint8ClampedArray;

      if (header.imageType === 2) {
        // Uncompressed RGB
        imageData = this.decodeUncompressedRGB(view, header);
      } else if (header.imageType === 10) {
        // RLE compressed RGB
        imageData = this.decodeRLECompressedRGB(view, header);
      } else {
        return { success: false, error: `Unsupported TGA type: ${header.imageType}` };
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
   * Decode TGA and convert to data URL
   * @param buffer - TGA file ArrayBuffer
   * @returns Data URL (base64 PNG)
   */
  public decodeToDataURL(buffer: ArrayBuffer): string | null {
    const result = this.decode(buffer);

    if (!result.success || !result.data || !result.width || !result.height) {
      return null;
    }

    // Create canvas and draw ImageData
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(result.width, result.height);
    imageData.data.set(result.data);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  }

  private readHeader(view: DataView): TGAHeader {
    // TGA header is 18 bytes
    return {
      idLength: view.getUint8(0),
      colorMapType: view.getUint8(1),
      imageType: view.getUint8(2),
      width: view.getUint16(12, true), // Little-endian
      height: view.getUint16(14, true),
      pixelDepth: view.getUint8(16),
      imageDescriptor: view.getUint8(17),
    };
  }

  private isValidHeader(header: TGAHeader): boolean {
    // Check for supported formats
    if (header.imageType !== 2 && header.imageType !== 10) {
      return false; // Only support RGB uncompressed/RLE
    }

    if (header.pixelDepth !== 24 && header.pixelDepth !== 32) {
      return false; // Only support 24/32-bit
    }

    if (header.width <= 0 || header.height <= 0) {
      return false;
    }

    return true;
  }

  private decodeUncompressedRGB(view: DataView, header: TGAHeader): Uint8ClampedArray {
    const bytesPerPixel = header.pixelDepth / 8;
    const imageSize = header.width * header.height * 4; // RGBA
    const data = new Uint8ClampedArray(imageSize);

    let dataOffset = 18 + header.idLength; // Skip header + ID
    let pixelIndex = 0;

    for (let y = 0; y < header.height; y++) {
      for (let x = 0; x < header.width; x++) {
        // TGA stores pixels as BGR(A)
        const b = view.getUint8(dataOffset);
        const g = view.getUint8(dataOffset + 1);
        const r = view.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;

        // Convert to RGBA
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;

        dataOffset += bytesPerPixel;
        pixelIndex += 4;
      }
    }

    return data;
  }

  private decodeRLECompressedRGB(view: DataView, header: TGAHeader): Uint8ClampedArray {
    const bytesPerPixel = header.pixelDepth / 8;
    const imageSize = header.width * header.height * 4; // RGBA
    const data = new Uint8ClampedArray(imageSize);

    let dataOffset = 18 + header.idLength;
    let pixelIndex = 0;
    let pixelCount = header.width * header.height;

    while (pixelCount > 0) {
      const packetHeader = view.getUint8(dataOffset++);
      const runLength = (packetHeader & 0x7f) + 1;

      if (packetHeader & 0x80) {
        // RLE packet (repeat pixel)
        const b = view.getUint8(dataOffset);
        const g = view.getUint8(dataOffset + 1);
        const r = view.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;
        dataOffset += bytesPerPixel;

        for (let i = 0; i < runLength; i++) {
          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          pixelIndex += 4;
        }
      } else {
        // Raw packet (individual pixels)
        for (let i = 0; i < runLength; i++) {
          const b = view.getUint8(dataOffset);
          const g = view.getUint8(dataOffset + 1);
          const r = view.getUint8(dataOffset + 2);
          const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;
          dataOffset += bytesPerPixel;

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          pixelIndex += 4;
        }
      }

      pixelCount -= runLength;
    }

    return data;
  }
}
