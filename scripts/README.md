# Edge Craft Scripts Directory

This directory contains build scripts, validation tools, and automation utilities for the Edge Craft project.

## 📂 Directory Structure

```
scripts/
├── hooks/                  # Git hooks for pre-commit validation
│   ├── pre-commit         # Main pre-commit hook script
│   ├── install-hooks.js   # Hook installation utility
│   └── uninstall-hooks.js # Hook removal utility
│
├── validation/            # Validation modules and tools
│   ├── AssetCreditsValidator.cjs      # Validates asset attribution
│   ├── PackageLicenseValidator.cjs    # Validates npm package licenses
│   ├── AssetDatabase.ts               # Asset tracking database
│   ├── CompliancePipeline.ts          # Legal compliance orchestration
│   ├── CopyrightValidator.ts          # Copyright violation detection
│   ├── LicenseGenerator.ts            # License file generation
│   └── VisualSimilarity.ts            # Visual asset comparison
│
├── validate-assets.cjs     # Asset validation (files, licenses, sizes)
├── validate-legal.cjs      # Legal compliance (no copyrighted files)
└── validate-attributions.js # Attribution completeness check
```

## 🚀 Quick Start

### Install Git Hooks

```bash
npm run install:hooks
```

This will install the pre-commit hook that runs:
- ✅ TypeScript type checking
- ✅ ESLint linting
- ✅ Unit tests
- ✅ Legal compliance check
- ✅ Package license validation
- ✅ Asset attribution validation

### Run All Validations Manually

```bash
npm run validate:all
```

### Run Individual Validations

```bash
# Legal compliance (no Blizzard assets)
npm run validate:legal

# Package licenses (MIT, Apache-2.0, etc.)
npm run validate:licenses

# Asset attribution (CREDITS.md completeness)
npm run validate:credits

# TypeScript type checking
npm run typecheck

# ESLint linting
npm run lint

# Unit tests
npm run test:unit
```

## 🔍 Validation Scripts

### 1. Asset Credits Validator

**File**: `validation/AssetCreditsValidator.cjs`

**Purpose**: Ensures every asset in `public/assets/` is properly attributed in `CREDITS.md`

**Checks**:
- ✅ All assets have attribution entries
- ✅ All attributions have license info (CC0, MIT, etc.)
- ✅ All attributions have source/author links
- ⚠️ Detects orphaned credits (attribution without files)
- ⚠️ Detects orphaned assets (files without attribution)

**Usage**:
```bash
node scripts/validation/AssetCreditsValidator.cjs
```

**Example Output**:
```
📊 Asset Attribution Statistics:
   Total assets: 90
   ✅ Attributed: 84
   ❌ Missing attribution: 6

❌ ASSETS WITHOUT ATTRIBUTION:
   - textures/terrain/dirt_frozen_normal.jpg
   ↳ Add these to CREDITS.md with source, author, and license
```

### 2. Package License Validator

**File**: `validation/PackageLicenseValidator.cjs`

**Purpose**: Validates all npm dependencies have compatible licenses

**Compatible Licenses**:
- ✅ MIT
- ✅ Apache-2.0
- ✅ BSD-2-Clause, BSD-3-Clause
- ✅ ISC
- ✅ CC0-1.0, Unlicense (Public Domain)
- ✅ CC-BY-4.0

**Blocked Licenses** (copyleft):
- ❌ GPL, GPL-2.0, GPL-3.0
- ❌ LGPL, LGPL-2.0, LGPL-2.1, LGPL-3.0
- ❌ AGPL, AGPL-3.0
- ❌ MPL, MPL-2.0 (Mozilla Public License)
- ❌ Commercial, Proprietary

**Usage**:
```bash
node scripts/validation/PackageLicenseValidator.cjs
```

**Example Output**:
```
📊 License Statistics:
   Total packages: 1097
   ✅ Compatible: 1089
   ❌ Blocked: 4

❌ BLOCKED LICENSES (Incompatible):
   - compressjs@1.0.3: GPL
   ↳ Remove packages with GPL/LGPL/AGPL
```

### 3. Legal Compliance Validator

**File**: `validate-legal.cjs`

**Purpose**: Ensures no copyrighted Blizzard assets are included

**Blocked File Extensions**:
- `.mpq`, `.casc` (Map archives - ALLOWED for testing)
- `.mdx`, `.mdl` (Blizzard 3D models - BLOCKED)
- `.m3` (StarCraft 2 models - BLOCKED)
- `.blp`, `.dds`, `.tga` (Blizzard textures - BLOCKED)

**Usage**:
```bash
npm run validate:legal
```

### 4. Asset File Validator

**File**: `validate-assets.cjs`

**Purpose**: Validates assets exist, have reasonable file sizes, and match manifest

**Checks**:
- ✅ All manifest entries have corresponding files
- ✅ File sizes are reasonable (textures < 5MB, models < 2MB)
- ✅ Licenses are compatible (CC0/MIT only)

**Usage**:
```bash
npm run validate-assets
```

## 🪝 Git Hooks

### Pre-Commit Hook

**File**: `hooks/pre-commit`

**Purpose**: Runs before each `git commit` to ensure code quality

**Checks** (6 steps):
1. ✅ TypeScript type checking (strict mode)
2. ✅ ESLint linting (0 errors, 0 warnings)
3. ✅ Unit tests (all passing)
4. ✅ Legal compliance (no copyrighted assets)
5. ✅ Package licenses (compatible)
6. ✅ Asset attribution (complete)

**Bypass** (emergencies only):
```bash
git commit --no-verify
```

### Install Hooks

```bash
npm run install:hooks
```

### Uninstall Hooks

```bash
npm run uninstall:hooks
```

## 🤖 CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/validation.yml`

**Runs on**:
- Push to `main`, `develop`, or any `dcversus/**` branch
- Pull requests to `main` or `develop`

**Jobs**:
1. **Validation** - Code quality & legal compliance
   - TypeScript type checking
   - ESLint linting
   - Unit tests
   - Legal compliance
   - Package licenses
   - Asset attribution

2. **E2E Tests** - Browser-based integration tests
   - Playwright E2E tests
   - Screenshot comparisons
   - Uploads failure screenshots as artifacts

3. **Security Audit** - npm audit for vulnerabilities
   - Checks for moderate+ severity issues
   - Non-blocking (warns but doesn't fail)

## 📋 Validation Workflow

### Development Workflow

```bash
# 1. Install hooks (one-time setup)
npm run install:hooks

# 2. Make changes to code
# ...

# 3. Run validations before commit
npm run validate:all

# 4. Commit (pre-commit hook runs automatically)
git commit -m "Your commit message"
```

### CI/CD Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Push to branch or create PR                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions: validation.yml                              │
│                                                              │
│ 1. TypeScript ──> ESLint ──> Unit Tests                    │
│ 2. Legal ──> Licenses ──> Assets                           │
│ 3. E2E Tests (Playwright)                                   │
│ 4. Security Audit (npm audit)                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ All checks pass → Ready to merge                        │
│ ❌ Any check fails → Cannot merge                          │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Hook Not Running

```bash
# Reinstall hooks
npm run uninstall:hooks
npm run install:hooks

# Verify installation
ls -la .git/hooks/pre-commit
```

### Package License Issues

If you encounter blocked packages (GPL, LGPL, MPL):

1. Find alternative package with compatible license (MIT, Apache-2.0)
2. Update `package.json` to use alternative
3. Run `npm install` and re-validate

**Example**:
```bash
# Remove GPL package
npm uninstall compressjs

# Install MIT alternative
npm install pako

# Re-validate
npm run validate:licenses
```

### Asset Attribution Missing

If assets are missing attribution:

1. Identify asset source (Poly Haven, Quaternius, Kenney, etc.)
2. Add entry to `CREDITS.md` with:
   - Filename (in backticks)
   - Source URL
   - Author name
   - License (CC0, MIT, etc.)

**Example**:
```markdown
- `grass_light.jpg` / `grass_light_normal.jpg` / `grass_light_roughness.jpg`
  - Source: Poly Haven "Sparse Grass" (https://polyhaven.com/a/sparse_grass)
  - Authors: Poly Haven team
  - License: CC0
```

## 📚 References

- [CREDITS.md](../CREDITS.md) - Asset attribution file
- [CLAUDE.md](../CLAUDE.md) - Development workflow guidelines
- [README.md](../README.md) - Project overview
- [package.json](../package.json) - NPM scripts reference

## 🔗 External Resources

- [SPDX License List](https://spdx.org/licenses/) - Standard license identifiers
- [Choose a License](https://choosealicense.com/) - License comparison
- [Poly Haven License](https://polyhaven.com/license) - CC0 asset source
- [Kenney Assets](https://kenney.nl/assets) - CC0 game assets
- [Quaternius](https://quaternius.com/) - CC0 3D models

---

**Last Updated**: 2025-10-19
**Maintained by**: Edge Craft Team
