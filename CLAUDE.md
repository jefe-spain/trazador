## Trazador Workflow

This project uses [trazador](https://github.com/jefernandez/trazador) for Linear- and GitHub-native agent workflows across Claude Code, Codex CLI, and OpenCode.

- **Config:** `.trazador/config.yaml`
- **Commands:** `/trazador:init`, `/trazador:discovery`, `/trazador:plan`, `/trazador:work`, `/trazador:review`, `/trazador:sync`, `/trazador:autopilot`
- **Source of truth:** Linear or GitHub Issues (from config)
- **Session protocol:** Read `.trazador/config.yaml`, check active issues in the configured PM tool, update the PM tool on completion.

## Runtime notes

- **Claude Code:** uses `.claude/commands/trazador/` and `.claude/skills/`
- **Codex CLI:** uses `.agents/skills/` and `.codex/config.toml`
- **OpenCode:** uses `.opencode/skills/` (project) or `~/.config/opencode/skills/` (global)
