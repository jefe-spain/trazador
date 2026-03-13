---
name: trazador-spec-validation
description: Validate specs before issue creation — catch infeasible criteria, vague requirements, and missing flows. Use during trazador plan phase.
user-invocable: false
---

# Spec Validation Methodology

Validate a drafted spec before it becomes a Linear issue. Catch infeasible criteria, vague requirements, and missing flows BEFORE implementation begins.

## When to Use

After drafting a spec in `/trazador:plan` Phase 2, follow this methodology before creating Linear issues.

## Process

### Step 1: Feasibility Check

For each acceptance criterion in the spec:

1. Search the codebase for the files, functions, and patterns the criterion depends on
2. Verify the Approach section covers the required changes
3. Classify:

| Classification | Meaning | Action |
|---------------|---------|--------|
| **Feasible** | Codebase supports it, approach covers it | No changes needed |
| **Needs Foundation** | Requires prerequisite work not in the Approach | Add prerequisite to Approach, or split into a separate issue |
| **Unclear** | Can't determine feasibility from the codebase | Flag for clarification with the user |

**Examples of "Needs Foundation":**
- Criterion references a model that doesn't exist yet
- Criterion assumes an API endpoint but the routing pattern hasn't been set up
- Criterion requires a library/dependency not currently installed

### Step 2: Criteria Quality

Each acceptance criterion must be:

- **Observable** — describes something you can see or measure (not "clean code" or "well-structured")
- **Testable** — you can write a test or manual verification step for it
- **Unambiguous** — only one interpretation is possible

For each criterion, grade:

| Grade | Meaning | Action |
|-------|---------|--------|
| **Good** | Observable, testable, unambiguous | Keep as-is |
| **Rewrite** | Vague or untestable | Propose a concrete rewrite |
| **Split** | Multiple concerns in one criterion | Break into separate criteria |

**Common rewrites:**
- "Handle errors gracefully" → "Return HTTP 400 with `{ error: string }` body when input validation fails"
- "Good performance" → "Endpoint responds in < 200ms for 95th percentile with 1000 records"
- "Support authentication" → "Reject requests without a valid Bearer token with HTTP 401"

### Step 3: Flow Completeness

Trace the user/system flow end-to-end:

1. Start from the trigger (user action, API call, scheduled job)
2. Walk through each step: What happens? What could fail? What state changes?
3. End at the final state (UI update, DB write, response sent)

Check for:
- **Missing happy path steps** — are there intermediate states the criteria don't cover?
- **Missing error states** — what happens when things fail? Network errors, validation errors, race conditions?
- **Missing edge cases** — empty lists, duplicate entries, concurrent access, null/undefined inputs?

Only flag gaps that are **likely to occur** in normal usage. Don't invent exotic failure modes.

## Output Format

Present the validation results as a table, then list any missing flows:

```markdown
### Spec Validation

| # | Criterion | Feasible? | Quality | Notes |
|---|-----------|-----------|---------|-------|
| 1 | ... | ✓ Feasible | Good | — |
| 2 | ... | ⚠ Needs Foundation | Rewrite | Needs: create User model first. Rewrite: "..." |
| 3 | ... | ✓ Feasible | Split | Split into: "..." and "..." |

### Missing Flows
- Error: What happens when [X] fails? Add criterion for error response.
- Edge: Empty list case — should return [] not 404.
```

## After Validation

- If all criteria are **Feasible + Good** with no missing flows → proceed to issue creation
- If any need rewrites/splits → apply them to the spec and confirm with the user
- If any **Need Foundation** → add prerequisite work to the Approach or create a separate issue
- If any are **Unclear** → use AskUserQuestion to clarify before proceeding
