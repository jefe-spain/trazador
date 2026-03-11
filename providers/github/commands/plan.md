---
name: trazador:plan
description: PM intake — define a feature goal, clarify requirements, create structured GitHub issues
argument-hint: "[feature idea, goal, or problem to solve]"
---

# Trazador Plan — Feature Intake to GitHub Issues

Transform a feature idea into well-structured GitHub issues with clear acceptance criteria.

## Input

<feature_description> #$ARGUMENTS </feature_description>

**If empty, ask:** "What feature or goal would you like to plan?"

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Execution Flow

### Phase 0: Context Load

Read config, scan repo for relevant patterns.

### Phase 1: Clarify the Goal

Interactive dialogue with AskUserQuestion — one question at a time.

### Phase 2: Structure the Spec

Write structured issue body with Goal, Context, Approach, Acceptance Criteria, Out of Scope.

### Phase 3: Decide Issue Structure

Simple: single GitHub issue.
Compound: parent issue with task list checkboxes, plus separate sub-issues linked via references.

### Phase 4: Create GitHub Issues

Use the GitHub MCP server to create issues:

```
mcp__github__create_issue(
  owner: <config.github.owner>,
  repo: <config.github.repo>,
  title: "<type>: <description>",
  body: <structured spec>,
  labels: ["feature"|"bug"|"improvement", "todo"]
)
```

### Phase 5: Handoff

Present issue URL and suggest next: `/trazador:work #XX`

## Important Guidelines

- **NEVER write code** — only plan and create issues
- **Keep specs concise**
- **One goal per issue**
- **Reference real code**
