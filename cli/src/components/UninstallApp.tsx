import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { uninstall } from "../installer.js";

export function UninstallApp() {
  const [status, setStatus] = useState("Removing trazador...");
  const [steps, setSteps] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const run = async () => {
      try {
        await uninstall({
          cwd: process.cwd(),
          onStep: (msg: string) => {
            setSteps((prev) => [...prev, msg]);
            setStatus(msg);
          },
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    run();
  }, []);

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>
          <Text color="red">■</Text>
          <Text bold color="red">  Uninstall failed</Text>
        </Text>
        <Box marginLeft={3} flexDirection="column">
          <Text color="red">│  {error}</Text>
          {steps.map((s, i) => (
            <Text key={i} dimColor>│  ✓ {s}</Text>
          ))}
        </Box>
      </Box>
    );
  }

  if (done) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>
          <Text color="green">◇</Text>
          <Text bold color="green">  trazador uninstalled</Text>
        </Text>
        <Box marginLeft={3} flexDirection="column">
          {steps.map((s, i) => (
            <Text key={i}>
              <Text dimColor>│  </Text>
              <Text dimColor>{s}</Text>
            </Text>
          ))}
          <Text dimColor>│</Text>
        </Box>
        <Text>
          <Text color="green">└</Text>
          <Text dimColor>  All clean.</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        <Text color="gray">┌</Text>
        <Text bold>  Uninstall</Text>
      </Text>
      <Box marginLeft={3} flexDirection="column">
        {steps.map((s, i) => (
          <Text key={i}>
            <Text color="green">│  ✓ </Text>
            <Text>{s}</Text>
          </Text>
        ))}
        <Box>
          <Text color="yellow">│  </Text>
          <Spinner label={status} />
        </Box>
      </Box>
    </Box>
  );
}
