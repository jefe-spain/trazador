---
name: trazador:plan
description: PM intake — define a feature goal, clarify requirements, create structured GitHub issues
argument-hint: "[feature idea, goal, or problem to solve]"
---

# Trazador Plan — Feature Intake to GitHub Issues

Transform a feature idea or goal into well-structured GitHub issues with clear acceptance criteria.

## Input

<feature_description> #$ARGUMENTS </feature_description>

**If empty, ask:** "What feature or goal would you like to plan? Describe what you want to achieve."

Do not proceed without a clear feature description.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (owner, repo, labels).
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 0: Context Load

1. Read config for owner, repo, labels.
2. Quick repo scan — understand existing patterns related to the feature:
   - Use Explore agent to find similar code, established conventions.

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

### Phase 2.5: Validate the Spec

Before creating issues, load the `trazador-spec-validation` skill and follow its methodology:

1. **Feasibility Check** — for each acceptance criterion, verify the codebase can support it. Flag criteria needing foundation work not covered in the Approach.
2. **Criteria Quality** — each criterion must be observable, testable, and unambiguous. Rewrite vague criteria.
3. **Flow Completeness** — trace the user flow end-to-end. Identify missing steps, error states, and edge cases.

Present the validation table to the user. Apply any rewrites, splits, or additions before proceeding.

If any criteria **Need Foundation**, add prerequisite steps to the Approach or suggest splitting into a separate issue.

### Phase 3: Decide Issue Structure

Based on complexity assessment from Phase 1:

**Simple (single concern, one package):**
- Create one GitHub issue

**Compound (multiple packages or phases):**
- Create a parent issue with the full spec and a task list linking sub-issues
- Create sub-issues for each independent work unit
- Each sub-issue gets its own focused acceptance criteria
- Sub-issues should be independently shippable when possible

Use **AskUserQuestion** to confirm the structure before creating.

### Phase 4: Create GitHub Issues

Read owner and repo from `.trazador/config.yaml`.

**For each issue, use the GitHub MCP server:**

```
mcp__github__create_issue(
  owner: <config.github.owner>,
  repo: <config.github.repo>,
  title: "<type>: <concise description>",
  body: <structured spec from Phase 2>,
  labels: ["feature"|"bug"|"improvement", "todo"]
)
```

**For compound issues**, update the parent issue body with a task list referencing sub-issues:
```markdown
## Sub-Issues
- [ ] #YY — <title>
- [ ] #ZZ — <title>
```

**Title conventions:**
- `feat: <description>` — new capability
- `fix: <description>` — bug fix
- `refactor: <description>` — restructure without behavior change
- `chore: <description>` — tooling, config, dependencies

### Phase 5: Sync & Handoff

After issue creation:

1. **Post a planning comment** on the parent issue via GitHub MCP:
   ```
   mcp__github__add_issue_comment(
     owner: <config.github.owner>,
     repo: <config.github.repo>,
     issue_number: <issue_number>,
     body: "## Planning Summary\n\nCreated by `/trazador:plan` on YYYY-MM-DD.\n\n**Approach:** [1 sentence]\n**Sub-issues:** [list if any]\n**Ready for:** `/trazador:work #XX`"
   )
   ```

2. **Present to user:**
   ```
   Issue created: #XX — <title>
   [Sub-issues if any: #YY, #ZZ]

   URL: <github url>

   Next steps:
   1. Review the issue on GitHub
   2. When ready: /trazador:work #XX
   ```

## Important Guidelines

- **NEVER write code** — this command only plans and creates issues
- **NEVER create local files** — everything goes to GitHub
- **Keep specs concise** — agents work better with clear, bounded specs than verbose novels
- **One goal per issue** — if you find yourself writing "and also...", split into sub-issues
- **Reference real code** — approach sections must cite existing files, not abstract patterns
