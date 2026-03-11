export type Scope = "project" | "global";
export type Agent = "claude" | "codex" | "both";

export const scopeLabels: Record<Scope, string> = {
  project: "This project",
  global: "Global",
};

export const agentLabels: Record<Agent, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  both: "Claude Code + Codex CLI",
};
