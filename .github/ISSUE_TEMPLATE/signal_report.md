---
name: Signal Report
about: Report a workflow violation or project status signal
title: '[SIGNAL] '
labels: signal, workflow
assignees: ''
---

## 🚨 Signal Report

### Signal Name
<!-- Clear, descriptive name for this signal -->


### Signal Strength
<!-- Mark with [x] -->
- [ ] 🔴 Incident (9-10) - Human intervention mandatory
- [ ] 🔶 Critical (6-8) - Immediate attention required
- [ ] ⚠️ Warning (3-5) - Review recommended
- [ ] ℹ️ Info (0-2) - Informational only

**Strength Number**: __/10

---

## 📋 Signal Details

### WHY (Reason)
<!-- Why was this signal triggered? What is the root cause? -->


### Category
<!-- Mark with [x] -->
- [ ] Workflow Violation (documentation, process)
- [ ] Quality Issue (code, tests, coverage)
- [ ] Performance Problem (FPS, memory, benchmarks)
- [ ] Legal Compliance (copyright, licensing)
- [ ] Project Status (phase delays, blockers)

---

## 🔍 Evidence

### Detection Method
<!-- How was this signal detected? -->
- [ ] Automated scan (signal-monitor agent)
- [ ] Manual observation
- [ ] CI/CD failure
- [ ] User report

### Affected Files/Areas
<!-- List specific files, directories, or systems affected -->


### Screenshots/Logs
<!-- Drag and drop evidence here -->


---

## 🛠️ HOW (Remediation Plan)

### Required Actions
<!-- Step-by-step plan to resolve this signal -->

1.
2.
3.
4.

### Estimated Time to Resolve
- [ ] < 1 hour
- [ ] 1-4 hours
- [ ] 1-2 days
- [ ] 2+ days (requires PRP)

### Assigned To
<!-- Who should resolve this? -->


---

## ✅ WHAT (Current Status)

### Status
<!-- Mark with [x] -->
- [ ] 🔴 Active - Not yet started
- [ ] 🟡 Investigating - Analysis in progress
- [ ] 🟠 In Progress - Remediation underway
- [ ] 🟢 Resolved - All actions complete
- [ ] 👁️ Monitoring - Resolved but watching for recurrence

### Resolution Progress
<!-- List completed steps with checkboxes -->
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Blockers
<!-- Any blockers preventing resolution? -->


---

## 🔒 Merge Status

**Does this signal block merges?**
- [ ] Yes - Blocks all PRs (strength >= 6)
- [ ] No - Informational only

**Override Justification** (if applicable):
<!-- Only for critical business needs, requires approval -->


---

## 📊 Impact Assessment

### Immediate Impact
<!-- What is currently affected? -->


### Long-term Impact
<!-- What happens if this is not resolved? -->


### Related PRPs
<!-- List PRPs blocked or affected by this signal -->


---

## 🔄 Prevention Plan

### Root Cause Analysis
<!-- Why did this happen? -->


### Prevention Measures
<!-- How can we prevent this in the future? -->
- [ ] Update .gitignore
- [ ] Add pre-commit hook
- [ ] Update CI/CD checks
- [ ] Document in CLAUDE.md
- [ ] Add to automated scans

---

## 📚 CLAUDE.md Update

**Has this signal been added to CLAUDE.md?**
- [ ] Yes - Added to Active Signals section
- [ ] No - Needs to be added

**Signal Number in CLAUDE.md**: #___

---

## 🏷️ Related Signals

### Similar Signals
<!-- Link to related signal issues -->


### Signal History
<!-- If this is a recurring signal, link to previous occurrences -->


---

## ✍️ Additional Notes

### Context
<!-- Any additional context or background -->


### Follow-up Actions
<!-- Any follow-up work needed after resolution -->


---

## 🎯 Acceptance Criteria

**Signal is resolved when**:
- [ ] All remediation steps complete
- [ ] Prevention measures in place
- [ ] CLAUDE.md updated with status
- [ ] No related violations detected
- [ ] Tests/validation passing
- [ ] CI/CD unblocked (if applicable)
