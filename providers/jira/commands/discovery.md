---
name: trazador:discovery
description: Analyze project state vs Jira, find gaps, and help define scope through creative dialogue
argument-hint: "[focus area or question]"
---

# Trazador Discovery — Project Reality Check (Jira)

Ground your project planning in reality. Discovery cross-references what exists in code against what's tracked in Jira, surfaces gaps, and helps you define or refine your project scope.

## Input

<discovery_input> #$ARGUMENTS </discovery_input>

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Execution Flow

### Phase 1: Scan the Codebase

Use Explore agents in parallel to scan backend, frontend, and infrastructure.

### Phase 2: Scan Jira

Fetch all issues from the configured project via the Jira MCP server, categorized by status.

### Phase 3: Cross-Reference & Gap Analysis

Compare code inventory vs Jira inventory to find:
1. Code without issues (untracked work)
2. Issues without code (planned but not started)
3. Stale or orphaned items
4. Integration gaps
5. Quality gaps

### Phase 4: Creative Scope Dialogue

Based on gaps, engage the user in structured conversation with AskUserQuestion.

### Phase 5: Capture Outcomes

Create Jira issues for agreed gaps, or defer to planning sessions.

### Phase 6: Summary

Present codebase stats, Jira stats, gaps found, and suggested next steps.

## Important Guidelines

- **NEVER write code** — discovery only analyzes and plans
- **Ground in reality** — every suggestion must reference actual code or actual issues
- **One question at a time**
