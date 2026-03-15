export type Scope = "project" | "global";
export type Agent = "claude" | "codex" | "opencode";
export type Tool = "linear" | "github";

export const scopeLabels: Record<Scope, string> = {
  project: "This project",
  global: "Global",
};

export const agentLabels: Record<Agent, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
};

export const toolLabels: Record<Tool, string> = {
  linear: "Linear",
  github: "GitHub Issues",
};
