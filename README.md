# Trazador

Linear-native agent workflow for Claude Code. Plan, build, review, and sync — with Linear as the single source of truth.

## What it does

Trazador connects AI coding agents (Claude Code, Codex) to Linear so every task is traceable from requirement to shipped code. No local task files, no competing trackers.

| Command | Purpose |
|---------|---------|
| `/trazador:init` | One-time setup — bind project to Linear team and project |
| `/trazador:discovery` | Analyze code vs Linear, find gaps, help define scope |
| `/trazador:plan` | Define a feature, break it down, create Linear issues |
| `/trazador:work` | Pick up an issue, implement it, ship a PR |
| `/trazador:review` | Validate implementation against the spec, then technical review |
| `/trazador:sync` | Keep Linear in sync, check project health |

## Install

```bash
# From local path (development)
claude --plugin-dir /path/to/trazador

# Or add marketplace (when published)
# /plugin marketplace add jefernandez/trazador
```

## Setup

After installing, run in any project:

```
/trazador:init
```

This will:
1. Validate Linear MCP connection (bundled with the plugin)
2. Ask which Linear team and project to use
3. Create `.trazador/config.yaml` in your project
4. Optionally update your `AGENTS.md`

## Workflow

```
/trazador:init          → Setup (once per project)
/trazador:discovery     → "Where are we? What's missing?"
/trazador:plan          → "Define this specific feature"
/trazador:work ISSUE-XX → "Build it"
/trazador:review ISSUE-XX → "Did we build the right thing?"
/trazador:sync          → "Keep everything in sync"
```

## How it differs from Task Master

| | Trazador | Task Master |
|---|---|---|
| Task storage | Linear (cloud) | Local files (.taskmaster/) |
| Source of truth | Linear issues | tasks.json |
| PM tool | Linear-native | None |
| Review | Goal-aligned validation | None |
| Scope | Full lifecycle | Task decomposition |

Trazador is for teams that use Linear. Task Master is for solo AI-driven development with local files.

## Requirements

- Claude Code
- Linear account (free tier works)
- Linear MCP server (bundled with plugin)

## License

MIT
