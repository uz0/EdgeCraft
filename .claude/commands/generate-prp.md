# Generate PRP (Phase Requirement Proposal)

**Usage**: `/generate-prp <short-description>`

**Purpose**: **FULLY AUTONOMOUS** PRP generation using 3-agent pipeline

**What happens**: Claude automatically orchestrates 3 specialized agents to create a complete PRP:
1. **System Analyst** → DoR, dependencies, business value
2. **AQA Engineer** → DoD, testing strategy, metrics
3. **Developer** → Architecture, implementation, research

**User provides**: Short description
**Claude delivers**: Complete, ready-to-execute PRP

---

## 🤖 Autonomous Execution (NO USER INTERVENTION)

### Step 1: Generate Boilerplate (Main Agent)

**Input**: `$ARGUMENTS` (user's short description)

**Actions**:
1. Extract feature name from description
2. Convert to kebab-case slug
3. Estimate complexity (small/medium/large)
4. Search for related PRPs: `grep -r "keyword" PRPs/`
5. Create file: `PRPs/{feature-slug}.md`
6. Fill basic template with placeholders

**Output File Structure**:
```markdown
# PRP: {Feature Name}
**Status**: 📋 Generating...
**Created**: {TODAY}
**Complexity**: {Small|Medium|Large}

## 🎯 Goal / Description
{User's description}

**Business Value**: [SYSTEM ANALYST WILL FILL]

## 📋 Definition of Ready (DoR)
[SYSTEM ANALYST WILL FILL]

## ✅ Definition of Done (DoD)
[AQA WILL FILL]

## 🏗️ Implementation Breakdown
[DEVELOPER WILL FILL]

## 📚 Research / Related Materials
[DEVELOPER WILL FILL]

## ⏱️ Timeline
[DEVELOPER WILL FILL]

## 📊 Success Metrics
[AQA WILL FILL]

## 🧪 Testing & Validation
[AQA WILL FILL]

## 📋 Progress Tracking
| Date | Role | Change Made | Status |
|------|------|-------------|--------|
| {TODAY} | Main Agent | Created boilerplate | Draft |

## 📈 Phase Exit Criteria
[WILL BE CHECKED AFTER ALL AGENTS COMPLETE]
```

---

### Step 2: Launch System Analyst Agent ⚡ AUTOMATIC

**🚨 CRITICAL: DO NOT WAIT FOR USER - LAUNCH IMMEDIATELY**

Use Task tool:
```javascript
Task({
  subagent_type: "general-purpose",
  description: "System Analyst fills DoR",
  prompt: `You are a System Analyst.

**File**: PRPs/{feature-slug}.md

**Tasks**:
1. Read the PRP file completely
2. Read CLAUDE.md to understand DoR requirements
3. Search existing PRPs for dependencies: grep -r "related-keyword" PRPs/
4. Fill "Definition of Ready (DoR)" section with 3-7 prerequisites
5. Fill "Business Value" with user/business/strategic impact
6. Update Progress Tracking table

**DoR Format**:
## 📋 Definition of Ready (DoR)
**Prerequisites to START work:**
- [ ] {Previous PRP/feature} is complete
- [ ] {Required infrastructure/tools} ready
- [ ] {Assets/data} available
- [ ] {Design/specs} approved
- [ ] {Dependencies} resolved

**Business Value**:
- User Impact: {How users benefit}
- Business Impact: {Revenue/efficiency gain}
- Strategic Value: {Long-term positioning}

**Update Progress**:
| {TODAY} | System Analyst | Completed DoR & business value | Ready for AQA |

**Tools**:
- Read: Read PRPs/{feature-slug}.md, CLAUDE.md, other PRPs
- Grep: Search dependencies
- Edit: Update the PRP file

Save changes directly to file.`
});
```

**Wait for completion** ✋

---

### Step 3: Launch AQA Engineer Agent ⚡ AUTOMATIC

**🚨 CRITICAL: LAUNCH IMMEDIATELY AFTER STEP 2 - DO NOT ASK USER**

Use Task tool:
```javascript
Task({
  subagent_type: "general-purpose",
  description: "AQA fills DoD and testing",
  prompt: `You are an AQA Engineer.

**File**: PRPs/{feature-slug}.md

**Tasks**:
1. Read the PRP file (now has DoR filled by System Analyst)
2. Read CLAUDE.md quality requirements (>80% coverage, 0 errors policy)
3. Fill "Definition of Done (DoD)" with 7-12 deliverables
4. Fill "Success Metrics" with measurable targets
5. Fill "Testing & Validation" with test scenarios and commands
6. Update Progress Tracking table

**DoD Format**:
## ✅ Definition of Done (DoD)
**Deliverables to COMPLETE work:**
- [ ] {Feature X} implemented
- [ ] Unit tests >80% coverage
- [ ] E2E tests pass (if applicable)
- [ ] Performance: {metric} < {threshold}
- [ ] Zero ESLint errors/warnings
- [ ] TypeScript strict passes
- [ ] All validation commands pass
- [ ] Code reviewed
- [ ] Merged to main

**Success Metrics Format**:
## 📊 Success Metrics
- Performance: {metric} < {target} (e.g., API <200ms P95)
- Quality: Test coverage > 85%
- Reliability: {uptime/error rate}
- User Experience: {load time < 3s}

**Validation**: ESLint 0 errors, TypeScript 0 errors, Tests 100% pass

**Testing Format**:
## 🧪 Testing & Validation

**Unit Tests**:
- Scenario 1: {Happy path}
- Scenario 2: {Edge case}
- Coverage: >80%

**E2E Tests** (if needed):
- Flow 1: {User scenario}

**Validation Commands**:
\`\`\`bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e  # if applicable
npm run validate
\`\`\`

**Update Progress**:
| {TODAY} | AQA | Completed DoD, metrics, testing | Ready for Developer |

**Tools**:
- Read: Read PRPs/{feature-slug}.md, CLAUDE.md
- Edit: Update the PRP file

Save changes directly to file.`
});
```

**Wait for completion** ✋

---

### Step 4: Launch Developer Agent ⚡ AUTOMATIC

**🚨 CRITICAL: LAUNCH IMMEDIATELY AFTER STEP 3 - DO NOT ASK USER**

Use Task tool:
```javascript
Task({
  subagent_type: "general-purpose",
  description: "Developer fills implementation & research",
  prompt: `You are a Senior Developer.

**File**: PRPs/{feature-slug}.md

**Tasks**:
1. Read the PRP file (now has DoR and DoD filled)
2. Research codebase patterns: grep -r "similar-pattern" src/
3. Search for related files: glob "src/**/*{keyword}*.ts"
4. WebSearch for library documentation and examples
5. Fill "Implementation Breakdown" with phases and tasks
6. Fill "Research / Related Materials" with all findings
7. Fill "Timeline" with estimates
8. Update Progress Tracking table

**Implementation Breakdown Format**:
## 🏗️ Implementation Breakdown

**Architecture Overview**:
{High-level technical approach}

**File Structure**:
\`\`\`
src/{module}/
├── index.ts
├── types.ts
├── {Component}.tsx
├── utils.ts
└── {Component}.test.tsx
\`\`\`

**Phase 1: Core Implementation**
- [ ] Create \`src/{path}/types.ts\` - Define interfaces
  - Follow: \`src/{example}/types.ts\`
- [ ] Create \`src/{path}/{Component}.tsx\` - Main logic
  - Follow: \`src/{example}/{Component}.tsx\`
- [ ] Implement {function}
  - Edge case: {X}

**Phase 2: Integration**
- [ ] Integrate with {system} at \`src/{file}.ts:{line}\`

**Phase 3: Testing**
- [ ] Unit tests (>80% coverage)
  - Follow: \`src/{example}/{Example}.test.tsx\`

**Research Format**:
## 📚 Research / Related Materials

**Codebase References**:
- \`src/{file}.ts:{line}\`: {Pattern to follow}

**External Documentation**:
- [{Library}]({URL}): {Section}
- [{Example}]({URL}): {Implementation}

**Similar PRPs**:
- \`PRPs/{prp}.md\`: {Reference}

**Gotchas**:
- {Edge case/quirk}

**Timeline Format**:
## ⏱️ Timeline
**Estimated Effort**: {X days}
**Phase Breakdown**:
- Phase 1: {X days}
- Phase 2: {Y days}
- Phase 3: {Z days}

**Assumptions**: No blockers, assets available

**Update Progress**:
| {TODAY} | Developer | Completed research, architecture, breakdown | Ready for Implementation |

**Tools**:
- Read: Read PRP, code files
- Grep: Search patterns
- Glob: Find files
- WebSearch: Library docs
- Edit: Update PRP file

**Research First**:
1. grep -r "similar-pattern" src/
2. Find library docs with WebSearch
3. Read example implementations
4. Document ALL findings

Save changes directly to file.`
});
```

**Wait for completion** ✋

---

### Step 5: Validate & Report (Main Agent)

After all 3 agents complete:

**Actions**:
1. Read completed PRP: `PRPs/{feature-slug}.md`
2. Validate sections filled:
   - ✅ DoR (System Analyst)
   - ✅ DoD (AQA)
   - ✅ Implementation Breakdown (Developer)
   - ✅ Research Materials (Developer)
   - ✅ Testing Strategy (AQA)
   - ✅ Timeline (Developer)
3. Update PRP status to "Ready for Implementation"
4. Update Phase Exit Criteria checkboxes
5. Report to user

**Final Status Update** (edit PRP):
```markdown
**Status**: ✅ Ready for Implementation
```

**Output to User**:
```
🎉 PRP Generated Successfully!

📄 File: PRPs/{feature-slug}.md
⏱️  Time: {X} seconds

✅ Completed by Agents:
  1. System Analyst → DoR ({N} prerequisites), Business Value
  2. AQA Engineer → DoD ({N} deliverables), Success Metrics, Testing
  3. Developer → Implementation ({N} tasks), Research ({N} refs), Timeline ({X} days)

📊 PRP Summary:
  • Complexity: {Small|Medium|Large}
  • Estimated Effort: {X days}
  • Implementation Phases: {N}
  • Codebase References: {N}
  • External Docs: {N}
  • Test Scenarios: {N}

🎯 Status: Ready for Implementation

📋 Next Steps:
  1. Review PRP: cat PRPs/{feature-slug}.md
  2. Start implementation: /execute-prp PRPs/{feature-slug}.md
  3. Or customize PRP if needed

💡 Tip: The PRP is complete and executable. All context has been gathered by the agents.
```

---

## 🎯 Key Principles for Claude

### **FULLY AUTONOMOUS** - No User Interaction Required

When user runs `/generate-prp <description>`:

1. **You generate boilerplate** immediately
2. **You launch System Analyst** using Task tool (NO PERMISSION NEEDED)
3. **You wait** for System Analyst to complete
4. **You launch AQA** using Task tool (NO PERMISSION NEEDED)
5. **You wait** for AQA to complete
6. **You launch Developer** using Task tool (NO PERMISSION NEEDED)
7. **You wait** for Developer to complete
8. **You validate** and report final status

### Each Agent:
- Reads the PRP file
- Fills assigned sections
- Updates Progress Tracking
- **Saves changes directly** to the file
- Returns when done

### User Experience:
```
User: /generate-prp Add user authentication with JWT

Claude: 🤖 Generating PRP for "Add user authentication with JWT"...

        📝 Creating boilerplate...
        ✅ Boilerplate created: PRPs/add-user-authentication-jwt.md

        🔄 Launching System Analyst agent...
        ✅ System Analyst completed (DoR: 5 prerequisites)

        🔄 Launching AQA Engineer agent...
        ✅ AQA completed (DoD: 9 deliverables, 12 test scenarios)

        🔄 Launching Developer agent...
        ✅ Developer completed (15 tasks, 3 phases, 6 days estimated)

        🎉 PRP Ready for Implementation!

        📄 File: PRPs/add-user-authentication-jwt.md
        ⏱️  Estimated: 6 days
        📊 Quality: >80% coverage, 0 errors policy

        Next: /execute-prp PRPs/add-user-authentication-jwt.md
```

**NO manual steps required!**

---

## 📚 References & Best Practices

### Anthropic Documentation:
- **Subagents**: https://docs.claude.com/en/docs/claude-code/sub-agents
- **Multi-Agent System**: https://www.anthropic.com/engineering/multi-agent-research-system
- **Autonomous Workflows**: https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously
- **Task Tool**: https://docs.claude.com/en/docs/claude-code/sub-agents#using-task-tool

### Community Resources:
- **Agent Orchestration**: https://github.com/wshobson/agents
- **Stream Chaining**: https://github.com/ruvnet/claude-flow/wiki/Stream-Chaining
- **Multi-Agent Patterns**: https://medium.com/@richardhightower/claude-code-sub-agents-build-a-documentation-pipeline-in-minutes-not-weeks-c0f8f943d1d5

### Key Learnings:
1. **Sequential execution**: Wait for each agent to complete before launching next
2. **Isolated context**: Each agent operates in its own context window
3. **Clear prompts**: Give agents specific, actionable instructions
4. **Tool access**: Agents can use Read, Grep, Glob, WebSearch, Edit
5. **Progress tracking**: Each agent updates the same file incrementally
6. **Validation**: Main agent validates final output

---

## 🔧 Technical Configuration

### Required Files:
- `.claude/agents/system-analyst.md` - System Analyst template
- `.claude/agents/aqa-engineer.md` - AQA Engineer template
- `.claude/agents/developer.md` - Developer template
- `.claude/commands/generate-prp.md` - This file (orchestrator)

### Agent Capabilities:
Each agent has access to:
- ✅ Read tool (read files)
- ✅ Edit tool (update PRP file)
- ✅ Grep tool (search codebase)
- ✅ Glob tool (find files)
- ✅ WebSearch tool (research docs)
- ✅ Bash tool (run commands)

### Orchestration Flow:
```
User Input
   ↓
Main Agent (generate boilerplate)
   ↓
Task → System Analyst (DoR, business value)
   ↓ (wait)
Task → AQA Engineer (DoD, testing, metrics)
   ↓ (wait)
Task → Developer (implementation, research, timeline)
   ↓ (wait)
Main Agent (validate & report)
   ↓
Complete PRP delivered to user
```

### Parallel vs Sequential:
- ❌ **Not parallel** - agents depend on previous work
- ✅ **Sequential** - each builds on the last
- System Analyst must complete before AQA (AQA needs DoR context)
- AQA must complete before Developer (Developer needs DoD context)

---

**Remember**: This is a FULLY AUTONOMOUS system. Claude handles everything from user's description to complete, executable PRP. No manual role-playing or intervention needed!
