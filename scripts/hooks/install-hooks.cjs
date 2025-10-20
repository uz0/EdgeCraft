#!/usr/bin/env node

/**
 * Install Git Hooks
 * Copies pre-commit hook to .git/hooks/ directory
 */

const fs = require('fs');
const path = require('path');

// Determine git hooks directory (handles both regular repos and worktrees)
let gitHooksDir;
const gitPath = path.join(process.cwd(), '.git');

if (!fs.existsSync(gitPath)) {
  console.log('⚠️  Not a git repository (no .git directory found)');
  console.log('   Skipping hook installation');
  process.exit(0);
}

const stat = fs.statSync(gitPath);
if (stat.isFile()) {
  // Git worktree - read gitdir path from .git file
  const gitDirPath = fs.readFileSync(gitPath, 'utf8').trim().replace('gitdir: ', '');
  gitHooksDir = path.join(gitDirPath, 'hooks');
} else {
  // Regular git directory
  gitHooksDir = path.join(gitPath, 'hooks');
}

const preCommitSource = path.join(__dirname, 'pre-commit');
const preCommitTarget = path.join(gitHooksDir, 'pre-commit');

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
