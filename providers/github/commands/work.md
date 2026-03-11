---
name: trazador:work
description: Pick up a GitHub issue and implement it — branch, code, test, PR, sync
argument-hint: "[GitHub issue number, e.g. #42 or 42]"
---

# Trazador Work — Execute a GitHub Issue

Pick up a GitHub issue, implement it, and ship a PR. All context comes from GitHub.

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which GitHub issue should I work on? Provide the issue number (e.g., 42 or #42)."

Do not proceed without an issue number.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 1: Load Context from GitHub

1. **Fetch the issue** via GitHub MCP: `mcp__github__get_issue(owner, repo, issue_number)`
2. **Fetch comments** via GitHub MCP for planning notes and prior context
3. **If parent issue** (has task list with sub-issue references), fetch those sub-issues too
4. **Read the issue thoroughly** — the body IS the spec. Comments are context.

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
   I'll work on #XX: <title>

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

1. **Update labels** — add "in-progress", remove "todo" via GitHub MCP:
   ```
   mcp__github__update_issue(owner, repo, issue_number, labels: add "in-progress", remove "todo")
   ```

2. **Post start comment** on the issue via GitHub MCP:
   ```
   mcp__github__add_issue_comment(owner, repo, issue_number,
     body: "## Work Started\n\nBranch: `<branch_name>`\nAgent: Claude Code\nStarted: YYYY-MM-DD HH:MM UTC")
   ```

3. **Create branch:**
   ```bash
   git checkout main && git pull origin main
   git checkout -b <issue-number>/<short-description>
   ```

### Phase 4: Implement

Load the `trazador-tdd` skill and follow its adaptive methodology:

**If parent issue (has sub-issues via task list)** — loop over sub-issues:

```
For each sub-issue:
  1. Update sub-issue labels: add "in-progress" via GitHub MCP
  2. Post start comment on sub-issue via GitHub MCP
  3. Read the sub-issue description and acceptance criteria
  4. For each acceptance criterion in this sub-issue:
     a. Detect test framework (first iteration only)
     b. If framework: RED (failing test) → GREEN (implement) → REFACTOR
     c. If no framework: implement directly following conventions
     d. Run tests after changes
  5. Commit when the sub-issue's work is complete
  6. Update sub-issue labels: add "in-review", remove "in-progress" via GitHub MCP
  7. Post progress comment on sub-issue via GitHub MCP
  8. Continue to the next sub-issue
```

Sub-issues transition independently: a sub-issue gets "in-review" as soon as its work is committed, even while other sub-issues are still "in-progress".

**If regular issue (no sub-issues):**

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
- Use conventional commit messages: `feat(scope): description (#XX)`
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
     description: "Verify acceptance criteria for #XX",
     prompt: "
       You are an independent acceptance criteria verifier. You did NOT write this code.

       Original acceptance criteria (from GitHub issue):
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

1. **If parent issue (has sub-issues)** — sweep all sub-issues before shipping:
   - Any sub-issues still labeled "in-progress" should get "in-review" via GitHub MCP

2. **Push the branch:**
   ```bash
   git push -u origin <branch_name>
   ```

   After pushing, tell the user the branch is ready and provide a PR creation link. Do NOT assume `gh` CLI or any external tools are installed — only use `git`.

   PR title: `<type>(<scope>): <description> (#XX)`

   PR body structure:
   ```markdown
   ## Summary

   Closes #XX

   - What was built
   - Why (link to GitHub issue goal)

   ## Acceptance Criteria

   - [x] Criterion 1
   - [x] Criterion 2

   ## Sub-Issues (if parent)

   | Sub-Issue | Title | Status |
   |-----------|-------|--------|
   | #YY | <title> | in-review |
   | #ZZ | <title> | in-review |

   ## Testing

   - Tests added/modified
   - Manual verification performed

   ---
   Generated with [Claude Code](https://claude.com/claude-code)
   ```

3. **Update labels** — add "in-review", remove "in-progress" via GitHub MCP

4. **Post completion comment** on the issue via GitHub MCP:
   ```
   mcp__github__add_issue_comment(owner, repo, issue_number,
     body: "## Work Complete\n\nBranch: `<branch_name>`\n\n### Acceptance Criteria\n- [x] ...\n\n### Changes\n- <file>: <what changed>\n\nReady for: `/trazador:review #XX`")
   ```

5. **Present to user:**
   ```
   Work complete on #XX: <title>

   Branch: <branch_name> (pushed)
   All acceptance criteria met.

   Sub-issues: [list with status if parent]

   Next: /trazador:review #XX
   ```

## Key Principles

- **The issue IS the spec** — don't invent requirements. If it's not in the issue, it's out of scope.
- **Simplest path** — meet acceptance criteria with minimum code. No extras.
- **Test as you go** — run tests after each change, not at the end.
- **Commit incrementally** — small, logical commits that tell a story.
- **Keep GitHub updated** — label changes and comments at every phase transition.
- **Ask early** — if something is unclear, ask now. Don't build the wrong thing.
