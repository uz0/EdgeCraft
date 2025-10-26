# PRP: Modular Extraction of MPQ & Compression Systems

## 🎯 Goal
Decouple the MPQ archive parser and compression algorithms from Edge Craft into a reusable npm package (working title: `@edgecraft/mpq-toolkit`) while ensuring license compliance, maintainability, and zero regressions in existing map loading pipelines. Deliver a blueprint for evaluating third-party alternatives, performing the refactor, publishing the new package, and updating Edge Craft to consume it.

## 📌 Status
- **State**: 🔬 Research
- **Created**: 2025-10-24
- **Notes**: Awaiting legal/licensing confirmation and library comparison before implementation handoff.

## 📈 Progress
- Draft PRP established with evaluation matrix, extraction blueprint, and follow-up instructions (2025-10-24).
- Initial legal similarity scan completed; licensing questions documented for counsel review.
- Pending actions include completing comparative analysis and finalizing legal go/no-go decisions.

## 🛠️ Results / Plan
- Next deliverables: finalize library comparison, document required attributions, and update blueprint with legal outcomes.
- On approval, spin up new repository per detailed instructions and schedule implementation phase.
- Maintain this PRP as research reference until extraction PR commences.

**Business Value**: Enables reuse across internal tools and potential commercialization, simplifies future maintenance, and clarifies intellectual property provenance for MPQ/compression code.

**Scope**:
- Evaluate existing OSS MPQ/compression libraries for feature parity, performance, and licensing.
- Define extraction plan preserving current API contracts, tests, and legal safety.
- Produce instructions for spawning a dedicated repository with full project scaffolding (PRP process, AGENTS.md, CI, test suite, npm publishing workflow).
- Update Edge Craft documentation and build pipeline to rely on the new external module.

---

## ✅ Definition of Done (DoD)

- [ ] Comparative analysis of candidate libraries completed with licensing notes and adoption recommendation.
- [ ] Extraction blueprint with phased rollout (unit tests, integration tests, fallback strategy) accepted by stakeholders.
- [ ] Documentation updates identified for README, CONTRIBUTING, and architecture docs.
- [ ] Instruction manual for follow-on agent includes repo creation steps, coding standards, CI setup, test commands, and publishing workflow.
- [ ] Edge Craft PR plan defined (dependency switch, regressions tests, release checklist).
- [ ] Progress tracking table kept current through implementation handoff.

---

## 📋 Definition of Ready (DoR)

- [x] Current MPQ/compression code paths identified (`src/formats/mpq`, `src/formats/compression`).
- [ ] Legal review confirms Edge Craft owns or has rights to relicense existing implementations.
- [ ] Stakeholder agreement on desired licensing (MIT vs. Apache-2.0) for outbound package.
- [ ] Target npm package name reserved or vetted for availability.
- [ ] Decision whether to prioritize replacement vs. extraction locked before implementation.

---

## 🧠 System Analyst — Discovery

- **Objective clarity**: Decide between (1) adopting battle-tested libraries (e.g., `stormlib`, `mpqjs`, `pako`, `lzma-native`) or (2) packaging Edge Craft’s clean-room code for reuse. Replacement is attractive for maintenance but risks Babylon-specific expectations; extraction preserves behavior and legal chain-of-custody.
- **Constraints**: Must avoid Blizzard license infringement, maintain 80%+ coverage, and uphold zero comments policy. Need to confirm original sources and ensure no GPL-contaminated code was referenced.
- **Dependencies**: Map parsing features rely on deterministic outputs (hash tables, block decompression) and seamless tie-in with W3X/W3M/SC2 loaders.
- **Stakeholders**: Engine team, legal counsel, infra (for npm publish), future tooling initiatives (e.g., World Editor).

---

## 🧪 AQA — Quality Gates

- Replacement candidates must pass compatibility suite against 24 archived maps without increasing parse failures.
- New package requires ≥90% coverage on decompression + parsing units.
- Static analysis (ESLint, TypeScript strict) and security scans (npm audit, license checker) run in CI.
- Migration plan includes regression E2E tests for map gallery, ensuring no performance regressions beyond ±5%.
- Documentation review to confirm legal notices and license files present.
- our main feature browser complience, it was a reason and motivation to create this package, need create such playwrite test to show what other libs are failing and its expecting


---

## 🛠️ Developer Planning

- **Evaluation matrix**: Compare internal code vs. OSS libraries on feature set (compression algorithms, sparse support, Storm offsets), TypeScript readiness, maintenance activity, and licensing. Record findings in `docs/research/mpq-library-comparison.md`.
- **Extraction approach**:
  1. Establish new repo skeleton with Vite? (no) – use bare TypeScript library template.
  2. Move compression modules with minimal namespace changes; introduce `@edgecraft/mpq-toolkit` entry.
  3. Preserve tests, add golden files for MPQ archives, ensure test assets sanitized.
  4. Provide compatibility layer exports matching current `src/formats` usage (e.g., `extractFile(buffer, name)`).
  5. Publish pre-release package (e.g., `1.0.0`), update Edge Craft’s dependency graph.
  6. Run smoke tests (npm run typecheck/lint/test) in both repos.
- **Docs & tooling**: Update `README.md`, `docs/architecture/map-loading.md`, and `CONTRIBUTING.md` with dependency guidance. Add release process doc for new package.

---

## 🔬 Research Plan

### Library Evaluation Tasks

- Search npm for MPQ-related packages (`mpq`, `stormlib`, `s2protocol`, `blizzardry`) and compression utilities. Document license (MIT/BSD/Apache preferred) and maintenance status.
- Compare functionality: multi-block decompression, ADPCM audio support, sparse file handling, big-endian tables.
- Verify legal provenance: Identify whether popular packages embed Blizzard code; avoid copying infringing assets.
- Determine minimal replacements: if external libs lack ADPCM or sparse, plan to retain internal modules.

> **Note**: Network access is restricted in current environment; evaluation tasks must be completed during execution phase with approved tooling.

### Codebase Extraction Analysis

- Map current import graph (e.g., `src/formats/maps/w3x/W3XMapLoader.ts` depends on `MPQParser`/`Compression`). Ensure future package exports align.
- Identify shared types (`src/formats/compression/types.ts`, `src/formats/mpq/types.ts`). Plan to move them into package as well.
- Tag TODOs where parent repo adjustments required (path updates, jest config pointing to new package).

---

## 📚 Documentation & Repo Strategy

- `README.md`: Add dependency note referencing external package once published.
- `CONTRIBUTING.md`: Include instructions for linking local package during development (`npm link` or `pnpm file:`).
- `docs/architecture/map-loading.md`: Update diagrams to reflect external toolkit boundary.
- New repo documents: PRP workflow, `AGENTS.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `README`, `SECURITY.md`,  `CLAUDE.md` (as relative symlink to agents).
- Tests: Mirror coverage by porting existing `*.unit.ts` and integration tests; include fixture MPQs under `fixtures/` with legal clearance.
- Banchmarking:
- CI: GitHub Actions pipeline running typecheck, lint, tests, and npm publish dry-run.

---

## 🧱 New Repository Agent Instructions

1. **Bootstrap**
   - Initialize repo (`npm init -y`, TypeScript + Vitest/Jest) with strict TS config.
   - Set license (tentatively GNU AGPL).
   - Add `.editorconfig`, `.prettierrc`, and ESLint config aligning with Edge Craft standards (no index files, explicit types).
2. **Project Structure**
   - `src/mpq/` (parser, table utilities), `src/compression/` (Zlib, Bzip2, LZMA, ADPCM, Sparse), `src/types/`.
   - `tests/` replicating current unit/integration coverage.
   - `fixtures/` with sanitized MPQ archives.
3. **Process Artifacts & Guidance**
   - Author `AGENTS.md` with the following sections:
     - **Mission**: create ultimate agents md to force good code review and force PRP proccess inside repo.
     - **Workflow Overview**: inline checklist `Issue intake → Analyze requirements → Draft/Update PRP → Implement → Test & Document → ensure requirements satisfied -> Open PR → Code Review (Claude + humans) → Merge & Release`.
     - **PRP Creation**: instruction explaining how to create a new PRP in `PRPs/` . Creation should lead to gh issue, gather context and prepare mini-adr-like doc with sections: filename convention, required sections: Goal, DoR/DoD, task list, Risks, Testing
     - **Code Review Rules**: include policy that every PR runs GitHub Actions plus a Claude review job, call out expectations (no eslint-disable, ≥90% coverage for core logic, request changes if quality gates fail).
     - **CI Hooks**: bullet list referencing available npm scripts and how reviewers trigger re-runs.
     - **PRP execution**: each time agent start work, it should understand OR ask user what prp we working on, then corresponding prp content should be executed, then delegated to test it and then
     - **PRP force**: during writing agents, please consider what all work should go with prp. need set high priority to this instruction.
   - Provide `CONTRIBUTING.md` covering coding standards, lint, test, release steps, and referencing the PRP workflow. Force 80%+ code coverage, use current code style as example and make it much much more strict please.
   - Add `docs/` for architecture overview, API surface, map formats details explained.
   - Add `README.md` with motivation (mpq parsing in browser for edgecraft game), with short use examples and links to docs, benchmarking section, thanks and credits,
4. **CI & Review Automation**
   - Configure GitHub Actions workflows:
     - `ci.yml` running `npm run lint`, `npm run typecheck`, `npm run test`, and license/coverage checks.
     - `claude-review.yml` (workflow_dispatch + pull_request) that triggers a Claude code-review job (document required secrets and reviewer expectations in `AGENTS.md`).
     - Optional `release.yml` for publishing via Changesets or npm script once manual approval is granted.
5. **Tooling & Scripts**
   - `npm run build` (tsc), `npm run fix` (all all lint/format/typecheck), `npm run lint`, `npm run format`, `npm run test`, `npm run typecheck`, `npm run validate` (license + bundle check), `npm run release` (changeset or npm publish wrapper).
   - Setup GitHub Actions for CI + publish (manual approval).
6. **Publishing Workflow**
   - Prepare `package.json` with scoped name, keywords, repository metadata.
   - Configure changesets or semantic-release.
   - Document encryption of artifacts if needed.
7. **Integration Back to Edge Craft**
   - Provide `pnpm link` instructions, update `package.json` dependency, adjust imports.
   - Run regression suite after swap; update PRP progress.
8. **Landing page**
   - based on github pages with CI deploy
   - some fancy Neumorphism minimalism design
   - AND big interactive drop down, where you can put mpq, w3x, sc2map, w3m files and see actual files inside and able to download it from browser!
   - thx to persons whose code i used,

These instructions will be executed in the new repository by a follow-up agent after this PRP is approved.

---

## ⚙️ Technical Feasibility & Complexity

| Workstream | Difficulty | Notes |
|------------|-----------|-------|
| Library comparison & licensing | Medium | Requires thorough npm search, license audits, and legal sign-off. |
| Extraction & packaging | High | Must preserve functionality, tests, and avoid regressions. |
| New repo scaffolding | Medium | Clear instructions for agent to follow; ensure standards alignment. |
| Edge Craft integration update | Medium | Replace imports, update docs, run full validation. |
| Publication workflow | Medium-High | Requires secure npm credentials, release process. |

---

## 🔗 Research / Related Materials

- StormLib (reference C library) — https://github.com/ladislav-zezula/StormLib
- mpqjs (JavaScript MPQ parser) — https://www.npmjs.com/package/mpqjs
- pako (zlib) — https://www.npmjs.com/package/pako
- lzma-native — https://www.npmjs.com/package/lzma-native
- seek-bzip — https://www.npmjs.com/package/seek-bzip
- Clean-room implementation guidelines — https://en.wikipedia.org/wiki/Clean-room_design
- npm package licensing guide — https://docs.npmjs.com/policies/npm-package-name-hijacking

> Perform due diligence to confirm current licensing and maintenance status during execution (some links may require updated verification).

---

## 🧭 Risks & Mitigations

- **License ambiguity**: Unclear provenance of existing code. Mitigation: legal review, document original authorship, prefer own package.
- **Regression risk**: Extraction might break map loaders. Mitigation: maintain high test coverage, run integration tests with sample maps.
- **Publishing hurdles**: npm name conflict or 2FA issues. Mitigation: reserve name early, document credential management.
- **Knowledge silos**: Transition to external module could slow onboarding. Mitigation: thorough docs, cross-team pairing.
- **Schedule creep**: Library comparison + legal loops may delay. Mitigation: timebox research, present go/no-go decision quickly.

---

## 📊 Progress Tracking

| Date       | Role           | Change Made                                  | Status   |
|------------|----------------|----------------------------------------------|----------|
| 2025-10-24 | System Analyst | PRP drafted, outlined evaluation and extraction plan | Complete |
| 2025-10-24 | Legal Analyst  | Ran similarity scan against referenced repos; cataloged license obligations and highlighted MIT/AGPL exposure | Complete |

**Current Blockers**: Need legal counsel sign-off on StormLib-derived reuse (MIT attribution) and confirmation that no AGPL-derived assets enter the toolkit.
**Next Steps**: 1) Document required attribution/NOTICE updates for StormLib-sourced algorithms. 2) Expand third-party library comparison with licensing compliance column. 3) Incorporate legal findings into extraction blueprint and repository instructions.

---

## ⚖️ Legal Diligence Findings (2025-10-24)

- Similarity scans (`jscpd`, min 50 tokens, skip intra-folder clones) show 0% duplication with `Retera/WarsmashModEngine`, `d07RiV/wc3data`, `linsmod/wc3dataHost`, and `stijnherfst/HiveWE`; `flowtsohg/mdx-m3-viewer` reports 0.01% overlap limited to the standard IMA ADPCM step table constants.
- StormLib (MIT) remains the authoritative upstream for MPQ algorithms; our implementations reference its specifications and require explicit MIT attribution when packaging.
- Blizzard Entertainment is the original author of the MPQ container format and bundled compression codecs; legal notices should acknowledge Blizzard’s ownership of the specifications when distributing derivative tooling.
- Ladislav Zezula (StormLib maintainer) and other StormLib contributors are the primary clean-room authors of the reference MPQ and ADPCM/Huffman implementations we studied; NOTICE/README text must credit them per MIT terms.
- Third-party repos `WarsmashModEngine` and `HiveWE` are AGPL-3.0, making direct code reuse legally incompatible with our intended permissive licensing; ensure strict clean-room separation.
- `mdx-m3-viewer` is MIT-licensed and provides browser-oriented MPQ tooling; no structural duplication observed beyond common lookup tables.
- `wc3data` / `wc3dataHost` lack clear SPDX metadata; treat as proprietary until license is confirmed to avoid unintentional contamination.

---

## 🗂️ Affected Files (anticipated)

- `PRPs/mpq-compression-module-extraction.md`
- Future: `src/formats/mpq/**`, `src/formats/compression/**`, `docs/architecture/map-loading.md`, `CONTRIBUTING.md`, `README.md`, `package.json`, `tests/**/*.unit.ts`

---
