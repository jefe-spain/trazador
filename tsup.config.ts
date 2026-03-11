import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["cli/src/cli.tsx"],
  format: ["esm"],
  outDir: "cli/dist",
  banner: {
    js: "#!/usr/bin/env node\nprocess.removeAllListeners('warning');",
  },
  external: ["ink", "react", "@inkjs/ui", "ink-gradient", "ink-big-text"],
  noExternal: ["meow", "yaml"],
});
