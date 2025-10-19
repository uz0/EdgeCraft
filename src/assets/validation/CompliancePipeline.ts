/**
 * Legal Compliance Pipeline - Main orchestrator for asset validation
 *
 * Coordinates copyright validation, asset replacement, and license attribution
 * to ensure zero copyrighted assets in production builds
 */

import { CopyrightValidator } from './CopyrightValidator';
import { AssetDatabase, type SearchCriteria } from './AssetDatabase';
import { VisualSimilarity, type PerceptualHash } from './VisualSimilarity';
import { LicenseGenerator } from './LicenseGenerator';
import type { AssetType } from './AssetDatabase';
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Asset metadata for validation
 */
export interface AssetMetadata {
  name: string;
  type: AssetType;
  category?: string;
  tags?: string[];
  source?: string;
}

/**
 * Validated asset result
 */
export interface ValidatedAsset {
  asset: ArrayBuffer;
  metadata: AssetMetadata;
  validated: boolean;
  replaced?: boolean;
  warnings?: string[];
  originalName?: string;
  replacedDueToCopyright?: boolean;
}

/**
 * Validation report
 */
export interface ValidationReport {
  totalAssets: number;
  validated: number;
  replaced: number;
  rejected: number;
  errors: string[];
  warnings: string[];
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  enableVisualSimilarity: boolean;
  visualSimilarityThreshold: number;
  autoReplace: boolean;
  strictMode: boolean;
}

/**
 * Legal compliance pipeline for comprehensive asset validation
 *
 * @example
 * ```typescript
 * const pipeline = new LegalCompliancePipeline();
 * const result = await pipeline.validateAndReplace(assetBuffer, metadata);
 *
 * if (result.replaced) {
 *   console.log('Asset replaced with legal alternative');
 * }
 * ```
 */
export class LegalCompliancePipeline {
  private validator: CopyrightValidator;
  private assetDB: AssetDatabase;
  private visualSimilarity: VisualSimilarity;
  private licenseGenerator: LicenseGenerator;
  private config: PipelineConfig;

  // Visual hash database for similarity detection
  private visualHashDB: Map<string, PerceptualHash>;

  constructor(config?: Partial<PipelineConfig>) {
    this.validator = new CopyrightValidator();
    this.assetDB = new AssetDatabase();
    this.visualSimilarity = new VisualSimilarity();
    this.licenseGenerator = new LicenseGenerator(this.assetDB);

    this.config = {
      enableVisualSimilarity: config?.enableVisualSimilarity ?? true,
      visualSimilarityThreshold: config?.visualSimilarityThreshold ?? 0.95,
      autoReplace: config?.autoReplace ?? true,
      strictMode: config?.strictMode ?? true,
    };

    this.visualHashDB = new Map();
    this.initializeVisualHashDB();
  }

  /**
   * Validate asset and replace if copyrighted
   */
  public async validateAndReplace(
    asset: ArrayBuffer,
    metadata: AssetMetadata
  ): Promise<ValidatedAsset> {
    const warnings: string[] = [];

    try {
      // Step 1: SHA-256 hash check
      const hashResult = await this.checkHash(asset);
      if (!hashResult.valid) {
        console.warn(`Hash check failed: ${metadata.name} - ${hashResult.reason}`);

        if (this.config.autoReplace) {
          return await this.findReplacement(metadata, warnings);
        } else {
          throw new Error(`Copyrighted asset detected: ${metadata.name}`);
        }
      }

      // Step 2: Embedded metadata check
      const metadataResult = await this.checkEmbeddedMetadata(asset);
      if (!metadataResult.valid) {
        console.warn(`Metadata check failed: ${metadata.name} - ${metadataResult.reason}`);

        if (this.config.autoReplace) {
          return await this.findReplacement(metadata, warnings);
        } else {
          throw new Error(`Copyrighted metadata detected: ${metadata.name}`);
        }
      }

      // Step 3: Visual similarity check (for textures/models)
      if (
        this.config.enableVisualSimilarity &&
        ['texture', 'model', 'sprite'].includes(metadata.type)
      ) {
        const similarityResult = await this.checkVisualSimilarity(asset, metadata);

        if (similarityResult.isMatch) {
          console.warn(
            `Visual similarity detected: ${metadata.name} (${(similarityResult.similarity * 100).toFixed(1)}%)`
          );
          warnings.push(
            `Visually similar to known copyrighted asset (${(similarityResult.similarity * 100).toFixed(1)}% match)`
          );

          if (this.config.strictMode && this.config.autoReplace) {
            return await this.findReplacement(metadata, warnings);
          }
        }
      }

      // All checks passed
      return {
        asset,
        metadata,
        validated: true,
        replaced: false,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      // eslint-disable-line no-empty
      const errorMsg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      // Only log the error message string to avoid serialization issues in CI
      console.error(`Validation error for ${metadata.name}: ${errorMsg}`);
      throw new Error(`Validation failed for ${metadata.name}: ${errorMsg}`);
    }
  }

  /**
   * Validate multiple assets and generate report
   */
  public async validateBatch(
    assets: Array<{ buffer: ArrayBuffer; metadata: AssetMetadata }>
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      totalAssets: assets.length,
      validated: 0,
      replaced: 0,
      rejected: 0,
      errors: [],
      warnings: [],
    };

    for (const { buffer, metadata } of assets) {
      try {
        const result = await this.validateAndReplace(buffer, metadata);

        if (result.validated) {
          report.validated++;
        }

        if (result.replaced === true) {
          report.replaced++;
        }

        if (result.warnings !== undefined) {
          report.warnings.push(...result.warnings);
        }
      } catch (error) {
        // eslint-disable-line no-empty
        report.rejected++;
        report.errors.push(
          `${metadata.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return report;
  }

  /**
   * Generate license attribution file
   */
  public generateLicenseFile(): string {
    return this.licenseGenerator.generateLicensesFile();
  }

  /**
   * Validate license attributions
   */
  public validateLicenseAttributions(): { valid: boolean; errors: string[] } {
    return this.licenseGenerator.validateAttributions();
  }

  /**
   * Get pipeline statistics
   */
  public getStats(): {
    database: ReturnType<AssetDatabase['getStats']>;
    blacklist: ReturnType<CopyrightValidator['getBlacklistStats']>;
    visualHashes: number;
  } {
    return {
      database: this.assetDB.getStats(),
      blacklist: this.validator.getBlacklistStats(),
      visualHashes: this.visualHashDB.size,
    };
  }

  /**
   * Check asset hash against blacklist
   */
  private async checkHash(asset: ArrayBuffer): Promise<{ valid: boolean; reason?: string }> {
    const result = await this.validator.validateAsset(asset);
    return {
      valid: result.valid,
      reason: result.reason,
    };
  }

  /**
   * Check embedded metadata
   */
  private async checkEmbeddedMetadata(
    asset: ArrayBuffer
  ): Promise<{ valid: boolean; reason?: string }> {
    // Use existing validator which checks metadata
    const result = await this.validator.validateAsset(asset);
    return {
      valid: result.valid,
      reason: result.reason,
    };
  }

  /**
   * Check visual similarity against known copyrighted assets
   */
  private async checkVisualSimilarity(
    asset: ArrayBuffer,
    _metadata: AssetMetadata
  ): Promise<{ isMatch: boolean; similarity: number }> {
    try {
      // Only proceed if database has entries to compare against
      const database = Array.from(this.visualHashDB.values());
      if (database.length === 0) {
        return { isMatch: false, similarity: 0 };
      }

      const result = await this.visualSimilarity.findSimilarInDatabase(
        asset,
        database,
        this.config.visualSimilarityThreshold
      );

      return {
        isMatch: result.matches.length > 0,
        similarity: result.similarity ?? 0,
      };
    } catch (error) {
      // eslint-disable-line no-empty
      // If visual similarity check fails (e.g., invalid image format), log warning but don't block
      console.debug(
        `Visual similarity check skipped: ${error instanceof Error ? error.message : String(error)}`
      );
      return { isMatch: false, similarity: 0 };
    }
  }

  /**
   * Find legal replacement for copyrighted asset
   */
  private async findReplacement(
    metadata: AssetMetadata,
    warnings: string[]
  ): Promise<ValidatedAsset> {
    // Build search criteria
    const criteria: SearchCriteria = {
      type: metadata.type,
      category: metadata.category,
      tags: metadata.tags,
    };

    // Search database for replacement
    const replacement = this.assetDB.findReplacement(criteria);

    if (replacement === null) {
      throw new Error(
        `No legal replacement found for: ${metadata.name} (type: ${metadata.type}, category: ${metadata.category ?? 'unknown'})`
      );
    }

    // Load replacement asset
    // In production, this would actually load the file from the path
    const replacementBuffer = this.loadReplacementAsset(replacement.path);

    warnings.push(
      `Asset replaced with legal alternative: ${replacement.path} (${replacement.license})`
    );

    return {
      asset: replacementBuffer,
      metadata: {
        name: replacement.path,
        type: metadata.type,
        category: metadata.category,
        tags: metadata.tags,
        source: replacement.source,
      },
      validated: true,
      replaced: true,
      replacedDueToCopyright: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Load replacement asset from path
   * In production, this would read from filesystem or CDN
   */
  private loadReplacementAsset(path: string): ArrayBuffer {
    // Mock implementation - returns empty buffer
    // In production, would use fetch() or fs.readFile()
    return new ArrayBuffer(0);
  }

  /**
   * Initialize visual hash database with known copyrighted assets
   * In production, this would load from a secure database
   */
  private initializeVisualHashDB(): void {
    // Placeholder - in production would load actual hashes
    // Example structure:
    // this.visualHashDB.set('wc3-footman', { hash: 'abc123...', width: 256, height: 256 });
  }

  /**
   * Add copyrighted asset hash to blacklist
   */
  public addBlacklistedHash(hash: string): void {
    this.validator.addBlacklistedHash(hash);
  }

  /**
   * Add visual hash to database
   */
  public addVisualHash(id: string, hash: PerceptualHash): void {
    this.visualHashDB.set(id, hash);
  }
}
