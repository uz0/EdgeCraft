#!/usr/bin/env node

/**
 * Uninstall Git Hooks
 * Removes pre-commit hook from .git/hooks/ directory
 */

const fs = require('fs');
const path = require('path');

const preCommitTarget = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');

// Check if hook exists
if (!fs.existsSync(preCommitTarget)) {
  console.log('ℹ️  No Git hooks to uninstall');
  process.exit(0);
}

// Remove pre-commit hook
try {
  fs.unlinkSync(preCommitTarget);
  console.log('✅ Git hooks uninstalled successfully');
} catch (error) {
  console.error('❌ Failed to uninstall hooks:', error.message);
  process.exit(1);
}
