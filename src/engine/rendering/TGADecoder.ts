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
      // eslint-disable-line no-empty
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decode TGA and convert to data URL
   * @param buffer - TGA file ArrayBuffer
   * @param maxSize - Maximum width/height (default: 512, safe for previews)
   * @returns Data URL (base64 PNG)
   */
  public async decodeToDataURL(buffer: ArrayBuffer, maxSize: number = 512): Promise<string | null> {
    const result = this.decode(buffer);

    if (!result.success || !result.data || !result.width || !result.height) {
      return null;
    }

    // Calculate target dimensions (always scale to safe size for previews)
    let targetWidth = result.width;
    let targetHeight = result.height;
    const maxDim = Math.max(result.width, result.height);

    if (maxDim > maxSize) {
      const scale = maxSize / maxDim;
      targetWidth = Math.floor(result.width * scale);
      targetHeight = Math.floor(result.height * scale);
    }

    // For large images, use chunked downscaling to avoid canvas size limits
    // Process in chunks if original is too large
    const CANVAS_LIMIT = 8192; // Increased limit - W3N campaigns have ~9000px TGAs
    const needsChunking = result.width > CANVAS_LIMIT || result.height > CANVAS_LIMIT;

    if (needsChunking) {
      // For very large images, downsample the pixel data directly before canvas rendering
      const downscaledData = this.downsamplePixelData(
        result.data,
        result.width,
        result.height,
        targetWidth,
        targetHeight
      );

      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const imageData = ctx.createImageData(targetWidth, targetHeight);
      imageData.data.set(downscaledData);
      ctx.putImageData(imageData, 0, 0);

      const blob = await canvas.convertToBlob({ type: 'image/png' });
      return await this.blobToDataUrl(blob);
    }

    // For normal-sized images, use standard canvas scaling
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If no scaling needed, use putImageData directly
    if (targetWidth === result.width && targetHeight === result.height) {
      const imageData = ctx.createImageData(result.width, result.height);
      imageData.data.set(result.data);
      ctx.putImageData(imageData, 0, 0);
    } else {
      // Create temp canvas for scaling
      const tempCanvas = new OffscreenCanvas(result.width, result.height);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      const imageData = tempCtx.createImageData(result.width, result.height);
      imageData.data.set(result.data);
      tempCtx.putImageData(imageData, 0, 0);

      // Scale to target size
      ctx.drawImage(tempCanvas, 0, 0, result.width, result.height, 0, 0, targetWidth, targetHeight);
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await this.blobToDataUrl(blob);
  }

  /**
   * Convert Blob to data URL (for OffscreenCanvas compatibility)
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Downsample pixel data directly (bilinear interpolation)
   * Used for very large images to avoid canvas size limits
   */
  private downsamplePixelData(
    sourceData: Uint8ClampedArray,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): Uint8ClampedArray {
    const targetData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
    const xRatio = sourceWidth / targetWidth;
    const yRatio = sourceHeight / targetHeight;

    for (let ty = 0; ty < targetHeight; ty++) {
      for (let tx = 0; tx < targetWidth; tx++) {
        // Find source position (bilinear sampling)
        const sx = tx * xRatio;
        const sy = ty * yRatio;
        const sx0 = Math.floor(sx);
        const sy0 = Math.floor(sy);
        const sx1 = Math.min(sx0 + 1, sourceWidth - 1);
        const sy1 = Math.min(sy0 + 1, sourceHeight - 1);

        // Sample 4 pixels
        const idx00 = (sy0 * sourceWidth + sx0) * 4;
        const idx10 = (sy0 * sourceWidth + sx1) * 4;
        const idx01 = (sy1 * sourceWidth + sx0) * 4;
        const idx11 = (sy1 * sourceWidth + sx1) * 4;

        // Bilinear weights
        const wx = sx - sx0;
        const wy = sy - sy0;

        const targetIdx = (ty * targetWidth + tx) * 4;

        // Interpolate each channel
        for (let c = 0; c < 4; c++) {
          const v00 = sourceData[idx00 + c] ?? 0;
          const v10 = sourceData[idx10 + c] ?? 0;
          const v01 = sourceData[idx01 + c] ?? 0;
          const v11 = sourceData[idx11 + c] ?? 0;

          const v0 = v00 * (1 - wx) + v10 * wx;
          const v1 = v01 * (1 - wx) + v11 * wx;
          const v = v0 * (1 - wy) + v1 * wy;

          targetData[targetIdx + c] = Math.round(v);
        }
      }
    }

    return targetData;
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

    // Check image origin (bit 5 of imageDescriptor)
    // 0 = origin at bottom-left (upside down), 1 = origin at top-left (normal)
    const originAtTop = (header.imageDescriptor & 0x20) !== 0;
    for (let y = 0; y < header.height; y++) {
      for (let x = 0; x < header.width; x++) {
        // TGA stores pixels as BGR(A)
        const b = view.getUint8(dataOffset);
        const g = view.getUint8(dataOffset + 1);
        const r = view.getUint8(dataOffset + 2);
        const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;

        // Calculate pixel position (flip vertically if origin is at bottom)
        const targetY = originAtTop ? y : header.height - 1 - y;
        const pixelIndex = (targetY * header.width + x) * 4;

        // Convert to RGBA
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;

        dataOffset += bytesPerPixel;
      }
    }

    return data;
  }

  private decodeRLECompressedRGB(view: DataView, header: TGAHeader): Uint8ClampedArray {
    const bytesPerPixel = header.pixelDepth / 8;
    const imageSize = header.width * header.height * 4; // RGBA
    const data = new Uint8ClampedArray(imageSize);

    let dataOffset = 18 + header.idLength;
    let currentPixel = 0; // Current pixel in scan-line order
    let pixelCount = header.width * header.height;

    // Check image origin (bit 5 of imageDescriptor)
    const originAtTop = (header.imageDescriptor & 0x20) !== 0;
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
          // Calculate position with vertical flip if needed
          const x = currentPixel % header.width;
          const y = Math.floor(currentPixel / header.width);
          const targetY = originAtTop ? y : header.height - 1 - y;
          const pixelIndex = (targetY * header.width + x) * 4;

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          currentPixel++;
        }
      } else {
        // Raw packet (individual pixels)
        for (let i = 0; i < runLength; i++) {
          const b = view.getUint8(dataOffset);
          const g = view.getUint8(dataOffset + 1);
          const r = view.getUint8(dataOffset + 2);
          const a = bytesPerPixel === 4 ? view.getUint8(dataOffset + 3) : 255;
          dataOffset += bytesPerPixel;

          // Calculate position with vertical flip if needed
          const x = currentPixel % header.width;
          const y = Math.floor(currentPixel / header.width);
          const targetY = originAtTop ? y : header.height - 1 - y;
          const pixelIndex = (targetY * header.width + x) * 4;

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
          currentPixel++;
        }
      }

      pixelCount -= runLength;
    }

    return data;
  }
}
