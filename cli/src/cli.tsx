import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./app.js";
import { UninstallApp } from "./components/UninstallApp.js";

const cli = meow(
  `
  Usage
    $ npx trazador              Install trazador
    $ npx trazador uninstall    Remove all trazador files

  Options
    --scope    Pre-select scope: project or global
    --agent    Pre-select agents (comma-separated): claude,codex,opencode
    --tool     Pre-select PM tool: linear or github

  Examples
    $ npx trazador
    $ npx trazador --scope project --agent claude --tool linear
    $ npx trazador --scope project --agent claude,codex --tool github
    $ npx trazador --scope project --agent opencode --tool github
    $ npx trazador uninstall
`,
  {
    importMeta: import.meta,
    flags: {
      scope: {
        type: "string",
      },
      agent: {
        type: "string",
      },
      tool: {
        type: "string",
      },
    },
  },
);

const command = cli.input[0];

if (command === "uninstall") {
  render(<UninstallApp />);
} else {
  render(<App flags={cli.flags} />);
}
