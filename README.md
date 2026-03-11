# trazador

*Trazador* (Spanish: tracer) — traces every task from issue to shipped PR. Nothing gets lost.

A complete software engineering workflow for AI agents. From issue to shipped PR in a single run.

```bash
npx trazador
```

Works with **Claude Code** and **Codex CLI**. Supports **Linear** and **GitHub Issues**.

## How it works

**Step 1** — Run the installer. Pick your scope, agent, and PM tool.

```
$ npx trazador

▸ trazador setup

Where should trazador be installed?
  ● This project only
  ○ Global (all projects)

Which agent runtime?
  ● Claude Code
  ○ Codex CLI
  ○ Both

Which PM tool?
  ● Linear
  ○ GitHub Issues

✓ Trazador installed successfully
  Scope: This project
  Agent: Claude Code
  PM Tool: Linear
```

**Step 2** — Inside your agent, run `/trazador:init` to connect to your PM tool.

- **Linear** — OAuth flow, pick a team/project, map workflow statuses
- **GitHub Issues** — configure PAT, detect repo from git remote, set up labels

## Commands

| Command | What it does |
|---------|-------------|
| `/trazador:init` | Connect to your PM tool, configure workspace |
| `/trazador:discovery` | Analyze codebase vs backlog, find gaps |
| `/trazador:plan` | Define a feature, break it into issues |
| `/trazador:work` | Pick up an issue, implement, push a branch |
| `/trazador:review` | Validate implementation against the spec |
| `/trazador:sync` | Keep issue state in sync, check project health |
| `/trazador:autopilot` | Supervisor dispatches agents per issue |

## Why trazador exists

Connecting an AI agent to a PM tool is the easy part. The hard part is making the agent **actually deliver**.

When an AI agent picks up an issue and works autonomously, it fails in predictable ways: it builds against a vague spec, guesses instead of reading the codebase, writes tests after the fact (or not at all), grades its own work, and ships code that gets rejected in review. Each failure turns "one-shot delivery" into a multi-round back-and-forth.

Trazador is not a PM integration. It's a **structured engineering workflow** that eliminates these failure modes so the agent gets it right the first time.

## Architecture

Trazador uses a hybrid of **skills** (methodology docs the agent follows) and **agents** (independent subprocesses with fresh context). Each solves a specific failure mode.

### Skills — teach the agent HOW to work

Skills are methodology files loaded during sequential phases. The main agent follows the process step by step — no spawn overhead, full context preserved.

| Skill | Used in | What it prevents |
|-------|---------|-----------------|
| **Spec Validation** | `/plan` | Bad specs reaching implementation. Catches infeasible criteria, vague requirements, and missing user flows before issues are created. |
| **Research** | `/work` | Guessing instead of reading. Forces the agent to map exact files, patterns, and reusable functions before writing any code. |
| **TDD** | `/work` | Retroactive tests that confirm what was built instead of what was asked. Tests come from acceptance criteria, written before implementation. Adapts: skips if the project has no test framework. |

### Agents — independent verification with fresh eyes

Agents are spawned as separate subprocesses with no shared context. They can't be biased by "I wrote this, so it must be right."

| Agent | Used in | What it catches |
|-------|---------|----------------|
| **Acceptance Verifier** | `/work`, `/review` | Self-grading bias. A fresh agent that didn't write the code checks each criterion against the diff. Runs twice: once before push, once during review. |
| **Security Auditor** | `/review` | Injection vulnerabilities, auth gaps, hardcoded secrets, data exposure — anything that shouldn't ship. |
| **Quality Reviewer** | `/review` | Pattern violations, over-engineering, N+1 queries, missing indexes — code that works but doesn't belong. |

### Why this split

We studied two approaches: **agent-per-task** (powerful for parallel review, wasteful for sequential work) and **skills-only** (great for process, but can't provide independent verification). Trazador uses each where it's strongest:

- **Skills** for sequential phases (planning, implementing) — the agent stays in context and builds understanding
- **Agents** for verification (quality check, review) — fresh perspective, no implementation bias, run in parallel

### The full pipeline

```
/plan                    /work                         /review
┌──────────────┐        ┌───────────────────────┐     ┌──────────────────────┐
│ Clarify goal │        │ Research skill         │     │ Goal alignment check │
│      ↓       │        │      ↓                 │     │      ↓               │
│ Draft spec   │   →    │ TDD skill (RED/GREEN)  │  →  │ 3 agents in parallel │
│      ↓       │        │      ↓                 │     │  • Security Auditor  │
│ Validate spec│        │ Acceptance Verifier    │     │  • Quality Reviewer  │
│      ↓       │        │      ↓                 │     │  • Acceptance Verify │
│ Create issue │        │ Push branch            │     │      ↓               │
└──────────────┘        └───────────────────────┘     │ Verdict: ship or fix │
                                                      └──────────────────────┘
```

Every step is posted back to your PM tool. The issue is the spec, the agent is the engineer, and trazador is the process that keeps it honest.

### Self-contained, zero dependencies

Everything ships with `npx trazador`. No external plugins, no extra installs. All skill files and agent prompts are bundled. Works offline (except for PM tool sync).

## Flags

Skip the interactive prompts:

```bash
npx trazador --scope project --agent claude --tool linear
npx trazador --agent both --tool github
```

## Uninstall

```bash
npx trazador uninstall
```

Removes all trazador files. Non-trazador config is preserved.

## Requirements

- Node.js 18+
- Claude Code or Codex CLI
- Linear account or GitHub repo with Issues enabled

## License

MIT
