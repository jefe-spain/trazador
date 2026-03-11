# trazador

Connect your AI coding agent to your PM tool. Every task is traceable from issue to shipped PR.

```bash
npx trazador
```

Works with **Claude Code** and **Codex CLI**. Supports **Linear**.

## How it works

**Step 1** — Run the installer. Pick your scope (project or global) and agent.

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

✓ Trazador installed successfully
  Scope: This project
  Agent: Claude Code
  PM Tool: Linear
```

**Step 2** — Inside your agent, run `/trazador:init` to connect to Linear (OAuth), pick a team/project, and map workflow statuses.

## Commands

| Command | What it does |
|---------|-------------|
| `/trazador:init` | Connect to Linear, select team/project |
| `/trazador:discovery` | Analyze codebase vs backlog, find gaps |
| `/trazador:plan` | Define a feature, break it into issues |
| `/trazador:work` | Pick up an issue, implement, open a PR |
| `/trazador:review` | Validate implementation against the spec |
| `/trazador:sync` | Keep Linear in sync, check project health |
| `/trazador:autopilot` | Supervisor dispatches agents per issue |

## Flags

Skip the interactive prompts:

```bash
npx trazador --scope project --agent claude
npx trazador --agent both
```

## Uninstall

```bash
npx trazador uninstall
```

Removes all trazador files. Non-trazador config is preserved.

## Requirements

- Node.js 18+
- Claude Code or Codex CLI
- Linear account

## License

MIT
