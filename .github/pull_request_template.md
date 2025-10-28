## 🎯 PR Summary

### Related PRP
<!-- Link to the PRP (Phase Requirement Proposal) this PR implements -->
**PRP**: `PRPs/[prp-name].md`

### Description
<!-- Brief description of what this PR accomplishes -->


### Type of Change
<!-- Mark with [x] -->
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that changes existing functionality)
- [ ] 🔧 Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] 📝 Documentation (changes to documentation only)
- [ ] 🧪 Test (adding or updating tests)
- [ ] ⚡ Performance (optimization or performance improvement)

---

## 🚨 Signals System Check

### Active Signals Status
<!-- Check CLAUDE.md for active signals before submitting PR -->

**Critical/Incident Signals (≥6)**:
- [ ] **No critical or incident signals present** (strength >= 6)
- [ ] OR: List signals and remediation plan below:

<details>
<summary>Active Signals (if any)</summary>

```
Signal #X: [Name]
Strength: X/10
Status: [Active/Investigating/Resolved]
Remediation: [Brief plan or link to CLAUDE.md]
```

</details>

---

## ✅ Definition of Done (DoD)

### PRP DoD Completion
<!-- Verify all DoD items from the related PRP are complete -->

**DoD Status**:
- [ ] All DoD checklist items marked complete in PRP
- [ ] PRP Progress Tracking table updated
- [ ] PRP Affected Files section lists all modified files

**Key DoD Items** (copy from PRP):
- [ ] [DoD item 1]
- [ ] [DoD item 2]
- [ ] [DoD item 3]

---

## 🧪 Testing & Quality

### Test Coverage
- [ ] Unit tests added/updated (minimum 80% coverage)
- [ ] All unit tests passing locally (`npm run test:unit`)
- [ ] E2E tests added/updated (if applicable)
- [ ] All E2E tests passing locally (`npm run test:e2e`)

### Code Quality
- [ ] TypeScript type check passing (`npm run typecheck`)
- [ ] ESLint passing with zero warnings (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format:check`)
- [ ] No `eslint-disable` added (or justified in code review)
- [ ] No comments added (except workarounds or TODO/FIXME)

### Performance
- [ ] No performance regressions (if engine/rendering changes)
- [ ] Benchmarks passing (if applicable): `npm run benchmark`

---

## 🛡️ Legal Compliance

### Asset Validation
- [ ] Asset validation passing (`npm run validate-assets`)
- [ ] No copyrighted Blizzard assets included
- [ ] All new assets have proper licenses (CC0/MIT)
- [ ] Attribution updated in `assets/LICENSES.md` (if applicable)

---

## 📚 Documentation

### Three-File Rule Compliance
- [ ] **No `docs/` directory created** (violates Three-File Rule)
- [ ] **No scattered `.md` files in root** (ARCHITECTURE.md, PLAN.md, etc.)
- [ ] All documentation in **CLAUDE.md**, **README.md**, or **PRPs/*.md** only

### Documentation Updates
- [ ] PRP updated with implementation details
- [ ] CLAUDE.md updated (if workflow changes)
- [ ] README.md updated (if setup/status changes)
- [ ] JSDoc added for public APIs

---

## 🔍 Code Review Checklist

### For Reviewers
- [ ] Code follows project style guidelines (CONTRIBUTING.md)
- [ ] No files exceed 500 lines
- [ ] Proper TypeScript types (no `any` types)
- [ ] Babylon.js resources properly disposed
- [ ] React components use functional style with hooks
- [ ] Error handling comprehensive
- [ ] No security vulnerabilities introduced

---

## 📊 CI/CD Status

<!-- CI will automatically update this section -->
**Required Checks**:
- [ ] Signal Check (no critical signals)
- [ ] Lint Check
- [ ] TypeScript Type Check
- [ ] Format Check
- [ ] Unit Tests
- [ ] E2E Tests
- [ ] Build Check
- [ ] Asset Validation
- [ ] Security Audit

---

## 📸 Screenshots / Videos

<!-- If UI changes, include screenshots or videos -->


---

## 🔗 Additional Context

### Breaking Changes
<!-- If breaking change, describe migration path -->


### Performance Impact
<!-- If performance-sensitive changes, include benchmark results -->


### Dependencies
<!-- List any new dependencies added and justification -->


---

## 📝 Review Notes

### Areas of Focus
<!-- Specific areas you want reviewers to focus on -->


### Known Issues
<!-- Any known issues or technical debt introduced (with justification) -->


---

## ✍️ Pre-Submission Checklist

**Before clicking "Create Pull Request"**:
- [ ] Checked CLAUDE.md for active signals >= 6
- [ ] Read PRP and verified all DoD items complete
- [ ] Ran full validation suite: `npm run typecheck && npm run lint && npm run test && npm run build`
- [ ] Updated PRP Progress Tracking table
- [ ] No forbidden documentation created (docs/, *.md in root)
- [ ] Filled out all required sections of this template

---

**By submitting this PR, I confirm**:
- ✅ I have read CONTRIBUTING.md and CLAUDE.md
- ✅ I have followed the Three-File Rule
- ✅ I have not introduced any workflow violations
- ✅ All CI checks are expected to pass
