---
name: trazador:review
description: Goal-aligned review — validate implementation against the GitHub issue spec, then technical review
argument-hint: "[GitHub issue number, e.g. #42 or 42]"
---

# Trazador Review — Goal-Aligned Code Review (GitHub Issues)

Validate implementation against the original GitHub issue spec, then run technical review agents.

## Input

<issue_id> #$ARGUMENTS </issue_id>

## Pre-flight

1. Read `.trazador/config.yaml`.

## Execution Flow

### Phase 1: Gather Context

Fetch issue, comments, and PR diff in parallel.

### Phase 2: Goal Alignment Review

Check each acceptance criterion: MET / NOT MET / PARTIAL.

### Phase 3: Technical Review

Run curated review agents in parallel.

### Phase 4: Synthesize & Post

Post review as GitHub issue comment and PR review.

- APPROVE → close issue, approve PR
- REQUEST CHANGES → request changes on PR, comment on issue

## Important Guidelines

- Goal alignment first
- Issue is the contract
- Post everything to GitHub
