---
name: trazador-tdd
description: Adaptive TDD methodology — write tests from acceptance criteria before implementation. Use during trazador work phase.
user-invocable: false
---

# Adaptive Test-Driven Development Methodology

Write tests from acceptance criteria BEFORE implementation. Tests validate the spec, not the code. Adapts to the project — skips gracefully if no test framework exists.

## When to Use

In `/trazador:work` Phase 4, before implementing each acceptance criterion. Also in autopilot teammate prompts during implementation.

## Process

### Step 1: Detection

Check if the project has a test framework:

1. **Look for test config files:**
   - `jest.config.*`, `vitest.config.*`, `pytest.ini`, `setup.cfg [tool:pytest]`, `conftest.py`
   - `Gemfile` with rspec/minitest, `.rspec`
   - `*_test.go` files, `Cargo.toml` with `[dev-dependencies]`
   - `phpunit.xml`, `karma.conf.js`, `mocha` in package.json

2. **Look for existing test files:**
   - `**/*.test.*`, `**/*.spec.*`, `**/*_test.*`, `**/test_*.*`
   - `test/`, `tests/`, `spec/`, `__tests__/` directories

3. **Check package.json / Makefile / Taskfile for test commands:**
   - `"test"` script in package.json
   - `make test`, `task test`

### Step 2: Decision

**If no test framework detected:**
- Log: "No test framework detected — implementing without TDD."
- Skip to direct implementation. Do not install a test framework.
- Still verify acceptance criteria manually in Phase 5.

**If test framework exists:** Proceed to Step 3.

### Step 3: RED — Write Failing Tests

For each acceptance criterion:

1. **Translate the criterion into a test** that describes the expected behavior
2. **Follow the project's existing test patterns:**
   - Same directory structure (co-located vs `test/` directory)
   - Same naming convention (`*.test.ts`, `*_spec.rb`, `test_*.py`)
   - Same assertion style (expect/assert/should)
   - Same setup/teardown patterns (beforeEach, fixtures, factories)
3. **Write the test so it FAILS** — it should assert behavior that doesn't exist yet

```
# Example: Criterion "Endpoint returns 200 with user profile JSON"

test("GET /users/:id returns user profile", async () => {
  const response = await request(app).get("/users/1");
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("id", 1);
  expect(response.body).toHaveProperty("name");
  expect(response.body).toHaveProperty("email");
});
```

4. **Run the tests** — confirm they fail for the right reason (missing function, 404, etc.), NOT because of a syntax error or import issue

### Step 4: GREEN — Implement to Pass

1. Write the **minimum code** to make the failing test pass
2. Run the tests after each change
3. When the test passes, move to the next criterion
4. Do NOT add code that isn't needed to pass a test

### Step 5: REFACTOR (Optional)

After all tests pass:

1. Look for duplication in the new code
2. Look for naming that could be clearer
3. Refactor only if it improves clarity — keep tests green
4. Run tests after refactoring to confirm nothing broke

## Scope Rules

- **Only test acceptance criteria** — don't add test coverage for unrelated code
- **Don't test implementation details** — test behavior (inputs → outputs), not internal methods
- **One criterion, one test (minimum)** — complex criteria may need multiple test cases (happy path + edge cases mentioned in the criterion)
- **Follow existing test granularity** — if the project has fine-grained unit tests, write fine-grained tests. If it has broad integration tests, match that style.

## When TDD Doesn't Apply

Some criteria aren't testable with automated tests:
- "Update the README with setup instructions" — skip TDD for docs
- "Deploy to staging" — skip TDD for ops tasks
- UI-only changes in projects without visual/component tests — implement directly, verify manually

For these, note: "Criterion X: not automatable — will verify manually in Phase 5."
