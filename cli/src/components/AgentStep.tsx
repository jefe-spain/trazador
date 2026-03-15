import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { useInput } from "ink";
import { agentLabels } from "../types.js";
import type { Agent } from "../types.js";

interface AgentStepProps {
  onSelect: (agents: Agent[]) => void;
}

export function AgentStep({ onSelect }: AgentStepProps) {
  const options: Agent[] = useMemo(() => ["claude", "codex", "opencode"], []);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Record<Agent, boolean>>({
    claude: true,
    codex: false,
    opencode: false,
  });

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => (prev === 0 ? options.length - 1 : prev - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((prev) => (prev + 1) % options.length);
      return;
    }
    if (input === " ") {
      const current = options[cursor];
      setSelected((prev) => ({ ...prev, [current]: !prev[current] }));
      return;
    }
    if (key.return) {
      const picked = options.filter((opt) => selected[opt]);
      if (picked.length > 0) {
        onSelect(picked);
      } else {
        onSelect([options[cursor]]);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">◆</Text>
        <Text bold>  Which agent runtimes? (space to toggle, enter to confirm)</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        <Text dimColor>|</Text>
        <Box flexDirection="column" marginLeft={1}>
          {options.map((opt, index) => {
            const active = index === cursor;
            const checked = selected[opt];
            return (
              <Text key={opt} color={active ? "cyan" : undefined}>
                {active ? ">" : " "} [{checked ? "x" : " "}] {agentLabels[opt]}
              </Text>
            );
          })}
        </Box>
        <Text dimColor>|</Text>
      </Box>
    </Box>
  );
}
