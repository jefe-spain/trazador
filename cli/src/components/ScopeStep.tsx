import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import type { Scope } from "../types.js";

interface ScopeStepProps {
  onSelect: (scope: Scope) => void;
}

export function ScopeStep({ onSelect }: ScopeStepProps) {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">◆</Text>
        <Text bold>  Where should trazador be installed?</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        <Text dimColor>|</Text>
        <Box flexDirection="column" marginLeft={1}>
          <Select
            options={[
              { label: "This project only", value: "project" },
              { label: "Global (all projects)", value: "global" },
            ]}
            onChange={(value) => onSelect(value as Scope)}
          />
        </Box>
        <Text dimColor>|</Text>
      </Box>
    </Box>
  );
}
