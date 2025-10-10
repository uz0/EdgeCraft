/**
 * Copyright Validator tests
 */

import { CopyrightValidator } from '@/assets/validation/CopyrightValidator';

describe('CopyrightValidator', () => {
  let validator: CopyrightValidator;

  beforeEach(() => {
    validator = new CopyrightValidator();
  });

  it('should create validator instance', () => {
    expect(validator).toBeDefined();
  });

  it('should validate clean asset', async () => {
    const buffer = new TextEncoder().encode('Clean asset content');
    const result = await validator.validateAsset(buffer.buffer);

    expect(result.valid).toBe(true);
    expect(result.hash).toBeDefined();
  });

  it('should reject asset with Blizzard copyright', async () => {
    const buffer = new TextEncoder().encode('Copyright: Blizzard Entertainment');
    const result = await validator.validateAsset(buffer.buffer);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blacklisted');
  });

  it('should reject asset with Warcraft mention', async () => {
    const buffer = new TextEncoder().encode('Author: Warcraft Developer');
    const result = await validator.validateAsset(buffer.buffer);

    expect(result.valid).toBe(false);
  });

  it('should add hash to blacklist', async () => {
    const testHash = 'abc123';
    validator.addBlacklistedHash(testHash);

    const stats = validator.getBlacklistStats();
    expect(stats.hashCount).toBeGreaterThan(0);
  });

  it('should add pattern to blacklist', () => {
    const pattern = /custom-pattern/i;
    validator.addBlacklistedPattern(pattern);

    const stats = validator.getBlacklistStats();
    expect(stats.patternCount).toBeGreaterThan(0);
  });

  it('should get blacklist stats', () => {
    const stats = validator.getBlacklistStats();

    expect(stats).toHaveProperty('hashCount');
    expect(stats).toHaveProperty('patternCount');
    expect(typeof stats.hashCount).toBe('number');
    expect(typeof stats.patternCount).toBe('number');
  });

  it('should compute consistent hashes', async () => {
    const buffer1 = new TextEncoder().encode('Test content');
    const buffer2 = new TextEncoder().encode('Test content');

    const result1 = await validator.validateAsset(buffer1.buffer);
    const result2 = await validator.validateAsset(buffer2.buffer);

    expect(result1.hash).toBe(result2.hash);
  });

  it('should handle empty buffers', async () => {
    const buffer = new ArrayBuffer(0);
    const result = await validator.validateAsset(buffer);

    expect(result.valid).toBe(true);
  });
});
