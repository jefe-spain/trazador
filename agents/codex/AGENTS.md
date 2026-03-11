## Trazador Workflow

This project uses [trazador](https://github.com/jefernandez/trazador) for {{tool_name}}-native agent workflow.

- **Config:** `.trazador/config.yaml`
- **PM Tool:** {{tool_name}}
- **MCP Config:** `.codex/mcp.json`
- **Source of truth:** {{tool_name}}
- **Session protocol:** Read `.trazador/config.yaml`, check {{tool_name}} for active issues, update on completion.

### How to work with Trazador

1. Read `.trazador/config.yaml` at the start of every session
2. Check {{tool_name}} for assigned/in-progress issues
3. Follow the issue spec exactly — it IS the contract
4. Update {{tool_name}} at every state transition (start, progress, complete)
5. Never create local task trackers — use {{tool_name}}

### Available workflows

- **Plan:** Create structured issues in {{tool_name}} from feature descriptions
- **Work:** Pick up an issue, implement it, ship a PR
- **Review:** Validate implementation against the spec
- **Sync:** Keep {{tool_name}} in sync with agent actions
