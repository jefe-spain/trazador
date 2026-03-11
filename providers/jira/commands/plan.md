---
name: trazador:plan
description: PM intake — define a feature goal, clarify requirements, create structured Jira issues
argument-hint: "[feature idea, goal, or problem to solve]"
---

# Trazador Plan — Feature Intake to Jira

Transform a feature idea or goal into well-structured Jira issues with clear acceptance criteria.

## Input

<feature_description> #$ARGUMENTS </feature_description>

**If empty, ask:** "What feature or goal would you like to plan? Describe what you want to achieve."

Do not proceed without a clear feature description.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (project, statuses, labels).
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 0: Context Load

1. Read config for project name, statuses, labels.
2. Quick repo scan — understand existing patterns related to the feature:
   - Use Explore agent to find similar code, established conventions, AGENTS.md constraints.

### Phase 1: Clarify the Goal

Use **AskUserQuestion** to refine the idea through focused dialogue:

- Ask **one question at a time**
- Prefer multiple choice when natural options exist
- Focus on: purpose, target user, success criteria, constraints, scope boundaries
- Apply YAGNI — resist scope creep, find the simplest path

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

### Phase 3: Decide Issue Structure

**Simple (single concern):** Create one Jira issue (Story or Task)

**Compound (multiple packages or phases):**
- Create a parent Epic or Story with the full spec
- Create sub-tasks for each independent work unit
- Each sub-task gets its own focused acceptance criteria

Use **AskUserQuestion** to confirm the structure before creating.

### Phase 4: Create Jira Issues

Read project from `.trazador/config.yaml`.

**For each issue, use the Jira MCP server to create issues:**

```
mcp__jira-server__create_issue(
  project: <config.jira.project_key>,
  summary: "<type>: <concise description>",
  description: <structured spec from Phase 2>,
  issueType: "Story"|"Task"|"Bug",
  status: <config.jira.statuses.todo>,
  priority: "Medium",
  labels: ["Feature"|"Bug"|"Improvement"]
)
```

**For sub-tasks, additionally set:**
```
parent: <parent issue key>
issueType: "Sub-task"
```

### Phase 5: Sync & Handoff

After issue creation:

1. **Post a comment** on the parent issue with planning summary
2. **Present to user:**
   ```
   Issue created: PROJ-XX — <title>
   [Sub-tasks if any: PROJ-YY, PROJ-ZZ]

   Next steps:
   1. Review the issue in Jira
   2. When ready: /trazador:work PROJ-XX
   ```

## Important Guidelines

- **NEVER write code** — this command only plans and creates issues
- **NEVER create local files** — everything goes to Jira
- **Keep specs concise** — agents work better with clear, bounded specs
- **One goal per issue** — if you find yourself writing "and also...", split
- **Reference real code** — approach sections must cite existing files
