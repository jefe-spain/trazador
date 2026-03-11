---
name: trazador:autopilot
description: Autonomous supervisor — dispatch teammate agents to work through Jira issues
argument-hint: "[max issues, default 5] [label filter]"
---

# Trazador Autopilot — Autonomous Issue Dispatcher (Jira)

Lightweight supervisor that picks issues from Jira and dispatches teammate agents.

## Input

<autopilot_input> #$ARGUMENTS </autopilot_input>

**Parse:** `max_issues` (default 5), `label_filter` (optional).

## Pre-flight

1. Read `.trazador/config.yaml`.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Confirm with user before starting.

## Execution Flow

### The Dispatch Loop

For each cycle:
1. Query Jira for "To Do" issues in the configured project
2. Apply label filter if set
3. Sort by priority
4. Spawn teammate agent per issue
5. Log result (completed/blocked/failed)

### Teammate Prompt Template

Same as Linear autopilot — teammate reads `.trazador/config.yaml`, fetches issue from Jira MCP, implements, creates PR, self-reviews.

### Safety Guards

- Max issues per session (default 5)
- Label filter for scoping
- No force push, no schema changes, no main commits
- 2 consecutive failures = stop

## Important Guidelines

- **Supervisor is THIN** — only dispatch and track
- **Teammates are DISPOSABLE** — fresh context each
- **Jira is the log** — every action posted to Jira
