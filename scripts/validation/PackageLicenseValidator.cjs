#!/usr/bin/env node

/**
 * Package License Validator
 *
 * Validates that all npm dependencies have compatible licenses:
 * - MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
 * - CC0-1.0, Unlicense (Public Domain)
 * - CC-BY-4.0 (with attribution)
 *
 * Blocks incompatible licenses:
 * - GPL, LGPL, AGPL (copyleft - requires source disclosure)
 * - Proprietary, Commercial licenses
 * - Unknown or missing licenses
 */

const fs = require('fs');
const path = require('path');

// Compatible licenses (allowed for commercial use)
const COMPATIBLE_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  'CC-BY-4.0',
  '0BSD', // BSD Zero Clause (Public Domain)
  'BlueOak-1.0.0',
  'Python-2.0',
  'MPL-2.0', // Weak copyleft - OK for build tools (modifications must be shared)
  'MPL-1.1', // Weak copyleft - OK for build tools
];

// Licenses requiring attribution (warn but allow)
const ATTRIBUTION_REQUIRED = ['Apache-2.0', 'CC-BY-4.0'];

// Blocked licenses (strong copyleft or proprietary)
// Note: MPL-2.0 is acceptable for build-time dependencies (not distributed)
const BLOCKED_LICENSES = [
  'GPL', 'GPL-2.0', 'GPL-3.0',
  'LGPL', 'LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0',
  'AGPL', 'AGPL-3.0',
  'EPL', 'EPL-1.0', 'EPL-2.0', // Eclipse Public License
  'CDDL', 'CDDL-1.0', 'CDDL-1.1', // Common Development and Distribution License
  'EUPL', 'EUPL-1.2', // European Union Public License
  'Commercial',
  'Proprietary',
  'UNLICENSED',
];

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

function isBlockedLicense(license) {
  if (!license) return false;

  // If it's compatible (e.g., dual-licensed with compatible option), not blocked
  if (isCompatibleLicense(license)) return false;

  const normalized = license.toUpperCase();
  return BLOCKED_LICENSES.some(blocked =>
    normalized.includes(blocked.toUpperCase())
  );
}

function needsAttribution(license) {
  if (!license) return false;
  return ATTRIBUTION_REQUIRED.some(req => license.includes(req));
}

// Known packages with missing license info in package.json but verified MIT licensed
// VERSION-AGNOSTIC: These packages have MIT license across all versions
// Versions listed are reference versions where license was manually verified
// The validator will accept ANY version of these packages as MIT
const KNOWN_MIT_PACKAGES = {
  'console-browserify': true, // Verified MIT @ 1.2.0: https://github.com/browserify/console-browserify
  'exit': true,               // Verified MIT @ 0.1.2: https://github.com/cowboy/node-exit
  'querystring-es3': true,    // Verified MIT @ 0.2.1: https://github.com/mike-spainhower/querystring
};

function getDependencyLicenses() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {},
  };

  const licenses = new Map();

  // Try to read package-lock.json for accurate license info
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    const packages = packageLock.packages || {};

    for (const [pkgPath, pkgData] of Object.entries(packages)) {
      if (pkgPath === '') continue; // Skip root package

      const pkgName = pkgPath.replace('node_modules/', '');
      let license = pkgData.license || 'UNKNOWN';

      // Check if this is a known MIT package with missing license info
      if (license === 'UNKNOWN' && KNOWN_MIT_PACKAGES[pkgName]) {
        license = 'MIT';
      }

      licenses.set(pkgName, {
        name: pkgName,
        version: pkgData.version || 'unknown',
        license: license,
      });
    }
  } else {
    // Fallback: read from node_modules/*/package.json
    for (const dep of Object.keys(dependencies)) {
      const depPackageJsonPath = path.join(
        process.cwd(),
        'node_modules',
        dep,
        'package.json'
      );

      if (fs.existsSync(depPackageJsonPath)) {
        const depPackageJson = JSON.parse(
          fs.readFileSync(depPackageJsonPath, 'utf8')
        );

        licenses.set(dep, {
          name: dep,
          version: depPackageJson.version || 'unknown',
          license: depPackageJson.license || 'UNKNOWN',
        });
      }
    }
  }

  return licenses;
}

function validateLicenses() {
  console.log('🔍 Validating package licenses...\n');

  const licenses = getDependencyLicenses();
  const stats = {
    total: licenses.size,
    compatible: 0,
    blocked: 0,
    unknown: 0,
    needsAttribution: 0,
  };

  const issues = {
    blocked: [],
    unknown: [],
    attribution: [],
  };

  for (const [name, pkg] of licenses.entries()) {
    const license = pkg.license;

    if (isBlockedLicense(license)) {
      stats.blocked++;
      issues.blocked.push(pkg);
    } else if (!isCompatibleLicense(license)) {
      stats.unknown++;
      issues.unknown.push(pkg);
    } else {
      stats.compatible++;

      if (needsAttribution(license)) {
        stats.needsAttribution++;
        issues.attribution.push(pkg);
      }
    }
  }

  return { stats, issues };
}

function printReport(result) {
  const { stats, issues } = result;

  console.log('📊 License Statistics:');
  console.log(`   Total packages: ${stats.total}`);
  console.log(`   ✅ Compatible: ${stats.compatible}`);
  console.log(`   ⚠️  Needs attribution: ${stats.needsAttribution}`);
  console.log(`   ❌ Blocked: ${stats.blocked}`);
  console.log(`   ❓ Unknown: ${stats.unknown}`);
  console.log('');

  // Print blocked licenses (CRITICAL)
  if (issues.blocked.length > 0) {
    console.log('❌ BLOCKED LICENSES (Incompatible):');
    for (const pkg of issues.blocked) {
      console.log(`   - ${pkg.name}@${pkg.version}: ${pkg.license}`);
    }
    console.log('');
  }

  // Print unknown licenses (WARNING)
  if (issues.unknown.length > 0) {
    console.log('⚠️  UNKNOWN LICENSES (Need Review):');
    for (const pkg of issues.unknown) {
      console.log(`   - ${pkg.name}@${pkg.version}: ${pkg.license}`);
    }
    console.log('');
  }

  // Print attribution required (INFO)
  if (issues.attribution.length > 0) {
    console.log('ℹ️  ATTRIBUTION REQUIRED:');
    for (const pkg of issues.attribution) {
      console.log(`   - ${pkg.name}@${pkg.version}: ${pkg.license}`);
    }
    console.log('   ↳ Ensure these are listed in CREDITS.md');
    console.log('');
  }

  // Final verdict
  if (issues.blocked.length > 0) {
    console.log('❌ VALIDATION FAILED: Blocked licenses detected!');
    console.log('   Remove packages with GPL/LGPL/AGPL or proprietary licenses.');
    return false;
  }

  if (issues.unknown.length > 0) {
    console.log('⚠️  VALIDATION WARNING: Unknown licenses detected!');
    console.log('   Review these packages and verify license compatibility.');
    return false;
  }

  console.log('✅ All package licenses are compatible!');
  return true;
}

function main() {
  try {
    const result = validateLicenses();
    const success = printReport(result);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error validating licenses:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateLicenses, isCompatibleLicense, isBlockedLicense };
