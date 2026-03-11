---
name: trazador:sync
description: Sync GitHub issue state — update labels, post comments, track progress automatically
argument-hint: "[issue number] [event type]"
---

# Trazador Sync — Keep GitHub Issues in Sync with Agent Actions

Automatically update GitHub Issues whenever an agent performs a meaningful state transition.

**This command is called by other trazador commands internally**, but can also be invoked manually to reconcile state.

## Input

<sync_input> #$ARGUMENTS </sync_input>

**Parse the input for:**
- `issue_number` — the GitHub issue number (e.g., 42)
- `event` — what happened (see Event Types below)

**If empty, run in reconciliation mode** (see Phase 3).

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (owner, repo, labels).
   - If missing, tell the user: "Run `/trazador:init` first." and stop.

## Event Types

| Event | Triggered by | GitHub Update |
|-------|-------------|---------------|
| `plan_created` | /trazador:plan | New issue created with "todo" label |
| `work_started` | /trazador:work Phase 3 | Label → "in-progress", start comment |
| `progress` | /trazador:work Phase 4 | Comment with commit summary |
| `work_complete` | /trazador:work Phase 6 | Label → "in-review", completion comment |
| `review_passed` | /trazador:review (APPROVE) | Close issue, review comment |
| `review_failed` | /trazador:review (REQUEST CHANGES) | Keep open, findings comment |
| `blocked` | Any command | Comment explaining blocker |
| `note` | Manual | Freeform comment on the issue |

## Execution Flow

### Phase 1: Validate Issue

1. Fetch the issue to confirm it exists and get current state:
   ```
   mcp__github__get_issue(owner: <config.github.owner>, repo: <config.github.repo>, issue_number: <issue_number>)
   ```

2. Verify the issue belongs to the configured repository.

### Phase 2: Apply Event

Based on the event type, update labels from `config.github.labels.*`:

#### `plan_created`
Already handled by /trazador:plan — no additional sync needed.

#### `work_started`
```
mcp__github__update_issue(owner, repo, issue_number, labels: add "in-progress", remove "todo")
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Work Started\n\nBranch: `<branch>`\nAgent: Claude Code\nStarted: <timestamp>")
```

#### `progress`
```
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Progress Update\n\n<commit_summary>\n\nFiles changed:\n- <file list>")
```

#### `work_complete`
```
mcp__github__update_issue(owner, repo, issue_number, labels: add "in-review", remove "in-progress")
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Work Complete\n\nBranch: `<branch>`\n\n### Acceptance Criteria\n<checked list>\n\nReady for: `/trazador:review #XX`")
```

#### `review_passed`
```
mcp__github__update_issue(owner, repo, issue_number, state: "closed")
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Review Passed\n\nAll acceptance criteria verified.\nReady to merge.\n\nCompleted: <timestamp>")
```

#### `review_failed`
```
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Review: Changes Requested\n\n<findings summary>\n\nSee full review in previous comment.")
```

#### `blocked`
```
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Blocked\n\n**Reason:** <blocker description>\n**Needs:** <what's needed to unblock>")
```

#### `note`
```
mcp__github__add_issue_comment(owner, repo, issue_number,
  body: "## Note\n\n<freeform content>")
```

### Phase 3: Reconciliation Mode (No Arguments)

When invoked without arguments, sync checks overall project health.

Read owner and repo from `.trazador/config.yaml`.

1. **Fetch active issues:**
   ```
   mcp__github__list_issues(owner, repo, state: "open", labels: "in-progress")
   mcp__github__list_issues(owner, repo, state: "open", labels: "in-review")
   mcp__github__list_issues(owner, repo, state: "open", labels: "todo")
   ```

2. **For each in-progress issue**, check:
   - Is there a branch for this issue? (`git branch -a | grep <issue-number>`)
   - Are there recent commits on that branch?
   - Is the branch ahead of main?

3. **For each in-review issue**, check:
   - Does a branch exist and is it pushed?
   - Are there recent commits since the "in-review" label was added?

4. **Report status:**
   ```
   Trazador Sync — <owner>/<repo>

   In Progress:
   - #XX: <title> — branch: <name>, <N> commits ahead of main
   - #YY: <title> — WARNING: no branch found

   In Review:
   - #ZZ: <title> — branch pushed, awaiting review

   Todo (ready for work):
   - #AA: <title>
   - #BB: <title>

   Stale (in-progress > 3 days without commits):
   - [none or list]
   ```

5. **Suggest next action:**
   - If stale issues exist: "#XX hasn't had commits in 3 days. Continue with `/trazador:work #XX` or update on GitHub?"
   - If reviews are waiting: "#ZZ is in review. Ready to check with `/trazador:review #ZZ`?"
   - If todo items exist: "Next up: #AA. Start with `/trazador:work #AA`?"

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
- **Non-destructive** — sync never re-opens a closed issue or removes labels unexpectedly
- **Transparent** — every GitHub update is logged as a comment
- **Lightweight** — sync should complete in seconds, not minutes
