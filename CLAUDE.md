# Edge Craft - AI Development Guidelines

## 🎯 Project Awareness & Context
**Edge Craft** is a WebGL-based RTS game engine supporting Blizzard file formats with legal safety through clean-room implementation. Built with TypeScript, React, and Babylon.js.
- **Mondatory** identify on what PRP (Product Requirement Proposal) we are working now first, clarify user if you lost track.
- **Always read `PRPs/*.md`** at the start of a new conversation to understand the current task goal and status.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in `CONTRIBUTING.md`.
- for small changes or patches as exception we can user commit and branch prefixes hotfix-* and trivial-* and TRIVIAL: * and HOTFIX: *. **ONLY IF WAS ASKED FOR!**
-

## 🧱 Development

### Rules
- *always* use chrome devtools mcp to validate client logic
- *never* creating tmp pages or script to test hypothesis
- add only neccesary for debug logs, after they give info - clear them!

### Pre-Commit Checks
```bash
npm run typecheck  # TypeScript: 0 errors
npm run lint       # ESLint: 0 errors
npm run test       # Tests: All passing
npm run validate   # Asset and packages Validation pipeline
```

### Folder structure
public/assets/manifest.json - list of all assets
public/assets - all external resources (textures, 3d models)
public/maps - game maps
scripts/ - utility scripts for ci and development
src/
src/engine - all game engine here
src/formats - maps to scene transformations
src/types - typescript types
src/utils - app utils
src/config - app config files
src/ui - react components to build interface (for pages only!)
src/hooks - ui react hooks (for pages only!)
src/pages - TMP! temporary folder for map list and scene pages
src/**/*.unit.ts - all unit tests placed nearby code
tests/ - ONLY playwrite tests here
tests/**/*.test.ts - end-to-end tests


### index files
index.js files are *FORBIDDEN*. always import with whole path from src.'

## 🧪 Testing & Reliability

- **Minimum: 80% unit test coverage** (enforced by CI/CD)
- Unit test (jest) files: `*.unit.ts`, `*.unit.tsx`
- E2E tests (Playwright) `*.test.ts`
- Framework: Jest + React Testing Library
- E2E: Playwright


## ✅ Task Completion
## 📎 Style & Conventions

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

### Phase 1: PRP Creation (Planning)

**Step 1: System Analyst** - Define Goal & DoR
- Write clear goal/description
- Define business value
- List prerequisites (DoR)
- Create initial DoD outline

**Step 2: AQA (Automation QA Engineer)** - Add Quality Gates
- Complete DoD with quality criteria
- Define required test coverage
- List validation checks
- Specify performance benchmarks

**Step 3: Developer** - Technical Planning
- Research technical approach
- Document high-level design (ADR style)
- List code references and dependencies
- Create breakthrough plan
- Add interface design
- Link related documentation

**Step 4: Finalization**
- All three roles review and finalize PRP
- PRP status: 📋 Planned → 🔬 Research
- PRP is now **executable**

### Phase 2: Development (Execution)

**Step 1: Developer Research**
- Review all materials in PRP
- Conduct additional research if needed
- Update "Research / Related Materials" section
- PRP status: 🔬 Research → 🟡 In Progress

**Step 2: Implementation**
- Write code following PRP design
- **ALWAYS update Progress Tracking table** after each significant change
- Run `npm run typecheck && npm run lint` continuously
- Write unit tests as you code (TDD)
- **All business logic changes MUST have tests**

**Step 3: Developer Self-Check**
- [ ] All DoD items checked
- [ ] All tests passing (`npm run test:unit`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code documented (JSDoc for public APIs)

### Phase 3: QA & Testing

**Step 1: Manual QA**
- Create test matrix (scenarios, test cases, results)
- Manually test all user stories
- Document results in PRP "Testing Evidence"
- Update Progress Tracking table
- PRP status: 🟡 In Progress → 🧪 Testing

**Step 2: AQA - Automated Tests**
- Write E2E tests for critical paths (if needed)
- Run full test suite
- Verify quality gates (coverage, performance)
- Mark "Quality Gates" section as complete
- Update Progress Tracking table

### Phase 4: Review & Merge

**Step 1: Create PR**
- Push code to branch
- Create Pull Request
- Link PRP in PR description
- Tag reviewers

**Step 2: Code Review**
- Address all review feedback
- Update Progress Tracking table with changes
- Get approval

**Step 3: Merge & Close**
- Merge PR to main
- Update PRP status: 🧪 Testing → ✅ Complete
- Fill "Review & Approval" section
- Document final status in PRP


**4. UPDATE PRP DURING WORK**

After EVERY significant change:
- Add row to Progress Tracking table
- Check off DoD items as completed
- Update "Current Blockers" or "Next Steps"
- Commit PRP changes with code

### DURING DEVELOPMENT

**Update PRP Progress Table (use ROLES not names):**
```markdown
| Date       | Role      | Change Made                          | Status      |
|------------|-----------|--------------------------------------|-------------|
| 2025-01-19 | Developer | Implemented terrain splatmap shader  | Complete    |
| 2025-01-19 | AQA       | Added unit tests (coverage 92%)      | Complete    |
| 2025-01-19 | Claude    | Fixed TypeScript errors              | Complete    |
```

**Check DoD Items:**
```markdown
## ✅ Definition of Done (DoD)

- [x] Terrain shader supports 4-8 textures
- [x] Unit tests >80% coverage
- [ ] E2E test for terrain rendering (AQA to add)
- [x] No TypeScript/ESLint errors
- [ ] Code review approved
```

### COMMON MISTAKES TO AVOID

❌ **WRONG:**
```
User: "Fix bug X"
Assistant: *Starts coding immediately*
```

✅ **CORRECT:**
```
User: "Fix bug X"
Assistant: "Which PRP should I work on? Please provide the filename from PRPs/ directory."
User: "PRPs/w3u-reforged-parser-fix.md"
Assistant: *Reads PRP first, then starts work*
```

❌ **WRONG:**
```
Assistant: *Completes work*
Assistant: "Done! The feature is implemented."
```

✅ **CORRECT:**
```
Assistant: *Completes work*
Assistant: *Updates PRP Progress Tracking table*
Assistant: *Checks off DoD items*
Assistant: *Runs all tests*
Assistant: "Work complete. Updated PRP with progress. All tests passing. Ready for review."
```

---

## 📏 CODE QUALITY RULES

---

## 🛡️ LEGAL COMPLIANCE

### Zero Tolerance Policy
- **NEVER include copyrighted assets** from another games
- **Use ONLY original or CC0/MIT licensed** content
- **Run validation before EVERY commit**: `npm run validate:all`

---

## 📊 VALIDATION PIPELINE
