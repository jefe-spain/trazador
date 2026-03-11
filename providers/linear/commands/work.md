---
name: trazador:work
description: Pick up a Linear issue and implement it — branch, code, test, PR, sync
argument-hint: "[Linear issue ID, e.g. CON-42]"
---

# Trazador Work — Execute a Linear Issue

Pick up a Linear issue, implement it, and ship a PR. All context comes from Linear.

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which Linear issue should I work on? Provide the issue ID (e.g., CON-42)."

Do not proceed without an issue ID.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 1: Load Context from Linear

1. **Fetch the issue** using `mcp__linear-server__get_issue` with `includeRelations: true`
2. **Fetch comments** using `mcp__linear-server__list_comments` for planning notes and prior context
3. **If parent issue**, also fetch sub-issues using `mcp__linear-server__list_issues` with `parentId`
4. **Read the issue thoroughly** — description IS the spec. Comments are context.

**Extract from the issue:**
- Goal (what to achieve)
- Acceptance criteria (checkboxes)
- Approach (what to change where)
- Out of scope (what NOT to do)
- Technical notes (if any)

**If the issue lacks acceptance criteria or a clear approach:**
Use **AskUserQuestion**: "This issue doesn't have clear acceptance criteria. Should I proceed with my interpretation, or would you like to update the issue first?"

### Phase 2: Plan & Confirm

1. **Quick repo research** — read the files referenced in the issue's approach section
2. **Create a brief execution plan** (not written anywhere — just communicated):
   ```
   I'll work on ISSUE-XX: <title>

   Steps:
   1. <what I'll do first>
   2. <what I'll do next>
   3. <tests I'll write>

   Files I'll touch:
   - path/to/file.ts (modify: reason)
   - path/to/new-file.ts (create: reason)

   Questions: [any, or "None — proceeding"]
   ```
3. **Get user confirmation** before starting implementation

### Phase 3: Setup Environment

1. **Update Linear status** — move to "In Progress":
   ```
   mcp__linear-server__save_issue(id: <issue_id>, state: <config.linear.statuses.in_progress>)
   ```

2. **Post start comment** on the issue:
   ```
   mcp__linear-server__save_comment(issueId: <issue_id>, body: "## Work Started\n\nBranch: `<branch_name>`\nAgent: Claude Code\nStarted: YYYY-MM-DD HH:MM UTC")
   ```

3. **If epic (has sub-issues)** — discover sub-issues (but don't transition them yet):
   - Fetch sub-issues: `mcp__linear-server__list_issues` with `parentId: <issue_id>`
   - Store their IDs and titles for tracking throughout the workflow
   - Do NOT move sub-issues to "In Progress" here — each sub-issue transitions only when you start working on it (see Phase 4)

4. **Create branch** from the Linear-suggested branch name (available in issue data) or generate one:
   ```bash
   git checkout main && git pull origin main
   git checkout -b <branch_name>
   ```
   Branch naming: use the Linear-provided `branchName` field if available, otherwise `<issue-key-lowercase>/<short-description>`.

### Phase 4: Implement

**Task execution loop:**

**If epic (has sub-issues)** — loop over sub-issues instead of individual criteria:

```
For each sub-issue:
  1. Move this sub-issue to "In Progress":
     mcp__linear-server__save_issue(id: <sub_issue_id>, state: <config.linear.statuses.in_progress>)
     mcp__linear-server__save_comment(issueId: <sub_issue_id>, body: "## Work Started\n\nBranch: `<branch_name>`\nAgent: Claude Code\nParent: <issue_id>")
  2. Read the sub-issue description and acceptance criteria
  3. For each acceptance criterion in this sub-issue:
     a. Read referenced files from the issue approach
     b. Look for similar patterns in codebase (grep/glob)
     c. Implement following existing conventions
     d. Write tests for new functionality
     e. Run tests after changes
  4. Commit when the sub-issue's work is complete
  5. Move this sub-issue to "In Review":
     mcp__linear-server__save_issue(id: <sub_issue_id>, state: <config.linear.statuses.in_review>)
  6. Post a progress comment on the sub-issue:
     mcp__linear-server__save_comment(issueId: <sub_issue_id>, body: "## Implementation Complete\n\n### Changes\n- <file>: <what changed>\n\n### Criteria Met\n- [x] ...")
  7. Continue to the next sub-issue
```

Sub-issues transition independently: a sub-issue moves to "In Review" as soon as its work is committed, even while other sub-issues are still "In Progress".

**If regular issue (no sub-issues)** — loop over acceptance criteria:

```
For each acceptance criterion:
  1. Read referenced files from the issue approach
  2. Look for similar patterns in codebase (grep/glob)
  3. Implement following existing conventions
  4. Write tests for new functionality
  5. Run tests after changes
  6. Commit when a logical unit is complete
```

**Commit guidelines:**
- Commit after each logical unit (not at the end)
- Use conventional commit messages: `feat(scope): description`, `fix(scope): description`
- Reference the issue: `feat(agents): add template selector (ISSUE-XX)`
- Don't commit if tests are failing
- Stage specific files, not `git add .`

**System-Wide Test Check** — before marking any unit done, ask:

| Question | Action |
|----------|--------|
| What fires when this runs? (callbacks, middleware, hooks) | Trace 2 levels out from your change |
| Do my tests exercise the real chain? | At least one integration test with real objects |
| Can failure leave orphaned state? | Test the failure path |
| What other interfaces expose this? | Grep for the behavior in related classes |

**When to skip the check:** Leaf-node changes with no callbacks, no state persistence, no parallel interfaces.

**Follow existing patterns:**
- Read AGENTS.md constraints
- Match naming conventions exactly
- Reuse existing components
- Don't over-engineer — simplest path to acceptance criteria

### Phase 5: Quality Check

1. **Run the project's test suite** (discover the test commands from package.json, Makefile, or similar)
2. **Run type checking** if the project uses TypeScript or similar
3. **Verify all acceptance criteria** — check each one explicitly:

   **If epic (has sub-issues)** — verify per sub-issue:
   ```
   Sub-issue ISSUE-31 (<title>):
     - [x] Criterion 1 — verified by: <how>
     - [x] Criterion 2 — verified by: <how>

   Sub-issue ISSUE-32 (<title>):
     - [x] Criterion 1 — verified by: <how>
     - [ ] Criterion 2 — NOT MET: <why>
   ```

   **If regular issue (no sub-issues):**
   ```
   Acceptance Criteria Verification:
   - [x] Criterion 1 — verified by: <how>
   - [x] Criterion 2 — verified by: <how>
   - [ ] Criterion 3 — NOT MET: <why>
   ```

4. **If any criterion is not met**, fix it before proceeding. If it can't be met, use **AskUserQuestion** to discuss.

### Phase 6: Ship It

1. **If epic (has sub-issues)** — sweep all sub-issues before creating the PR:
   - Any sub-issues still in "In Progress" should be moved to "In Review":
     ```
     mcp__linear-server__save_issue(id: <sub_issue_id>, state: <config.linear.statuses.in_review>)
     ```

2. **Create PR:**
   ```bash
   git push -u origin <branch_name>
   ```

   PR title: `<type>(<scope>): <description> (ISSUE-XX)`

   PR body structure:
   ```markdown
   ## Summary

   Resolves [ISSUE-XX](linear-url)

   - What was built
   - Why (link to Linear issue goal)

   ## Acceptance Criteria

   - [x] Criterion 1
   - [x] Criterion 2

   ## Sub-Issues (if epic)

   | Sub-Issue | Title | Status |
   |-----------|-------|--------|
   | ISSUE-31 | <title> | In Review |
   | ISSUE-32 | <title> | In Review |

   ## Testing

   - Tests added/modified
   - Manual verification performed

   ## Post-Deploy Monitoring & Validation

   - What to monitor
   - Expected healthy behavior
   - Failure signals

   ---
   Generated with [Claude Code](https://claude.com/claude-code)
   ```

3. **Update Linear — move to "In Review":**
   ```
   mcp__linear-server__save_issue(id: <issue_id>, state: <config.linear.statuses.in_review>)
   ```

4. **Post completion comment** on the issue:
   ```
   mcp__linear-server__save_comment(issueId: <issue_id>, body: "## Work Complete\n\nPR: <pr_url>\n\n### Acceptance Criteria\n- [x] ...\n\n### Sub-Issues\n| Sub-Issue | Title | Status |\n|-----------|-------|--------|\n| ISSUE-31 | <title> | In Review |\n\n### Changes\n- <file>: <what changed>\n\nReady for: `/trazador:review ISSUE-XX`")
   ```

5. **If epic (has sub-issues)** — post completion comment on each sub-issue:
   ```
   mcp__linear-server__save_comment(issueId: <sub_issue_id>, body: "## Work Complete\n\nPR: <pr_url>\nParent: ISSUE-XX\n\nAll criteria implemented. Awaiting review.")
   ```

6. **Link PR to issue:**
   ```
   mcp__linear-server__save_issue(id: <issue_id>, links: [{ url: "<pr_url>", title: "PR: <pr_title>" }])
   ```

7. **Present to user:**
   ```
   Work complete on ISSUE-XX: <title>

   PR: <pr_url>
   All acceptance criteria met.

   Sub-issues: [list with status if epic]

   Next: /trazador:review ISSUE-XX
   ```

## Key Principles

- **The issue IS the spec** — don't invent requirements. If it's not in the issue, it's out of scope.
- **Simplest path** — meet acceptance criteria with minimum code. No extras.
- **Test as you go** — run tests after each change, not at the end.
- **Commit incrementally** — small, logical commits that tell a story.
- **Keep Linear updated** — status changes and comments at every phase transition.
- **Ask early** — if something is unclear, ask now. Don't build the wrong thing.
