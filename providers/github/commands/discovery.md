---
name: trazador:discovery
description: Analyze project state vs GitHub Issues, find gaps, and help define scope
argument-hint: "[focus area or question]"
---

# Trazador Discovery — Project Reality Check (GitHub Issues)

Cross-reference code against GitHub Issues to surface gaps and define scope.

## Input

<discovery_input> #$ARGUMENTS </discovery_input>

## Pre-flight

1. Read `.trazador/config.yaml`.

## Execution Flow

### Phase 1: Scan Codebase

Use Explore agents for backend, frontend, infrastructure.

### Phase 2: Scan GitHub Issues

Fetch all issues (open and recently closed) via GitHub MCP.

### Phase 3: Cross-Reference & Gap Analysis

Compare code vs issues — find untracked code, unstarted issues, stale items.

### Phase 4: Creative Scope Dialogue

Engage user with AskUserQuestion.

### Phase 5: Capture Outcomes

Create GitHub issues for agreed gaps.

## Important Guidelines

- **NEVER write code**
- **Ground in reality**
- **One question at a time**
