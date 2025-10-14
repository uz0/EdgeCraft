#!/usr/bin/env node

/**
 * Bundle size validation script
 * Ensures production builds stay within acceptable size limits
 *
 * Note: Only JS/CSS bundles count towards the limit. Assets like textures,
 * models, and maps are loaded on-demand and don't impact initial page load.
 */

const fs = require('fs');
const path = require('path');

const MAX_SIZES = {
  js: 6000 * 1024,     // 6MB max for JS bundles (includes Babylon.js ~5MB)
  css: 50 * 1024,      // 50KB max for CSS (gzipped)
  total: 6500 * 1024,  // 6.5MB total for JS + CSS only
};

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function scanDistDirectory() {
  const distDir = path.join(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const assets = {
    js: [],
    css: [],
    other: []
  };

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const size = getFileSize(fullPath);
        const relativePath = path.relative(distDir, fullPath);

        if (ext === '.js') {
          assets.js.push({ path: relativePath, size });
        } else if (ext === '.css') {
          assets.css.push({ path: relativePath, size });
        } else if (ext !== '.map' && ext !== '.html') {
          assets.other.push({ path: relativePath, size });
        }
      }
    }
  }

  scan(distDir);
  return assets;
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  console.log('📦 Validating bundle sizes...\n');

  const assets = scanDistDirectory();

  let bundleSize = 0; // Only JS/CSS counts towards bundle size
  let totalAssetSize = 0; // All assets for informational purposes
  let hasViolations = false;

  console.log('JavaScript bundles:');
  assets.js.forEach(asset => {
    bundleSize += asset.size;
    totalAssetSize += asset.size;
    const status = asset.size <= MAX_SIZES.js ? '✅' : '❌';
    console.log(`  ${status} ${asset.path}: ${formatSize(asset.size)}`);
    if (asset.size > MAX_SIZES.js) hasViolations = true;
  });

  console.log('\nCSS bundles:');
  assets.css.forEach(asset => {
    bundleSize += asset.size;
    totalAssetSize += asset.size;
    const status = asset.size <= MAX_SIZES.css ? '✅' : '❌';
    console.log(`  ${status} ${asset.path}: ${formatSize(asset.size)}`);
    if (asset.size > MAX_SIZES.css) hasViolations = true;
  });

  if (assets.other.length > 0) {
    console.log('\nOther assets (loaded on-demand, not counted in bundle):');
    const displayLimit = 10;
    const displayed = assets.other.slice(0, displayLimit);
    displayed.forEach(asset => {
      totalAssetSize += asset.size;
      console.log(`  ℹ️  ${asset.path}: ${formatSize(asset.size)}`);
    });

    if (assets.other.length > displayLimit) {
      const remaining = assets.other.slice(displayLimit);
      const remainingSize = remaining.reduce((sum, a) => sum + a.size, 0);
      totalAssetSize += remainingSize;
      console.log(`  ℹ️  ... and ${remaining.length} more assets (${formatSize(remainingSize)} total)`);
    }
  }

  console.log(`\nBundle size (JS + CSS): ${formatSize(bundleSize)}`);
  console.log(`Limit: ${formatSize(MAX_SIZES.total)}`);
  console.log(`Total assets on disk: ${formatSize(totalAssetSize)}`);

  if (bundleSize > MAX_SIZES.total) {
    console.error('\n❌ Bundle size exceeds limit!');
    hasViolations = true;
  }

  if (hasViolations) {
    console.error('\n❌ Bundle size validation failed');
    process.exit(1);
  }

  console.log('\n✅ Bundle size validation passed\n');
  process.exit(0);
}

main();
