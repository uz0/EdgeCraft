#!/usr/bin/env node
/**
 * Prepare benchmark artifact directory by ensuring required folders exist
 * and optionally cleaning previous result files.
 *
 * Usage:
 *   node scripts/benchmark/prepare.cjs
 *   node scripts/benchmark/prepare.cjs --scope=browser
 *   node scripts/benchmark/prepare.cjs --scope=node
 */

const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const scopeArg = args.find((arg) => arg.startsWith('--scope='));
const scope = scopeArg ? scopeArg.split('=')[1] : 'all';

const analysisDir = path.resolve('tests/analysis');
if (!fs.existsSync(analysisDir)) {
  fs.mkdirSync(analysisDir, { recursive: true });
}

const targetsByScope = {
  browser: ['browser-benchmark-results.json'],
  node: ['node-benchmark-results.json'],
  all: ['browser-benchmark-results.json', 'node-benchmark-results.json']
};

const targets = targetsByScope[scope] ?? targetsByScope.all;
for (const fileName of targets) {
  const filePath = path.join(analysisDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
}
