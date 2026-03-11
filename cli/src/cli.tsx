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
    --agent    Pre-select agent: claude, codex, or both

  Examples
    $ npx trazador
    $ npx trazador --scope project --agent claude
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
    },
  },
);

const command = cli.input[0];

if (command === "uninstall") {
  render(<UninstallApp />);
} else {
  render(<App flags={cli.flags} />);
}
