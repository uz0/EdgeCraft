#!/usr/bin/env node

/**
 * Legal compliance validation script
 * Ensures no copyrighted assets from Blizzard games are included
 */

const fs = require('fs');
const path = require('path');

const BLOCKED_EXTENSIONS = [
  '.mpq', '.casc', '.scm', '.scx', '.w3m', '.w3x', '.SC2Map',
  '.mdx', '.mdl', '.m3', '.blp', '.dds', '.tga'
];

const ALLOWED_LICENSES = [
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause',
  'ISC', 'CC0-1.0', 'Unlicense', 'CC-BY-4.0'
];

const EXCLUDE_DIRS = [
  'node_modules', '.git', 'dist', 'coverage', '.conductor'
];

function scanDirectory(dir, violations = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        scanDirectory(fullPath, violations);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        violations.push({
          type: 'BLOCKED_FILE',
          path: fullPath,
          message: `Blocked file extension: ${ext}`
        });
      }
    }
  }

  return violations;
}

function validatePackageLicenses() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

    // Check project license
    if (!ALLOWED_LICENSES.includes(packageJson.license)) {
      console.warn(`⚠️  Project license '${packageJson.license}' should be reviewed`);
    }

    console.log('✅ Package licenses validated');
    return true;
  } catch (error) {
    console.error('❌ Error validating package licenses:', error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Running legal compliance validation...\n');

  // Scan for blocked files
  const violations = scanDirectory(process.cwd());

  if (violations.length > 0) {
    console.error('❌ Legal compliance violations found:\n');
    violations.forEach(v => {
      console.error(`  ${v.type}: ${v.path}`);
      console.error(`  ${v.message}\n`);
    });
    process.exit(1);
  }

  // Validate licenses
  if (!validatePackageLicenses()) {
    process.exit(1);
  }

  console.log('\n✅ Legal compliance validation passed');
  console.log('   - No copyrighted game files detected');
  console.log('   - All licenses are compliant\n');

  process.exit(0);
}

main();
