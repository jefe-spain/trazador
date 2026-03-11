---
name: trazador:sync
description: Sync Jira issue state — update status, post comments, link artifacts automatically
argument-hint: "[Jira issue key] [event type]"
---

# Trazador Sync — Keep Jira in Sync (Jira)

Automatically update Jira whenever an agent performs a meaningful state transition.

## Input

<sync_input> #$ARGUMENTS </sync_input>

**Parse for:** `issue_key` and `event` (plan_created, work_started, progress, work_complete, review_passed, review_failed, blocked, note).

**If empty, run in reconciliation mode.**

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Execution Flow

### Phase 1: Validate Issue

Fetch the issue from Jira MCP to confirm it exists.

### Phase 2: Apply Event

Based on the event type, transition the issue and post comments using the Jira MCP server.

### Phase 3: Reconciliation Mode (No Arguments)

When invoked without arguments:
1. Fetch active issues (In Progress, In Review) from the project
2. Cross-reference with git branches and PR status
3. Report project health and suggest next actions

## Guidelines

- **Idempotent** — running sync twice should not create duplicate comments
- **Non-destructive** — sync never moves an issue backwards
- **Transparent** — every update is posted as a comment
