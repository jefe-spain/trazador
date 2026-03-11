import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type { Scope, Agent } from "./types.js";

interface InstallOptions {
  scope: Scope;
  agent: Agent;
  cwd: string;
  onStep: (msg: string) => void;
}

interface UninstallOptions {
  cwd: string;
  onStep: (msg: string) => void;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..", "..");
const homeDir = os.homedir();

async function readPackageVersion(): Promise<string> {
  const pkgPath = path.join(packageRoot, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
  return pkg.version || "0.0.0";
}

function claudeRoot(scope: Scope, cwd: string): string {
  return scope === "global"
    ? path.join(homeDir, ".claude")
    : path.join(cwd, ".claude");
}

function codexRoot(scope: Scope, cwd: string): string {
  return scope === "global" ? path.join(homeDir, ".codex") : cwd;
}

export async function install({
  scope,
  agent,
  cwd,
  onStep,
}: InstallOptions): Promise<void> {
  const agents =
    agent === "both" ? (["claude", "codex"] as const) : ([agent] as const);

  const scopeLabel = scope === "global" ? "globally" : "for this project";
  onStep(`Installing ${scopeLabel}`);

  const providerDir = path.join(packageRoot, "providers", "linear");
  await ensureProviderExists(providerDir);

  for (const ag of agents) {
    if (ag === "claude") {
      await installClaude({ scope, cwd, onStep });
    } else {
      await installCodex({ scope, cwd, onStep });
    }
  }

  // Write installation metadata
  const metaDir =
    scope === "global"
      ? path.join(homeDir, ".trazador")
      : path.join(cwd, ".trazador");
  onStep("Writing installation metadata");
  await fs.mkdir(metaDir, { recursive: true });

  const version = await readPackageVersion();
  const meta = {
    scope,
    agent,
    tools: ["linear"],
    installed_at: new Date().toISOString(),
    version,
  };
  await fs.writeFile(
    path.join(metaDir, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
  );

  onStep("Installation complete");
}

export async function uninstall({
  cwd,
  onStep,
}: UninstallOptions): Promise<void> {
  const projectMeta = path.join(cwd, ".trazador", "meta.json");
  const globalMeta = path.join(homeDir, ".trazador", "meta.json");

  let meta:
    | { scope?: string; agent?: string; tools?: string[]; tool?: string }
    | undefined;
  let metaScope: Scope = "project";

  if (await fileExists(projectMeta)) {
    meta = JSON.parse(await fs.readFile(projectMeta, "utf-8"));
    metaScope = (meta?.scope as Scope) || "project";
  } else if (await fileExists(globalMeta)) {
    meta = JSON.parse(await fs.readFile(globalMeta, "utf-8"));
    metaScope = "global";
  } else {
    onStep("Nothing to uninstall (no .trazador/meta.json found)");
    return;
  }

  const agents: string[] =
    meta?.agent === "both"
      ? ["claude", "codex"]
      : meta?.agent
        ? [meta.agent]
        : ["claude", "codex"];

  if (agents.includes("claude")) {
    await removeClaude(metaScope, cwd, meta, onStep);
  }

  if (agents.includes("codex")) {
    await removeCodex(metaScope, cwd, onStep);
  }

  const trazadorDir =
    metaScope === "global"
      ? path.join(homeDir, ".trazador")
      : path.join(cwd, ".trazador");
  if (await fileExists(trazadorDir)) {
    await fs.rm(trazadorDir, { recursive: true });
    onStep("Removed .trazador/ directory");
  }

  onStep("Uninstall complete");
}

// --- Claude Code installer ---

async function installClaude({
  scope,
  cwd,
  onStep,
}: {
  scope: Scope;
  cwd: string;
  onStep: (msg: string) => void;
}): Promise<void> {
  const root = claudeRoot(scope, cwd);
  const providerDir = path.join(packageRoot, "providers", "linear");

  // Copy commands -> commands/trazador/*.md
  onStep("Installing Linear commands");
  const srcCommands = path.join(providerDir, "commands");
  const destCommands = path.join(root, "commands", "trazador");
  await copyDir(srcCommands, destCommands);

  // Copy skills -> skills/trazador/SKILL.md
  onStep("Installing Linear skills");
  const srcSkills = path.join(providerDir, "skills");
  const destSkills = path.join(root, "skills");
  await copyDir(srcSkills, destSkills);

  // Write MCP config to .mcp.json (project scope only)
  if (scope === "project") {
    onStep("Configuring MCP servers");
    const mcpDest = path.join(cwd, ".mcp.json");
    let mergedMcp: Record<string, unknown> = {};

    if (await fileExists(mcpDest)) {
      const existing = JSON.parse(await fs.readFile(mcpDest, "utf-8"));
      mergedMcp = existing.mcpServers || {};
    }

    const mcpSrc = path.join(providerDir, "mcp.json");
    if (await fileExists(mcpSrc)) {
      const mcpConfig = JSON.parse(await fs.readFile(mcpSrc, "utf-8"));
      Object.assign(mergedMcp, mcpConfig.mcpServers);
    }

    await fs.writeFile(
      mcpDest,
      JSON.stringify({ mcpServers: mergedMcp }, null, 2) + "\n",
    );
  } else {
    onStep("Skipping .mcp.json (global scope — configure MCP per-project)");
  }
}

// --- Codex CLI installer ---

async function installCodex({
  scope,
  cwd,
  onStep,
}: {
  scope: Scope;
  cwd: string;
  onStep: (msg: string) => void;
}): Promise<void> {
  const root = codexRoot(scope, cwd);
  const providerDir = path.join(packageRoot, "providers", "linear");

  onStep("Setting up Codex CLI configuration");

  // 1. AGENTS.md (project scope only)
  if (scope === "project") {
    const codexTemplate = path.join(
      packageRoot,
      "agents",
      "codex",
      "AGENTS.md",
    );
    const destAgents = path.join(cwd, "AGENTS.md");

    if (await fileExists(codexTemplate)) {
      let content = await fs.readFile(codexTemplate, "utf-8");
      content = content.replace(/\{\{tool\}\}/g, "linear");
      content = content.replace(/\{\{tool_name\}\}/g, "Linear");

      if (await fileExists(destAgents)) {
        const existing = await fs.readFile(destAgents, "utf-8");
        if (!existing.includes("## Trazador Workflow")) {
          await fs.writeFile(destAgents, existing + "\n" + content);
          onStep("Appended trazador section to AGENTS.md");
        } else {
          onStep("AGENTS.md already has trazador section — skipped");
        }
      } else {
        await fs.writeFile(destAgents, content);
        onStep("Created AGENTS.md with trazador instructions");
      }
    }
  }

  // 2. Install skills from provider
  const skillsRoot = scope === "global" ? root : cwd;
  const srcCommands = path.join(providerDir, "commands");

  if (await fileExists(srcCommands)) {
    onStep("Installing Linear skills for Codex");
    const entries = await fs.readdir(srcCommands);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const skillName = `trazador-${entry.replace(".md", "")}`;
      const skillDir = path.join(
        skillsRoot,
        ".agents",
        "skills",
        skillName,
      );
      await fs.mkdir(skillDir, { recursive: true });
      await fs.copyFile(
        path.join(srcCommands, entry),
        path.join(skillDir, "SKILL.md"),
      );
    }
  }

  // 3. Write MCP config to .codex/config.toml (rebuild, not append)
  onStep("Configuring MCP servers for Codex");
  const codexDir = scope === "global" ? root : path.join(cwd, ".codex");
  await fs.mkdir(codexDir, { recursive: true });

  const configTomlPath = path.join(codexDir, "config.toml");

  // Read existing content and preserve non-trazador sections
  let existingNonTrazador = "";
  if (await fileExists(configTomlPath)) {
    const existing = await fs.readFile(configTomlPath, "utf-8");
    // Remove trazador-managed sections (between trazador comments)
    const lines = existing.split("\n");
    let inTrazadorSection = false;
    const kept: string[] = [];
    for (const line of lines) {
      if (line.startsWith("# Trazador MCP configuration")) {
        inTrazadorSection = true;
        continue;
      }
      if (inTrazadorSection) {
        // End of trazador block: next non-trazador [section] or another comment block
        if (
          line.startsWith("[") &&
          !line.startsWith("[mcp_servers.linear-server")
        ) {
          inTrazadorSection = false;
          kept.push(line);
        }
        // skip trazador lines
        continue;
      }
      kept.push(line);
    }
    existingNonTrazador = kept.join("\n").trim();
  }

  const mcpSrc = path.join(providerDir, "mcp.json");
  const tomlLines: string[] = [
    "# Trazador MCP configuration for Codex CLI",
    "# PM Tool: Linear",
    "",
  ];

  if (await fileExists(mcpSrc)) {
    const mcpConfig = JSON.parse(await fs.readFile(mcpSrc, "utf-8"));

    for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
      const cfg = config as Record<string, unknown>;
      tomlLines.push(`[mcp_servers.${name}]`);

      if (cfg.type === "http" && cfg.url) {
        tomlLines.push(`url = "${cfg.url}"`);
      } else if (cfg.command) {
        tomlLines.push(`command = "${cfg.command}"`);
        if (Array.isArray(cfg.args)) {
          const argsStr = cfg.args.map((a: string) => `"${a}"`).join(", ");
          tomlLines.push(`args = [${argsStr}]`);
        }
        if (cfg.env && typeof cfg.env === "object") {
          tomlLines.push("");
          tomlLines.push(`[mcp_servers.${name}.env]`);
          for (const [k, v] of Object.entries(
            cfg.env as Record<string, string>,
          )) {
            tomlLines.push(`${k} = "${v}"`);
          }
        }
      }

      tomlLines.push(`enabled = true`);
      tomlLines.push("");
    }
  }

  const trazadorBlock = tomlLines.join("\n");
  const finalContent = existingNonTrazador
    ? existingNonTrazador + "\n\n" + trazadorBlock
    : trazadorBlock;

  await fs.writeFile(configTomlPath, finalContent);
  onStep("Configured MCP in config.toml");
}

// --- Uninstall helpers ---

async function removeClaude(
  scope: Scope,
  cwd: string,
  meta: { tools?: string[] } | undefined,
  onStep: (msg: string) => void,
): Promise<void> {
  const root = claudeRoot(scope, cwd);

  // Remove commands/trazador/ directory
  const commandsDir = path.join(root, "commands", "trazador");
  if (await fileExists(commandsDir)) {
    await fs.rm(commandsDir, { recursive: true });
    const parentCommands = path.join(root, "commands");
    const remaining = await fs.readdir(parentCommands);
    if (remaining.length === 0) {
      await fs.rm(parentCommands, { recursive: true });
    }
    onStep("Removed trazador commands");
  }

  // Remove skills/trazador/ directory
  const skillsDir = path.join(root, "skills", "trazador");
  if (await fileExists(skillsDir)) {
    await fs.rm(skillsDir, { recursive: true });
    const parentSkills = path.join(root, "skills");
    const remaining = await fs.readdir(parentSkills);
    if (remaining.length === 0) {
      await fs.rm(parentSkills, { recursive: true });
    }
    onStep("Removed trazador skills");
  }

  // Clean up empty .claude/ directory
  if (await fileExists(root)) {
    try {
      const remaining = await fs.readdir(root);
      if (remaining.length === 0) {
        await fs.rm(root, { recursive: true });
      }
    } catch {
      /* ignore */
    }
  }

  // Clean up old install formats (bare commands/, skills/, .claude-plugin/ at project root)
  const oldPaths = [
    path.join(cwd, ".claude-plugin"),
    path.join(cwd, "commands", "trazador"),
    path.join(cwd, "skills", "trazador"),
  ];
  for (const oldPath of oldPaths) {
    if (await fileExists(oldPath)) {
      await fs.rm(oldPath, { recursive: true });
      const parent = path.dirname(oldPath);
      try {
        const remaining = await fs.readdir(parent);
        if (remaining.length === 0) await fs.rm(parent, { recursive: true });
      } catch {
        /* ignore */
      }
      onStep(`Removed old ${path.relative(cwd, oldPath)}`);
    }
  }

  // Derive MCP server names to remove from meta or provider mcp.json
  const mcpPath = path.join(cwd, ".mcp.json");
  if (await fileExists(mcpPath)) {
    const content = await fs.readFile(mcpPath, "utf-8");
    try {
      const mcpConfig = JSON.parse(content);
      const serverNames = await getTrazadorServerNames(meta);
      let removed = false;
      for (const server of serverNames) {
        if (mcpConfig.mcpServers?.[server]) {
          delete mcpConfig.mcpServers[server];
          removed = true;
        }
      }
      if (removed) {
        if (Object.keys(mcpConfig.mcpServers || {}).length === 0) {
          await fs.unlink(mcpPath);
          onStep("Removed .mcp.json");
        } else {
          await fs.writeFile(
            mcpPath,
            JSON.stringify(mcpConfig, null, 2) + "\n",
          );
          onStep("Removed trazador entries from .mcp.json");
        }
      }
    } catch {
      // skip
    }
  }
}

/**
 * Derive MCP server names from meta.json tools list and provider mcp.json files,
 * rather than hardcoding them.
 */
async function getTrazadorServerNames(
  meta: { tools?: string[] } | undefined,
): Promise<string[]> {
  const tools = meta?.tools ?? ["linear"];
  const names: string[] = [];
  for (const tool of tools) {
    const mcpSrc = path.join(packageRoot, "providers", tool, "mcp.json");
    if (await fileExists(mcpSrc)) {
      try {
        const mcpConfig = JSON.parse(await fs.readFile(mcpSrc, "utf-8"));
        names.push(...Object.keys(mcpConfig.mcpServers || {}));
      } catch {
        /* ignore */
      }
    }
  }
  // Fallback: if no names were found, use the known ones
  if (names.length === 0) {
    names.push("linear-server");
  }
  return names;
}

async function removeCodex(
  scope: Scope,
  cwd: string,
  onStep: (msg: string) => void,
): Promise<void> {
  const root = codexRoot(scope, cwd);
  const skillsBase = path.join(
    scope === "project" ? cwd : root,
    ".agents",
    "skills",
  );

  if (await fileExists(skillsBase)) {
    const entries = await fs.readdir(skillsBase);
    for (const entry of entries) {
      if (entry.startsWith("trazador-")) {
        await fs.rm(path.join(skillsBase, entry), { recursive: true });
      }
    }
    const remaining = await fs.readdir(skillsBase);
    if (remaining.length === 0) {
      await fs.rm(path.join(scope === "project" ? cwd : root, ".agents"), {
        recursive: true,
      });
    }
    onStep("Removed trazador skills from .agents/skills/");
  }

  const codexConfigDir = scope === "global" ? root : path.join(cwd, ".codex");
  const configTomlPath = path.join(codexConfigDir, "config.toml");

  if (await fileExists(configTomlPath)) {
    const content = await fs.readFile(configTomlPath, "utf-8");
    // Remove trazador-managed MCP sections
    let cleaned = content;
    // Remove the trazador comment block and linear-server section
    cleaned = cleaned.replace(
      /# Trazador MCP configuration[\s\S]*?(?=\[(?!mcp_servers\.linear)|$)/g,
      "",
    );
    // Also remove any remaining linear-server section
    cleaned = cleaned.replace(
      /\[mcp_servers\.linear-server\][\s\S]*?(?=\[|$)/g,
      "",
    );
    cleaned = cleaned.replace(/# PM Tool.*\n/g, "");
    cleaned = cleaned.trim();

    if (cleaned.length === 0) {
      await fs.unlink(configTomlPath);
      try {
        const remaining = await fs.readdir(codexConfigDir);
        if (remaining.length === 0) {
          await fs.rm(codexConfigDir, { recursive: true });
        }
      } catch {
        // ignore
      }
      onStep("Removed .codex/config.toml");
    } else {
      await fs.writeFile(configTomlPath, cleaned + "\n");
      onStep("Removed trazador entries from .codex/config.toml");
    }
  }

  const agentsPath = path.join(cwd, "AGENTS.md");
  if (await fileExists(agentsPath)) {
    const content = await fs.readFile(agentsPath, "utf-8");
    if (content.includes("## Trazador Workflow")) {
      const cleaned = content
        .replace(
          /\n?## Trazador Workflow[\s\S]*?(?=\n## [^T]|\n## $|$)/,
          "",
        )
        .trim();
      if (cleaned.length === 0) {
        await fs.unlink(agentsPath);
        onStep("Removed AGENTS.md (was trazador-only)");
      } else {
        await fs.writeFile(agentsPath, cleaned + "\n");
        onStep("Removed trazador section from AGENTS.md");
      }
    }
  }
}

// --- Helpers ---

async function ensureProviderExists(providerDir: string): Promise<void> {
  if (!(await fileExists(providerDir))) {
    throw new Error(
      `Linear provider not found at ${providerDir}`,
    );
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  if (!(await fileExists(src))) return;

  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}
