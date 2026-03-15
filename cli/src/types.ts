export type Scope = "project" | "global";
export type Agent = "claude" | "codex" | "opencode" | "both" | "all";
export type Tool = "linear" | "github";

export const scopeLabels: Record<Scope, string> = {
  project: "This project",
  global: "Global",
};

export const agentLabels: Record<Agent, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
  both: "Claude Code + Codex CLI",
  all: "Claude Code + Codex CLI + OpenCode",
};

export const toolLabels: Record<Tool, string> = {
  linear: "Linear",
  github: "GitHub Issues",
};
