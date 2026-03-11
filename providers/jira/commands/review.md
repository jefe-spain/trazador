---
name: trazador:review
description: Goal-aligned review — validate implementation against the Jira issue spec, then run technical review
argument-hint: "[Jira issue key, e.g. PROJ-42]"
---

# Trazador Review — Goal-Aligned Code Review (Jira)

Validate that the implementation matches the original Jira issue spec, then run curated technical review agents.

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which Jira issue should I review? Provide the issue key (e.g., PROJ-42)."

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Execution Flow

### Phase 1: Gather All Context

Run these in parallel:

1. **Fetch the Jira issue** with full details
2. **Fetch issue comments** for planning notes and work log
3. **Get the PR diff** — find the linked PR from branch name:
   ```bash
   gh pr list --head <branch_name> --json number,url,title,body
   gh pr diff <pr_number>
   ```

### Phase 2: Goal Alignment Review

**For each acceptance criterion from the issue:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Criterion 1 | MET / NOT MET / PARTIAL | File:line |

**Scope boundary check** and **Goal integrity verdict** (ALIGNED / PARTIAL / MISALIGNED).

### Phase 3: Technical Review

Run curated review agents in parallel (pattern recognition, code simplicity, security, performance).

### Phase 4: Synthesize Findings

Categorize as P1 CRITICAL / P2 IMPORTANT / P3 SUGGESTION.

### Phase 5: Post to Jira & Handoff

1. **Post the review as a Jira comment**
2. **Update issue based on verdict:**
   - APPROVE → Status → Done, approve PR
   - REQUEST CHANGES → Status stays In Review, list fixes needed
3. **Present to user** with summary

## Important Guidelines

- **Goal alignment comes FIRST** — before any code quality review
- **Use the issue as the contract** — don't invent criteria
- **Be specific** — every finding must reference a file:line
- **Post everything to Jira** — the review must be durable
