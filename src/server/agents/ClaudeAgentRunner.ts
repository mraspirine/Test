import type { AgentRunner, RunContext, RunEvent } from "./AgentRunner";

/**
 * Real Claude-backed runner. Stub for now — selected when AGENT_RUNNER=claude.
 *
 * To implement (single change, no UI/route/game edits needed):
 *   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *   const stream = client.beta.messages.create({
 *     model: process.env.CLAUDE_MODEL ?? "claude-fable-5",
 *     max_tokens: 64000,
 *     stream: true,
 *     // Claude Fable 5: do NOT pass `thinking` (always on), no sampling params,
 *     // no assistant prefill. Control depth via output_config.effort.
 *     output_config: { effort: "high" },
 *     betas: ["mcp-client-2025-11-20", "server-side-fallback-2026-06-01"],
 *     fallbacks: [{ model: "claude-opus-4-8" }],
 *     // Map ctx.mcpServers (the same config the mock uses) into MCP connectors:
 *     mcp_servers: ctx.mcpServers
 *       .filter((s) => s.type === "url" && s.url)
 *       .map((s) => ({ type: "url", name: s.name, url: s.url! })),
 *     system: systemPromptFor(ctx),   // LEAD=triage / REVIEWER=unit+dimensions / QA=severity gating
 *     messages: [{ role: "user", content: userPromptFor(ctx) }],
 *   });
 *   // Parse text / tool_use / mcp_tool_use / mcp_tool_result blocks and translate
 *   // them into the SAME RunEvent stream the mock emits (AGENT_STEP / MCP_CALL /
 *   // FINDING_ADDED / QA_DECISION / TRIAGE_DECISION / DONE).
 */
export class ClaudeAgentRunner implements AgentRunner {
  // eslint-disable-next-line require-yield
  async *run(_ctx: RunContext): AsyncGenerator<RunEvent> {
    throw new Error(
      "ClaudeAgentRunner is not implemented yet. Set AGENT_RUNNER=mock, or implement run() per the comments in ClaudeAgentRunner.ts.",
    );
  }
}
