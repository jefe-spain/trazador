import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import type { Agent } from "../types.js";

interface AgentStepProps {
  onSelect: (agent: Agent) => void;
}

export function AgentStep({ onSelect }: AgentStepProps) {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">◆</Text>
        <Text bold>  Which agent runtime?</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        <Text dimColor>|</Text>
        <Box flexDirection="column" marginLeft={1}>
          <Select
            options={[
              { label: "Claude Code", value: "claude" },
              { label: "Codex CLI", value: "codex" },
              { label: "Both", value: "both" },
            ]}
            onChange={(value) => onSelect(value as Agent)}
          />
        </Box>
        <Text dimColor>|</Text>
      </Box>
    </Box>
  );
}
