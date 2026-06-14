import { MAX_REWORK_ROUNDS, type TaskStatus } from "./types";

export type TaskEvent =
  | "triage"
  | "scoped"
  | "startReview"
  | "allSubtasksDone"
  | "merged"
  | "submitToQa"
  | "qaPass"
  | "qaFail"
  | "reopen";

// from -> event -> to (static edges; qaFail is dynamic, handled below)
const TRANSITIONS: Partial<Record<TaskStatus, Partial<Record<TaskEvent, TaskStatus>>>> = {
  CREATED: { triage: "TRIAGING" },
  TRIAGING: { scoped: "ASSIGNED" },
  ASSIGNED: { startReview: "REVIEWING" },
  REVIEWING: { allSubtasksDone: "CONSOLIDATING" },
  CONSOLIDATING: { merged: "REVIEW_DONE" },
  REVIEW_DONE: { submitToQa: "QA_PENDING" },
  QA_PENDING: { qaPass: "QA_PASSED" },
  QA_FAILED: { reopen: "REVIEWING" },
};

export interface TransitionCtx {
  reworkRound: number;
}

export function nextState(
  from: TaskStatus,
  event: TaskEvent,
  ctx: TransitionCtx = { reworkRound: 0 },
): TaskStatus | null {
  // qaFail branches on how many rework rounds have already happened.
  if (from === "QA_PENDING" && event === "qaFail") {
    return ctx.reworkRound >= MAX_REWORK_ROUNDS ? "ESCALATED" : "QA_FAILED";
  }
  return TRANSITIONS[from]?.[event] ?? null;
}

export function canTransition(
  from: TaskStatus,
  event: TaskEvent,
  ctx: TransitionCtx = { reworkRound: 0 },
): boolean {
  return nextState(from, event, ctx) !== null;
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "QA_PASSED" || status === "ESCALATED";
}
