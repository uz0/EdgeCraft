/**
 * W3F Campaign Info Parser
 * Parses war3campaign.w3f file from W3N campaign archives
 *
 * Based on: https://www.hiveworkshop.com/threads/parsing-metadata-from-w3m-w3x-w3n.322007/
 */

import type { W3FCampaignInfo, CampaignDifficulty } from './types';
import type { RGBA } from '../types';

/**
 * Parse war3campaign.w3f file
 */
export class W3FCampaignInfoParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Parse the entire w3f file
   */
  public parse(): W3FCampaignInfo {
    this.offset = 0;

    // Read file format version (currently 1)
    const formatVersion = this.readInt32();

    // Read campaign version (save count)
    const campaignVersion = this.readInt32();

    // Read editor version
    const editorVersion = this.readInt32();

    // Read campaign metadata
    const name = this.readString();
    const difficulty = this.readString();
    const author = this.readString();
    const description = this.readString();

    // Read difficulty flags
    // 0 = Fixed Difficulty, Only w3m maps
    // 1 = Variable Difficulty, Only w3m maps
    // 2 = Fixed Difficulty, Contains w3x maps
    // 3 = Variable Difficulty, Contains w3x maps
    const difficultyFlags = this.readInt32() as CampaignDifficulty;

    // Read background screen settings
    const screenIndex = this.readInt32();
    const customBackgroundPath = this.readString();
    const minimapPath = this.readString();

    // Read ambient sound settings
    const soundIndex = this.readInt32();
    const customSoundPath = this.readString();

    // Read terrain fog settings
    const fogStyleIndex = this.readInt32();
    const fogZStart = this.readFloat32();
    const fogZEnd = this.readFloat32();
    const fogDensity = this.readFloat32();

    // Read fog color (RGBA)
    const fogColor: RGBA = {
      r: this.readUint8(),
      g: this.readUint8(),
      b: this.readUint8(),
      a: this.readUint8(),
    };

    return {
      formatVersion,
      campaignVersion,
      editorVersion,
      name,
      difficulty,
      author,
      description,
      difficultyFlags,
      background: {
        screenIndex,
        customPath: customBackgroundPath,
        minimapPath,
      },
      ambientSound: {
        soundIndex,
        customPath: customSoundPath,
      },
      fog: {
        styleIndex: fogStyleIndex,
        zStart: fogZStart,
        zEnd: fogZEnd,
        density: fogDensity,
        color: fogColor,
      },
    };
  }

  /**
   * Read a 32-bit signed integer
   */
  private readInt32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read an 8-bit unsigned integer
   */
  private readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Read a 32-bit float
   */
  private readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read a null-terminated string
   * Format: null-terminated UTF-8 string
   */
  private readString(): string {
    const bytes: number[] = [];

    while (this.offset < this.buffer.byteLength) {
      const byte = this.view.getUint8(this.offset);
      this.offset += 1;

      if (byte === 0) {
        break;
      }

      bytes.push(byte);
    }

    // Convert bytes to string (UTF-8)
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(new Uint8Array(bytes));
  }
}
