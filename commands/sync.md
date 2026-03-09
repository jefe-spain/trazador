---
name: trazador:sync
description: Sync Linear issue state — update status, post comments, link artifacts automatically
argument-hint: "[Linear issue ID] [event type]"
---

# Trazador Sync — Keep Linear in Sync with Agent Actions

Automatically update Linear whenever an agent performs a meaningful state transition.

**This command is called by other trazador commands internally**, but can also be invoked manually to reconcile state.

## Input

<sync_input> #$ARGUMENTS </sync_input>

**Parse the input for:**
- `issue_id` — the Linear issue ID (e.g., CON-42)
- `event` — what happened (see Event Types below)

**If empty, run in reconciliation mode** (see Phase 3).

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (team, project, statuses).
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Event Types

| Event | Triggered by | Linear Update |
|-------|-------------|---------------|
| `plan_created` | /trazador:plan | New issue created in Todo |
| `work_started` | /trazador:work Phase 3 | Status -> In Progress, start comment |
| `progress` | /trazador:work Phase 4 | Comment with commit summary |
| `work_complete` | /trazador:work Phase 6 | Status -> In Review, link PR, completion comment |
| `review_passed` | /trazador:review (APPROVE) | Status -> Done, review comment |
| `review_failed` | /trazador:review (REQUEST CHANGES) | Status stays In Review, findings comment |
| `blocked` | Any command | Comment explaining blocker |
| `note` | Manual | Freeform comment on the issue |

## Execution Flow

### Phase 1: Validate Issue

1. Fetch the issue to confirm it exists and get current state:
   ```
   mcp__linear-server__get_issue(id: <issue_id>)
   ```

2. Verify the issue belongs to the configured project and team (from `.trazador/config.yaml`).

### Phase 2: Apply Event

Based on the event type, use statuses from `config.linear.statuses.*`:

#### `plan_created`
Already handled by /trazador:plan — no additional sync needed.

#### `work_started`
```
mcp__linear-server__save_issue(id: <issue_id>, state: <config.linear.statuses.in_progress>)
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Work Started\n\nBranch: `<branch>`\nAgent: Claude Code\nStarted: <timestamp>"
)
```

#### `progress`
```
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Progress Update\n\n<commit_summary>\n\nFiles changed:\n- <file list>"
)
```

#### `work_complete`
```
mcp__linear-server__save_issue(
  id: <issue_id>,
  state: <config.linear.statuses.in_review>,
  links: [{ url: "<pr_url>", title: "PR: <pr_title>" }]
)
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Work Complete\n\nPR: <pr_url>\n\n### Acceptance Criteria\n<checked list>\n\nReady for: `/trazador:review <issue_id>`"
)
```

#### `review_passed`
```
mcp__linear-server__save_issue(id: <issue_id>, state: <config.linear.statuses.done>)
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Review Passed\n\nAll acceptance criteria verified.\nPR approved and ready to merge.\n\nCompleted: <timestamp>"
)
```

#### `review_failed`
```
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Review: Changes Requested\n\n<findings summary>\n\nSee full review in previous comment."
)
```

#### `blocked`
```
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Blocked\n\n**Reason:** <blocker description>\n**Needs:** <what's needed to unblock>"
)
```

#### `note`
```
mcp__linear-server__save_comment(
  issueId: <issue_id>,
  body: "## Note\n\n<freeform content>"
)
```

### Phase 3: Reconciliation Mode (No Arguments)

When invoked without arguments, sync checks overall project health.

Read team and project from `.trazador/config.yaml`.

1. **Fetch active issues:**
   ```
   mcp__linear-server__list_issues(
     team: <config.linear.team_name>,
     project: <config.linear.project_name>,
     state: "started"
   )
   ```

2. **For each In Progress issue**, check:
   - Is there a branch for this issue? (`git branch -a | grep <issue-key>`)
   - Are there recent commits on that branch?
   - Is the branch ahead of main?

3. **For each In Review issue**, check:
   - Is there an open PR linked?
   - What's the PR status? (checks passing, review state)

4. **Report status:**
   ```
   Trazador Sync — Project <config.linear.project_name>

   In Progress:
   - ISSUE-XX: <title> — branch: <name>, <N> commits ahead of main
   - ISSUE-YY: <title> — WARNING: no branch found

   In Review:
   - ISSUE-ZZ: <title> — PR #N, checks: passing, review: approved

   Todo (ready for work):
   - ISSUE-AA: <title> (priority: High)
   - ISSUE-BB: <title> (priority: Normal)

   Stale (In Progress > 3 days without commits):
   - [none or list]
   ```

5. **Suggest next action:**
   - If stale issues exist: "ISSUE-XX hasn't had commits in 3 days. Continue with `/trazador:work ISSUE-XX` or update in Linear?"
   - If reviews are approved: "ISSUE-ZZ review passed. Ready to merge."
   - If todo items exist: "Next highest priority: ISSUE-AA. Start with `/trazador:work ISSUE-AA`?"

## Comment Formatting Rules

All trazador comments follow a consistent format:

1. **Always use H2 headers** (`##`) for the event type
2. **Always include timestamp** in UTC
3. **Always reference agent** (Claude Code / Codex)
4. **Use markdown tables** for structured data
5. **Keep comments concise** — max 500 words per comment
6. **Never duplicate** — check recent comments before posting similar content

## Guidelines

- **Idempotent** — running sync twice for the same event should not create duplicate comments
- **Non-destructive** — sync never moves an issue backwards (e.g., from In Review to In Progress)
- **Transparent** — every Linear update is logged as a comment
- **Lightweight** — sync should complete in seconds, not minutes
