import type {
  AgentKind,
  Dimension,
  Finding,
  QaVerdict,
  ReviewUnit,
  Task,
} from "@/domain/types";
import type { McpServerConfig } from "@/server/mcpConfig";

export interface RunContext {
  task: Task;
  agentKind: AgentKind;
  agentId: string;
  runId: string;
  // Reviewer-only:
  unit?: ReviewUnit;
  dimensions?: Dimension[];
  subtaskId?: string;
  // QA / consolidation input:
  findingsSoFar?: Finding[];
  // Lead-only:
  scopedUnits?: ReviewUnit[];
  reworkRound?: number;
  mcpServers: McpServerConfig[];
}

export type RunEvent =
  | { type: "TRIAGE_DECISION"; units: ReviewUnit[]; rationale: string }
  | { type: "AGENT_STEP"; message: string }
  | {
      type: "MCP_CALL";
      server: string;
      tool: string;
      args: Record<string, unknown>;
      message: string;
    }
  | { type: "FINDING_ADDED"; finding: Finding }
  | { type: "QA_DECISION"; verdict: QaVerdict }
  | { type: "DONE"; outcome: { findings?: Finding[]; verdict?: QaVerdict; units?: ReviewUnit[] } }
  | { type: "ERROR"; message: string };

export interface AgentRunner {
  run(ctx: RunContext): AsyncGenerator<RunEvent, void, unknown>;
}
