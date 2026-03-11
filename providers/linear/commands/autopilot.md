---
name: trazador:autopilot
description: Autonomous supervisor — dispatch teammate agents to work through Linear issues
argument-hint: "[max issues to process, default 5] [label filter, e.g. 'autopilot-ready']"
---

# Trazador Autopilot — Autonomous Issue Dispatcher

Lightweight supervisor that picks issues from Linear and dispatches teammate agents to implement them. Keeps minimal context — just enough to track who's working on what.

## Input

<autopilot_input> #$ARGUMENTS </autopilot_input>

**Parse the input for:**
- `max_issues` — maximum issues to process this session (default: 5)
- `label_filter` — only pick issues with this label (optional, e.g., "autopilot-ready")

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Confirm with the user before starting:
   ```
   Autopilot ready.

   Config:
     Team:     <team_name>
     Project:  <project_name>
     Max:      <max_issues> issues
     Filter:   <label_filter or "none — all Todo issues">

   This will autonomously pick up Todo issues and implement them.
   Each issue gets a dedicated teammate agent with full context.

   Proceed? (yes/no)
   ```

## Execution Flow

### The Dispatch Loop

**IMPORTANT: Keep this loop as lightweight as possible. The supervisor's job is ONLY to dispatch and track. Never load issue details, never read code, never plan implementations.**

```
session_log = []

for cycle in 1..max_issues:

  # Step 1: Quick sync — what's available?
  issues = mcp__linear-server__list_issues(
    team: <config.linear.team_name>,
    project: <config.linear.project_name>,
    state: <config.linear.statuses.todo>
  )

  # Apply label filter if set
  if label_filter:
    issues = issues.filter(has_label: label_filter)

  # Sort by priority (1=Urgent, 2=High, 3=Normal, 4=Low)
  issues = issues.sort_by(priority ASC, id ASC)

  # Step 2: Pick the next issue
  if issues.empty:
    report "No more Todo issues. Autopilot complete."
    break

  issue = issues.first
  report "Cycle {cycle}/{max_issues}: Dispatching teammate for {issue.id} — {issue.title}"

  # Step 3: Spawn teammate agent
  result = Agent(
    subagent_type: "general-purpose",
    description: "Implement {issue.id}",
    prompt: <TEAMMATE_PROMPT with issue.id>
  )

  # Step 4: Log the outcome (1 line)
  session_log.append({
    cycle: cycle,
    issue: issue.id,
    title: issue.title,
    result: <extract status from agent result: "completed" | "failed" | "blocked">
  })

  # Step 5: Brief status update
  report "Cycle {cycle} done: {issue.id} → {result.status}"

end loop
```

### Teammate Prompt Template

When spawning the teammate agent, use this prompt:

```
You are a trazador teammate — an autonomous coding agent.

Your task: implement Linear issue {issue_id}.

## Instructions

1. Read `.trazador/config.yaml` for workspace constants (team, project, statuses, labels).
2. Read the trazador skill at `skills/trazador/SKILL.md` (or the plugin's skill) for conventions.
3. Fetch the issue from Linear:
   - mcp__linear-server__get_issue(id: "{issue_id}", includeRelations: true)
   - mcp__linear-server__list_comments(issueId: "{issue_id}")
4. Read the issue description — it IS the spec.
5. **Research before coding** — load the `trazador-research` skill and follow its methodology:
   - Map every file in the Approach section (patterns, naming, error handling)
   - Search for reusable utilities, helpers, base classes
   - Read 2-3 similar files to extract conventions
   - Create an implementation brief: for each criterion, map where to implement, what to reuse, what pattern to follow
   - Skip if the Approach already has specific file:line references with pattern descriptions
6. Plan your implementation, then execute:
   - Update Linear status to In Progress
   - Create a branch
   - **Use adaptive TDD** — load the `trazador-tdd` skill:
     - Detect test framework. If none exists, implement directly.
     - If framework exists: for each criterion, write a failing test (RED), implement to pass (GREEN), refactor if needed.
   - Commit incrementally with conventional messages referencing {issue_id}
   - Run the test suite
7. **Independent acceptance verification** — before shipping, spawn an Acceptance Verifier agent:
   ```
   Agent(
     subagent_type: "general-purpose",
     description: "Verify criteria for {issue_id}",
     prompt: "You are an independent verifier. You did NOT write this code. Check `git diff main...HEAD` against these acceptance criteria: <criteria>. For each: PASS (cite file:line), FAIL (what's missing), or PARTIAL (the gap)."
   )
   ```
   Fix any FAIL criteria before proceeding.
8. When all criteria verified:
   - Push the branch
   - Create a PR with structured body (Summary, Acceptance Criteria, Testing)
   - Update Linear status to In Review
   - Post a completion comment on the issue
9. Self-review:
   - Check scope boundaries (nothing extra, nothing missing)
   - If all criteria MET and no issues found, move issue to Done in Linear
   - If issues found, note them in the PR and leave status as In Review

## Rules
- The issue IS the spec. Do not invent requirements.
- Simplest path — minimum code to meet acceptance criteria.
- Research first, then code. Never guess when you can grep.
- Test as you go (if the project has tests).
- If the issue is unclear or blocked, update Linear with a "Blocked" comment and return "blocked".
- Do not ask questions — either figure it out from the issue/code or mark as blocked.
- Always update Linear at every state transition.

## Return
When done, summarize in one line:
- "completed: PR #{number} created, all criteria met"
- "completed-with-review: PR #{number} created, needs human review"
- "blocked: {reason}"
- "failed: {reason}"
```

### After the Loop — Session Summary

```
Autopilot session complete.

| # | Issue | Title | Result | PR |
|---|-------|-------|--------|----|
| 1 | ISSUE-XX | <title> | completed | #N |
| 2 | ISSUE-YY | <title> | blocked | — |
| 3 | ISSUE-ZZ | <title> | completed | #M |

Processed: 3/5
Completed: 2
Blocked: 1
Failed: 0

Blocked issues need attention:
- ISSUE-YY: <reason>
```

### Post session summary to Linear

Create a comment on a project-level tracking issue or the first processed issue:

```
mcp__linear-server__save_comment(
  issueId: <first issue id>,
  body: "## Autopilot Session — YYYY-MM-DD\n\nProcessed {N} issues.\n\n| Issue | Result |\n|-------|--------|\n| ... | ... |\n\nAgent: Claude Code Autopilot"
)
```

## Safety Guards

| Guard | Rule |
|-------|------|
| Max issues | Hard cap per session (default 5) |
| Label filter | Only touch issues explicitly marked for autopilot |
| No force push | Teammates must never force-push |
| No schema changes | If issue requires DB migration, mark as blocked |
| No main commits | All work on branches, always via PR |
| Blocked = skip | If teammate reports blocked, log it and move on |
| Failed = stop | If 2 consecutive failures, stop the loop and report |

## Important Guidelines

- **Supervisor is THIN** — never load issue details, code, or diffs. Only dispatch and track.
- **Teammates are DISPOSABLE** — each gets fresh context, does its work, returns a result.
- **Linear is the log** — every action is posted to Linear, so the PM can follow along.
- **Human can intervene** — the PM can move issues out of Todo or remove the autopilot label to stop processing.
- **Conservative defaults** — max 5 issues, no label filter means it picks any Todo issue. Recommend using a label filter in practice.
