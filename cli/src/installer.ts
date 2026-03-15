import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type { Scope, Agent, Tool } from "./types.js";

interface InstallOptions {
  scope: Scope;
  agents: Agent[];
  tool: Tool;
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

function opencodeRoot(scope: Scope, cwd: string): string {
  return scope === "global"
    ? path.join(homeDir, ".config", "opencode")
    : path.join(cwd, ".opencode");
}

function normalizeAgents(
  input: Agent[] | string[] | string | undefined,
): Agent[] {
  if (Array.isArray(input)) {
    const raw = input
      .map((item) => item.toLowerCase())
      .filter((item) => item === "claude" || item === "codex" || item === "opencode") as Agent[];
    if (raw.length > 0) return Array.from(new Set(raw));
    return ["claude", "codex", "opencode"];
  }

  if (input === "both") return ["claude", "codex"];
  if (input === "all") return ["claude", "codex", "opencode"];
  if (input === "claude" || input === "codex" || input === "opencode") {
    return [input];
  }
  return ["claude", "codex", "opencode"];
}

export async function install({
  scope,
  agents,
  tool,
  cwd,
  onStep,
}: InstallOptions): Promise<void> {
  const normalizedAgents = normalizeAgents(agents);

  const scopeLabel = scope === "global" ? "globally" : "for this project";
  onStep(`Installing ${scopeLabel}`);

  const providerDir = path.join(packageRoot, "providers", tool);
  await ensureProviderExists(providerDir);

  // Detect existing install and clean up if switching providers
  const metaDir =
    scope === "global"
      ? path.join(homeDir, ".trazador")
      : path.join(cwd, ".trazador");
  const existingMetaPath = path.join(metaDir, "meta.json");
  if (await fileExists(existingMetaPath)) {
    const existingMeta = JSON.parse(
      await fs.readFile(existingMetaPath, "utf-8"),
    );
    const existingTool = existingMeta.tools?.[0] ?? "linear";
    const existingAgents = normalizeAgents(existingMeta.agents ?? existingMeta.agent);
    const sameAgents =
      existingAgents.length === normalizedAgents.length &&
      existingAgents.every((item) => normalizedAgents.includes(item));
    if (existingTool !== tool || !sameAgents) {
      onStep(
        `Removing previous install (${existingTool}/${existingAgents.join("+")})`,
      );
      await uninstall({ cwd, onStep: () => {} });
    }
  }

  for (const ag of normalizedAgents) {
    if (ag === "claude") {
      await installClaude({ scope, tool, cwd, onStep });
    } else if (ag === "codex") {
      await installCodex({ scope, tool, cwd, onStep });
    } else {
      await installOpenCode({ scope, tool, cwd, onStep });
    }
  }

  // Write installation metadata
  onStep("Writing installation metadata");
  await fs.mkdir(metaDir, { recursive: true });

  const version = await readPackageVersion();
  const meta = {
    scope,
    agents: normalizedAgents,
    tools: [tool],
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
    | {
        scope?: string;
        agent?: string;
        agents?: string[];
        tools?: string[];
        tool?: string;
      }
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

  const agents = normalizeAgents(meta?.agents ?? meta?.agent);

  if (agents.includes("claude")) {
    await removeClaude(metaScope, cwd, meta, onStep);
  }

  if (agents.includes("codex")) {
    await removeCodex(metaScope, cwd, onStep);
  }

  if (agents.includes("opencode")) {
    await removeOpenCode(metaScope, cwd, onStep);
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
  tool,
  cwd,
  onStep,
}: {
  scope: Scope;
  tool: Tool;
  cwd: string;
  onStep: (msg: string) => void;
}): Promise<void> {
  const root = claudeRoot(scope, cwd);
  const providerDir = path.join(packageRoot, "providers", tool);

  // Copy commands -> commands/trazador/*.md
  const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
  onStep(`Installing ${toolName} commands`);
  const srcCommands = path.join(providerDir, "commands");
  const destCommands = path.join(root, "commands", "trazador");
  await copyDir(srcCommands, destCommands);

  // Copy skills -> skills/ (trazador/, trazador-spec-validation/, trazador-research/, trazador-tdd/)
  onStep(`Installing ${toolName} skills`);
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
  tool,
  cwd,
  onStep,
}: {
  scope: Scope;
  tool: Tool;
  cwd: string;
  onStep: (msg: string) => void;
}): Promise<void> {
  const root = codexRoot(scope, cwd);
  const providerDir = path.join(packageRoot, "providers", tool);

  const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
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
      content = content.replace(/\{\{tool\}\}/g, tool);
      content = content.replace(/\{\{tool_name\}\}/g, toolName);

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

  // 2. Install skills from provider (commands as skills + dedicated skill files)
  const skillsRoot = scope === "global" ? root : cwd;

  // 2a. Copy command files as skills (trazador-init, trazador-plan, etc.)
  const srcCommands = path.join(providerDir, "commands");
  if (await fileExists(srcCommands)) {
    onStep(`Installing ${toolName} skills for Codex`);
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

      let content = await fs.readFile(
        path.join(srcCommands, entry),
        "utf-8",
      );
      content = transformCommandToSkill(content);
      await fs.writeFile(path.join(skillDir, "SKILL.md"), content);
    }
  }

  // 2b. Copy dedicated skill files (trazador-spec-validation, trazador-research, trazador-tdd, etc.)
  const srcSkills = path.join(providerDir, "skills");
  if (await fileExists(srcSkills)) {
    const skillEntries = await fs.readdir(srcSkills, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(
        skillsRoot,
        ".agents",
        "skills",
        entry.name,
      );
      await copyDir(path.join(srcSkills, entry.name), skillDir);
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
        // End of trazador block: any [section] that isn't an MCP server definition
        if (
          line.startsWith("[") &&
          !line.startsWith("[mcp_servers.")
        ) {
          inTrazadorSection = false;
          kept.push(line);
        }
        // skip trazador lines (including mcp_servers.* within the block)
        continue;
      }
      kept.push(line);
    }
    existingNonTrazador = kept.join("\n").trim();
  }

  const mcpSrc = path.join(providerDir, "mcp.json");
  const tomlLines: string[] = [
    "# Trazador MCP configuration for Codex CLI",
    `# PM Tool: ${toolName}`,
    "",
  ];

  if (await fileExists(mcpSrc)) {
    const mcpConfig = JSON.parse(await fs.readFile(mcpSrc, "utf-8"));

    for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
      const cfg = config as Record<string, unknown>;
      tomlLines.push(`[mcp_servers.${name}]`);

      if (cfg.type === "http" && cfg.url) {
        tomlLines.push(`url = "${cfg.url}"`);
        // Codex-specific: bearer_token_env_var for PAT-based auth
        const codexCfg = cfg.codex as Record<string, string> | undefined;
        if (codexCfg?.bearer_token_env_var) {
          tomlLines.push(
            `bearer_token_env_var = "${codexCfg.bearer_token_env_var}"`,
          );
        }
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

// --- OpenCode installer ---

async function installOpenCode({
  scope,
  tool,
  cwd,
  onStep,
}: {
  scope: Scope;
  tool: Tool;
  cwd: string;
  onStep: (msg: string) => void;
}): Promise<void> {
  const root = opencodeRoot(scope, cwd);
  const providerDir = path.join(packageRoot, "providers", tool);
  const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);

  onStep("Setting up OpenCode skills");
  const skillsRoot = path.join(root, "skills");

  // Copy command files as skills (trazador-init, trazador-plan, etc.)
  const srcCommands = path.join(providerDir, "commands");
  if (await fileExists(srcCommands)) {
    onStep(`Installing ${toolName} workflow skills for OpenCode`);
    const entries = await fs.readdir(srcCommands);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const skillName = `trazador-${entry.replace(".md", "")}`;
      const skillDir = path.join(skillsRoot, skillName);
      await fs.mkdir(skillDir, { recursive: true });

      let content = await fs.readFile(path.join(srcCommands, entry), "utf-8");
      content = transformCommandToSkill(content);

      await fs.writeFile(path.join(skillDir, "SKILL.md"), content);
    }
  }

  // Copy dedicated methodology skills
  const srcSkills = path.join(providerDir, "skills");
  if (await fileExists(srcSkills)) {
    const skillEntries = await fs.readdir(srcSkills, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(skillsRoot, entry.name);
      await copyDir(path.join(srcSkills, entry.name), skillDir);
    }
  }
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

  // Remove all trazador skill directories (trazador/, trazador-spec-validation/, trazador-research/, trazador-tdd/)
  const parentSkills = path.join(root, "skills");
  if (await fileExists(parentSkills)) {
    const skillEntries = await fs.readdir(parentSkills);
    let removedAny = false;
    for (const entry of skillEntries) {
      if (entry.startsWith("trazador")) {
        await fs.rm(path.join(parentSkills, entry), { recursive: true });
        removedAny = true;
      }
    }
    if (removedAny) {
      const remaining = await fs.readdir(parentSkills);
      if (remaining.length === 0) {
        await fs.rm(parentSkills, { recursive: true });
      }
      onStep("Removed trazador skills");
    }
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
      if (entry === "trazador" || entry.startsWith("trazador-")) {
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
    // Remove trazador-managed MCP sections (provider-agnostic)
    let cleaned = content;
    // Remove the entire trazador block: from comment header to next non-trazador section or EOF
    cleaned = cleaned.replace(
      /# Trazador MCP configuration[\s\S]*?(?=\n\[(?!mcp_servers\.)|\n#(?! (?:Trazador|PM Tool))|\s*$)/g,
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

async function removeOpenCode(
  scope: Scope,
  cwd: string,
  onStep: (msg: string) => void,
): Promise<void> {
  const root = opencodeRoot(scope, cwd);
  const skillsBase = path.join(root, "skills");

  if (!(await fileExists(skillsBase))) {
    return;
  }

  const entries = await fs.readdir(skillsBase);
  let removedAny = false;
  for (const entry of entries) {
    if (entry === "trazador" || entry.startsWith("trazador-")) {
      await fs.rm(path.join(skillsBase, entry), { recursive: true });
      removedAny = true;
    }
  }

  if (!removedAny) {
    return;
  }

  const remainingSkills = await fs.readdir(skillsBase);
  if (remainingSkills.length === 0) {
    await fs.rm(skillsBase, { recursive: true });
    try {
      const remainingRoot = await fs.readdir(root);
      if (remainingRoot.length === 0) {
        await fs.rm(root, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  const displayPath =
    scope === "global" ? "~/.config/opencode/skills/" : ".opencode/skills/";
  onStep(`Removed trazador skills from ${displayPath}`);
}

// --- Helpers ---

async function ensureProviderExists(providerDir: string): Promise<void> {
  if (!(await fileExists(providerDir))) {
    throw new Error(
      `Provider not found at ${providerDir}`,
    );
  }
}

function transformCommandToSkill(content: string): string {
  return content.replace(
    /^---\n([\s\S]*?)---\n/,
    (_match: string, frontmatter: string) => {
      let fm = frontmatter;
      fm = fm.replace(/name:\s*trazador:(\S+)/, "name: trazador-$1");
      fm = fm.replace(/^argument-hint:.*\n/m, "");
      return `---\n${fm}---\n`;
    },
  );
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
