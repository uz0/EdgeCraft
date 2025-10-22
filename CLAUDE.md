# Edge Craft - AI Development Guidelines

## 🎯 Project Awareness & Context
**Edge Craft** is a WebGL-based RTS game engine supporting Blizzard file formats with legal safety through clean-room implementation. Built with TypeScript, React, and Babylon.js.
- **Mondatory** identify on what PRP (Product Requirement Proposal) we are working now first, clarify user if you lost track.
- **Always read `PRPs/*.md`** at the start of a new conversation to understand the current task goal and status.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in `CONTRIBUTING.md`.
- for small changes or patches as exception we can user commit and branch prefixes hotfix-* and trivial-* and TRIVIAL: * and HOTFIX: *. **ONLY IF WAS ASKED FOR!**
- **UPDATE PRP DURING WORK** After EVERY significant change, add row to Progress Tracking table, check off DoD items as completed, update "Current Blockers" or "Next Steps"
- PRP should contain list of affected files

## 🧱 Development

### Rules
- *always* use chrome devtools mcp to validate client logic
- *never* creating tmp pages or script to test hypothesis
- add only neccesary for debug logs, after they give info - clear them!
- avoid early faulty generalization. split first utility layer, then dont hesistate to copy-paste, only on third case with re-use start generalization
- index.js files are *FORBIDDEN*. always import with whole path from src.'
- **NEVER use `git checkout` or `git revert` to undo changes** - Always fix issues by making forward progress with proper edits

**Rules for self-documenting code instead of comments:**
- Use descriptive variable names: `userAssessmentRun` not `run`
- Use descriptive function names: `validateUserAccessToAssessment()` not `validate()`
- Use descriptive test names: `'should return 404 when user lacks assessment access'`
- Extract complex conditions to well-named functions
- Use enums and constants with clear names

### Pre-Commit Checks
```bash
npm run typecheck  # TypeScript: 0 errors
npm run lint       # ESLint: 0 errors
npm run test       # Tests: All passing
npm run validate   # Asset and packages Validation pipeline
```

### Folder structure
public/
├── assets/
│   └── manifest.json          # List of all assets
│   └── ...                    # All external resources (textures, 3d models)
└── maps/                      # Game maps

scripts/                       # Utility scripts for CI and development

src/
├── engine/                    # Babylon.js game engine
│   ├── rendering/             # Advanced lighting, shadows, post-processing
│   ├── terrain/               # Terrain rendering & LOD
│   ├── camera/                # RTS camera system
│   ├── core/                  # Scene & engine core
│   └── assets/                # Asset loading & management
├── formats/                   # File format parsers
│   ├── mpq/                   # MPQ archive parser
│   ├── maps/                  # W3X, W3M, W3N, SC2Map loaders
│   └── compression/           # ZLIB, BZip2, LZMA decompression
├── types/                     # TypeScript types
├── utils/                     # App utils
├── config/                    # App config files
├── ui/                        # React components to build interface (for pages only!)
├── hooks/                     # UI React hooks (for pages only!)
├── pages/                     # TMP! Temporary folder for map list and scene pages
└── **/*.unit.ts               # All unit tests placed nearby code

tests/                         # ONLY Playwright tests here
└── **/*.test.ts               # End-to-end tests

## 🧪 Testing & Reliability

- **Minimum: 80% unit test coverage** (enforced by CI/CD)
- Unit test (jest) files: `*.unit.ts`, `*.unit.tsx`
- E2E tests (Playwright) `*.test.ts`
- Framework: Jest + React Testing Library
- E2E: Playwright

## ✅ Task Completion

**Step 1: System Analyst** - Define Goal & DoR
- 🤖 **USE AGENT**: Launch `system-analyst` agent for this step!
- Write clear goal/description
- Define business value
- List prerequisites (DoR)
- Create initial DoD outline

**Step 2: AQA (Automation QA Engineer)** - Add Quality Gates
- 🤖 **USE AGENT**: Launch `aqa-engineer` agent for this step!
- Complete DoD with quality criteria
- Define required test coverage
- List validation checks
- Specify performance benchmarks

**Step 3: Developer** - Technical Planning
- 🤖 **USE AGENT**: Launch `developer` agent for this step!
- Research technical approach
- Document high-level design (ADR style)
- List code references and dependencies
- Create breakthrough plan
- Add interface design
- Link related documentation

**Step 4: Finalization preparation**
- 🚀 **PARALLEL AGENTS**: Run all 3 agents together for faster results!
- All three roles review and finalize PRP
- PRP status: 📋 Planned → 🔬 Research
- PRP is now **executable**

**Step 5: Developer Research**
- 🤖 **USE AGENT**: Launch `developer` agent for deep research!
- Review all materials in PRP
- Conduct additional research if needed
- Update "Research / Related Materials" section
- PRP status: 🔬 Research → 🟡 In Progress

**Step 6: Implementation**
- Write code following PRP design
- **ALWAYS update Progress Tracking table** after each significant change
- Run `npm run typecheck && npm run lint` continuously
- Write unit tests as you code (TDD)
- **All business logic changes MUST have tests**

**Step 7: Developer Self-Check**
- [ ] All DoD items checked
- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code documented (JSDoc for public APIs)

**Step 8: Manual QA**
- Create test matrix (scenarios, test cases, results)
- Manually test all user stories
- Document results in PRP "Testing Evidence"
- Update Progress Tracking table
- PRP status: 🟡 In Progress → 🧪 Testing

**Step 9: AQA - Automated Tests**
- Write E2E tests for critical paths (if needed)
- Run full test suite
- Verify quality gates (coverage, performance)
- Mark "Quality Gates" section as complete
- Update Progress Tracking table

**Step 10: Create PR**
- Push code to branch
- Create Pull Request
- Link PRP in PR description
- Tag reviewers

**Step 11: Code Review**
- Address all review feedback
- Update Progress Tracking table with changes
- Get approval

**Step 12: Merge & Close**
- Merge PR to main
- Update PRP status: 🧪 Testing → ✅ Complete
- Fill "Review & Approval" section
- Document final status in PRP

## 📎 Style & Conventions

### **ESLINT-DISABLE NO TOLERANCE**
- eslint-disable forbidden by default
- eslint-disable can be placed with explanation ONLY if user allow it and it's necessity

### ZERO COMMENTS POLICY
**CRITICAL: ZERO COMMENTS POLICY - ABSOLUTELY NO COMMENTS**

Comments are ONLY allowed in TWO cases:
  1. **Workarounds** - When code does something unusual to bypass a framework/library bug
  2. **TODO/FIXME** - Temporary markers for incomplete work (must be removed before commit)

### File Size Limit
- **HARD LIMIT: 500 lines per file**
- Split into modules when approaching limit

### TypeScript Standards
```typescript
// ✅ DO: Use explicit types
interface UnitData {
  id: string;
  position: Vector3;
  health: number;
}

// ❌ DON'T: Use 'any'
function processUnit(unit: any) { } // FORBIDDEN
```

**Every business logic change MUST have tests. No exceptions.**

## 📚 Documentation & Explainability

## 🧠 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified packages.
- **Always confirm file paths and module names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `PRPs/*.md`.
- **The PRP-Centric Workflow:**
  1. `CLAUDE.md` ← You are here (workflow rules)
  2. `README.md` ← Project overview
  3. `PRPs/` ← ALL work is defined here

## 🤖 USE SUBAGENTS

**RULE: Always delegate to specialist subagents. Your role is ORCHESTRATOR.**

### Quick Agent Match

| Task Type | Agent | Trigger Words |
|-----------|-------|---------------|
| PRP work, DoR/DoD, requirements | `system-analyst` | "rework PRP", "create PRP", "as system analyst" |
| Technical research, architecture | `developer` | "research format", "design architecture", "as developer" |
| Tests, quality gates, benchmarks | `aqa-engineer` | "define tests", "quality gates", "as AQA" |
| Assets, licenses, compliance | `legal-compliance` | "validate assets", "check licenses" |
| Networking, multiplayer | `multiplayer-architect` | "netcode", "synchronization" |
| Binary parsing, formats | `format-parser` | "parse MPQ", "extract W3X" |
| Babylon.js, rendering, shaders | `babylon-renderer` | "render terrain", "optimize scene" |

### Self-Check

Before doing ANY task:
1. **Does it match an agent's specialty?** → Use that agent
2. **Am I writing DoR/DoD?** → Use system-analyst
3. **Am I researching tech specs?** → Use developer
4. **Am I defining tests?** → Use aqa-engineer

**If yes to any: STOP and launch the agent!**

### Parallel Pattern

```typescript
// ✅ Run subagents in parallel for multi-domain tasks
Task(system-analyst): "Define DoR/DoD/user stories"
Task(developer): "Research binary formats"
Task(aqa-engineer): "Define quality gates"

// ❌ Don't do specialist work yourself
```
