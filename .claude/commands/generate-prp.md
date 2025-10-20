# Generate PRP (Phase Requirement Proposal)

**Usage**: `/generate-prp <short-description>`

**Purpose**: Generate a boilerplate PRP following CLAUDE.md workflow with role-based placeholders

---

## Step 1: Generate PRP Boilerplate

Create a new PRP file with the description: `$ARGUMENTS`

**Extract key info:**
- Feature/phase name from description
- Estimate complexity (small/medium/large)
- Identify related PRPs to reference
- how it related to existing features and prp's

**Save to:** `PRPs/{feature-slug}.md` (use kebab-case)

**Use the PRP Template below** - Fill in ONLY what you can infer from the short description. Leave role-specific sections as placeholders with instructions.

---

## PRP Template (Boilerplate)

```markdown
# PRP: {Feature Name}

**Status**: 📋 Draft
**Created**: {YYYY-MM-DD}
**Complexity**: {Small | Medium | Large}

---

## 🎯 Goal / Description

{1-2 sentence description from $ARGUMENTS}

**Business Value**: {Why this matters - placeholder for System Analyst}

---

## 📋 Definition of Ready (DoR)

<!-- System Analyst: List prerequisites to START work -->
<!-- Example: -->
<!-- - [ ] Dependency X is complete -->
<!-- - [ ] Test data available -->
<!-- - [ ] Design approved -->

**🔴 SYSTEM ANALYST TODO:**
1. Read CLAUDE.md section on DoR
2. Identify all prerequisites
3. Check previous PRPs for dependencies
4. List each as a checkbox

---

## ✅ Definition of Done (DoD)

<!-- AQA: Define quality gates and deliverables -->
<!-- Example: -->
<!-- - [ ] Feature X implemented -->
<!-- - [ ] Unit tests >80% coverage -->
<!-- - [ ] E2E tests pass -->
<!-- - [ ] Performance: <Xms response time -->
<!-- - [ ] Documentation updated -->

**🔴 AQA TODO:**
1. Read CLAUDE.md section on DoD
2. Define test coverage requirements
3. Specify performance benchmarks
4. List quality gates (lint, typecheck, tests)
5. Add validation commands

---

## 🏗️ Implementation Breakdown

<!-- Developer: Technical design and code structure -->
<!-- Break into phases with specific tasks -->

**🔴 DEVELOPER TODO:**
1. Research existing patterns in codebase (use Grep/Glob)
2. Search for similar implementations (use WebSearch)
3. Design architecture (interfaces, classes, functions)
4. Break into implementable tasks
5. Reference existing files to follow
6. Document gotchas and edge cases

**Suggested Structure:**
```
**Phase 1: Core Implementation**
- [ ] Task 1: {what, where, why}
- [ ] Task 2: {what, where, why}

**Phase 2: Integration**
- [ ] Task 3: {what, where, why}

**Phase 3: Testing**
- [ ] Task 4: {what, where, why}
```

---

## 📚 Research / Related Materials

<!-- All Roles: Add context for future AI execution -->

**Codebase References:**
- {File path}: {What pattern/code to follow}
- {File path}: {Related implementation}

**External Documentation:**
- {URL}: {Library docs, specific section}
- {URL}: {Example implementation}

**Similar PRPs:**
- {PRP file}: {What to reference}

**🔴 DEVELOPER TODO:**
- Use `Grep` to find similar code patterns
- Use `WebSearch` for library docs
- Link to official documentation
- Include code snippets as examples

---

## 📊 Success Metrics

<!-- AQA: Define measurable success criteria -->

**🔴 AQA TODO:**
Define metrics with target values:
- Performance: {metric} < {threshold}
- Quality: Test coverage > 80%
- Reliability: {metric} > {threshold}

**Example:**
- API Response Time: <200ms (P95)
- Test Coverage: >85%
- Build Time: <30s
- Zero linting errors

---

## 🧪 Testing & Validation

<!-- AQA: Specify test requirements -->

**🔴 AQA TODO:**
1. Define unit test scenarios
2. Define E2E test scenarios
3. Specify validation commands
4. Add benchmarks if needed

**Validation Commands:**
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test:unit

# E2E tests (if applicable)
npm run test:e2e

# Performance benchmarks (if applicable)
npm run benchmark -- {feature-name}
```

---

## 📋 Progress Tracking

| Date | Role | Change Made | Status |
|------|------|-------------|--------|
| {YYYY-MM-DD} | System Analyst | Created PRP boilerplate | Draft |
| {YYYY-MM-DD} | System Analyst | Completed DoR | In Progress |
| {YYYY-MM-DD} | AQA | Completed DoD & Testing | In Progress |
| {YYYY-MM-DD} | Developer | Completed Implementation Breakdown | Ready |
| {YYYY-MM-DD} | Developer | Started implementation | In Progress |

**🔴 ALL ROLES:** Update this table after each contribution

---

## 📈 Phase Exit Criteria

**Ready for Implementation when:**
- [ ] All DoR items checked
- [ ] All DoD items defined
- [ ] Implementation breakdown complete
- [ ] Research/references added
- [ ] Timeline estimated
- [ ] Success metrics defined
- [ ] Testing strategy documented

**Ready for Closure when:**
- [ ] All DoD items checked
- [ ] All tests passing
- [ ] All benchmarks met
- [ ] Code reviewed
- [ ] Merged to main

---

## 🎯 Next Steps

**For System Analyst:**
1. Fill in DoR section
2. Define business value
3. Identify dependencies
4. Update Progress Tracking

**For AQA:**
1. Fill in DoD section
2. Define success metrics
3. Specify testing requirements
4. Add validation commands
5. Update Progress Tracking

**For Developer:**
1. Research codebase patterns
2. Fill in Implementation Breakdown
3. Add research/references
4. Estimate timeline
5. Update Progress Tracking

**For Execution (AI Agent):**
Once all roles complete their sections:
1. Read entire PRP
2. Validate all context is present
3. Execute following Implementation Breakdown
4. Update Progress Tracking after each task
5. Check off DoD items as completed
6. Run validation commands continuously

```

---

## Step 2: After Generating Boilerplate

**Output to user:**
```
✅ PRP boilerplate created: PRPs/{feature-slug}.md

📋 Next Steps (Role-Based Pipeline):

1️⃣ System Analyst: Define DoR, business value, dependencies
2️⃣ AQA: Define DoD, testing strategy, success metrics
3️⃣ Developer: Research, design, break into tasks

Once all roles complete their sections, the PRP is ready for AI execution.

📚 Reference:
- CLAUDE.md: Workflow rules
- Existing PRPs: PRPs/*.md
- Anthropic Docs: https://docs.claude.com/en/docs/claude-code/sub-agents
```

---

## Multi-Agent Orchestration (Advanced)

For complex PRPs, use subagents to fill role-specific sections:

**System Analyst Agent:**
```markdown
You are a System Analyst. Read the PRP at {file_path}.

Tasks:
1. Fill in "Definition of Ready (DoR)" section
2. Define business value
3. Identify dependencies from existing PRPs
4. Update Progress Tracking table

Follow CLAUDE.md guidelines for DoR.
```

**AQA Agent:**
```markdown
You are an AQA Engineer. Read the PRP at {file_path}.

Tasks:
1. Fill in "Definition of Done (DoD)" section
2. Define success metrics with target values
3. Specify testing requirements (unit, E2E, benchmarks)
4. Add validation commands
5. Update Progress Tracking table

Follow CLAUDE.md guidelines for DoD and quality gates.
```

**Developer Agent:**
```markdown
You are a Senior Developer. Read the PRP at {file_path}.

Tasks:
1. Research existing patterns (use Grep/Glob tools)
2. Search external docs (use WebSearch)
3. Fill in "Implementation Breakdown" with specific tasks
4. Add "Research / Related Materials"
5. Estimate timeline
6. Update Progress Tracking table

Follow CLAUDE.md code quality rules (500 lines max, >80% coverage).
```

**Orchestrator Pattern:**
```markdown
Execute the following subagents in sequence:

1. Launch System Analyst agent
2. Wait for completion
3. Launch AQA agent
4. Wait for completion
5. Launch Developer agent
6. Wait for completion
7. Validate PRP is ready (all sections filled)
8. Report status to user

Each agent updates the same PRP file incrementally.
```

---

## Configuration for Claude Code

**To enable multi-agent workflow:**

1. **Create subagent prompts** in `.claude/agents/`:
   - `system-analyst.md`
   - `aqa-engineer.md`
   - `developer.md`

2. **Use Task tool** with `subagent_type` parameter:
```typescript
// In your command/agent
await Task({
  subagent_type: "general-purpose",
  description: "Fill PRP as System Analyst",
  prompt: `You are a System Analyst. Read PRPs/${filename} and fill DoR section.`
});
```

3. **Sequential execution** for role pipeline:
```typescript
// Generate boilerplate first
const filename = await generateBoilerplate(description);

// Role 1: System Analyst
await Task({
  subagent_type: "general-purpose",
  description: "System Analyst fills DoR",
  prompt: `Fill DoR in PRPs/${filename}`
});

// Role 2: AQA
await Task({
  subagent_type: "general-purpose",
  description: "AQA fills DoD",
  prompt: `Fill DoD in PRPs/${filename}`
});

// Role 3: Developer
await Task({
  subagent_type: "general-purpose",
  description: "Developer fills implementation",
  prompt: `Fill implementation breakdown in PRPs/${filename}`
});
```

---

## Quality Checklist

Before marking PRP as "Ready for Implementation":

- [ ] Short description converted to full PRP
- [ ] All role sections have placeholders with clear instructions
- [ ] DoR section present (for System Analyst)
- [ ] DoD section present (for AQA)
- [ ] Implementation Breakdown present (for Developer)
- [ ] Progress Tracking table included
- [ ] Validation commands specified
- [ ] Success metrics defined
- [ ] File saved in PRPs/ directory

---

## References

- **CLAUDE.md**: Complete workflow documentation
- **Anthropic Subagents Docs**: https://docs.claude.com/en/docs/claude-code/sub-agents
- **Multi-Agent Research**: https://www.anthropic.com/engineering/multi-agent-research-system
- **Existing PRPs**: See PRPs/*.md for examples

---

**Remember**: The goal is to create a PRP that can be executed in one pass by an AI agent after all roles complete their sections. Comprehensive context = successful implementation.
