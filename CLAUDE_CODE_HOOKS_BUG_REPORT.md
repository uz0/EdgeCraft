# [BUG] Hooks Completely Non-Functional in Subdirectories (v2.0.27) - Blocking CI/CD Pipeline Development

## Environment

- **Claude Code Version:** v2.0.27
- **Platform:** macOS Darwin 23.5.0
- **Working Directory:** `/Users/dcversus/conductor/edgecraft/.conductor/lahore` (subdirectory)
- **Settings Files Tested:**
  - `~/.claude/settings.json` (global)
  - `/Users/dcversus/conductor/edgecraft/.claude/settings.json` (project root)
  - `/Users/dcversus/conductor/edgecraft/.conductor/lahore/.claude/settings.json` (working directory)

## Problem Statement

**All hook types (UserPromptSubmit, SessionStart, PreToolUse, PostToolUse, Stop) completely fail to execute when Claude Code runs from subdirectories.** This blocks development of advanced CI/CD pipelines that rely on hooks to:
- Trigger parallel development environments
- Update Phase Requirement Proposals (PRPs) automatically
- Orchestrate multiple Claude Code instances with different models
- Execute custom CLI workflows

This appears to be a **combination of Issue #8810 (subdirectory bug) and Issue #6305 (PreToolUse/PostToolUse broken)**, making hooks entirely unusable in real-world project structures.

## Use Case: Multi-Agent CI/CD Pipeline

We're building an AI-driven development pipeline that uses hooks to:

1. **SessionStart**: Initialize 10 parallel dev servers, each assigned to different PRPs
2. **UserPromptSubmit**: Inject codebase context, validate requirements against PRPs
3. **PreToolUse**: Route tool calls to appropriate agents based on task type
4. **PostToolUse**: Update PRP progress tracking tables automatically
5. **SubagentStop**: Aggregate results from parallel agents
6. **Stop**: Generate comprehensive session reports

**Without working hooks, this entire workflow architecture is impossible.**

## Reproduction Steps

### Test 1: UserPromptSubmit Hook (Global Settings)

**File:** `~/.claude/settings.json`
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat > /dev/null && date '+%Y-%m-%d %H:%M:%S UserPromptSubmit' >> /tmp/claude-hooks-test.log && echo '🎬 Hook fired!'"
          }
        ]
      }
    ]
  }
}
```

**Steps:**
1. Clear log: `rm -f /tmp/claude-hooks-test.log`
2. Start Claude Code from subdirectory: `cd /Users/dcversus/conductor/edgecraft/.conductor/lahore && claude`
3. Send any message
4. Check log: `cat /tmp/claude-hooks-test.log`

**Expected:** Hook fires, log created
**Actual:** No log file created, hook never executed
**Result:** ❌ **FAIL**

---

### Test 2: SessionStart Hook (Local Settings)

**File:** `.claude/settings.json` (in working directory)
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "date > /tmp/claude-session-start.txt"
          }
        ]
      }
    ]
  }
}
```

**Steps:**
1. Clear marker: `rm -f /tmp/claude-session-start.txt`
2. Completely restart Claude Code
3. Check marker: `ls -la /tmp/claude-session-start.txt`

**Expected:** File created on session start
**Actual:** File not created
**Result:** ❌ **FAIL**

---

### Test 3: PreToolUse Hook (Script File)

**File:** `.claude/hooks/pre-tool-use.sh`
```bash
#!/usr/bin/env bash
read -r input_json
echo "🎬 PreToolUse hook fired!" >&2
exit 0
```

**File:** `~/.claude/settings.json`
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/dcversus/conductor/edgecraft/.conductor/lahore/.claude/hooks/pre-tool-use.sh"
          }
        ]
      }
    ]
  }
}
```

**Steps:**
1. `chmod +x .claude/hooks/pre-tool-use.sh`
2. Test manually: `echo '{"tool":"Bash"}' | .claude/hooks/pre-tool-use.sh` ✅ Works
3. Restart Claude Code completely
4. Ask Claude to run any bash command
5. Look for hook output before tool execution

**Expected:** "🎬 PreToolUse hook fired!" appears before Bash output
**Actual:** No hook output, hook never executed
**Result:** ❌ **FAIL**

---

### Test 4: Stop Hook (Logging to File)

**File:** `~/.claude/settings.json`
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat > /dev/null && date '+%Y-%m-%d %H:%M:%S Stop' >> /tmp/claude-hooks-test.log"
          }
        ]
      }
    ]
  }
}
```

**Steps:**
1. Clear log: `rm -f /tmp/claude-hooks-test.log`
2. Restart Claude Code
3. Send a message, wait for response to complete
4. Check log: `cat /tmp/claude-hooks-test.log`

**Expected:** Log entry created after each response
**Actual:** No log file created
**Result:** ❌ **FAIL**

---

## Testing Evidence

**Manual Script Execution:** ✅ All hook scripts execute correctly when run manually
```bash
$ echo '{"tool":"Bash"}' | .claude/hooks/pre-tool-use.sh
🎬 PreToolUse hook fired!

$ cat > /dev/null && echo '🎬 Inline hook!'
🎬 Inline hook!
```

**File Permissions:** ✅ All scripts have execute permissions
```bash
$ ls -la .claude/hooks/
-rwxr-xr-x  1 dcversus  staff  270 Oct 26 07:06 pre-tool-use.sh
-rwxr-xr-x  1 dcversus  staff  304 Oct 26 07:06 user-prompt-submit.sh
```

**Configuration Syntax:** ✅ JSON validates correctly
```bash
$ cat ~/.claude/settings.json | jq .
{
  "hooks": {
    "UserPromptSubmit": [ ... ]
  }
}
```

**Restart Attempts:** 🔄 Tested 15+ full restarts (`claude --dangerously-skip-permissions -c`)
**Settings Reload:** 🔄 Used `/hooks` command after every config change
**Log Monitoring:** 🔍 Continuously monitored `/tmp/claude-hooks-test.log` with `tail -f`

---

## Workarounds Attempted

### ❌ Symlink Approach (Issue #8810 suggestion)
```bash
mkdir -p /Users/dcversus/conductor/edgecraft/.conductor/lahore/.claude
ln -s ~/.claude/settings.json .claude/settings.json
```
**Result:** Still no hook execution, even after restart

### ❌ Absolute Paths
Converted all hook commands to absolute paths
**Result:** No change, hooks still don't fire

### ❌ Inline Commands (Avoid Script Files)
Used inline `cat > /dev/null && echo 'test'` directly in settings.json
**Result:** No execution

### ❌ Different Hook Types
Tested all 9 hook types (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SubagentStop, Notification, PreCompact, SessionEnd)
**Result:** None execute in subdirectories

---

## Expected Behavior

According to [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks):

> **User settings** are defined in `~/.claude/settings.json` and **apply to all projects**.

Hooks should:
1. Execute from `~/.claude/settings.json` regardless of working directory
2. Execute from local `.claude/settings.json` when present
3. Fire consistently after `/hooks` reload command
4. Work immediately after Claude Code restart

---

## Actual Behavior

**In subdirectories:**
- ❌ Global hooks (`~/.claude/settings.json`) don't execute
- ❌ Local hooks (`.claude/settings.json`) don't execute
- ❌ Hook scripts are never invoked (no process spawned)
- ❌ No error messages or warnings shown
- ❌ `/hooks` command doesn't display configured hooks
- ❌ Logs show zero hook activity

**From home directory (`~`):**
- ⚠️ Hooks reportedly work ~80-90% of the time (Issue #8810)
- ⚠️ Duplicate firing reported (Issue #3465)

---

## Impact Assessment

**Severity:** 🔴 **CRITICAL** - Blocks entire workflow categories

**Affected Use Cases:**
1. **CI/CD Pipelines**: Cannot automate testing, validation, or deployment hooks
2. **Multi-Agent Workflows**: Cannot orchestrate parallel development sessions
3. **Context Injection**: Cannot add codebase-specific context to prompts
4. **Security Validation**: Cannot enforce command approval workflows
5. **Progress Tracking**: Cannot automatically update project documentation
6. **Quality Gates**: Cannot block unsafe operations via PreToolUse hooks

**Workaround:** None that work reliably

---

## Related Issues

- **#8810**: UserPromptSubmit hooks not working in subdirectories (partial overlap)
- **#6305**: PreToolUse/PostToolUse hooks not executing (affects all directories)
- **#3579**: User settings hooks not loading in `/hooks` command
- **#2814**: Claude Code hooks system configuration issues
- **#6403**: PostToolUse hooks not executing despite stdin JSON config

---

## Proposed Solutions

### Option 1: Fix Subdirectory Support (Immediate)
1. Ensure `~/.claude/settings.json` loads regardless of `process.cwd()`
2. Resolve hook script paths relative to settings file location
3. Add diagnostic logging: "Loaded N hooks from ~/.claude/settings.json"

### Option 2: Investigate Path Resolution (Root Cause)
1. Debug why hooks work from `~` but not from `/project/subdir`
2. Check if `~/.claude/settings.json` is even being read when `cwd != ~`
3. Verify environment variables affecting path resolution

### Option 3: Add `/hooks debug` Command (Diagnostics)
```
$ claude /hooks debug
✅ Global settings: ~/.claude/settings.json (5 hooks loaded)
✅ Local settings: .claude/settings.json (3 hooks loaded)
❌ Hook execution log: 0 hooks fired in last session
⚠️ Current directory: /Users/dcversus/project/subdir (known issue #8810)
```

### Option 4: Source Code Investigation
We need access to the hooks loading/execution logic to debug:
- Where settings.json is loaded from (file path resolution)
- How hook commands are spawned (working directory, PATH, env vars)
- Why subdirectories break this mechanism

**Request:** Can Anthropic share the relevant source code or provide detailed internal logging?

---

## Temporary Workaround for Users

**Until this is fixed, the ONLY way to use hooks is:**

1. **Always start Claude Code from home directory:**
   ```bash
   cd ~
   claude
   ```

2. **Use absolute paths in all hook commands:**
   ```json
   {
     "command": "/Users/username/project/.claude/hooks/script.sh"
   }
   ```

3. **Use external orchestration (not hooks):**
   - GitHub Actions workflows
   - Shell aliases that wrap `claude` command
   - External process monitoring (e.g., `fswatch` + scripts)

**This severely limits hooks usefulness for real-world development.**

---

## Additional Context

**Our Project:** Open-source game engine (Edge Craft) with 10+ Phase Requirement Proposals (PRPs) being developed in parallel. We need hooks to:
- Route different task types to specialized agents (terrain, networking, UI, etc.)
- Auto-update progress tracking tables in PRPs
- Validate asset licensing compliance before commits
- Generate architecture decision records (ADRs) from tool use

**Community Impact:** Multiple users report identical hook failures across versions (v1.0.51, v1.0.89, v2.0.27), suggesting this affects a large portion of the user base working in real project structures (not just `~`).

---

## Request for Anthropic Team

1. **Acknowledge this as critical bug** affecting core hooks functionality
2. **Prioritize fix** - hooks are advertised feature but fundamentally broken
3. **Share debugging guidance** - how can we help diagnose the root cause?
4. **Provide workaround** - is there ANY way to make hooks work in subdirectories?
5. **Transparency** - is this a known limitation? Should docs clarify "hooks only work from ~"?

---

## Testing Offer

We're happy to:
- Test patches/fixes before release
- Provide detailed logging from our environment
- Share our CI/CD pipeline design for reference
- Contribute documentation improvements

**Contact:** Available via this GitHub issue

---

## Logs / Configuration Files

**~/.claude/settings.json:**
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "includeCoAuthoredBy": false,
  "enabledPlugins": {
    "example-skills@anthropic-agent-skills": true,
    "chrome-devtools@claude-code-mcp": true
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat > /dev/null && date '+%Y-%m-%d %H:%M:%S UserPromptSubmit' >> /tmp/claude-hooks-test.log && echo '🎬 HOOK WORKS!'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat > /dev/null && date '+%Y-%m-%d %H:%M:%S Stop' >> /tmp/claude-hooks-test.log"
          }
        ]
      }
    ]
  }
}
```

**Working Directory:** `/Users/dcversus/conductor/edgecraft/.conductor/lahore`

**Hook Test Log:**
```bash
$ cat /tmp/claude-hooks-test.log
cat: /tmp/claude-hooks-test.log: No such file or directory
```

---

**Summary:** Hooks are completely non-functional in subdirectories in v2.0.27, blocking critical CI/CD use cases. This combines bugs from #8810 and #6305, making hooks unusable for real-world projects. Needs urgent investigation and fix.
