---
name: trazador:discovery
description: Analyze project state vs Linear, find gaps, and help define scope through creative dialogue
argument-hint: "[focus area or question, e.g. 'what should we build next?' or 'backend API gaps']"
---

# Trazador Discovery — Project Reality Check & Scope Definition

Ground your project planning in reality. Discovery cross-references what exists in code against what's tracked in Linear, surfaces gaps, and helps you define or refine your project scope through creative dialogue.

**This is NOT brainstorming from scratch** — it starts from what you actually have and what's actually planned, then builds forward.

## Input

<discovery_input> #$ARGUMENTS </discovery_input>

**If a focus area is provided**, narrow the analysis to that domain (e.g., "backend API", "auth flow", "frontend dashboard").

**If empty**, run a full-spectrum discovery.

## Pre-flight

1. Read `.trazador/config.yaml` for workspace constants (team, project, statuses, labels).
   - If missing, tell the user: "Run `/trazador:init` first to configure your workspace." and stop.
2. Load the `trazador` skill for workflow conventions.

## Execution Flow

### Phase 1: Scan the Codebase (What Exists)

Use the **Explore agent** (subagent_type=Explore) in parallel for each domain:

**Backend scan:**
- Routes and endpoints (paths, methods, what they do)
- Database models/schema (tables, columns, relationships)
- Services and business logic
- Applied migrations vs. pending migrations
- External integrations (APIs, SDKs, webhooks)
- Test coverage (what's tested, what's not)
- Configuration and environment variables

**Frontend scan:**
- Pages and routes
- Components (shared, page-specific)
- API client calls (what endpoints does the frontend consume?)
- Auth flow and protected routes
- State management patterns

**Infrastructure scan:**
- Deployment config (Docker, CI/CD, hosting)
- Environment management (dev, staging, prod)
- Monitoring and logging setup

**Produce a structured inventory:**

```
## Codebase Inventory

### Backend
- Endpoints: [list with status: implemented/stub/broken]
- Models: [list with column counts]
- Services: [list with purpose]
- Migrations: [applied count / pending count]
- Tests: [count, coverage areas]
- Integrations: [list with status]

### Frontend
- Pages: [list with route paths]
- Components: [count, shared vs page-specific]
- API calls: [list what frontend expects from backend]

### Infrastructure
- Deployment: [configured/not configured]
- CI/CD: [configured/not configured]
- Environments: [list]
```

### Phase 2: Scan Linear (What's Planned)

Read team and project from `.trazador/config.yaml`, then fetch all issues:

```
mcp__linear-server__list_issues(team: <config.linear.team_name>, project: <config.linear.project_name>)
```

For each issue, note:
- ID, title, status, priority, labels
- Whether it has acceptance criteria
- Whether it has sub-issues

**Produce a structured inventory:**

```
## Linear Inventory

### By Status
- Done: [count] — [titles]
- In Review: [count] — [titles]
- In Progress: [count] — [titles]
- Todo: [count] — [titles]
- Backlog: [count] — [titles]

### Coverage
- Total issues: N
- With acceptance criteria: N
- With sub-issues: N
```

### Phase 3: Cross-Reference & Gap Analysis

Compare the two inventories to find:

**1. Code without issues (untracked work)**
- Features in code that have no corresponding Linear issue
- These might be: completed work from before Linear, ad-hoc fixes, legacy code

**2. Issues without code (planned but not started)**
- Linear issues in Todo/Backlog that have no corresponding code
- Check if acceptance criteria are clear enough to start work

**3. Stale or orphaned items**
- Issues marked "Done" but code doesn't reflect it
- Code that references deprecated patterns or removed features
- Branches without linked issues

**4. Integration gaps**
- Frontend expects endpoints that don't exist in backend
- Backend has endpoints that frontend doesn't consume
- External service integrations that are partially implemented

**5. Quality gaps**
- Untested critical paths
- Missing error handling on external boundaries
- No deployment or CI configuration
- Missing environment variable documentation

**Present findings as a gap report:**

```
## Gap Analysis

### Untracked Code (exists but no Linear issue)
- [item]: [description, risk level]

### Planned but Missing (Linear issue but no code)
- [ISSUE-XX]: [title, status, what's needed]

### Integration Mismatches
- [description of mismatch]

### Quality Gaps
- [gap]: [impact, severity]
```

### Phase 4: Creative Scope Dialogue

This is the **interactive and creative** phase. Based on the gap analysis, engage the user in a structured conversation.

**Use AskUserQuestion — one question at a time.**

**Conversation strategy depends on the user's situation:**

#### Situation A: User has a clear roadmap but gaps exist
- Present the gaps prioritized by impact
- Ask: "Which of these gaps are most important to address next?"
- Help refine each gap into a concrete feature or fix
- Suggest grouping related gaps into milestones

#### Situation B: User is unsure what to build next
- Summarize what exists and what's working
- Identify the **highest-leverage missing pieces** — what would unlock the most value?
- Propose 3-5 concrete directions with trade-offs:
  ```
  Based on what you have, here are the highest-impact next steps:

  1. **[Direction A]** — [what it enables, effort level]
  2. **[Direction B]** — [what it enables, effort level]
  3. **[Direction C]** — [what it enables, effort level]

  Which resonates? Or is there something else on your mind?
  ```
- Be creative — suggest features the user might not have thought of based on the codebase patterns

#### Situation C: User wants to reassess the whole project
- Present a "project health score" based on:
  - Feature completeness (what % of a usable product exists?)
  - Code quality (tests, types, error handling)
  - Deployment readiness (can it ship?)
  - Documentation (can someone else understand it?)
- Identify the **critical path to MVP** — what's the minimum needed to deliver value?
- Help the user distinguish between must-have, should-have, and nice-to-have
- Challenge assumptions: "You have X in the codebase but no issue for it — is this still relevant?"

#### Situation D: User provides a specific focus area
- Deep-dive into that area only
- Show what exists, what's missing, and what adjacent features would be needed
- Propose a mini-roadmap for that area

**Creative prompting techniques:**

- "If a user tried to [use case] right now, what would break?"
- "What's the one feature that would make this product useful to real users?"
- "Looking at your integrations, have you considered [complementary feature]?"
- "Your data model supports X but you're not using it yet — is that intentional?"

### Phase 5: Capture Outcomes

Based on the dialogue, help the user decide what to do next:

**Option 1: Create Linear issues immediately**
- For each agreed-upon gap or feature, offer to run `/trazador:plan` inline
- Or create lightweight placeholder issues directly:
  ```
  mcp__linear-server__save_issue(
    team: <config.linear.team_name>,
    project: <config.linear.project_name>,
    title: "<type>: <description>",
    description: "Discovered via /trazador:discovery on YYYY-MM-DD.\n\n<brief context>",
    state: <config.linear.statuses.backlog>,
    labels: [<appropriate label>]
  )
  ```

**Option 2: Defer to separate planning sessions**
- List the agreed outcomes clearly:
  ```
  Discovery complete. Agreed next steps:

  1. [Feature/fix] — run /trazador:plan to define
  2. [Feature/fix] — run /trazador:plan to define
  3. [Quality improvement] — can be done as chore

  Run /trazador:plan "<description>" to start planning any of these.
  ```

**Option 3: Post a discovery summary to Linear**
- Create a single "discovery note" comment on a tracking issue:
  ```
  mcp__linear-server__save_comment(
    issueId: <tracking issue or first relevant issue>,
    body: "## Discovery Summary — YYYY-MM-DD\n\n<findings summary>\n\n### Agreed Next Steps\n<list>"
  )
  ```

### Phase 6: Summary

Present the final state:

```
Discovery complete.

Codebase: [N endpoints, M models, K pages]
Linear:   [X issues total, Y in progress, Z todo]
Gaps found: [N significant gaps]
Actions taken: [created N issues / deferred to planning / posted summary]

Suggested next:
- /trazador:plan "<highest priority gap>"
- /trazador:work ISSUE-XX (if ready issues exist)
```

## Important Guidelines

- **NEVER write code** — discovery only analyzes and plans
- **NEVER create local files** — outcomes go to Linear or stay as conversation
- **Ground in reality** — every suggestion must reference actual code or actual issues
- **Be creative but practical** — suggest features based on what the codebase can support, not fantasies
- **One question at a time** — never overwhelm with multiple questions
- **Respect the user's pace** — if they want to stop early, capture what you have and exit cleanly
- **No scope creep** — help the user say "no" to things that don't matter right now
- **Effort honesty** — don't underestimate effort. If something is hard, say so.
- **Focus area respect** — if the user gave a focus area, stay within it. Don't expand to a full audit unless asked.
