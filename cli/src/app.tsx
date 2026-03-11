import React, { useState } from "react";
import { Box, Text } from "ink";
import { Header } from "./components/Header.js";
import { ScopeStep } from "./components/ScopeStep.js";
import { AgentStep } from "./components/AgentStep.js";
import { InstallStep } from "./components/InstallStep.js";
import { Done } from "./components/Done.js";
import { scopeLabels, agentLabels } from "./types.js";
import type { Scope, Agent } from "./types.js";

export type { Scope, Agent };

type Step = "scope" | "agent" | "install" | "done";

interface Flags {
  scope?: string;
  agent?: string;
}

export function App({ flags }: { flags: Flags }) {
  const initialScope = parseScope(flags.scope);
  const initialAgent = parseAgent(flags.agent);

  const startStep = (): Step => {
    if (initialScope && initialAgent) return "install";
    if (initialScope) return "agent";
    return "scope";
  };

  const [step, setStep] = useState<Step>(startStep);
  const [scope, setScope] = useState<Scope | undefined>(initialScope);
  const [agent, setAgent] = useState<Agent | undefined>(initialAgent);

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
      {agent && step !== "scope" && step !== "agent" && step !== "done" && (
        <Text>
          <Text color="green">◇</Text>
          <Text>  Agent: </Text>
          <Text bold>{agentLabels[agent]}</Text>
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
            setAgent(value);
            setStep("install");
          }}
        />
      )}

      {step === "install" && scope && agent && (
        <InstallStep
          scope={scope}
          agent={agent}
          onDone={() => setStep("done")}
        />
      )}

      {step === "done" && scope && agent && (
        <Done scope={scope} agent={agent} />
      )}
    </Box>
  );
}

function parseScope(value?: string): Scope | undefined {
  if (value === "project" || value === "global") return value;
  return undefined;
}

function parseAgent(value?: string): Agent | undefined {
  if (value === "claude" || value === "codex" || value === "both") return value;
  return undefined;
}
