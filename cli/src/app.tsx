import React, { useState } from "react";
import { Box, Text } from "ink";
import { Header } from "./components/Header.js";
import { ScopeStep } from "./components/ScopeStep.js";
import { AgentStep } from "./components/AgentStep.js";
import { ToolStep } from "./components/ToolStep.js";
import { InstallStep } from "./components/InstallStep.js";
import { Done } from "./components/Done.js";
import { scopeLabels, agentLabels, toolLabels } from "./types.js";
import type { Scope, Agent, Tool } from "./types.js";

export type { Scope, Agent, Tool };

type Step = "scope" | "agent" | "tool" | "install" | "done";

interface Flags {
  scope?: string;
  agent?: string;
  tool?: string;
}

export function App({ flags }: { flags: Flags }) {
  const initialScope = parseScope(flags.scope);
  const initialAgents = parseAgents(flags.agent);
  const initialTool = parseTool(flags.tool);

  const startStep = (): Step => {
    if (initialScope && initialAgents && initialTool) return "install";
    if (initialScope && initialAgents) return "tool";
    if (initialScope) return "agent";
    return "scope";
  };

  const [step, setStep] = useState<Step>(startStep);
  const [scope, setScope] = useState<Scope | undefined>(initialScope);
  const [agents, setAgents] = useState<Agent[] | undefined>(initialAgents);
  const [tool, setTool] = useState<Tool | undefined>(initialTool);

  return (
    <Box flexDirection="column" padding={1}>
      {step !== "done" && (
        <Box marginBottom={1}>
          <Header />
        </Box>
      )}

      {/* Intro connector */}
      {step !== "done" && (
        <Text>
          <Text color="gray">|</Text>
          <Text bold>  Setup</Text>
        </Text>
      )}

      {/* Completed: scope */}
      {scope && step !== "scope" && step !== "done" && (
        <Text>
          <Text color="green">◇</Text>
          <Text>  Scope: </Text>
          <Text bold>{scopeLabels[scope]}</Text>
        </Text>
      )}

      {/* Completed: agent */}
      {agents && step !== "scope" && step !== "agent" && step !== "done" && (
        <Text>
          <Text color="green">◇</Text>
          <Text>  Agents: </Text>
          <Text bold>{formatAgents(agents)}</Text>
        </Text>
      )}

      {/* Completed: tool */}
      {tool && step !== "scope" && step !== "agent" && step !== "tool" && step !== "done" && (
        <Text>
          <Text color="green">◇</Text>
          <Text>  PM Tool: </Text>
          <Text bold>{toolLabels[tool]}</Text>
        </Text>
      )}

      {/* Active step */}
      {step === "scope" && (
        <ScopeStep
          onSelect={(value) => {
            setScope(value);
            setStep("agent");
          }}
        />
      )}

      {step === "agent" && (
        <AgentStep
          onSelect={(value) => {
            setAgents(value);
            setStep("tool");
          }}
        />
      )}

      {step === "tool" && (
        <ToolStep
          onSelect={(value) => {
            setTool(value);
            setStep("install");
          }}
        />
      )}

      {step === "install" && scope && agents && tool && (
        <InstallStep
          scope={scope}
          agents={agents}
          tool={tool}
          onDone={() => setStep("done")}
        />
      )}

      {step === "done" && scope && agents && tool && (
        <Done scope={scope} agents={agents} tool={tool} />
      )}
    </Box>
  );
}

function parseScope(value?: string): Scope | undefined {
  if (value === "project" || value === "global") return value;
  return undefined;
}

function parseAgents(value?: string): Agent[] | undefined {
  if (!value) return undefined;
  const raw = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const picked: Agent[] = [];
  for (const token of raw) {
    if (token === "both") {
      picked.push("claude", "codex");
      continue;
    }
    if (token === "all") {
      picked.push("claude", "codex", "opencode");
      continue;
    }
    if (token === "claude" || token === "codex" || token === "opencode") {
      picked.push(token);
      continue;
    }
    return undefined;
  }

  const deduped = Array.from(new Set(picked));
  if (deduped.length === 0) return undefined;
  return deduped;
}

function formatAgents(agents: Agent[]): string {
  return agents.map((agent) => agentLabels[agent]).join(" + ");
}

function parseTool(value?: string): Tool | undefined {
  if (value === "linear" || value === "github") return value;
  return undefined;
}
