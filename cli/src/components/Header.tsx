import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";

export function Header() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Gradient name="vice">
        <BigText text="trazador" font="tiny" />
      </Gradient>
      <Text dimColor>Connect your agent to your PM tool</Text>
    </Box>
  );
}
