---
name: trazador:work
description: Pick up a GitHub issue and implement it — branch, code, test, PR, sync
argument-hint: "[GitHub issue number, e.g. #42 or 42]"
---

# Trazador Work — Execute a GitHub Issue

Pick up a GitHub issue, implement it, and ship a PR. All context comes from GitHub.

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which GitHub issue should I work on? Provide the issue number (e.g., 42 or #42)."

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Execution Flow

### Phase 1: Load Context from GitHub

1. Fetch the issue via GitHub MCP
2. Fetch comments for context
3. Read the issue body as the spec

### Phase 2: Plan & Confirm

Brief execution plan, confirm with user.

### Phase 3: Setup Environment

1. **Update labels** — add "in-progress", remove "todo":
   ```
   mcp__github__update_issue(owner, repo, issue_number, labels: add "in-progress")
   ```
2. **Post start comment** on the issue
3. **Create branch:** `<issue-number>/<short-description>`

### Phase 4: Implement

Standard implementation loop — code, test, commit incrementally.

### Phase 5: Quality Check

Run tests, verify acceptance criteria.

### Phase 6: Ship It

1. **Create PR** with body referencing `Closes #XX`
2. **Update labels** — add "in-review", remove "in-progress"
3. **Post completion comment**
4. **Present to user**

## Key Principles

- **The issue IS the spec**
- **Simplest path**
- **Test as you go**
- **Commit incrementally**
- **Keep GitHub updated**
