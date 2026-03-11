import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import type { Tool } from "../types.js";

interface ToolStepProps {
  onSelect: (tool: Tool) => void;
}

export function ToolStep({ onSelect }: ToolStepProps) {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">◆</Text>
        <Text bold>  Which PM tool?</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        <Text dimColor>|</Text>
        <Box flexDirection="column" marginLeft={1}>
          <Select
            options={[
              { label: "Linear", value: "linear" },
              { label: "GitHub Issues", value: "github" },
            ]}
            onChange={(value) => onSelect(value as Tool)}
          />
        </Box>
        <Text dimColor>|</Text>
      </Box>
    </Box>
  );
}
