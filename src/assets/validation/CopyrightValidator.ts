/**
 * Copyright Validator - Ensures assets don't contain copyrighted content
 *
 * This is a critical component for legal compliance.
 * All assets must pass validation before being used in the game.
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  hash?: string;
}

/**
 * Asset metadata
 */
interface AssetMetadata {
  copyright?: string;
  author?: string;
  license?: string;
}

/**
 * Copyright Validator for asset compliance
 *
 * @example
 * ```typescript
 * const validator = new CopyrightValidator();
 * const result = await validator.validateAsset(buffer);
 * if (!result.valid) {
 *   console.error('Asset failed validation:', result.reason);
 * }
 * ```
 */
export class CopyrightValidator {
  private blacklistedHashes: Set<string>;
  private blacklistedPatterns: RegExp[];

  constructor() {
    // SHA-256 hashes of known copyrighted assets
    // In production, this would be loaded from a secure database
    this.blacklistedHashes = new Set([
      // Example hashes - in real implementation, these would be actual Blizzard asset hashes
      // 'abc123...',
    ]);

    // Patterns that indicate copyrighted content
    this.blacklistedPatterns = [
      /blizzard/i,
      /warcraft/i,
      /world of warcraft/i,
      /starcraft/i,
      /diablo/i,
      /©.*blizzard/i,
      /copyright.*blizzard/i,
    ];
  }

  /**
   * Validate asset buffer
   */
  public async validateAsset(buffer: ArrayBuffer): Promise<ValidationResult> {
    // Compute hash of asset
    const hash = await this.computeHash(buffer);

    // Check against blacklist
    if (this.blacklistedHashes.has(hash)) {
      return {
        valid: false,
        reason: 'Asset matches known copyrighted content',
        hash,
      };
    }

    // Extract and check metadata
    const metadata = this.extractMetadata(buffer);
    const metadataCheck = this.validateMetadata(metadata);
    if (!metadataCheck.valid) {
      return metadataCheck;
    }

    return {
      valid: true,
      hash,
    };
  }

  /**
   * Validate file by URL
   */
  public async validateFile(url: string): Promise<ValidationResult> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return this.validateAsset(buffer);
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to fetch file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Compute SHA-256 hash of buffer
   */
  private async computeHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extract metadata from buffer
   *
   * This is a simplified implementation.
   * Real implementation would parse actual file formats.
   */
  private extractMetadata(buffer: ArrayBuffer): AssetMetadata {
    const text = new TextDecoder().decode(buffer);

    // Look for copyright/license info in first 1KB
    const header = text.substring(0, 1024);

    return {
      copyright: this.extractField(header, 'copyright'),
      author: this.extractField(header, 'author'),
      license: this.extractField(header, 'license'),
    };
  }

  /**
   * Extract field from text
   */
  private extractField(text: string, field: string): string | undefined {
    const regex = new RegExp(`${field}[:\\s]+([^\n]+)`, 'i');
    const match = text.match(regex);
    return match !== null && match[1] !== undefined && match[1] !== ''
      ? match[1].trim()
      : undefined;
  }

  /**
   * Validate metadata
   */
  private validateMetadata(metadata: AssetMetadata): ValidationResult {
    // Check copyright field
    if (metadata.copyright !== undefined && metadata.copyright !== '') {
      for (const pattern of this.blacklistedPatterns) {
        if (pattern.test(metadata.copyright)) {
          return {
            valid: false,
            reason: `Asset copyright contains blacklisted content: ${metadata.copyright}`,
          };
        }
      }
    }

    // Check author field
    if (metadata.author !== undefined && metadata.author !== '') {
      for (const pattern of this.blacklistedPatterns) {
        if (pattern.test(metadata.author)) {
          return {
            valid: false,
            reason: `Asset author contains blacklisted content: ${metadata.author}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Add hash to blacklist
   */
  public addBlacklistedHash(hash: string): void {
    this.blacklistedHashes.add(hash);
  }

  /**
   * Add pattern to blacklist
   */
  public addBlacklistedPattern(pattern: RegExp): void {
    this.blacklistedPatterns.push(pattern);
  }

  /**
   * Get blacklist stats
   */
  public getBlacklistStats(): {
    hashCount: number;
    patternCount: number;
  } {
    return {
      hashCount: this.blacklistedHashes.size,
      patternCount: this.blacklistedPatterns.length,
    };
  }
}
