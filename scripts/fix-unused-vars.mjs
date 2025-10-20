#!/usr/bin/env node

/**
 * Fix unused variable errors by prefixing them with _
 */

import fs from 'fs';
import { execSync } from 'child_process';

// Get list of unused variables from TypeScript
let tscOutput;
try {
  tscOutput = execSync('npm run typecheck 2>&1', { encoding: 'utf8' });
} catch (err) {
  tscOutput = err.stdout || '';
}

const unusedVars = [];
const regex = /^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\.$/gm;

let match;
while ((match = regex.exec(tscOutput)) !== null) {
  const [, filePath, line, col, varName] = match;
  unusedVars.push({ filePath, line: parseInt(line), col: parseInt(col), varName });
}

console.log(`Found ${unusedVars.length} unused variables\n`);

// Group by file
const byFile = {};
for (const { filePath, line, varName } of unusedVars) {
  if (!byFile[filePath]) byFile[filePath] = [];
  byFile[filePath].push({ line, varName });
}

// Fix each file
for (const [filePath, vars] of Object.entries(byFile)) {
  const fullPath = filePath;
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Sort by line number descending to avoid offset issues
  vars.sort((a, b) => b.line - a.line);

  for (const { line, varName } of vars) {
    const lineIndex = line - 1;
    const originalLine = lines[lineIndex];

    // Replace varName with _varName (handle different patterns)
    const patterns = [
      new RegExp(`\\bconst ${varName}\\b`, 'g'),
      new RegExp(`\\blet ${varName}\\b`, 'g'),
      new RegExp(`\\b${varName}:\\s`, 'g'), // destructuring
    ];

    let modified = false;
    for (const pattern of patterns) {
      if (pattern.test(originalLine)) {
        lines[lineIndex] = originalLine.replace(pattern, (match) => {
          if (match.includes(':')) {
            return `_${varName}: `;
          }
          return match.replace(varName, `_${varName}`);
        });
        modified = true;
        break;
      }
    }

    if (modified) {
      console.log(`✅ ${filePath}:${line} - ${varName} → _${varName}`);
    }
  }

  fs.writeFileSync(fullPath, lines.join('\n'));
}

console.log(`\n✅ Fixed ${unusedVars.length} unused variables`);
