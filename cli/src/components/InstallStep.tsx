import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { install } from "../installer.js";
import type { Scope, Agent, Tool } from "../types.js";

interface InstallStepProps {
  scope: Scope;
  agents: Agent[];
  tool: Tool;
  onDone: () => void;
}

export function InstallStep({ scope, agents, tool, onDone }: InstallStepProps) {
  const [status, setStatus] = useState("Starting...");
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const run = async () => {
      try {
        await install({
          scope,
          agents,
          tool,
          cwd: process.cwd(),
          onStep: (msg: string) => {
            setSteps((prev) => [...prev, msg]);
            setStatus(msg);
          },
        });
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    run();
  }, [scope, agents, tool, onDone]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="red">■</Text>
          <Text bold color="red">  Installation failed</Text>
        </Text>
        <Box marginLeft={3} flexDirection="column">
          <Text color="red">|</Text>
          <Text color="red">|  {error}</Text>
          <Text color="red">|</Text>
          {steps.map((s, i) => (
            <Text key={i} dimColor>|  ✓ {s}</Text>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="yellow">◆</Text>
        <Text bold>  Installing...</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        {steps.slice(0, -1).map((s, i) => (
          <Text key={i}>
            <Text color="green">|</Text>
            <Text color="green">  ✓ </Text>
            <Text>{s}</Text>
          </Text>
        ))}
        <Box>
          <Text color="yellow">|  </Text>
          <Spinner label={status} />
        </Box>
      </Box>
    </Box>
  );
}
