// Core domain types for the UI Review Task System.

export type Dimension =
  | "layout"
  | "typography"
  | "color"
  | "tokens"
  | "fidelity"
  | "a11y"
  | "responsive"
  | "states"
  | "content";

// A "review unit" is one specialist's scope (one reviewer agent owns exactly one unit).
export type ReviewUnit =
  | "layout"
  | "typography"
  | "color"
  | "tokens"
  | "fidelity"
  | "a11y"
  | "behavior"
  | "content";

export type ReviewSide = "design" | "quality";

export type AgentKind = "LEAD" | "REVIEWER" | "QA";

export type Severity = "info" | "minor" | "major" | "blocker";

export type TaskStatus =
  | "CREATED"
  | "TRIAGING"
  | "ASSIGNED"
  | "REVIEWING"
  | "CONSOLIDATING"
  | "REVIEW_DONE"
  | "QA_PENDING"
  | "QA_PASSED"
  | "QA_FAILED"
  | "ESCALATED";

export type SubtaskStatus = "PENDING" | "REVIEWING" | "DONE" | "FAILED";

export type RunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export const MAX_REWORK_ROUNDS = 2;

export interface TargetRef {
  type: "url" | "figmaNode";
  value: string;
}

export interface LeadAgent {
  id: string;
  name: string;
  kind: "LEAD";
}

export interface ReviewerAgent {
  id: string;
  name: string;
  kind: "REVIEWER";
  unit: ReviewUnit;
  side: ReviewSide;
}

export interface QaAgent {
  id: string;
  name: string;
  kind: "QA";
}

export type Agent = LeadAgent | ReviewerAgent | QaAgent;

export interface Finding {
  id: string;
  subtaskId: string;
  unit: ReviewUnit;
  dimension: Dimension;
  severity: Severity;
  area: string;
  message: string;
  evidenceRef?: string;
  dedupOf?: string; // id of the canonical finding this was merged into
}

export interface QaVerdict {
  result: "PASSED" | "FAILED";
  summary: string;
  reworkUnits: ReviewUnit[];
  round: number;
  decidedAt: string;
  qaAgentId: string;
}

export interface ReviewSubtask {
  id: string;
  taskId: string;
  unit: ReviewUnit;
  dimensions: Dimension[];
  assignedReviewerAgentId: string;
  status: SubtaskStatus;
  findings: Finding[];
}

export interface Task {
  id: string;
  title: string;
  target: TargetRef;
  status: TaskStatus;
  scopedUnits: ReviewUnit[];
  reworkRound: number;
  leadAgentId: string;
  qaAgentId: string;
  qaVerdict: QaVerdict | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "STATUS_CHANGED"
  | "TRIAGE_DECISION"
  | "AGENT_STEP"
  | "MCP_CALL"
  | "FINDING_ADDED"
  | "CONSOLIDATED"
  | "QA_DECISION"
  | "ERROR";

export interface ActivityEvent {
  id: string;
  taskId: string;
  subtaskId: string | null;
  runId: string | null;
  agentKind: AgentKind | null;
  agentId: string | null;
  unit: ReviewUnit | null;
  type: ActivityType;
  message: string;
  data?: Record<string, unknown>;
  at: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  subtaskId: string | null;
  agentKind: AgentKind;
  agentId: string;
  unit: ReviewUnit | null;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  error?: string;
}

export interface DbShape {
  tasks: Task[];
  subtasks: ReviewSubtask[];
  runs: AgentRun[];
  events: ActivityEvent[];
  agents: Agent[];
}
