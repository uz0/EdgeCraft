#!/usr/bin/env node

/**
 * Install Git Hooks
 * Copies pre-commit hook to .git/hooks/ directory
 */

const fs = require('fs');
const path = require('path');

const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
const preCommitSource = path.join(__dirname, 'pre-commit');
const preCommitTarget = path.join(gitHooksDir, 'pre-commit');

// Check if .git directory exists
if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
  console.log('⚠️  Not a git repository (no .git directory found)');
  console.log('   Skipping hook installation');
  process.exit(0);
}

// Create hooks directory if it doesn't exist
if (!fs.existsSync(gitHooksDir)) {
  fs.mkdirSync(gitHooksDir, { recursive: true });
}

// Copy pre-commit hook
try {
  fs.copyFileSync(preCommitSource, preCommitTarget);
  fs.chmodSync(preCommitTarget, '755');
  console.log('✅ Git hooks installed successfully');
  console.log('   → Pre-commit hook: .git/hooks/pre-commit');
} catch (error) {
  console.error('❌ Failed to install hooks:', error.message);
  process.exit(1);
}
