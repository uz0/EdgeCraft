#!/usr/bin/env node

/**
 * Remove all console statements from TypeScript/TSX files
 * This script removes console.log, console.warn, console.error, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let i = 0;
  let removed = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if line contains console statement
    if (/console\.(log|warn|error|info|debug|trace)/.test(line)) {
      // Single-line console statement
      if (/console\.[a-z]+\(.*\);?\s*$/.test(line.trim())) {
        removed++;
        i++;
        continue;
      }

      // Multi-line console statement - skip until we find the closing );
      let depth = 0;
      let foundStart = false;
      let skip = true;

      while (i < lines.length) {
        const currentLine = lines[i];

        for (const char of currentLine) {
          if (char === '(') {
            depth++;
            foundStart = true;
          } else if (char === ')') {
            depth--;
            if (foundStart && depth === 0) {
              skip = false;
              break;
            }
          }
        }

        i++;
        removed++;

        if (!skip) break;
      }

      continue;
    }

    newLines.push(line);
    i++;
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`✅ ${path.relative(srcDir, filePath)}: Removed ${removed} console statements`);
    return removed;
  }

  return 0;
}

function walkDir(dir) {
  let totalRemoved = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalRemoved += walkDir(filePath);
    } else if (/\.(ts|tsx)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
      totalRemoved += processFile(filePath);
    }
  }

  return totalRemoved;
}

console.log('🔍 Removing console statements from src/ directory...\n');
const totalRemoved = walkDir(srcDir);
console.log(`\n✅ Total removed: ${totalRemoved} console statements`);
