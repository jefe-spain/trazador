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

1. **Deep repo research** — load the `trazador-research` skill and follow its methodology:
   - **File Mapping**: Read every file in the Approach section. Extract patterns, naming, error handling, test patterns.
   - **Reuse Discovery**: Search for existing utilities, helpers, base classes, and types to reuse.
   - **Convention Extraction**: Read 2-3 similar files to establish conventions.
   - **Implementation Brief**: For each criterion, map: where to implement, what pattern to follow, what to reuse, where to test.
   - Skip if the issue's Approach already contains specific `file:line` references with pattern descriptions.
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

**If regular issue (no sub-issues)** — load the `trazador-tdd` skill and follow its adaptive methodology:

```
Step 1: Detect test framework (jest, vitest, pytest, rspec, go test, etc.)
  - If no framework: skip TDD, implement directly, verify manually in Phase 5

Step 2 (if framework exists): For each acceptance criterion:
  a. RED — Write a failing test from the criterion (follow project test conventions)
  b. Run tests — confirm failure for the right reason
  c. GREEN — Implement minimum code to pass the test
  d. Run tests — confirm pass
  e. REFACTOR — clean up if needed (keep tests green)
  f. Commit when a logical unit is complete

Step 2 (if no framework): For each acceptance criterion:
  a. Read referenced files from the issue approach
  b. Look for similar patterns in codebase (grep/glob)
  c. Implement following existing conventions
  d. Commit when a logical unit is complete
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
3. **Independent Acceptance Verification** — spawn an Acceptance Verifier agent to check criteria with a fresh perspective (prevents self-grading bias):

   ```
   Agent(
     subagent_type: "general-purpose",
     description: "Verify acceptance criteria for <issue_id>",
     prompt: "
       You are an independent acceptance criteria verifier. You did NOT write this code.

       Original acceptance criteria (from Linear issue):
       <paste all acceptance criteria here>

       Review the code changes by running: git diff main...HEAD

       For each criterion:
       1. Read the criterion carefully
       2. Search the diff for evidence that it's implemented
       3. Verify edge cases mentioned in the criterion are handled
       4. Check if tests exist that exercise this criterion

       Report per criterion:
       - PASS: Implemented with evidence (cite file:line)
       - FAIL: Not implemented or incomplete (explain what's missing)
       - PARTIAL: Partially implemented (explain the gap)

       If any criterion is FAIL, list exactly what code changes are needed to fix it.
     "
   )
   ```

4. **If the verifier reports any FAIL criteria**, fix them before proceeding. If a criterion can't be met, use **AskUserQuestion** to discuss.

### Phase 6: Ship It

1. **If epic (has sub-issues)** — sweep all sub-issues before creating the PR:
   - Any sub-issues still in "In Progress" should be moved to "In Review":
     ```
     mcp__linear-server__save_issue(id: <sub_issue_id>, state: <config.linear.statuses.in_review>)
     ```

2. **Push and create PR:**
   ```bash
   git push -u origin <branch_name>
   ```

   After pushing, tell the user the branch is ready and provide a PR creation link. Do NOT assume `gh` CLI or any external tools are installed — only use `git`.

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
