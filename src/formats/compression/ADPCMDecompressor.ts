/**
 * ADPCM Decompressor for MPQ Archives
 *
 * Implements Blizzard's IMA ADPCM decompression algorithm
 * Used for audio data in Warcraft 3 MPQ files
 *
 * Based on: https://github.com/ladislav-zezula/StormLib
 */

import type { IDecompressor } from './types';

/**
 * IMA ADPCM step table for delta decoding
 */
const IMA_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73,
  80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494,
  544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499,
  2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
  12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
];

/**
 * IMA ADPCM index table for step index adjustment
 */
const IMA_INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8];

export class ADPCMDecompressor implements IDecompressor {
  /**
   * Decompress ADPCM-compressed audio data
   *
   * @param compressed - Compressed data buffer
   * @param uncompressedSize - Expected size after decompression
   * @param channels - Number of audio channels (1=mono, 2=stereo)
   * @returns Decompressed data
   */
  public async decompress(
    compressed: ArrayBuffer,
    uncompressedSize: number,
    channels: number = 1
  ): Promise<ArrayBuffer> {
    return Promise.resolve().then(() => {
      try {
        const input = new Uint8Array(compressed);
        const output = new Uint8Array(uncompressedSize);

        if (channels === 1) {
          this.decompressMono(input, output);
        } else if (channels === 2) {
          this.decompressStereo(input, output);
        } else {
          throw new Error(`Unsupported number of channels: ${channels}`);
        }

        return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`ADPCM decompression failed: ${errorMsg}`);
      }
    });
  }

  /**
   * Decompress mono (1-channel) ADPCM data
   */
  private decompressMono(input: Uint8Array, output: Uint8Array): void {
    let inPos = 0;
    let outPos = 0;

    // Read initial predictor and step index
    const view = new DataView(input.buffer, input.byteOffset);
    let predictor = view.getInt16(inPos, true);
    inPos += 2;
    let stepIndex = input[inPos++] ?? 0;

    // Write initial sample
    const outView = new DataView(output.buffer, output.byteOffset);
    outView.setInt16(outPos, predictor, true);
    outPos += 2;

    // Decompress samples
    while (inPos < input.length && outPos < output.length) {
      const byte = input[inPos++] ?? 0;

      // Process two 4-bit samples per byte
      for (let shift = 0; shift < 8; shift += 4) {
        if (outPos >= output.length) break;

        const nibble = (byte >> shift) & 0x0f;
        const result = this.decodeSample(nibble, predictor, stepIndex);

        predictor = result.predictor;
        stepIndex = result.stepIndex;

        outView.setInt16(outPos, predictor, true);
        outPos += 2;
      }
    }
  }

  /**
   * Decompress stereo (2-channel) ADPCM data
   */
  private decompressStereo(input: Uint8Array, output: Uint8Array): void {
    let inPos = 0;
    const view = new DataView(input.buffer, input.byteOffset);
    const outView = new DataView(output.buffer, output.byteOffset);

    // Read initial predictors and step indices for both channels
    const predictors = [view.getInt16(inPos, true), view.getInt16(inPos + 2, true)];
    inPos += 4;
    const stepIndices = [input[inPos++] ?? 0, input[inPos++] ?? 0];

    let outPos = 0;

    // Write initial samples
    outView.setInt16(outPos, predictors[0]!, true);
    outPos += 2;
    outView.setInt16(outPos, predictors[1]!, true);
    outPos += 2;

    // Decompress samples (interleaved)
    let channel = 0;
    while (inPos < input.length && outPos < output.length) {
      const byte = input[inPos++] ?? 0;

      // Process two 4-bit samples per byte
      for (let shift = 0; shift < 8; shift += 4) {
        if (outPos >= output.length) break;

        const nibble = (byte >> shift) & 0x0f;
        const result = this.decodeSample(nibble, predictors[channel]!, stepIndices[channel]!);

        predictors[channel] = result.predictor;
        stepIndices[channel] = result.stepIndex;

        outView.setInt16(outPos, result.predictor, true);
        outPos += 2;

        // Alternate channels
        channel = 1 - channel;
      }
    }
  }

  /**
   * Decode a single IMA ADPCM sample
   */
  private decodeSample(
    nibble: number,
    predictor: number,
    stepIndex: number
  ): { predictor: number; stepIndex: number } {
    const step = IMA_STEP_TABLE[stepIndex] ?? 7;

    // Calculate difference
    let diff = step >> 3;
    if (nibble & 4) diff += step;
    if (nibble & 2) diff += step >> 1;
    if (nibble & 1) diff += step >> 2;

    // Apply sign
    if (nibble & 8) {
      predictor -= diff;
    } else {
      predictor += diff;
    }

    // Clamp predictor to 16-bit range
    predictor = Math.max(-32768, Math.min(32767, predictor));

    // Update step index
    stepIndex += IMA_INDEX_TABLE[nibble & 7] ?? 0;
    stepIndex = Math.max(0, Math.min(88, stepIndex));

    return { predictor, stepIndex };
  }

  /**
   * Check if ADPCM decompressor is available
   */
  public isAvailable(): boolean {
    return true;
  }
}
