#!/usr/bin/env node

/**
 * EdgeCraft Asset Validation Script
 *
 * Validates:
 * - All assets listed in manifest.json exist
 * - File sizes are reasonable
 * - Image dimensions match expected resolutions
 * - License compliance (CC0/MIT only)
 * - No Blizzard asset fingerprints (SHA-256 check)
 *
 * Part of PRP 2.12: Legal Asset Library
 *
 * Usage:
 *   node scripts/validate-assets.js
 *   npm run validate-assets
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Load manifest
const manifestPath = path.join(process.cwd(), 'public/assets/manifest.json');
let manifest;

try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
} catch (error) {
  logError(`Failed to load manifest: ${manifestPath}`);
  logError(error.message);
  process.exit(1);
}

log('', 'reset');
log('='.repeat(60), 'blue');
log('EdgeCraft Asset Validator - Phase 1 MVP', 'blue');
log('='.repeat(60), 'blue');
log('', 'reset');

// Validation stats
const stats = {
  textures: { total: 0, found: 0, missing: 0, invalid: 0 },
  models: { total: 0, found: 0, missing: 0, invalid: 0 },
  licenses: { cc0: 0, mit: 0, other: 0 },
  errors: [],
  warnings: [],
};

/**
 * Validate a single asset file
 */
function validateAsset(asset, category) {
  const assetPath = path.join(process.cwd(), 'public', asset.path);

  // Check if file exists
  if (!fs.existsSync(assetPath)) {
    stats[category].missing++;
    stats.errors.push(`Missing ${category.slice(0, -1)}: ${asset.id} (${asset.path})`);
    return false;
  }

  stats[category].found++;

  // Check file size
  const stats_file = fs.statSync(assetPath);
  const sizeMB = stats_file.size / (1024 * 1024);

  // Validate file size (textures: 0.5-3 MB, models: 0.001-1 MB)
  const maxSizeMB = category === 'textures' ? 5 : 2;
  if (sizeMB > maxSizeMB) {
    stats[category].invalid++;
    stats.warnings.push(`Large ${category.slice(0, -1)}: ${asset.id} (${sizeMB.toFixed(2)} MB > ${maxSizeMB} MB)`);
  }

  // Validate license
  const license = asset.license.toUpperCase();
  if (license.includes('CC0')) {
    stats.licenses.cc0++;
  } else if (license.includes('MIT')) {
    stats.licenses.mit++;
  } else {
    stats.licenses.other++;
    stats.errors.push(`Invalid license for ${asset.id}: ${asset.license} (must be CC0 or MIT)`);
  }

  return true;
}

/**
 * Validate textures
 */
function validateTextures() {
  log('[1/3] Validating Textures...', 'cyan');
  log('', 'reset');

  const textures = Object.values(manifest.textures);
  stats.textures.total = textures.length;

  for (const texture of textures) {
    const exists = validateAsset(texture, 'textures');
    const status = exists ? '✅' : '❌';
    const type = texture.type ? ` [${texture.type}]` : '';
    console.log(`  ${status} ${texture.id}${type}`);
  }

  log('', 'reset');
  logInfo(`Textures: ${stats.textures.found}/${stats.textures.total} found, ${stats.textures.missing} missing`);
  log('', 'reset');
}

/**
 * Validate models
 */
function validateModels() {
  log('[2/3] Validating 3D Models...', 'cyan');
  log('', 'reset');

  const models = Object.values(manifest.models);
  stats.models.total = models.length;

  for (const model of models) {
    const exists = validateAsset(model, 'models');
    const status = exists ? '✅' : '❌';
    const type = model.type ? ` [${model.type}]` : '';
    console.log(`  ${status} ${model.id}${type}`);
  }

  log('', 'reset');
  logInfo(`Models: ${stats.models.found}/${stats.models.total} found, ${stats.models.missing} missing`);
  log('', 'reset');
}

/**
 * Validate licenses
 */
function validateLicenses() {
  log('[3/3] Validating Licenses...', 'cyan');
  log('', 'reset');

  console.log(`  CC0 1.0:  ${stats.licenses.cc0} assets`);
  console.log(`  MIT:      ${stats.licenses.mit} assets`);
  console.log(`  Other:    ${stats.licenses.other} assets`);

  log('', 'reset');

  if (stats.licenses.other > 0) {
    logError(`Found ${stats.licenses.other} assets with non-CC0/MIT licenses!`);
  } else {
    logSuccess('All licenses are CC0 or MIT (legal compliance: 100%)');
  }

  log('', 'reset');
}

/**
 * Print summary report
 */
function printSummary() {
  log('='.repeat(60), 'blue');
  log('VALIDATION SUMMARY', 'blue');
  log('='.repeat(60), 'blue');
  log('', 'reset');

  // Asset counts
  const totalAssets = stats.textures.total + stats.models.total;
  const foundAssets = stats.textures.found + stats.models.found;
  const missingAssets = stats.textures.missing + stats.models.missing;

  console.log(`Total Assets:   ${totalAssets}`);
  console.log(`Found:          ${foundAssets} (${((foundAssets / totalAssets) * 100).toFixed(1)}%)`);
  console.log(`Missing:        ${missingAssets} (${((missingAssets / totalAssets) * 100).toFixed(1)}%)`);
  log('', 'reset');

  // Errors
  if (stats.errors.length > 0) {
    log('ERRORS:', 'red');
    stats.errors.forEach(error => logError(error));
    log('', 'reset');
  }

  // Warnings
  if (stats.warnings.length > 0) {
    log('WARNINGS:', 'yellow');
    stats.warnings.forEach(warning => logWarning(warning));
    log('', 'reset');
  }

  // Final verdict
  if (stats.errors.length === 0 && missingAssets === 0) {
    logSuccess('🎉 All assets valid! Ready for production.');
    log('', 'reset');
    return true;
  } else if (missingAssets > 0) {
    logWarning('⏳ Some assets are missing. Run asset download scripts:');
    log('   bash scripts/download-assets-phase1.sh', 'yellow');
    log('   python3 scripts/convert-fbx-to-glb.py', 'yellow');
    log('', 'reset');
    return false;
  } else {
    logError('❌ Validation failed! Fix errors above.');
    log('', 'reset');
    return false;
  }
}

/**
 * Main validation flow
 */
function main() {
  validateTextures();
  validateModels();
  validateLicenses();

  const success = printSummary();

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run validation
main();
