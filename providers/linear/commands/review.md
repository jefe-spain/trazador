---
name: trazador:review
description: Goal-aligned review — validate implementation against the Linear issue spec, then run technical review
argument-hint: "[Linear issue ID, e.g. CON-42]"
---

# Trazador Review — Goal-Aligned Code Review

Validate that the implementation matches the original Linear issue spec, then run curated technical review agents.

**This is NOT just a code review.** It answers: "Did we build what we said we'd build, and did we build it well?"

## Input

<issue_id> #$ARGUMENTS </issue_id>

**If empty, ask:** "Which Linear issue should I review? Provide the issue ID (e.g., CON-42)."

Do not proceed without an issue ID.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants.
   - If missing, tell the user: "Run `/trazador:init` first." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 1: Gather All Context

Run these in parallel:

1. **Fetch the Linear issue** — `mcp__linear-server__get_issue` with `includeRelations: true`
2. **Fetch issue comments** — `mcp__linear-server__list_comments` for planning notes and work log
3. **Get the code changes** — determine the branch from issue data or comments, then:
   ```bash
   git fetch origin
   git diff main...<branch_name>
   ```

**Extract the review contract:**
- Original **Goal** from the issue
- **Acceptance Criteria** (the checklist)
- **Out of Scope** boundaries
- **Approach** that was specified
- **PR changes** (the actual diff)

### Phase 2: Goal Alignment Review

This is the unique value of trazador:review — it validates **intent**, not just code.

**For each acceptance criterion from the issue:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Criterion 1 text | MET / NOT MET / PARTIAL | File:line that proves it, or what's missing |
| Criterion 2 text | MET / NOT MET / PARTIAL | ... |

**Scope boundary check:**

| Check | Pass/Fail |
|-------|-----------|
| Does the PR include changes NOT covered by the spec? | List any extras |
| Does the PR miss anything FROM the spec? | List any gaps |
| Were Out of Scope boundaries respected? | List any violations |
| Does the approach match what was specified? | Note deviations |

**Goal integrity verdict:**

One of:
- **ALIGNED** — All criteria met, scope respected, approach followed
- **PARTIAL** — Some criteria unmet or scope deviations (list them)
- **MISALIGNED** — Significant gaps or the wrong thing was built

### Phase 3: Technical Review

Run **3 self-contained review agents in parallel** using the Agent tool. No external plugin dependencies — all prompts are inline.

Launch all 3 agents simultaneously:

**1. Security Auditor:**

```
Agent(
  subagent_type: "general-purpose",
  description: "Security audit for <issue_id>",
  prompt: "
    You are a security auditor reviewing a pull request.

    Run `git diff main...HEAD` to get the code changes.

    Check for:
    1. Injection vulnerabilities (SQL, command, XSS, template)
    2. Authentication/authorization gaps (missing auth checks, privilege escalation)
    3. Input validation (untrusted data used without validation)
    4. Secrets/credentials (hardcoded keys, tokens, passwords)
    5. Data exposure (sensitive data in logs, error messages, API responses)
    6. Insecure dependencies (known vulnerable patterns)

    For each finding:
    - Severity: P1 (exploitable) / P2 (potential risk) / P3 (hardening)
    - File and line number
    - What the vulnerability is
    - How to fix it

    If no security issues found, state 'No security findings.'
  "
)
```

**2. Quality Reviewer:**

```
Agent(
  subagent_type: "general-purpose",
  description: "Quality review for <issue_id>",
  prompt: "
    You are a code quality reviewer. Review this PR for three concerns.

    Run `git diff main...HEAD` to get the code changes.
    Read 2-3 existing files in the same directory as the changes to understand codebase patterns.

    ## 1. Pattern Conformance
    - Does new code match existing patterns in the codebase?
    - Naming conventions, file organization, error handling style
    - Flag deviations from established patterns

    ## 2. Simplicity (YAGNI)
    - Is anything over-engineered for the stated acceptance criteria?
    - Are there abstractions that aren't needed yet?
    - Could any part be simpler while still meeting the spec?

    ## 3. Performance
    - N+1 query patterns
    - Missing database indexes for new queries
    - Unnecessary memory allocation or computation
    - Blocking operations that could be async

    For each finding:
    - Severity: P1 (will cause problems) / P2 (should fix) / P3 (suggestion)
    - File and line number
    - What the issue is
    - How to fix it

    If no issues found in a category, state 'No findings.'
  "
)
```

**3. Acceptance Verifier:**

```
Agent(
  subagent_type: "general-purpose",
  description: "Verify acceptance criteria for <issue_id>",
  prompt: "
    You are an independent acceptance criteria verifier. You did NOT write this code.

    Original acceptance criteria (from Linear issue):
    <paste all acceptance criteria here>

    Run `git diff main...HEAD` to get the code changes.

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

### Phase 4: Synthesize Findings

Combine goal alignment and technical review into a single report.

**Categorize findings:**

| Severity | Meaning | Action |
|----------|---------|--------|
| P1 CRITICAL | Blocks merge — goal misalignment, security vuln, data loss risk | Must fix |
| P2 IMPORTANT | Should fix — missing test, pattern violation, performance issue | Fix before merge |
| P3 SUGGESTION | Nice to have — style, naming, minor simplification | Optional |

**Report structure:**

```markdown
## Trazador Review: ISSUE-XX

### Goal Alignment: [ALIGNED / PARTIAL / MISALIGNED]

#### Acceptance Criteria
| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | ... | MET | file:line |
| 2 | ... | MET | file:line |

#### Scope Check
- Extra changes: [none / list]
- Missing items: [none / list]
- Out of scope violations: [none / list]

### Technical Findings

#### P1 CRITICAL (blocks merge)
- [finding or "None"]

#### P2 IMPORTANT (fix before merge)
- [findings]

#### P3 SUGGESTION (optional)
- [findings]

### Verdict: [APPROVE / REQUEST CHANGES / DISCUSS]

[1-2 sentence summary of the overall assessment]
```

### Phase 5: Post to Linear & Handoff

1. **Post the review as a Linear comment:**
   ```
   mcp__linear-server__save_comment(issueId: <issue_id>, body: <review report>)
   ```

2. **Update issue based on verdict:**

   | Verdict | Linear Action |
   |---------|--------------|
   | APPROVE | State -> <config.linear.statuses.done>, comment: "Review passed. Ready to merge." |
   | REQUEST CHANGES | State stays <config.linear.statuses.in_review>, comment lists what to fix |
   | DISCUSS | State stays <config.linear.statuses.in_review>, comment flags points for PM decision |

3. **If APPROVE:**
   - Tell the user: "Review passed. PR is ready to merge."

4. **If APPROVE and epic (has sub-issues)** — move all sub-issues to "Done":
   - Fetch sub-issues: `mcp__linear-server__list_issues` with `parentId: <issue_id>`
   - For each sub-issue:
     ```
     mcp__linear-server__save_issue(id: <sub_issue_id>, state: <config.linear.statuses.done>)
     mcp__linear-server__save_comment(issueId: <sub_issue_id>, body: "## Review Passed\n\nParent ISSUE-XX approved. Moving to Done.\nPR: <pr_url>")
     ```

5. **If REQUEST CHANGES:**
   - Tell the user: "Changes required — see findings above."

6. **Present to user:**
   ```
   Review complete for ISSUE-XX: <title>

   Goal: [ALIGNED / PARTIAL / MISALIGNED]
   Verdict: [APPROVE / REQUEST CHANGES / DISCUSS]

   P1: [count] | P2: [count] | P3: [count]

   Sub-issues: [list with final status if epic]

   [If REQUEST CHANGES: list the P1/P2 items]

   Full review posted to Linear.
   ```

## Important Guidelines

- **Goal alignment comes FIRST** — before any code quality review. The best-written code that solves the wrong problem is a failure.
- **Use the issue as the contract** — don't invent criteria that weren't in the spec.
- **Be specific** — every finding must reference a file:line and explain why.
- **P1 means P1** — only use it for things that genuinely block: security, data loss, goal misalignment. Bad variable names are P3.
- **Post everything to Linear** — the review must be durable, not just in the conversation.
