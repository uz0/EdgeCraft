#!/usr/bin/env tsx
/**
 * Auto-fix ESLint warnings for nullable string checks and missing return types
 */

import * as fs from 'fs';
import * as path from 'path';

const filesToFix = [
  'src/workers/parsers/W3XClassicParser.ts',
  'src/workers/parsers/W3NCampaignParser.ts',
  'src/workers/parsers/SC2MapParser.ts',
  'src/engine/storage/PreviewCacheDB.ts',
  'src/formats/mpq/MPQParser.ts',
];

function fixNullableStringChecks(content: string): string {
  // Fix patterns like: if (dataUrl) { to if (dataUrl !== null && dataUrl !== '') {
  // But only for string variables, not objects

  // Pattern 1: if (variable) where variable is a nullable string
  content = content.replace(
    /if \((dataUrl|embeddedPreview|campaignIcon|nestedPreview|generatedPreview)\) \{/g,
    "if ($1 !== null && $1 !== '') {"
  );

  // Pattern 2: if (!variable) where variable is a nullable string
  content = content.replace(
    /if \(!(dataUrl|fileData|previewData|result)\) \{/g,
    'if ($1 === null || $1 === undefined) {'
  );

  return content;
}

function fixMissingReturnTypes(content: string): string {
  // Fix inline arrow functions without return types

  // Pattern 1: .then(() => {
  content = content.replace(/\.then\(\(\) => \{/g, '.then((): void => {');

  // Pattern 2: new Promise((resolve, reject) => {
  content = content.replace(
    /new Promise\(\(resolve, reject\) => \{/g,
    'new Promise((resolve, reject): void => {'
  );

  return content;
}

async function fixFile(filePath: string): Promise<void> {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Apply fixes
  content = fixNullableStringChecks(content);
  content = fixMissingReturnTypes(content);

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⚪ No changes: ${filePath}`);
  }
}

async function main(): Promise<void> {
  console.log('🔧 Fixing ESLint warnings...\n');

  for (const file of filesToFix) {
    await fixFile(file);
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
