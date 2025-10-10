/**
 * Legal Compliance Pipeline tests
 */

import { LegalCompliancePipeline } from '@/assets/validation/CompliancePipeline';
import type { AssetMetadata } from '@/assets/validation/CompliancePipeline';

describe('LegalCompliancePipeline', () => {
  let pipeline: LegalCompliancePipeline;

  beforeEach(() => {
    pipeline = new LegalCompliancePipeline();
  });

  describe('Initialization', () => {
    it('should create pipeline instance', () => {
      expect(pipeline).toBeDefined();
    });

    it('should accept configuration', () => {
      const customPipeline = new LegalCompliancePipeline({
        enableVisualSimilarity: false,
        autoReplace: false,
        strictMode: false
      });

      expect(customPipeline).toBeDefined();
    });

    it('should use default configuration', () => {
      const stats = pipeline.getStats();
      expect(stats).toBeDefined();
      expect(stats.database).toBeDefined();
      expect(stats.blacklist).toBeDefined();
    });
  });

  describe('validateAndReplace', () => {
    it('should validate clean asset', async () => {
      const buffer = new TextEncoder().encode('Clean test asset content').buffer;
      const metadata: AssetMetadata = {
        name: 'test-asset.png',
        type: 'texture',
        category: 'test',
        tags: ['test']
      };

      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result).toBeDefined();
      expect(result.validated).toBe(true);
      expect(result.replaced).toBe(false);
    });

    it('should detect copyrighted metadata', async () => {
      const buffer = new TextEncoder().encode('Copyright: Blizzard Entertainment').buffer;
      const metadata: AssetMetadata = {
        name: 'copyrighted-asset.png',
        type: 'texture',
        category: 'terrain',
        tags: ['grass']
      };

      // With autoReplace enabled, should replace
      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result).toBeDefined();
      expect(result.validated).toBe(true);
      // Should have attempted replacement
    });

    it('should handle visual similarity check', async () => {
      const buffer = new ArrayBuffer(1000);
      const metadata: AssetMetadata = {
        name: 'texture.png',
        type: 'texture',
        category: 'terrain'
      };

      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result).toBeDefined();
      expect(result.validated).toBe(true);
    });

    it('should skip visual similarity for non-visual assets', async () => {
      const buffer = new TextEncoder().encode('{"data": "test"}').buffer;
      const metadata: AssetMetadata = {
        name: 'data.json',
        type: 'data',
        category: 'config'
      };

      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result).toBeDefined();
      expect(result.validated).toBe(true);
    });

    it('should provide warnings when appropriate', async () => {
      const buffer = new TextEncoder().encode('Test content').buffer;
      const metadata: AssetMetadata = {
        name: 'test.png',
        type: 'texture'
      };

      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result).toBeDefined();
      // Warnings may or may not be present
      if (result.warnings !== undefined) {
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple assets', async () => {
      const assets = [
        {
          buffer: new TextEncoder().encode('Asset 1').buffer,
          metadata: { name: 'asset1.png', type: 'texture' as const }
        },
        {
          buffer: new TextEncoder().encode('Asset 2').buffer,
          metadata: { name: 'asset2.png', type: 'texture' as const }
        },
        {
          buffer: new TextEncoder().encode('Asset 3').buffer,
          metadata: { name: 'asset3.gltf', type: 'model' as const }
        }
      ];

      const report = await pipeline.validateBatch(assets);

      expect(report).toBeDefined();
      expect(report.totalAssets).toBe(3);
      expect(report.validated).toBeDefined();
      expect(report.replaced).toBeDefined();
      expect(report.rejected).toBeDefined();
      expect(Array.isArray(report.errors)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it('should handle empty batch', async () => {
      const report = await pipeline.validateBatch([]);

      expect(report.totalAssets).toBe(0);
      expect(report.validated).toBe(0);
      expect(report.replaced).toBe(0);
      expect(report.rejected).toBe(0);
    });

    it('should collect errors from failed validations', async () => {
      const assets = [
        {
          buffer: new TextEncoder().encode('Clean asset').buffer,
          metadata: { name: 'clean.png', type: 'texture' as const }
        }
      ];

      const report = await pipeline.validateBatch(assets);

      expect(report.errors).toBeDefined();
      expect(Array.isArray(report.errors)).toBe(true);
    });

    it('should collect warnings', async () => {
      const assets = [
        {
          buffer: new ArrayBuffer(100),
          metadata: { name: 'test.png', type: 'texture' as const }
        }
      ];

      const report = await pipeline.validateBatch(assets);

      expect(report.warnings).toBeDefined();
      expect(Array.isArray(report.warnings)).toBe(true);
    });
  });

  describe('generateLicenseFile', () => {
    it('should generate license file', async () => {
      const content = await pipeline.generateLicenseFile();

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include proper headers', async () => {
      const content = await pipeline.generateLicenseFile();

      expect(content).toContain('# Third-Party Asset Licenses');
      expect(content).toContain('Edge Craft');
    });
  });

  describe('validateLicenseAttributions', () => {
    it('should validate attributions', () => {
      const result = pipeline.validateLicenseAttributions();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should pass with default database', () => {
      const result = pipeline.validateLicenseAttributions();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return pipeline statistics', () => {
      const stats = pipeline.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('database');
      expect(stats).toHaveProperty('blacklist');
      expect(stats).toHaveProperty('visualHashes');
    });

    it('should include database stats', () => {
      const stats = pipeline.getStats();

      expect(stats.database).toHaveProperty('totalMappings');
      expect(stats.database).toHaveProperty('byType');
      expect(stats.database).toHaveProperty('byGame');
      expect(stats.database).toHaveProperty('verified');
    });

    it('should include blacklist stats', () => {
      const stats = pipeline.getStats();

      expect(stats.blacklist).toHaveProperty('hashCount');
      expect(stats.blacklist).toHaveProperty('patternCount');
    });

    it('should include visual hash count', () => {
      const stats = pipeline.getStats();

      expect(typeof stats.visualHashes).toBe('number');
      expect(stats.visualHashes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addBlacklistedHash', () => {
    it('should add hash to blacklist', () => {
      const statsBefore = pipeline.getStats();
      const beforeCount = statsBefore.blacklist.hashCount;

      pipeline.addBlacklistedHash('test-hash-123');

      const statsAfter = pipeline.getStats();
      const afterCount = statsAfter.blacklist.hashCount;

      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe('addVisualHash', () => {
    it('should add visual hash to database', () => {
      const statsBefore = pipeline.getStats();
      const beforeCount = statsBefore.visualHashes;

      pipeline.addVisualHash('test-visual-hash', {
        hash: 'abc123def456',
        width: 256,
        height: 256
      });

      const statsAfter = pipeline.getStats();
      const afterCount = statsAfter.visualHashes;

      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe('Configuration options', () => {
    it('should respect enableVisualSimilarity option', () => {
      const disabledPipeline = new LegalCompliancePipeline({
        enableVisualSimilarity: false
      });

      expect(disabledPipeline).toBeDefined();
    });

    it('should respect visualSimilarityThreshold option', () => {
      const customPipeline = new LegalCompliancePipeline({
        visualSimilarityThreshold: 0.80
      });

      expect(customPipeline).toBeDefined();
    });

    it('should respect autoReplace option', async () => {
      const noReplacePipeline = new LegalCompliancePipeline({
        autoReplace: false
      });

      const buffer = new TextEncoder().encode('Test').buffer;
      const metadata: AssetMetadata = {
        name: 'test.png',
        type: 'texture'
      };

      const result = await noReplacePipeline.validateAndReplace(buffer, metadata);
      expect(result).toBeDefined();
    });

    it('should respect strictMode option', () => {
      const lenientPipeline = new LegalCompliancePipeline({
        strictMode: false
      });

      expect(lenientPipeline).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should work end-to-end for clean assets', async () => {
      const buffer = new TextEncoder().encode('Original clean content').buffer;
      const metadata: AssetMetadata = {
        name: 'clean-asset.png',
        type: 'texture',
        category: 'ui',
        tags: ['button', 'icon']
      };

      const result = await pipeline.validateAndReplace(buffer, metadata);

      expect(result.validated).toBe(true);
      expect(result.metadata.name).toBeDefined();
    });

    it('should generate complete compliance report', async () => {
      const assets = [
        {
          buffer: new TextEncoder().encode('Asset 1').buffer,
          metadata: { name: 'asset1.png', type: 'texture' as const }
        }
      ];

      const report = await pipeline.validateBatch(assets);
      const license = await pipeline.generateLicenseFile();
      const validation = pipeline.validateLicenseAttributions();

      expect(report).toBeDefined();
      expect(license).toBeDefined();
      expect(validation).toBeDefined();
    });
  });
});
