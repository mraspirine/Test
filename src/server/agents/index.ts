import type { AgentRunner } from "./AgentRunner";
import { MockAgentRunner } from "./MockAgentRunner";
import { ClaudeAgentRunner } from "./ClaudeAgentRunner";

let cached: AgentRunner | null = null;

/** Factory: pick the runner implementation from the AGENT_RUNNER env var. */
export function getRunner(): AgentRunner {
  if (cached) return cached;
  const kind = (process.env.AGENT_RUNNER ?? "mock").toLowerCase();
  cached = kind === "claude" ? new ClaudeAgentRunner() : new MockAgentRunner();
  return cached;
}

export type { AgentRunner, RunContext, RunEvent } from "./AgentRunner";
