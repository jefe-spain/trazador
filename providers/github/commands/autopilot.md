---
name: trazador:autopilot
description: Autonomous supervisor — dispatch teammate agents to work through GitHub issues
argument-hint: "[max issues, default 5] [label filter]"
---

# Trazador Autopilot — Autonomous Issue Dispatcher (GitHub Issues)

Lightweight supervisor that picks issues from GitHub and dispatches teammate agents.

## Input

<autopilot_input> #$ARGUMENTS </autopilot_input>

## Pre-flight

1. Read `.trazador/config.yaml`.
2. Confirm with user before starting.

## Execution Flow

### The Dispatch Loop

1. Query GitHub for open issues labeled "todo" (or filtered by label)
2. Sort by priority labels (priority-high, priority-normal, etc.)
3. Spawn teammate agent per issue
4. Log results

### Safety Guards

Max issues, label filter, no force push, no schema changes, 2 failures = stop.

## Important Guidelines

- Supervisor is thin — dispatch and track only
- Teammates are disposable — fresh context each
- GitHub is the log
