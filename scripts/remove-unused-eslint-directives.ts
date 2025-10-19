#!/usr/bin/env tsx
/**
 * Remove unused eslint-disable directives
 *
 * After broadening ESLint config overrides, many inline disable comments
 * became unnecessary. This script removes them automatically.
 */

import * as fs from 'fs';
import * as path from 'path';

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function removeUnusedDirectives(): Promise<void> {
  // Find all TypeScript files in src/
  const files = getAllTsFiles('src');

  let totalRemoved = 0;

  for (const file of files) {
    const fullPath = path.resolve(file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Remove inline disable comments for rules now disabled globally
    // Pattern 1: // eslint-disable-next-line RULE_NAME
    content = content.replace(/\/\/ eslint-disable-next-line no-empty\n/g, '');
    content = content.replace(
      /\/\/ eslint-disable-next-line @typescript-eslint\/ban-ts-comment\n/g,
      ''
    );
    content = content.replace(
      /\/\/ eslint-disable-next-line @typescript-eslint\/strict-boolean-expressions\n/g,
      ''
    );
    content = content.replace(
      /\/\/ eslint-disable-next-line @typescript-eslint\/explicit-function-return-type\n/g,
      ''
    );

    // Pattern 2: // eslint-disable-line RULE_NAME (at end of line)
    content = content.replace(/ \/\/ eslint-disable-line no-empty/g, '');
    content = content.replace(/ \/\/ eslint-disable-line @typescript-eslint\/ban-ts-comment/g, '');
    content = content.replace(
      / \/\/ eslint-disable-line @typescript-eslint\/strict-boolean-expressions/g,
      ''
    );
    content = content.replace(
      / \/\/ eslint-disable-line @typescript-eslint\/explicit-function-return-type/g,
      ''
    );

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      totalRemoved++;
      console.log(`✅ Cleaned: ${file}`);
    }
  }

  console.log(`\n✨ Done! Cleaned ${totalRemoved} files.`);
}

removeUnusedDirectives().catch(console.error);
