#!/usr/bin/env node

/**
 * Asset Credits Validator
 *
 * Ensures every asset in public/assets/ is properly attributed in CREDITS.md
 * Validates:
 * - All files have license attribution
 * - License is compatible (CC0, MIT, etc.)
 * - Author/source links are provided
 * - No orphaned assets (files without attribution)
 * - No orphaned credits (attribution without files)
 */

const fs = require('fs');
const path = require('path');

const ASSET_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.webp', // Images
  '.glb', '.gltf', '.obj', '.fbx', // 3D Models
  '.mp3', '.wav', '.ogg', // Audio
  '.json', // Data files (manifest, etc.)
];

const EXCLUDE_FILES = [
  'manifest.json', // Auto-generated
  '.DS_Store',
  'Thumbs.db',
];

const COMPATIBLE_LICENSES = [
  'CC0', 'CC0-1.0', 'CC-0', 'Public Domain',
  'MIT',
  'Apache-2.0', 'Apache 2.0',
  'BSD-2-Clause', 'BSD-3-Clause',
  'ISC',
  'Unlicense',
];

/**
 * Scan public/assets for all asset files
 */
function scanAssetFiles() {
  const assetsDir = path.join(process.cwd(), 'public', 'assets');
  const files = [];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (ASSET_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(entry.name)) {
          // Get relative path from public/assets
          const relativePath = path.relative(assetsDir, fullPath);
          files.push(relativePath);
        }
      }
    }
  }

  scan(assetsDir);
  return files;
}

/**
 * Parse CREDITS.md to extract asset attributions
 */
function parseCreditsFile() {
  const creditsPath = path.join(process.cwd(), 'CREDITS.md');

  if (!fs.existsSync(creditsPath)) {
    throw new Error('CREDITS.md not found! Create this file to track asset attributions.');
  }

  const content = fs.readFileSync(creditsPath, 'utf8');
  const attributions = new Map();

  // Extract file mentions (look for .png, .jpg, .glb, etc.)
  const fileRegex = /`([^`]+\.(png|jpg|jpeg|webp|glb|gltf|obj|fbx|mp3|wav|ogg))`/gi;
  const matches = content.matchAll(fileRegex);

  for (const match of matches) {
    const filename = match[1];
    attributions.set(filename, {
      filename,
      mentioned: true,
    });
  }

  // Extract source links (Poly Haven, Quaternius, Kenney, etc.)
  const sourceRegex = /-\s+`([^`]+)`[^\n]*\n\s+-\s+Source:\s+([^\n]+)/gi;
  const sourceMatches = content.matchAll(sourceRegex);

  for (const match of sourceMatches) {
    const filename = match[1];
    const source = match[2].trim();

    if (attributions.has(filename)) {
      attributions.get(filename).source = source;
    } else {
      attributions.set(filename, {
        filename,
        source,
        mentioned: true,
      });
    }
  }

  // Extract license info
  const licenseRegex = /-\s+`([^`]+)`[^\n]*\n[^\n]*\n\s+-\s+License:\s+([^\n]+)/gi;
  const licenseMatches = content.matchAll(licenseRegex);

  for (const match of licenseMatches) {
    const filename = match[1];
    const license = match[2].trim();

    if (attributions.has(filename)) {
      attributions.get(filename).license = license;
    } else {
      attributions.set(filename, {
        filename,
        license,
        mentioned: true,
      });
    }
  }

  // Extract Poly Haven textures (grouped format)
  const polyHavenRegex = /^-\s+`([^`]+)`.*?Source:\s+Poly Haven[^\n]*/gmi;
  const polyHavenMatches = content.matchAll(polyHavenRegex);

  for (const match of polyHavenMatches) {
    const filename = match[1];
    if (!attributions.has(filename)) {
      attributions.set(filename, {
        filename,
        source: 'Poly Haven',
        license: 'CC0',
        mentioned: true,
      });
    }
  }

  return attributions;
}

/**
 * Validate asset credits
 */
function validateAssetCredits() {
  console.log('🔍 Validating asset credits...\n');

  const assetFiles = scanAssetFiles();
  const attributions = parseCreditsFile();

  const stats = {
    totalFiles: assetFiles.length,
    attributed: 0,
    missing: 0,
    orphaned: 0,
  };

  const issues = {
    missingAttribution: [],
    missingLicense: [],
    incompatibleLicense: [],
    missingSource: [],
    orphanedCredits: [],
  };

  // Check each asset file
  for (const file of assetFiles) {
    const filename = path.basename(file);
    const attribution = attributions.get(filename);

    if (!attribution) {
      stats.missing++;
      issues.missingAttribution.push(file);
      continue;
    }

    stats.attributed++;

    // Check for license
    if (!attribution.license) {
      issues.missingLicense.push(file);
    } else {
      // Check license compatibility
      const isCompatible = COMPATIBLE_LICENSES.some(lic =>
        attribution.license.toUpperCase().includes(lic.toUpperCase())
      );

      if (!isCompatible) {
        issues.incompatibleLicense.push({
          file,
          license: attribution.license,
        });
      }
    }

    // Check for source
    if (!attribution.source) {
      issues.missingSource.push(file);
    }
  }

  // Check for orphaned credits (attribution without files)
  for (const [filename, attr] of attributions.entries()) {
    const exists = assetFiles.some(file => path.basename(file) === filename);
    if (!exists) {
      stats.orphaned++;
      issues.orphanedCredits.push(filename);
    }
  }

  return { stats, issues };
}

/**
 * Print validation report
 */
function printReport(result) {
  const { stats, issues } = result;

  console.log('📊 Asset Attribution Statistics:');
  console.log(`   Total assets: ${stats.totalFiles}`);
  console.log(`   ✅ Attributed: ${stats.attributed}`);
  console.log(`   ❌ Missing attribution: ${stats.missing}`);
  console.log(`   ⚠️  Orphaned credits: ${stats.orphaned}`);
  console.log('');

  let hasErrors = false;

  // Missing attribution (CRITICAL)
  if (issues.missingAttribution.length > 0) {
    hasErrors = true;
    console.log('❌ ASSETS WITHOUT ATTRIBUTION:');
    for (const file of issues.missingAttribution) {
      console.log(`   - ${file}`);
    }
    console.log('   ↳ Add these to CREDITS.md with source, author, and license');
    console.log('');
  }

  // Incompatible licenses (CRITICAL)
  if (issues.incompatibleLicense.length > 0) {
    hasErrors = true;
    console.log('❌ INCOMPATIBLE LICENSES:');
    for (const item of issues.incompatibleLicense) {
      console.log(`   - ${item.file}: ${item.license}`);
    }
    console.log('   ↳ Replace with CC0/MIT licensed assets');
    console.log('');
  }

  // Missing license info (WARNING)
  if (issues.missingLicense.length > 0) {
    console.log('⚠️  MISSING LICENSE INFO:');
    for (const file of issues.missingLicense) {
      console.log(`   - ${file}`);
    }
    console.log('   ↳ Add license information to CREDITS.md');
    console.log('');
  }

  // Missing source info (WARNING)
  if (issues.missingSource.length > 0) {
    console.log('⚠️  MISSING SOURCE INFO:');
    for (const file of issues.missingSource) {
      console.log(`   - ${file}`);
    }
    console.log('   ↳ Add source URL to CREDITS.md');
    console.log('');
  }

  // Orphaned credits (INFO)
  if (issues.orphanedCredits.length > 0) {
    console.log('ℹ️  ORPHANED CREDITS (file not found):');
    for (const file of issues.orphanedCredits) {
      console.log(`   - ${file}`);
    }
    console.log('   ↳ Remove from CREDITS.md or add missing files');
    console.log('');
  }

  // Final verdict
  if (hasErrors) {
    console.log('❌ VALIDATION FAILED: Asset attribution issues detected!');
    return false;
  }

  if (issues.missingLicense.length > 0 || issues.missingSource.length > 0) {
    console.log('⚠️  VALIDATION WARNING: Some assets need better attribution.');
    console.log('   Fix warnings before production release.');
    return true; // Warning, but not blocking
  }

  console.log('✅ All assets properly attributed!');
  return true;
}

function main() {
  try {
    const result = validateAssetCredits();
    const success = printReport(result);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error validating asset credits:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateAssetCredits, scanAssetFiles, parseCreditsFile };
