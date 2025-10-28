# Documentation Updates Required for MPQ Extraction

**Date**: 2025-10-28
**Status**: ✅ Complete
**Related**: [Extraction Blueprint](./mpq-extraction-blueprint.md)

---

## 🎯 Overview

This document catalogs all documentation that must be created or updated during the MPQ toolkit extraction process. Updates are organized by phase and repository.

---

## 📦 New Repository: `@edgecraft/mpq-toolkit`

### Phase 1-2: Core Documentation

**README.md**
- [ ] Project description and value proposition
- [ ] Browser + Node.js support badges
- [ ] Installation instructions (`npm install @edgecraft/mpq-toolkit`)
- [ ] Quick start code example
- [ ] Supported compression algorithms list
- [ ] Link to full API documentation
- [ ] Link to GitHub repo and issues
- [ ] License badge (Apache-2.0)

**LICENSE**
- [ ] Full Apache License 2.0 text
- [ ] Copyright holder: Edge Craft Contributors

**NOTICE**
- [ ] StormLib specification attribution
- [ ] Ladislav Zezula credit (StormLib maintainer)
- [ ] Third-party dependency acknowledgments:
  - pako (MIT) - Zlib decompression
  - lzma-js (MIT) - LZMA decompression
  - seek-bzip (MIT) - Bzip2 decompression

**SECURITY.md**
- [ ] Vulnerability reporting process
- [ ] Supported versions table
- [ ] Security contact email
- [ ] PGP key (if applicable)

### Phase 3-4: API & Developer Docs

**docs/api/README.md** (TypeDoc generated)
- [ ] MPQParser class reference
- [ ] All public methods documented
- [ ] All public types/interfaces documented
- [ ] Code examples for common use cases
- [ ] Compression algorithm details

**docs/migration-guide.md**
- [ ] Migrating from mpqjs
- [ ] Migrating from stormlib-node
- [ ] API differences and breaking changes
- [ ] Code examples (before/after)

**docs/contributing.md**
- [ ] How to contribute
- [ ] Development setup (`npm install`, `npm test`)
- [ ] Coding standards (TypeScript strict, ESLint rules)
- [ ] PR process and review checklist
- [ ] Link to PRP process

**docs/troubleshooting.md**
- [ ] Common errors and solutions
- [ ] Browser compatibility issues
- [ ] Performance optimization tips
- [ ] Debugging techniques

### Phase 5-8: Advanced & Community Docs

**CHANGELOG.md**
- [ ] Semantic versioning explained
- [ ] Alpha releases (1.0.0-alpha.1, 1.0.0-alpha.2)
- [ ] Release candidate (1.0.0-rc.1)
- [ ] Production release (1.0.0)
- [ ] Future planned features

**CODE_OF_CONDUCT.md**
- [ ] Contributor Covenant 2.1
- [ ] Enforcement guidelines
- [ ] Contact information

**AGENTS.md** (as per PRP requirements)
- [ ] Mission statement
- [ ] Workflow overview (Issue → PRP → Implement → Test → PR → Merge)
- [ ] PRP creation instructions
- [ ] Code review rules (Claude + human reviewers)
- [ ] CI hooks and GitHub Actions
- [ ] Quality gates (90% coverage, typecheck, lint)

**docs/architecture.md**
- [ ] High-level architecture diagram
- [ ] MPQParser flow (parse → hash table → block table → extract)
- [ ] Compression pipeline
- [ ] Streaming API design
- [ ] Performance considerations

**docs/file-formats.md**
- [ ] MPQ v1 format (Warcraft III)
- [ ] MPQ v2 format (StarCraft II)
- [ ] Hash table structure
- [ ] Block table structure
- [ ] Compression flags
- [ ] External references (StormLib docs, format wikis)

---

## 🎮 Edge Craft Repository Updates

### Phase 5-6: Integration Documentation

**README.md**
- [ ] Update "Architecture" section - reference external `@edgecraft/mpq-toolkit`
- [ ] Add "Dependencies" section:
  ```markdown
  ## Dependencies
  - `@edgecraft/mpq-toolkit` - MPQ archive parser (Apache-2.0)
  - `@babylonjs/core` - WebGL rendering engine (Apache-2.0)
  ```
- [ ] Update build instructions (new dependency)

**CONTRIBUTING.md**
- [ ] Add note: MPQ/compression changes go to `github.com/edgecraft/mpq-toolkit`
- [ ] Link to mpq-toolkit contribution guide
- [ ] Update local development setup (linked npm package):
  ```bash
  # Development with local mpq-toolkit
  cd ../mpq-toolkit
  npm link
  cd ../edgecraft
  npm link @edgecraft/mpq-toolkit
  ```

**docs/architecture/map-loading.md**
- [ ] Update architecture diagram showing external dependency
- [ ] Before:
  ```
  Edge Craft
  ├── src/formats/mpq/ (internal)
  ├── src/formats/compression/ (internal)
  └── src/formats/maps/w3x/ (uses internal MPQ)
  ```
- [ ] After:
  ```
  Edge Craft
  ├── @edgecraft/mpq-toolkit (external npm)
  └── src/formats/maps/w3x/ (imports from package)
  ```
- [ ] Document package version pinning strategy
- [ ] Document update process for mpq-toolkit

**docs/architecture/dependencies.md** (NEW)
- [ ] List all external dependencies
- [ ] License compliance matrix
- [ ] Security update policy
- [ ] Dependency upgrade cadence

### Phase 7-8: Final Documentation

**package.json**
- [ ] Update `description` to mention mpq-toolkit usage
- [ ] Add `@edgecraft/mpq-toolkit` to `dependencies`
- [ ] Update version (minor bump due to dependency change)

**CHANGELOG.md**
- [ ] Document MPQ extraction change:
  ```markdown
  ## [0.2.0] - 2025-12-31
  ### Changed
  - **BREAKING**: Extracted MPQ parser into `@edgecraft/mpq-toolkit` package
  - Map loaders now import from `@edgecraft/mpq-toolkit` (API unchanged)
  - Reduced bundle size by 45KB (MPQ code externalized)

  ### Migration
  No changes required for consumers. Internal refactor only.
  ```

**docs/troubleshooting.md**
- [ ] Add section: "MPQ Parsing Errors"
- [ ] Link to mpq-toolkit issues page
- [ ] Note: Report MPQ bugs to `@edgecraft/mpq-toolkit` repo, not Edge Craft

**docs/performance.md**
- [ ] Update benchmarks with new dependency
- [ ] Note: MPQ parsing performance now governed by external package
- [ ] Link to mpq-toolkit performance docs

---

## 📊 Documentation Checklist by Phase

### Phase 0: Preparation
- [x] Create `docs/research/mpq-library-comparison.md`
- [x] Create `docs/research/mpq-extraction-blueprint.md`
- [x] Create `docs/research/documentation-updates-required.md` (this file)
- [ ] Create `docs/research/mpq-api-baseline.md` (API contract snapshot)

### Phase 1-2: Package Bootstrap
- [ ] Write `@edgecraft/mpq-toolkit/README.md`
- [ ] Copy Apache-2.0 license to `@edgecraft/mpq-toolkit/LICENSE`
- [ ] Write `@edgecraft/mpq-toolkit/NOTICE`
- [ ] Write `@edgecraft/mpq-toolkit/SECURITY.md`

### Phase 3-4: Testing & Publication
- [ ] Generate TypeDoc API docs
- [ ] Write migration guide
- [ ] Write contributing guide
- [ ] Initialize CHANGELOG.md

### Phase 5-6: Edge Craft Integration
- [ ] Update Edge Craft README.md
- [ ] Update Edge Craft CONTRIBUTING.md
- [ ] Update `docs/architecture/map-loading.md`
- [ ] Create `docs/architecture/dependencies.md`

### Phase 7-8: Finalization
- [ ] Write troubleshooting guide
- [ ] Write architecture docs
- [ ] Write file formats reference
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Create AGENTS.md
- [ ] Update Edge Craft CHANGELOG.md
- [ ] Update Edge Craft package.json

---

## 📝 Documentation Templates

### README.md Template (mpq-toolkit)

```markdown
# @edgecraft/mpq-toolkit

> The only actively-maintained browser-native MPQ archive parser with full compression support

[![npm version](https://badge.fury.io/js/@edgecraft%2Fmpq-toolkit.svg)](https://www.npmjs.com/package/@edgecraft/mpq-toolkit)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)]()

Parse MPQ archives (Warcraft III, StarCraft II, StarCraft I) in browser and Node.js with full compression algorithm support.

## ✨ Features

- ⚡ **Fast** - Optimized TypeScript implementation
- 🌐 **Browser-Ready** - Works directly in browser, no server needed
- 🎯 **Complete** - Supports all 6 compression algorithms (LZMA, Zlib, Bzip2, Huffman, ADPCM, Sparse)
- 📦 **Small** - Under 50KB gzipped
- 🧪 **Tested** - 90%+ test coverage with real-world MPQ files
- 🔒 **Safe** - Clean-room implementation (Apache-2.0)

## 📦 Installation

```bash
npm install @edgecraft/mpq-toolkit
# or
pnpm add @edgecraft/mpq-toolkit
# or
yarn add @edgecraft/mpq-toolkit
```

## 🚀 Quick Start

```typescript
import { MPQParser } from '@edgecraft/mpq-toolkit';

// Parse MPQ archive
const response = await fetch('/path/to/map.w3x');
const buffer = await response.arrayBuffer();
const parser = new MPQParser(buffer);
const result = await parser.parse();

if (result.success) {
  console.log('Files:', result.archive.fileList);

  // Extract file
  const file = await parser.extractFile('war3map.w3i');
  console.log('Extracted', file.name, file.data);
}
```

## 📚 Documentation

- [API Reference](https://edgecraft.github.io/mpq-toolkit/api/)
- [Migration Guide](https://edgecraft.github.io/mpq-toolkit/migration-guide/)
- [Architecture](https://edgecraft.github.io/mpq-toolkit/architecture/)
- [Contributing](./CONTRIBUTING.md)

## 🙏 Acknowledgments

This library is based on the [StormLib](https://github.com/ladislav-zezula/StormLib) specification by Ladislav Zezula.

**Dependencies:**
- [pako](https://github.com/nodeca/pako) (MIT) - Zlib decompression
- [lzma-js](https://github.com/LZMA-JS/LZMA-JS) (MIT) - LZMA decompression
- [seek-bzip](https://github.com/cscott/seek-bzip) (MIT) - Bzip2 decompression

## 📄 License

Apache License 2.0 - See [LICENSE](./LICENSE) for details.
```

### NOTICE Template (mpq-toolkit)

```
Apache License 2.0

This product includes software developed by the Edge Craft project
(https://github.com/edgecraft/edgecraft).

This product includes software based on the StormLib MPQ specification
by Ladislav Zezula (https://github.com/ladislav-zezula/StormLib), used
under the MIT License.

Third-Party Dependencies:

- pako (https://github.com/nodeca/pako) - MIT License
- lzma-js (https://github.com/LZMA-JS/LZMA-JS) - MIT License
- seek-bzip (https://github.com/cscott/seek-bzip) - MIT License

The MPQ file format is a proprietary format created by Blizzard Entertainment.
This library is a clean-room implementation based on publicly available
specifications and does not contain any Blizzard proprietary code.
```

---

## ✅ Documentation Ownership

| Document | Owner | Reviewer |
|----------|-------|----------|
| README.md (mpq-toolkit) | Developer | QA Lead |
| API Reference | Developer | Tech Writer |
| Migration Guide | Developer | Tech Writer |
| Edge Craft README.md | Developer | Product Owner |
| Edge Craft CONTRIBUTING.md | Developer | Engineering Lead |
| Architecture Docs | Developer | Architect |
| AGENTS.md | Developer | Process Manager |

---

## 📚 References

- [Edge Craft CLAUDE.md](../../CLAUDE.md) - Documentation discipline (Three-File Rule)
- [Extraction Blueprint](./mpq-extraction-blueprint.md) - Phased rollout plan
- [Library Comparison](./mpq-library-comparison.md) - Competitive analysis

---

**Status**: ✅ **COMPLETE - Ready for Implementation**
