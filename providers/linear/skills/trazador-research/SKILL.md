---
name: trazador-research
description: Pre-implementation codebase research — map files, patterns, and conventions before writing code. Use during trazador work phase.
user-invocable: false
---

# Pre-Implementation Research Methodology

Research the codebase thoroughly before writing any code. Map the exact files, patterns, functions, and conventions you'll use. Prevents the agent from guessing and reinventing patterns that already exist.

## When to Use

In `/trazador:work` Phase 2, before creating the execution plan. Also in autopilot teammate prompts before implementation begins.

**Skip if:** The issue's Approach section already contains specific `file:line` references with pattern descriptions and function names to reuse.

## Process

### Step 1: File Mapping

For each file mentioned in the issue's Approach section:

1. **Read the file** completely
2. Extract:
   - **Patterns used** — What architecture pattern does this follow? (MVC, service layer, repository, etc.)
   - **Naming conventions** — How are functions, variables, classes, files named?
   - **Error handling style** — Exceptions? Result types? Error codes? How are errors logged?
   - **Test patterns** — Where are tests for this file? What testing framework? What's the naming convention for test files?
3. Record: `file.ts → uses pattern X, naming: camelCase, errors: thrown as HttpException, tests in file.test.ts`

### Step 2: Reuse Discovery

Search for existing functions, components, and utilities that could be reused:

1. **Grep for similar functionality** — if you're building "create user", search for "create" patterns in similar models
2. **Check for shared utilities** — look in `utils/`, `helpers/`, `lib/`, `shared/`, `common/` directories
3. **Check for base classes or mixins** — does the codebase use inheritance or composition patterns you should follow?
4. **Check for existing types/interfaces** — are there DTOs, schemas, or type definitions you should extend rather than create?

Record each finding: `Found createEntity() in utils/db.ts:42 — reuse for new model creation`

### Step 3: Convention Extraction

Read 2-3 representative files in the same area of the codebase (same directory, same layer):

1. **File structure** — How is the file organized? Imports → types → constants → functions → exports?
2. **Documentation** — Are there JSDoc comments? Inline comments? None?
3. **Formatting** — Tabs or spaces? Semicolons? Trailing commas? (Follow existing, don't impose preferences)
4. **Testing conventions** — describe/it? test()? What assertion library? How are mocks set up?

### Step 4: Implementation Brief

Synthesize your research into a brief for each acceptance criterion:

```
Criterion: "<acceptance criterion text>"
  Implement in: path/to/file.ts (modify existing function X at line Y)
  Follow pattern: path/to/similar.ts (same structure as createWidget)
  Reuse: utils/db.ts:createEntity(), types/models.ts:BaseEntity
  Test in: path/to/file.test.ts (add test case following existing describe block)
  Conventions: camelCase functions, HttpException for errors, zod for validation
```

## Output

Present the implementation brief to the user as part of the execution plan in Phase 2. This replaces the vague "read referenced files" step with concrete, researched mappings.

If research reveals that the Approach section is wrong or incomplete (e.g., a referenced file doesn't exist, or a different pattern should be used), flag it before proceeding:

```
⚠ Research finding: The Approach suggests modifying routes/users.ts, but this file doesn't exist.
  User routes are in src/api/v2/users.controller.ts (NestJS controller pattern).
  Adjusting the plan accordingly.
```
