import React from "react";
import { Box, Text } from "ink";
import { agentLabels, toolLabels } from "../types.js";
import type { Scope, Agent, Tool } from "../types.js";

interface DoneProps {
  scope: Scope;
  agent: Agent;
  tool: Tool;
}

export function Done({ scope, agent, tool }: DoneProps) {
  const agents = agent === "both" ? ["claude", "codex"] : [agent];
  const scopeDisplay = scope === "global" ? "Global" : "This project";

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">◇</Text>
        <Text bold color="green">  trazador installed</Text>
      </Text>

      <Box marginLeft={3} flexDirection="column">
        <Text dimColor>|</Text>

        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1} marginLeft={1}>
          <Text>
            <Text dimColor>{"Scope    "}</Text>
            <Text bold>{scopeDisplay}</Text>
          </Text>
          <Text>
            <Text dimColor>{"Agent    "}</Text>
            <Text bold>{agentLabels[agent]}</Text>
          </Text>
          <Text>
            <Text dimColor>{"PM Tool  "}</Text>
            <Text bold>{toolLabels[tool]}</Text>
          </Text>
        </Box>

        <Text dimColor>|</Text>
        <Text bold>
          <Text dimColor>|  </Text>
          Next steps:
        </Text>

        {agents.includes("claude") && (
          <Text>
            <Text dimColor>|  </Text>
            <Text dimColor>{"  Claude Code -> "}</Text>
            <Text color="cyan" bold>/trazador:init</Text>
          </Text>
        )}

        {agents.includes("codex") && (
          <Text>
            <Text dimColor>|  </Text>
            <Text dimColor>{"  Codex CLI   -> "}</Text>
            <Text color="cyan" bold>See AGENTS.md</Text>
          </Text>
        )}

        <Text dimColor>|</Text>
      </Box>

      <Text>
        <Text color="green">-</Text>
        <Text dimColor>  To uninstall: </Text>
        <Text>npx trazador uninstall</Text>
      </Text>
    </Box>
  );
}
