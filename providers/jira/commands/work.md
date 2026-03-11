---
name: trazador:work
description: Pick up a Jira issue and implement it — branch, code, test, PR, sync
argument-hint: "[Jira issue key, e.g. PROJ-42]"
---

# Trazador Work — Execute a Jira Issue

Pick up a Jira issue, implement it, and ship a PR. All context comes from Jira.

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which Jira issue should I work on? Provide the issue key (e.g., PROJ-42)."

Do not proceed without an issue key.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 1: Load Context from Jira

1. **Fetch the issue** using the Jira MCP server
2. **Fetch comments** for planning notes and prior context
3. **If parent issue**, also fetch sub-tasks
4. **Read the issue thoroughly** — description IS the spec. Comments are context.

**Extract from the issue:**
- Goal (what to achieve)
- Acceptance criteria (checkboxes)
- Approach (what to change where)
- Out of scope (what NOT to do)
- Technical notes (if any)

**If the issue lacks acceptance criteria or a clear approach:**
Use **AskUserQuestion**: "This issue doesn't have clear acceptance criteria. Should I proceed with my interpretation, or would you like to update the issue first?"

### Phase 2: Plan & Confirm

1. **Quick repo research** — read the files referenced in the issue's approach section
2. **Create a brief execution plan** (communicated, not written):
   ```
   I'll work on PROJ-XX: <title>

   Steps:
   1. <what I'll do first>
   2. <what I'll do next>
   3. <tests I'll write>

   Files I'll touch:
   - path/to/file.ts (modify: reason)
   ```
3. **Get user confirmation** before starting implementation

### Phase 3: Setup Environment

1. **Update Jira status** — move to "In Progress":
   ```
   mcp__jira-server__transition_issue(issueKey: <issue_key>, status: <config.jira.statuses.in_progress>)
   ```

2. **Post start comment** on the issue

3. **Create branch:**
   ```bash
   git checkout main && git pull origin main
   git checkout -b <issue-key-lowercase>/<short-description>
   ```

### Phase 4: Implement

**Task execution loop:**

```
For each acceptance criterion:
  1. Read referenced files from the issue approach
  2. Look for similar patterns in codebase
  3. Implement following existing conventions
  4. Write tests for new functionality
  5. Run tests after changes
  6. Commit when a logical unit is complete
```

**Commit guidelines:**
- Commit after each logical unit
- Use conventional commit messages: `feat(scope): description (PROJ-XX)`
- Don't commit if tests are failing
- Stage specific files, not `git add .`

### Phase 5: Quality Check

1. **Run the project's test suite**
2. **Run type checking** if applicable
3. **Verify all acceptance criteria:**
   ```
   Acceptance Criteria Verification:
   - [x] Criterion 1 — verified by: <how>
   - [x] Criterion 2 — verified by: <how>
   ```
4. **If any criterion is not met**, fix it before proceeding.

### Phase 6: Ship It

1. **Create PR** with structured body referencing the Jira issue
2. **Update Jira — move to "In Review"**
3. **Post completion comment** on the issue
4. **Present to user:**
   ```
   Work complete on PROJ-XX: <title>

   PR: <pr_url>
   All acceptance criteria met.

   Next: /trazador:review PROJ-XX
   ```

## Key Principles

- **The issue IS the spec** — don't invent requirements
- **Simplest path** — meet acceptance criteria with minimum code
- **Test as you go** — run tests after each change
- **Commit incrementally** — small, logical commits
- **Keep Jira updated** — status changes and comments at every phase transition
