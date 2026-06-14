import { promises as fs } from "node:fs";
import path from "node:path";
import { getUnitDef } from "@/domain/dimensions";
import type { ReviewUnit } from "@/domain/types";

export interface McpServerConfig {
  name: string;
  type: "url" | "command";
  url?: string;
  command?: string;
  enabled: boolean;
  tools: string[];
}

export interface McpConfig {
  servers: McpServerConfig[];
}

const CONFIG_FILE = path.join(process.cwd(), "data", "mcp.config.json");

const DEFAULT_CONFIG: McpConfig = {
  servers: [
    {
      name: "figma",
      type: "url",
      url: "https://mcp.figma.com/mcp",
      enabled: true,
      tools: [
        "get_screenshot",
        "get_design_context",
        "get_metadata",
        "get_variable_defs",
        "get_code_connect_map",
      ],
    },
  ],
};

function validate(raw: unknown): McpConfig {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as McpConfig).servers)) {
    throw new Error("Invalid MCP config: expected { servers: [...] }");
  }
  const servers = (raw as McpConfig).servers.map((s, i) => {
    if (!s.name || (s.type !== "url" && s.type !== "command")) {
      throw new Error(`Invalid MCP server at index ${i}`);
    }
    return {
      name: s.name,
      type: s.type,
      url: s.url,
      command: s.command,
      enabled: Boolean(s.enabled),
      tools: Array.isArray(s.tools) ? s.tools : [],
    } satisfies McpServerConfig;
  });
  return { servers };
}

export async function readMcpConfig(): Promise<McpConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    return validate(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeMcpConfig(config: unknown): Promise<McpConfig> {
  const valid = validate(config);
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(valid, null, 2), "utf8");
  return valid;
}

export async function getEnabledServers(): Promise<McpServerConfig[]> {
  return (await readMcpConfig()).servers.filter((s) => s.enabled);
}

/**
 * Resolve which (server, tool) pairs a unit can actually use given the enabled
 * servers. A unit's preferred tools are matched against tools each server
 * exposes — this is how the mock decides what MCP_CALLs to emit.
 */
export async function resolveUnitToolCalls(
  unit: ReviewUnit,
): Promise<{ server: string; tool: string }[]> {
  const def = getUnitDef(unit);
  const servers = await getEnabledServers();
  const calls: { server: string; tool: string }[] = [];
  for (const tool of def.tools) {
    const server = servers.find((s) => s.tools.includes(tool));
    if (server) calls.push({ server: server.name, tool });
  }
  // If none of the preferred tools are available but a server is enabled,
  // fall back to that server's first tool so the lane still shows MCP activity.
  if (calls.length === 0 && servers.length > 0 && servers[0].tools.length > 0) {
    calls.push({ server: servers[0].name, tool: servers[0].tools[0] });
  }
  return calls;
}
