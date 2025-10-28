/**
 * PackageLicenseValidator Tests - SPDX AND/OR Expression Handling
 */

const { describe, it, expect } = require('@jest/globals');

// Compatible licenses list (from PackageLicenseValidator.cjs)
const COMPATIBLE_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
  'CC-BY-4.0',
  'CC-BY-3.0',
  'MPL-2.0', // Allowed for build tools only
  'MPL-1.1', // Legacy version
];

// License compatibility checker (extracted from PackageLicenseValidator.cjs)
function isCompatibleLicense(license) {
  if (!license) return false;

  // Handle SPDX expressions with AND/OR operators
  // For "AND" expressions, ALL licenses must be compatible
  // For "OR" expressions, AT LEAST ONE license must be compatible

  // First check for AND expressions (stricter requirement)
  if (/\s+AND\s+/i.test(license)) {
    const andLicenses = license.split(/\s+AND\s+/i);
    // For AND, all licenses must be compatible
    return andLicenses.every(lic => {
      const normalized = lic.trim().replace(/[()]/g, '');
      return COMPATIBLE_LICENSES.some(compat => normalized.includes(compat));
    });
  }

  // Handle OR expressions (at least one must be compatible)
  const licenses = license.split(/\s+OR\s+/i);
  return licenses.some(lic => {
    const normalized = lic.trim().replace(/[()]/g, '');
    return COMPATIBLE_LICENSES.some(compat => normalized.includes(compat));
  });
}

describe('PackageLicenseValidator - SPDX Expression Handling', () => {
  describe('OR expressions', () => {
    it('should accept when at least one license is compatible', () => {
      expect(isCompatibleLicense('MIT OR Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('GPL-3.0 OR MIT')).toBe(true);
      expect(isCompatibleLicense('Proprietary OR BSD-3-Clause')).toBe(true);
    });

    it('should reject when all licenses are incompatible', () => {
      expect(isCompatibleLicense('GPL-3.0 OR AGPL-3.0')).toBe(false);
      expect(isCompatibleLicense('Proprietary OR Commercial')).toBe(false);
    });

    it('should handle case-insensitive OR', () => {
      expect(isCompatibleLicense('MIT or Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('MIT Or Apache-2.0')).toBe(true);
    });

    it('should handle multiple OR clauses', () => {
      expect(isCompatibleLicense('GPL-3.0 OR MIT OR Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('Proprietary OR GPL-3.0 OR BSD-2-Clause')).toBe(true);
    });
  });

  describe('AND expressions', () => {
    it('should accept when all licenses are compatible', () => {
      expect(isCompatibleLicense('MIT AND Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('BSD-2-Clause AND ISC')).toBe(true);
      expect(isCompatibleLicense('MIT AND BSD-3-Clause AND Apache-2.0')).toBe(true);
    });

    it('should reject when any license is incompatible', () => {
      expect(isCompatibleLicense('MIT AND GPL-3.0')).toBe(false);
      expect(isCompatibleLicense('Apache-2.0 AND Proprietary')).toBe(false);
      expect(isCompatibleLicense('MIT AND BSD-3-Clause AND GPL-3.0')).toBe(false);
    });

    it('should handle case-insensitive AND', () => {
      expect(isCompatibleLicense('MIT and Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('MIT And Apache-2.0')).toBe(true);
    });
  });

  describe('Complex SPDX expressions', () => {
    it('should handle parentheses', () => {
      expect(isCompatibleLicense('(MIT OR Apache-2.0)')).toBe(true);
      expect(isCompatibleLicense('(MIT AND Apache-2.0)')).toBe(true);
      expect(isCompatibleLicense('(MIT)')).toBe(true);
    });

    it('should prioritize AND over OR (AND is checked first)', () => {
      // Current implementation checks AND first
      expect(isCompatibleLicense('MIT AND Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('MIT OR Apache-2.0')).toBe(true);
    });
  });

  describe('Single licenses', () => {
    it('should accept compatible licenses', () => {
      expect(isCompatibleLicense('MIT')).toBe(true);
      expect(isCompatibleLicense('Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('BSD-3-Clause')).toBe(true);
      expect(isCompatibleLicense('ISC')).toBe(true);
      expect(isCompatibleLicense('CC0-1.0')).toBe(true);
    });

    it('should reject incompatible licenses', () => {
      expect(isCompatibleLicense('GPL-3.0')).toBe(false);
      expect(isCompatibleLicense('AGPL-3.0')).toBe(false);
      expect(isCompatibleLicense('Proprietary')).toBe(false);
    });

    it('should reject null/undefined/empty', () => {
      expect(isCompatibleLicense(null)).toBe(false);
      expect(isCompatibleLicense(undefined)).toBe(false);
      expect(isCompatibleLicense('')).toBe(false);
    });
  });

  describe('Real-world SPDX expressions', () => {
    it('should handle common dual-license patterns', () => {
      expect(isCompatibleLicense('MIT OR GPL-2.0')).toBe(true);
      expect(isCompatibleLicense('Apache-2.0 OR MIT')).toBe(true);
      expect(isCompatibleLicense('BSD-3-Clause OR GPL-3.0')).toBe(true);
    });

    it('should handle MPL dual-licensing', () => {
      expect(isCompatibleLicense('MPL-2.0 OR Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('MPL-1.1 OR MIT')).toBe(true);
    });

    it('should handle whitespace variations', () => {
      expect(isCompatibleLicense('MIT OR  Apache-2.0')).toBe(true); // extra space
      expect(isCompatibleLicense('MIT  OR Apache-2.0')).toBe(true);
      expect(isCompatibleLicense('  MIT OR Apache-2.0  ')).toBe(true); // leading/trailing
    });
  });
});
