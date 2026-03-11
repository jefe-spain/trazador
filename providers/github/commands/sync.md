---
name: trazador:sync
description: Sync GitHub issue state — update labels, post comments, link PRs automatically
argument-hint: "[issue number] [event type]"
---

# Trazador Sync — Keep GitHub Issues in Sync

Update GitHub Issues on state transitions.

## Input

<sync_input> #$ARGUMENTS </sync_input>

## Pre-flight

1. Read `.trazador/config.yaml`.

## Execution Flow

### Phase 1: Validate Issue

Fetch issue from GitHub MCP.

### Phase 2: Apply Event

Update labels and post comments based on event type. GitHub uses labels for status instead of workflow states.

### Phase 3: Reconciliation Mode

Check In Progress issues vs git branches, In Review vs PR status.

## Guidelines

- Idempotent, non-destructive, transparent
