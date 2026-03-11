---
name: trazador:autopilot
description: Autonomous supervisor — dispatch teammate agents to work through GitHub issues
argument-hint: "[max issues to process, default 5] [label filter, e.g. 'autopilot-ready']"
---

# Trazador Autopilot — Autonomous Issue Dispatcher (GitHub Issues)

Lightweight supervisor that picks issues from GitHub and dispatches teammate agents to implement them. Keeps minimal context — just enough to track who's working on what.

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
     Repo:     <owner>/<repo>
     Max:      <max_issues> issues
     Filter:   <label_filter or "none — all todo issues">

   This will autonomously pick up todo issues and implement them.
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
  issues = mcp__github__list_issues(
    owner: <config.github.owner>,
    repo: <config.github.repo>,
    state: "open",
    labels: "todo"
  )

  # Apply label filter if set
  if label_filter:
    issues = issues.filter(has_label: label_filter)

  # Sort by priority labels (priority-high first, then priority-normal, etc.)
  issues = issues.sort_by(priority_label, number ASC)

  # Step 2: Pick the next issue
  if issues.empty:
    report "No more todo issues. Autopilot complete."
    break

  issue = issues.first
  report "Cycle {cycle}/{max_issues}: Dispatching teammate for #{issue.number} — {issue.title}"

  # Step 3: Spawn teammate agent
  result = Agent(
    subagent_type: "general-purpose",
    description: "Implement #{issue.number}",
    prompt: <TEAMMATE_PROMPT with issue.number>
  )

  # Step 4: Log the outcome (1 line)
  session_log.append({
    cycle: cycle,
    issue: issue.number,
    title: issue.title,
    result: <extract status from agent result: "completed" | "failed" | "blocked">
  })

  # Step 5: Brief status update
  report "Cycle {cycle} done: #{issue.number} → {result.status}"

end loop
```

### Teammate Prompt Template

When spawning the teammate agent, use this prompt:

```
You are a trazador teammate — an autonomous coding agent.

Your task: implement GitHub issue #{issue_number} in the repo <owner>/<repo>.

## Instructions

1. Read `.trazador/config.yaml` for workspace constants (owner, repo, labels).
2. Read the trazador skill at `skills/trazador/SKILL.md` (or the plugin's skill) for conventions.
3. Fetch the issue from GitHub MCP:
   - mcp__github__get_issue(owner: "<owner>", repo: "<repo>", issue_number: {issue_number})
   - Fetch comments for context
4. Read the issue body — it IS the spec.
5. **Research before coding** — load the `trazador-research` skill and follow its methodology:
   - Map every file in the Approach section (patterns, naming, error handling)
   - Search for reusable utilities, helpers, base classes
   - Read 2-3 similar files to extract conventions
   - Create an implementation brief: for each criterion, map where to implement, what to reuse, what pattern to follow
   - Skip if the Approach already has specific file:line references with pattern descriptions
6. Plan your implementation, then execute:
   - Update labels to "in-progress" via GitHub MCP
   - Create a branch
   - **Use adaptive TDD** — load the `trazador-tdd` skill:
     - Detect test framework. If none exists, implement directly.
     - If framework exists: for each criterion, write a failing test (RED), implement to pass (GREEN), refactor if needed.
   - Commit incrementally with conventional messages referencing #{issue_number}
   - Run the test suite
7. **Independent acceptance verification** — before shipping, spawn an Acceptance Verifier agent:
   ```
   Agent(
     subagent_type: "general-purpose",
     description: "Verify criteria for #{issue_number}",
     prompt: "You are an independent verifier. You did NOT write this code. Check `git diff main...HEAD` against these acceptance criteria: <criteria>. For each: PASS (cite file:line), FAIL (what's missing), or PARTIAL (the gap)."
   )
   ```
   Fix any FAIL criteria before proceeding.
8. When all criteria verified:
   - Push the branch: `git push -u origin <branch_name>`
   - Tell the user to create a PR (do NOT assume gh CLI is installed)
   - Update labels to "in-review" via GitHub MCP
   - Post a completion comment on the issue via GitHub MCP
9. Self-review:
   - Check scope boundaries (nothing extra, nothing missing)
   - If all criteria MET and no issues found, close the issue via GitHub MCP
   - If issues found, note them in a comment and leave issue open

## Rules
- The issue IS the spec. Do not invent requirements.
- Simplest path — minimum code to meet acceptance criteria.
- Research first, then code. Never guess when you can grep.
- Test as you go (if the project has tests).
- If the issue is unclear or blocked, post a "Blocked" comment via GitHub MCP and return "blocked".
- Do not ask questions — either figure it out from the issue/code or mark as blocked.
- Always update GitHub labels and post comments at every state transition.
- Do NOT assume `gh` CLI or any external tools — only use `git` for git operations.

## Return
When done, summarize in one line:
- "completed: branch <name> pushed, all criteria met"
- "completed-with-review: branch <name> pushed, needs human review"
- "blocked: {reason}"
- "failed: {reason}"
```

### After the Loop — Session Summary

```
Autopilot session complete.

| # | Issue | Title | Result | Branch |
|---|-------|-------|--------|--------|
| 1 | #XX | <title> | completed | <branch> |
| 2 | #YY | <title> | blocked | — |
| 3 | #ZZ | <title> | completed | <branch> |

Processed: 3/5
Completed: 2
Blocked: 1
Failed: 0

Blocked issues need attention:
- #YY: <reason>
```

### Post session summary to GitHub

Create a comment on the first processed issue via GitHub MCP:

```
mcp__github__add_issue_comment(
  owner: <config.github.owner>,
  repo: <config.github.repo>,
  issue_number: <first issue number>,
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
- **GitHub is the log** — every action is posted to GitHub, so the PM can follow along.
- **Human can intervene** — the PM can close issues or remove labels to stop processing.
- **Conservative defaults** — max 5 issues, no label filter means it picks any todo issue. Recommend using a label filter in practice.
