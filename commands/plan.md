---
name: trazador:plan
description: PM intake — define a feature goal, clarify requirements, create structured Linear issues
argument-hint: "[feature idea, goal, or problem to solve]"
---

# Trazador Plan — Feature Intake to Linear

Transform a feature idea or goal into well-structured Linear issues with clear acceptance criteria.

## Input

<feature_description> #$ARGUMENTS </feature_description>

**If empty, ask:** "What feature or goal would you like to plan? Describe what you want to achieve."

Do not proceed without a clear feature description.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (team, project, statuses, labels).
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 0: Context Load

1. Read config for team name, project name, statuses, labels.
2. Quick repo scan — understand existing patterns related to the feature:
   - Use Explore agent to find similar code, established conventions, AGENTS.md constraints.

### Phase 1: Clarify the Goal

Use **AskUserQuestion** to refine the idea through focused dialogue:

- Ask **one question at a time**
- Prefer multiple choice when natural options exist
- Focus on: purpose, target user, success criteria, constraints, scope boundaries
- Apply YAGNI — resist scope creep, find the simplest path

**Gather signals for complexity assessment:**

| Signal | What it tells you |
|--------|------------------|
| Touches multiple packages (server + frontend + api) | Needs sub-issues |
| Requires DB schema changes | Higher risk, explicit migration task |
| External API integration | Needs research, error handling focus |
| UI-only change | Likely single issue |
| Clear acceptance criteria from user | Can proceed faster |

**Exit when:** The goal, scope, and success criteria are clear — OR user says "proceed".

### Phase 2: Structure the Spec

Write a structured issue description in markdown:

```markdown
## Goal

[1-2 sentences: what this achieves for the user/business]

## Context

[Why now? What existing code/patterns are relevant? Link to files with `path:line`]

## Approach

[The simplest path to achieve the goal. Be specific about what changes where.]

## Acceptance Criteria

- [ ] Criterion 1 (observable, testable)
- [ ] Criterion 2
- [ ] ...

## Out of Scope

[Explicitly list what this does NOT include to prevent scope creep]

## Technical Notes

[Only if needed: migration steps, API contracts, performance considerations]
```

**Rules:**
- Every acceptance criterion must be **observable and testable** — not "clean code" but "endpoint returns 200 with payload X"
- Approach section must reference **specific files** from repo research
- Out of Scope is mandatory — forces discipline on boundaries

### Phase 3: Decide Issue Structure

Based on complexity assessment from Phase 1:

**Simple (single concern, one package):**
- Create one Linear issue

**Compound (multiple packages or phases):**
- Create a parent issue with the full spec
- Create sub-issues for each independent work unit
- Each sub-issue gets its own focused acceptance criteria
- Sub-issues should be independently shippable when possible

Use **AskUserQuestion** to confirm the structure before creating.

### Phase 4: Create Linear Issues

Read team and project from `.trazador/config.yaml`.

**For each issue, use `mcp__linear-server__save_issue`:**

```
team: <config.linear.team_name>
project: <config.linear.project_name>
title: "<type>: <concise description>"
description: <structured spec from Phase 2>
state: <config.linear.statuses.todo>
priority: <inferred from conversation, default 3 (Normal)>
labels: ["Feature" | "Bug" | "Improvement"]
```

**For sub-issues, additionally set:**
```
parentId: <parent issue ID>
```

**Title conventions:**
- `feat: <description>` — new capability
- `fix: <description>` — bug fix
- `refactor: <description>` — restructure without behavior change
- `chore: <description>` — tooling, config, dependencies

### Phase 5: Sync & Handoff

After issue creation:

1. **Post a planning comment** on the parent issue:
   ```
   ## Planning Summary

   Created by `/trazador:plan` on YYYY-MM-DD.

   **Approach:** [1 sentence]
   **Sub-issues:** [list if any]
   **Ready for:** `/trazador:work <issue-id>`
   ```

2. **Present to user:**
   ```
   Issue created: ISSUE-XX — <title>
   [Sub-issues if any: ISSUE-YY, ISSUE-ZZ]

   URL: <linear url>

   Next steps:
   1. Review the issue in Linear
   2. When ready: /trazador:work ISSUE-XX
   ```

## Important Guidelines

- **NEVER write code** — this command only plans and creates issues
- **NEVER create local files** — everything goes to Linear
- **Keep specs concise** — agents work better with clear, bounded specs than verbose novels
- **One goal per issue** — if you find yourself writing "and also...", split into sub-issues
- **Reference real code** — approach sections must cite existing files, not abstract patterns
