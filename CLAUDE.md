# Edge Craft - AI Development Guidelines

## 🎯 Project Context
**Edge Craft** is a WebGL-based RTS game engine supporting Blizzard file formats with legal safety through clean-room implementation. Built with **TypeScript, React, and Babylon.js**.

---

## 🚨 CRITICAL: PRP-CENTRIC WORKFLOW (MANDATORY)

### 🔴 THE GOLDEN RULE

**EVERY PIECE OF WORK MUST BE TIED TO A PRP.**

**IF THERE IS NO PRP, STOP AND ASK THE USER WHICH PRP THIS WORK RELATES TO.**

**ALWAYS REFLECT UPDATES TO PRP**

**NO EXCEPTIONS. NO WORKAROUNDS. NO SHORTCUTS.**

### ⚡ EXCEPTION: HOTFIX & TRIVIAL COMMITS

**ONLY** for urgent production fixes or trivial changes, commits MAY bypass PRP requirement using these prefixes:

- **`HOTFIX:`** - Critical production bugs requiring immediate fix (security, data loss, system down)
- **`TRIVIAL:`** - Typo fixes, comment updates, formatting-only changes (NO logic changes)

**Requirements:**
- Commits MUST start with prefix: `HOTFIX: Fix critical auth bypass` or `TRIVIAL: Fix typo in README`
- Hotfixes MUST be followed by a PRP within 24 hours documenting root cause and prevention
- Trivial changes MUST NOT modify any business logic, algorithms, or behavior
- All other work (features, refactors, non-critical bugs) REQUIRES a PRP before starting

**Examples:**
```bash
# ✅ ALLOWED without PRP:
git commit -m "HOTFIX: Fix SQL injection in user login endpoint"
git commit -m "TRIVIAL: Fix typo in CLAUDE.md (compliant → complaint)"

# ❌ NOT ALLOWED without PRP:
git commit -m "Fix user authentication bug"  # Not urgent → needs PRP
git commit -m "Refactor login logic"  # Not trivial → needs PRP
```

---

## 📋 WHAT IS A PRP?

**PRP = Product Requirement Proposal**

A PRP is the **ONLY** allowed format for documenting work. Every business logic change, feature, bugfix, or improvement MUST have a PRP.

**PRP Directory Structure:**
```
PRPs/
├── 2.13-complete-map-validation-closure.md
├── w3u-reforged-parser-fix.md
├── asset-credits-validation.md
└── {descriptive-name}.md
```

**Rules:**
- ✅ **Flat structure** - All PRPs directly in `PRPs/` directory
- ✅ **Descriptive names** - `{feature-or-bugfix-description}.md`
- ❌ **No subdirectories** - No `PRPs/phase1/`, `PRPs/features/`, etc.

---

## 📝 PRP STRUCTURE (MANDATORY)

Every PRP MUST contain EXACTLY these sections (no more, no less):

```markdown
# PRP: {Descriptive Title}

**Status**: 📋 Planned | 🔬 Research | 🟡 In Progress | 🧪 Testing | ✅ Complete | ❌ Cancelled
**Created**: YYYY-MM-DD

---

## 🎯 Goal / Description

{Clear, concise description of WHAT we're building and WHY}

**Value**: {Why this matters}
**Goal**: {What do we want to achieve}

---

## 📋 Definition of Ready (DoR)

**Prerequisites to START work:**
- [ ] all test data and assets prepared
- [ ] test data prepared
- [ ] needed assets uploaded and legal compliant

---

## ✅ Definition of Done (DoD)

**Deliverables to COMPLETE work:**
- [ ] all tests are passed
- [ ] tests are written
- [ ] prp updated

---

## 🏗️ Implementation Breakdown

**Phase 1: {Phase Name}**
- [ ] Step 1
- [ ] Step 2

**Phase 2: {Phase Name}**
- [ ] Step 3
- [ ] Step 4

---

## ⏱️ Timeline

**Target Completion**: YYYY-MM-DD
**Current Progress**: XX%
**Phase 1**: Status
**Phase 2**: Status

---

## 🧪 Quality Gates (AQA)

**Required checks before marking complete:**
- [ ] Unit tests coverage >80%
- [ ] E2E tests for critical paths
- [ ] Manual QA test matrix passed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Performance benchmarks met

---

## 📊 Success Metrics

**How do we measure success?**
- Metric 1: [target value]
- Metric 2: [target value]

---

## 📖 User Stories

**As a** {user type}
**I want** {feature}
**So that** {benefit}

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

---

## 🔬 Research / Related Materials

**Technical Context:**
- [Documentation link](url)
- [Code reference](file:line)
- [Related RFC/ADR](link)

**High-Level Design:**
- Architecture Decision: {Decision made and why}
- Interface Design: {Key interfaces/contracts}
- Dependencies: {What we depend on}

**Code References:**
- `src/path/to/file.ts:123` - Description
- `src/other/file.ts:456` - Description

---

## 📊 Progress Tracking

**Use roles, NOT individual names:**
- **Developer** - Software engineer implementing features/fixes
- **AQA** - Quality Assurance/Test Engineer
- **System Analyst** - Requirements analysis and design
- **DevOps** - Infrastructure and deployment

| Date       | Role            | Change Made                          | Status      |
|------------|-----------------|--------------------------------------|-------------|
| YYYY-MM-DD | Developer       | Initial implementation               | In Progress |
| YYYY-MM-DD | AQA             | E2E tests added                      | Complete    |
| YYYY-MM-DD | Developer       | Code review feedback addressed       | Complete    |
| YYYY-MM-DD | System Analyst  | Requirements refinement              | Complete    |

**Current Blockers**: {Any blockers or issues}
**Next Steps**: {What's next}

---

## 🧪 Testing Evidence

**Unit Tests:**
- File: `src/path/to/test.unit.ts`
- Coverage: 95%
- Status: ✅ Passing

**E2E Tests:**
- File: `tests/feature.test.ts`
- Scenarios: 5
- Status: ✅ Passing

**Manual QA:**
- Test Matrix: [Link to test matrix]
- Executed By: {QA Engineer}
- Status: ✅ Passed

---

## 📈 Review & Approval

**Code Review:**
- Reviewer: {Name}
- Date: YYYY-MM-DD
- Status: ✅ Approved / ⏳ Pending

**Final Sign-Off:**
- Date: YYYY-MM-DD
- Status: ✅ Complete / 🟡 In Progress

---

## 🚪 Exit Criteria

**What signals work is DONE?**
- [ ] All DoD items complete
- [ ] Quality gates passing
- [ ] Success metrics achieved
- [ ] Code review approved
- [ ] Documentation updated
- [ ] PRP status updated to ✅ Complete

---

## 🔄 PRP WORKFLOW (STRICT ENFORCEMENT)

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

---

## 🚦 AI AGENT WORKFLOW (MANDATORY RULES)

### BEFORE STARTING ANY WORK

**1. ALWAYS IDENTIFY CURRENT PRP**

```
User: "Fix the terrain texture bug"

CORRECT RESPONSE:
"Which PRP is this work related to? I need to know the PRP file name so I can:
1. Read the PRP to understand context
2. Update Progress Tracking
3. Ensure my work aligns with DoD
4. Mark appropriate checklist items

Please provide the PRP filename (e.g., 'terrain-texture-splatmap-fix.md')"
```

**2. IF USER DOESN'T SPECIFY PRP**

```
User: "Add new feature X"

CORRECT RESPONSE:
"I don't see a PRP for this work. Before I start, we need to:

1. Create a new PRP following the 3-phase process:
   - System Analyst: Define goal & DoR
   - AQA: Add quality gates & testing requirements
   - Developer: Technical planning & design

Would you like me to:
a) Help create a new PRP for this feature?
b) Check if there's an existing PRP this relates to?
c) Wait while you specify the PRP filename?

Note: I cannot proceed without a PRP - this is a mandatory workflow requirement."
```

**3. READ PRP BEFORE CODING**

```bash
# ALWAYS start by reading the PRP
cat PRPs/{prp-filename}.md

# Check DoR is complete
# Review Research / Related Materials
# Understand DoD requirements
# Review existing Progress Tracking
```

**4. UPDATE PRP DURING WORK**

After EVERY significant change:
- Add row to Progress Tracking table
- Check off DoD items as completed
- Update "Current Blockers" or "Next Steps"
- Commit PRP changes with code

**5. VERIFY QUALITY BEFORE CLAIMING DONE**

```bash
# ALWAYS run before marking work complete
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run test:unit  # Must pass
npm run test:e2e   # Must pass (if E2E tests exist)
```

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

### Testing Requirements
- **Minimum: 80% unit test coverage** (enforced by CI/CD)
- Test files: `*.unit.ts`, `*.unit.tsx`
- Framework: Jest + React Testing Library
- E2E: Playwright

**Every business logic change MUST have tests. No exceptions.**

---

## 🛡️ LEGAL COMPLIANCE

### Zero Tolerance Policy
- **NEVER include copyrighted assets** from another games
- **Use ONLY original or CC0/MIT licensed** content
- **Run validation before EVERY commit**: `npm run validate:all`

---

## 📊 VALIDATION PIPELINE

### Pre-Commit Checks (5 steps)
```bash
npm run typecheck          # TypeScript: 0 errors
npm run lint               # ESLint: 0 errors
npm run test:unit          # Tests: All passing
npm run validate:licenses  # Licenses: 0 blocked
npm run validate:credits   # Assets: Properly attributed
```

### CI/CD Workflows
- **validation.yml** - TypeScript, ESLint, Unit Tests, Licenses, Credits
- **ci.yml** - Full pipeline (Lint, Tests, Security, Build, E2E)
- **e2e-tests.yml** - Playwright E2E tests

---

## 🚨 WORKFLOW VIOLATIONS & ENFORCEMENT

### ❌ VIOLATIONS

**1. Working Without PRP**
- **Violation**: Starting code changes without specifying PRP
- **Action**: STOP immediately. Ask user for PRP filename.

**2. Skipping Quality Gates**
- **Violation**: Marking work complete without running tests
- **Action**: Run all validation checks. Fix failures.

**3. Not Updating PRP**
- **Violation**: Making changes without updating Progress Tracking
- **Action**: Update PRP before committing code.

**4. Incomplete DoD**
- **Violation**: Claiming work done with unchecked DoD items
- **Action**: Complete all DoD items or ask for clarification.

### ✅ ENFORCEMENT

**AI Agent Rules:**
1. **ALWAYS** ask for PRP if not specified
2. **ALWAYS** read PRP before starting work
3. **ALWAYS** update PRP during work
4. **ALWAYS** run tests before claiming done
5. **ALWAYS** check DoD before marking complete

**If unclear which PRP to use:**
```
"I need clarification on which PRP this work relates to.

Current PRPs in PRPs/:
- 2.13-complete-map-validation-closure.md
- w3u-reforged-parser-fix.md
- asset-credits-validation.md

Which PRP should I work on, or should I help create a new one?"
```

---

## 🎯 QUICK REFERENCE

### Starting New Work
```bash
# 1. User specifies or I ask for PRP
# 2. Read the PRP
cat PRPs/{prp-name}.md

# 3. Verify DoR complete
# 4. Review Research section
# 5. Understand DoD requirements

# 6. Implement following PRP design
# 7. Update Progress Tracking after each change
# 8. Check off DoD items as completed

# 9. Run validation before claiming done
npm run typecheck && npm run lint && npm run test:unit

# 10. Update PRP status and progress
# 11. Commit PRP + code together
```

### Creating New PRP
```bash
# 1. System Analyst: Goal + DoR
# 2. AQA: Quality Gates + Testing
# 3. Developer: Technical Design + Research
# 4. All review and finalize
# 5. PRP status: 📋 Planned
```

### Daily Workflow
- [ ] Which PRP am I working on?
- [ ] Have I read the PRP recently?
- [ ] Is my work aligned with PRP DoD?
- [ ] Have I updated Progress Tracking?
- [ ] Have I run tests?
- [ ] Are there any blockers to document?

---

## 📚 REMEMBER

**The PRP-Centric Workflow:**
1. `CLAUDE.md` ← You are here (workflow rules)
2. `README.md` ← Project overview
3. `PRPs/` ← ALL work is defined here

**If it's not in a PRP, it doesn't exist.**

**Every change requires:**
- ✅ PRP defining the work
- ✅ Progress tracking updates
- ✅ Tests confirming functionality
- ✅ DoD items checked off
- ✅ Quality gates passing

**This workflow ensures:**
- 🎯 Clear objectives (PRPs define work)
- 📊 Measurable progress (Progress Tracking)
- 🚦 Transparent status (DoD checklists)
- ✅ Quality assurance (Tests + validation)
- 🔄 Continuous improvement (Review feedback)
- 📝 Single source of truth (No doc drift)

**Follow this workflow. Trust the process. Ship quality code.** 🚀
