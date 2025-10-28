# Agent Instruction Manual: MPQ Toolkit Extraction

**Date**: 2025-10-28
**Status**: ✅ Complete
**For**: Follow-on AI Agent or Human Developer
**Estimated Duration**: 10 weeks (2 developers)

---

## 🎯 Mission

**Extract the MPQ archive parser and compression modules from Edge Craft into a standalone npm package (`@edgecraft/mpq-toolkit`) while ensuring zero regressions, maintaining 90%+ test coverage, and establishing proper governance for the new repository.**

**Success Criteria:**
- ✅ Package published to npm as `@edgecraft/mpq-toolkit@1.0.0`
- ✅ Edge Craft uses package instead of local code (3,131 lines removed)
- ✅ All tests passing (0 new failures)
- ✅ Performance within ±5% of baseline
- ✅ Landing page deployed with documentation
- ✅ Community adoption (>100 npm downloads/week within 3 months)

---

## 📚 Required Reading (MUST READ BEFORE STARTING)

1. **[MPQ Library Comparison](./mpq-library-comparison.md)** - Why we're extracting (15 min read)
2. **[Extraction Blueprint](./mpq-extraction-blueprint.md)** - Phased execution plan (30 min read)
3. **[Documentation Updates Required](./documentation-updates-required.md)** - All docs to create/update (10 min read)
4. **[Edge Craft CLAUDE.md](../../CLAUDE.md)** - Coding standards, zero comments policy, file size limits (20 min read)

**Total Reading Time**: ~75 minutes

**DO NOT SKIP THIS READING.** These documents contain critical context and prevent costly mistakes.

---

## 🏁 Phase 0: Preparation & Baseline

### Objective
Establish performance baselines and prepare infrastructure.

### Prerequisites
- [x] Library comparison complete
- [x] Extraction blueprint approved
- [x] npm package name reserved (`@edgecraft/mpq-toolkit`)

### Tasks

#### Task 0.1: Capture Baseline Benchmarks

**Command:**
```bash
cd /path/to/edgecraft
npm run benchmark -- mpq-baseline
```

**Expected Output:**
```json
{
  "parseTimeMs": {
    "test.w3x": 45.2,
    "large.w3x": 280.5,
    "campaign.w3n": 125.8
  },
  "extractTimeMs": {
    "war3map.w3i": 12.3,
    "war3map.w3e": 34.7
  },
  "memoryUsageMB": {
    "peak": 128.4,
    "average": 85.2
  }
}
```

**Save to:** `benchmarks/mpq-baseline-2025-10-28.json`

**Verification:**
- [ ] Benchmark file created
- [ ] Parse times for 3+ maps captured
- [ ] Extract times for 2+ files captured
- [ ] Memory usage captured

---

#### Task 0.2: Document Current API Contracts

**Command:**
```bash
cd /path/to/edgecraft
npm run extract-api -- src/formats/mpq/MPQParser.ts > docs/research/mpq-api-baseline.md
```

**Manual Documentation:**

Create `docs/research/mpq-api-baseline.md`:

```markdown
# MPQ API Baseline (2025-10-28)

## Public API

### MPQParser

**Constructor:**
```typescript
constructor(buffer: ArrayBuffer)
```

**Methods:**
```typescript
parse(): MPQParseResult
extractFile(filename: string): Promise<MPQFile>
parseStream(reader: StreamingFileReader, options: MPQStreamOptions): Promise<MPQStreamParseResult>
getArchive(): MPQArchive | undefined
```

**Types:**
```typescript
interface MPQParseResult {
  success: boolean;
  error?: string;
  parseTimeMs: number;
  archive?: MPQArchive;
}

interface MPQArchive {
  header: MPQHeader;
  hashTable: MPQHashEntry[];
  blockTable: MPQBlockEntry[];
  fileList: string[];
}

// ... (copy all type definitions)
```

## Usage Examples

```typescript
// Example 1: Parse and extract
const parser = new MPQParser(arrayBuffer);
const result = await parser.parse();
if (result.success) {
  const file = await parser.extractFile('war3map.w3i');
}

// Example 2: Streaming API
const reader = new StreamingFileReader(file);
const result = await parser.parseStream(reader, { extractFiles: ['(listfile)'] });
```
```

**Verification:**
- [ ] All public methods documented
- [ ] All public types documented
- [ ] Usage examples included
- [ ] File saved to `docs/research/mpq-api-baseline.md`

---

#### Task 0.3: Create New GitHub Repository

**Step 1: Create Repository**

Go to https://github.com/edgecraft and create new repository:
- Name: `mpq-toolkit`
- Description: `Browser-native MPQ archive parser with full compression support`
- Visibility: Public
- Initialize with README: **No** (we'll create it)
- Add .gitignore: **No**
- Add license: **No** (we'll add Apache-2.0)

**Step 2: Clone Repository**

```bash
git clone git@github.com:edgecraft/mpq-toolkit.git
cd mpq-toolkit
```

**Step 3: Initialize Package**

```bash
npm init -y
```

**Step 4: Configure Git**

```bash
git config user.name "Edge Craft Bot"
git config user.email "bot@edgecraft.dev"
```

**Verification:**
- [ ] Repository created at `github.com/edgecraft/mpq-toolkit`
- [ ] Repository cloned locally
- [ ] `package.json` exists
- [ ] Git configured

---

#### Task 0.4: Configure CI/CD Pipelines

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

**Verification:**
- [ ] `.github/workflows/ci.yml` created
- [ ] Workflow runs on push/PR
- [ ] All Node versions tested

**Phase 0 Exit Criteria:**
- [ ] Baseline benchmarks captured
- [ ] API contracts documented
- [ ] New repository created and configured
- [ ] CI/CD pipelines running

---

## 🏗️ Phase 1: Repository Bootstrap & Core Extraction

### Objective
Create standalone package with MPQParser (stubbed compression).

### Tasks

#### Task 1.1: Initialize TypeScript Project

**Create `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Update `package.json`:**

```json
{
  "name": "@edgecraft/mpq-toolkit",
  "version": "1.0.0-alpha.1",
  "description": "Browser-native MPQ archive parser with full compression support",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc && tsc -p tsconfig.esm.json",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mpq", "warcraft", "starcraft", "blizzard", "archive", "parser"],
  "author": "Edge Craft Contributors",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/edgecraft/mpq-toolkit"
  },
  "bugs": {
    "url": "https://github.com/edgecraft/mpq-toolkit/issues"
  },
  "homepage": "https://edgecraft.github.io/mpq-toolkit/",
  "dependencies": {
    "pako": "^2.1.0",
    "lzma-js": "^3.0.0",
    "seek-bzip": "^1.0.6"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/pako": "^2.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.55.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

**Install Dependencies:**

```bash
npm install
```

**Verification:**
- [ ] `tsconfig.json` created
- [ ] `package.json` updated with all fields
- [ ] Dependencies installed
- [ ] `npm run typecheck` passes (no files yet, but config valid)

---

#### Task 1.2: Copy MPQ Core Files

**Copy Files from Edge Craft:**

```bash
# Assuming edgecraft repo is at ../edgecraft
mkdir -p src/mpq src/utils

cp ../edgecraft/src/formats/mpq/MPQParser.ts src/mpq/MPQParser.ts
cp ../edgecraft/src/formats/mpq/types.ts src/mpq/types.ts
cp ../edgecraft/src/utils/StreamingFileReader.ts src/utils/StreamingFileReader.ts
```

**Update Imports in `src/mpq/MPQParser.ts`:**

```diff
- import { StreamingFileReader } from '../../utils/StreamingFileReader';
+ import { StreamingFileReader } from '../utils/StreamingFileReader';

- import { LZMADecompressor } from '../compression/LZMADecompressor';
+ import { LZMADecompressor } from '../compression/LZMADecompressor'; // Keep path

// ... (same for all compression imports)
```

**Verification:**
- [ ] Files copied successfully
- [ ] Imports updated
- [ ] No references to Edge Craft code remain

---

#### Task 1.3: Create Compression Stubs

**Create `src/compression/LZMADecompressor.ts`:**

```typescript
export class LZMADecompressor {
  decompress(input: Uint8Array, expectedSize: number): Uint8Array {
    // TODO: Implement in Phase 2
    console.warn('LZMA decompression stubbed');
    return new Uint8Array(expectedSize);
  }
}
```

**Repeat for all decompressors:**
- `ZlibDecompressor.ts`
- `Bzip2Decompressor.ts`
- `HuffmanDecompressor.ts`
- `ADPCMDecompressor.ts`
- `SparseDecompressor.ts`

**Create `src/compression/types.ts`:**

```typescript
export enum CompressionAlgorithm {
  None = 0x00,
  Huffman = 0x01,
  Zlib = 0x02,
  PKZIP = 0x08,
  Bzip2 = 0x10,
  Sparse = 0x20,
  ADPCM_Mono = 0x40,
  ADPCM_Stereo = 0x80,
  LZMA = 0x12,
}
```

**Verification:**
- [ ] All 6 decompressor stubs created
- [ ] `types.ts` created
- [ ] `npm run typecheck` passes

---

#### Task 1.4: Create Public Exports

**Create `src/index.ts`:**

```typescript
// MPQ Parser
export { MPQParser } from './mpq/MPQParser';

// Types
export type {
  MPQArchive,
  MPQHeader,
  MPQHashEntry,
  MPQBlockEntry,
  MPQFile,
  MPQParseResult,
  MPQStreamOptions,
  MPQStreamParseResult,
} from './mpq/types';

// Compression (for advanced users)
export { LZMADecompressor } from './compression/LZMADecompressor';
export { ZlibDecompressor } from './compression/ZlibDecompressor';
export { Bzip2Decompressor } from './compression/Bzip2Decompressor';
export { HuffmanDecompressor } from './compression/HuffmanDecompressor';
export { ADPCMDecompressor } from './compression/ADPCMDecompressor';
export { SparseDecompressor } from './compression/SparseDecompressor';
export { CompressionAlgorithm } from './compression/types';
```

**Verification:**
- [ ] `src/index.ts` created
- [ ] All public API exported
- [ ] `npm run build` succeeds
- [ ] `dist/` folder created

**Phase 1 Exit Criteria:**
- [ ] Package structure complete
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run lint` passes (0 warnings)
- [ ] `npm run build` produces valid bundle
- [ ] Can be imported: `import { MPQParser } from '@edgecraft/mpq-toolkit'`

---

## 📦 Phase 2-8: Execution Instructions

**IMPORTANT:** Phases 2-8 are detailed in the [Extraction Blueprint](./mpq-extraction-blueprint.md).

For each phase:
1. **Read the phase objectives** in the blueprint
2. **Complete all tasks** in order
3. **Verify exit criteria** before proceeding
4. **Update progress tracking** in PRP

### Quick Phase Overview

- **Phase 2** (Week 3): Extract compression modules (replace stubs with real code)
- **Phase 3** (Week 4): Integration tests with real MPQ files
- **Phase 4** (Week 5): Publish alpha to npm
- **Phase 5** (Week 6): Edge Craft compatibility layer
- **Phase 6** (Week 7): Delete local MPQ code from Edge Craft
- **Phase 7** (Week 8-9): Documentation and stabilization
- **Phase 8** (Week 10): Production release and landing page launch

**Refer to [Extraction Blueprint](./mpq-extraction-blueprint.md) for detailed instructions.**

---

## 🧪 Testing Guidelines

### Running Tests

**Unit Tests:**
```bash
npm run test -- src/compression/LZMADecompressor.unit.ts
```

**Integration Tests:**
```bash
npm run test -- tests/integration/
```

**Coverage Report:**
```bash
npm run test -- --coverage
```

**Target**: ≥90% coverage for all compression modules and MPQParser.

### Test Structure

```typescript
// tests/unit/LZMADecompressor.unit.ts
import { describe, it, expect } from 'vitest';
import { LZMADecompressor } from '../../src/compression/LZMADecompressor';

describe('LZMADecompressor', () => {
  it('should decompress valid LZMA data', () => {
    const decompressor = new LZMADecompressor();
    const input = new Uint8Array([/* LZMA compressed data */]);
    const output = decompressor.decompress(input, 1024);

    expect(output).toBeInstanceOf(Uint8Array);
    expect(output.byteLength).toBe(1024);
  });

  it('should handle corrupt data gracefully', () => {
    const decompressor = new LZMADecompressor();
    const input = new Uint8Array([0xFF, 0xFF, 0xFF]);

    expect(() => {
      decompressor.decompress(input, 1024);
    }).toThrow();
  });
});
```

---

## 📊 Quality Gates

Before completing ANY phase, verify:

### Code Quality

```bash
npm run typecheck  # 0 errors
npm run lint       # 0 warnings
npm run test       # 100% passing, ≥90% coverage
```

### Performance

```bash
npm run benchmark
```

Compare to baseline (`benchmarks/mpq-baseline-2025-10-28.json`):
- Parse time: ±5%
- Extract time: ±5%
- Memory usage: ±10%

### Security

```bash
npm audit         # 0 vulnerabilities
npm run validate  # License checker passes
```

### Bundle Size

```bash
npm run build
du -h dist/index.js | awk '{print $1}'  # Should be <50KB gzipped
```

---

## 🚨 Troubleshooting

### Issue: TypeScript Errors After Copying Files

**Symptom**: `Cannot find module '../../utils/StreamingFileReader'`

**Solution**:
1. Check file paths are correct
2. Update imports to use relative paths within new package
3. Ensure `src/utils/StreamingFileReader.ts` exists

### Issue: Tests Failing Due to Missing Fixtures

**Symptom**: `ENOENT: no such file or directory, open 'fixtures/test.w3x'`

**Solution**:
1. Copy test fixtures from Edge Craft: `cp -r ../edgecraft/tests/fixtures ./fixtures`
2. Sanitize fixtures (remove any copyrighted content)
3. Add fixtures to `.gitignore` if they contain sensitive data

### Issue: npm publish Fails with "Package name already exists"

**Symptom**: `npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@edgecraft%2fmpq-toolkit`

**Solution**:
1. Check if you're logged in: `npm whoami`
2. Verify you have publish rights to `@edgecraft` scope
3. Use `npm publish --access public` for scoped packages

### Issue: Performance Regression in Edge Craft

**Symptom**: Benchmarks show >10% slowdown after integration

**Solution**:
1. Profile with Chrome DevTools: `node --inspect-brk node_modules/.bin/vitest`
2. Identify bottleneck (likely unnecessary copying or synchronous operations)
3. Fix in package, publish hotfix
4. Update Edge Craft to new version

---

## 📋 Checklist for Agent Completion

Before marking this PRP as complete:

- [ ] All 8 phases executed successfully
- [ ] Package published to npm as `@edgecraft/mpq-toolkit@1.0.0`
- [ ] Edge Craft PR merged (local MPQ code deleted)
- [ ] All tests passing (Edge Craft + mpq-toolkit)
- [ ] Performance within ±5% of baseline
- [ ] Landing page deployed
- [ ] Documentation complete (README, API, migration guide)
- [ ] NOTICE file with StormLib attribution
- [ ] License checker passing
- [ ] npm audit clean
- [ ] Bundle size <50KB gzipped
- [ ] PRP progress tracking updated
- [ ] Final report written (see below)

---

## 📝 Final Report Template

After completing all phases, create `docs/research/extraction-final-report.md`:

```markdown
# MPQ Toolkit Extraction - Final Report

**Date**: [Completion Date]
**Agent**: [Your Name/ID]
**Duration**: [Actual Duration]

## Summary

[Brief overview of what was accomplished]

## Metrics

### Package
- npm package: `@edgecraft/mpq-toolkit@1.0.0`
- Bundle size: [X]KB gzipped
- Test coverage: [X]%
- npm downloads (week 1): [X]

### Edge Craft
- Lines removed: 3,131
- Bundle size reduction: 45KB
- Performance impact: [±X]%
- Test failures: [X] (target: 0)

## Challenges Encountered

1. [Challenge 1]
   - Root cause: [Explanation]
   - Resolution: [How it was fixed]
   - Time impact: [+X days]

## Lessons Learned

1. [Lesson 1]
2. [Lesson 2]

## Recommendations

1. [Recommendation for future extractions]
2. [Process improvements]

## Conclusion

[Final thoughts and assessment of success]
```

---

## 🎯 Success Checklist

**Mission Accomplished When:**

- ✅ `@edgecraft/mpq-toolkit@1.0.0` published and installable
- ✅ Edge Craft uses package (no local MPQ code)
- ✅ 0 test failures
- ✅ Performance ±5% baseline
- ✅ >90% test coverage
- ✅ Landing page live
- ✅ Documentation complete
- ✅ Apache-2.0 license compliance verified

**You may then:**
1. Update PRP status to ✅ Complete
2. Close all related GitHub issues
3. Announce release on social media
4. Monitor npm downloads and GitHub stars
5. Respond to community feedback

---

## 📚 References

- [MPQ Library Comparison](./mpq-library-comparison.md)
- [Extraction Blueprint](./mpq-extraction-blueprint.md)
- [Documentation Updates Required](./documentation-updates-required.md)
- [PRP: MPQ Compression Module Extraction](../../PRPs/mpq-compression-module-extraction.md)
- [Edge Craft CLAUDE.md](../../CLAUDE.md)
- [StormLib Specification](https://github.com/ladislav-zezula/StormLib)

---

**Agent Instruction Manual Status**: ✅ **COMPLETE - Ready for Agent Handoff**

**Next Action**: Assign to follow-on agent and begin Phase 0.
