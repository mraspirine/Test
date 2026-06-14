import { getUnitDef } from "@/domain/dimensions";
import { newId, now } from "@/domain/ids";
import { nextState, type TaskEvent } from "@/domain/stateMachine";
import type {
  ActivityEvent,
  ActivityType,
  AgentKind,
  Finding,
  QaVerdict,
  ReviewSubtask,
  ReviewUnit,
  Task,
  TaskStatus,
} from "@/domain/types";
import { getEnabledServers } from "@/server/mcpConfig";
import { publish } from "@/server/eventBus";
import { getRunner, type RunContext } from "@/server/agents";
import * as repo from "@/server/repo";

// ---- event emission ----

interface EmitInput {
  taskId: string;
  subtaskId?: string | null;
  runId?: string | null;
  agentKind?: AgentKind | null;
  agentId?: string | null;
  unit?: ReviewUnit | null;
  type: ActivityType;
  message: string;
  data?: Record<string, unknown>;
}

async function emit(input: EmitInput): Promise<void> {
  const event: ActivityEvent = {
    id: newId("evt"),
    taskId: input.taskId,
    subtaskId: input.subtaskId ?? null,
    runId: input.runId ?? null,
    agentKind: input.agentKind ?? null,
    agentId: input.agentId ?? null,
    unit: input.unit ?? null,
    type: input.type,
    message: input.message,
    data: input.data,
    at: now(),
  };
  await repo.insertEvent(event);
  publish(event);
}

async function setStatus(task: Task, event: TaskEvent): Promise<Task> {
  const to = nextState(task.status, event, { reworkRound: task.reworkRound });
  if (!to) throw new Error(`Illegal transition ${task.status} -(${event})-> ?`);
  const updated = (await repo.updateTask(task.id, { status: to }))!;
  await emit({
    taskId: task.id,
    type: "STATUS_CHANGED",
    message: `${task.status} → ${to}`,
    data: { from: task.status, to, event },
  });
  return updated;
}

// ---- generic agent run ----

interface RunOutcome {
  findings: Finding[];
  verdict?: QaVerdict;
  units?: ReviewUnit[];
}

async function runAgent(ctx: RunContext): Promise<RunOutcome> {
  const run = await repo.insertRun({
    id: ctx.runId,
    taskId: ctx.task.id,
    subtaskId: ctx.subtaskId ?? null,
    agentKind: ctx.agentKind,
    agentId: ctx.agentId,
    unit: ctx.unit ?? null,
    status: "RUNNING",
    startedAt: now(),
    finishedAt: null,
  });

  const outcome: RunOutcome = { findings: [] };
  const base = {
    taskId: ctx.task.id,
    subtaskId: ctx.subtaskId ?? null,
    runId: run.id,
    agentKind: ctx.agentKind,
    agentId: ctx.agentId,
    unit: ctx.unit ?? null,
  };

  try {
    for await (const ev of getRunner().run(ctx)) {
      switch (ev.type) {
        case "TRIAGE_DECISION":
          outcome.units = ev.units;
          await emit({ ...base, type: "TRIAGE_DECISION", message: ev.rationale, data: { units: ev.units } });
          break;
        case "AGENT_STEP":
          await emit({ ...base, type: "AGENT_STEP", message: ev.message });
          break;
        case "MCP_CALL":
          await emit({
            ...base,
            type: "MCP_CALL",
            message: ev.message,
            data: { server: ev.server, tool: ev.tool, args: ev.args },
          });
          break;
        case "FINDING_ADDED":
          outcome.findings.push(ev.finding);
          await emit({
            ...base,
            type: "FINDING_ADDED",
            message: `[${ev.finding.severity}] ${ev.finding.message}`,
            data: { finding: ev.finding },
          });
          break;
        case "QA_DECISION":
          outcome.verdict = ev.verdict;
          await emit({ ...base, type: "QA_DECISION", message: ev.verdict.summary, data: { verdict: ev.verdict } });
          break;
        case "ERROR":
          await emit({ ...base, type: "ERROR", message: ev.message });
          await repo.updateRun(run.id, { status: "FAILED", finishedAt: now(), error: ev.message });
          throw new Error(ev.message);
        case "DONE":
          break;
      }
    }
    await repo.updateRun(run.id, { status: "COMPLETED", finishedAt: now() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await repo.updateRun(run.id, { status: "FAILED", finishedAt: now(), error: msg });
    throw err;
  }

  return outcome;
}

// ---- public workflow steps ----

/** Create a task in CREATED state (caller then kicks off startTask in the background). */
export async function createTask(input: { title: string; target: Task["target"] }): Promise<Task> {
  const agents = await repo.listAgents();
  const lead = agents.find((a) => a.kind === "LEAD");
  const qa = agents.find((a) => a.kind === "QA");
  if (!lead || !qa) throw new Error("Roster missing LEAD or QA agent");
  const ts = now();
  const task: Task = {
    id: newId("task"),
    title: input.title,
    target: input.target,
    status: "CREATED",
    scopedUnits: [],
    reworkRound: 0,
    leadAgentId: lead.id,
    qaAgentId: qa.id,
    qaVerdict: null,
    createdAt: ts,
    updatedAt: ts,
  };
  await repo.insertTask(task);
  await emit({ taskId: task.id, type: "STATUS_CHANGED", message: `Task created: ${task.title}`, data: { to: "CREATED" } });
  return task;
}

/** Lead triage → scope units → create + assign subtasks → ASSIGNED. */
export async function startTask(taskId: string): Promise<void> {
  const task = await requireTask(taskId);
  if (task.status !== "CREATED") return;
  await setStatus(task, "triage");
  const servers = await getEnabledServers();

  const triaged = await guard(taskId, () =>
    runAgent({
      task,
      agentKind: "LEAD",
      agentId: task.leadAgentId,
      runId: newId("run"),
      mcpServers: servers,
    }),
  );
  if (!triaged) return;

  const units = triaged.units ?? [];
  const subtasks: ReviewSubtask[] = [];
  for (const unit of units) {
    const def = getUnitDef(unit);
    const reviewer = await repo.getReviewerForUnit(unit);
    subtasks.push({
      id: newId("sub"),
      taskId,
      unit,
      dimensions: def.dimensions,
      assignedReviewerAgentId: reviewer?.id ?? def.agentId,
      status: "PENDING",
      findings: [],
    });
  }
  await repo.insertSubtasks(subtasks);
  await repo.updateTask(taskId, { scopedUnits: units });
  const t2 = (await repo.getTask(taskId))!;
  await setStatus(t2, "scoped");
}

/** Fan-out reviewers for all PENDING subtasks, consolidate, then QA_PENDING. */
export async function startReview(taskId: string): Promise<void> {
  let task = await requireTask(taskId);
  if (task.status !== "ASSIGNED") return;
  task = await setStatus(task, "startReview");
  await runPendingReviews(taskId);
}

async function runPendingReviews(taskId: string): Promise<void> {
  const task = await requireTask(taskId);
  const servers = await getEnabledServers();
  const subtasks = (await repo.listSubtasks(taskId)).filter((s) => s.status === "PENDING");

  await Promise.allSettled(
    subtasks.map(async (sub) => {
      await repo.updateSubtask(sub.id, { status: "REVIEWING" });
      try {
        const out = await runAgent({
          task,
          agentKind: "REVIEWER",
          agentId: sub.assignedReviewerAgentId,
          runId: newId("run"),
          unit: sub.unit,
          dimensions: sub.dimensions,
          subtaskId: sub.id,
          mcpServers: servers,
        });
        await repo.updateSubtask(sub.id, { status: "DONE", findings: out.findings });
      } catch {
        await repo.updateSubtask(sub.id, { status: "FAILED" });
      }
    }),
  );

  await consolidateAndQueue(taskId);
}

/** Merge near-duplicate findings, then move to REVIEW_DONE → QA_PENDING. */
async function consolidateAndQueue(taskId: string): Promise<void> {
  let task = await requireTask(taskId);
  task = await setStatus(task, "allSubtasksDone"); // → CONSOLIDATING

  const subtasks = await repo.listSubtasks(taskId);
  const all = subtasks.flatMap((s) => s.findings);
  // Dedup heuristic: same area + same first 5 words of message → keep highest severity.
  const seen = new Map<string, Finding>();
  let merged = 0;
  for (const f of all) {
    const key = `${f.area}::${f.message.split(/\s+/).slice(0, 5).join(" ").toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, f);
    } else {
      f.dedupOf = existing.id;
      merged++;
    }
  }
  if (merged > 0) {
    // Persist dedupOf flags back onto their subtasks.
    for (const sub of subtasks) {
      await repo.updateSubtask(sub.id, { findings: sub.findings });
    }
    await emit({
      taskId,
      type: "CONSOLIDATED",
      message: `Merged ${merged} duplicate finding(s) across units`,
      data: { merged },
    });
  }

  task = await setStatus(task, "merged"); // → REVIEW_DONE
  await setStatus(task, "submitToQa"); // → QA_PENDING
}

/** Run QA over consolidated findings, apply severity gating + bounded loop. */
export async function startQa(taskId: string): Promise<void> {
  const task = await requireTask(taskId);
  if (task.status !== "QA_PENDING") return;
  const servers = await getEnabledServers();
  const subtasks = await repo.listSubtasks(taskId);
  const findings = subtasks.flatMap((s) => s.findings);

  const out = await guard(taskId, () =>
    runAgent({
      task,
      agentKind: "QA",
      agentId: task.qaAgentId,
      runId: newId("run"),
      findingsSoFar: findings,
      reworkRound: task.reworkRound,
      mcpServers: servers,
    }),
  );
  if (!out?.verdict) return;

  const verdict = out.verdict;
  await repo.updateTask(taskId, { qaVerdict: verdict });
  const fresh = (await repo.getTask(taskId))!;

  if (verdict.result === "PASSED") {
    await setStatus(fresh, "qaPass");
  } else {
    await setStatus(fresh, "qaFail"); // → QA_FAILED or ESCALATED (round-gated)
  }
}

/** Reopen failed units for another review round (bounded by MAX_REWORK_ROUNDS). */
export async function reopen(taskId: string): Promise<void> {
  const task = await requireTask(taskId);
  if (task.status !== "QA_FAILED") return;
  const reworkUnits = task.qaVerdict?.reworkUnits ?? [];

  const subtasks = await repo.listSubtasks(taskId);
  for (const sub of subtasks) {
    if (reworkUnits.includes(sub.unit)) {
      await repo.updateSubtask(sub.id, { status: "PENDING", findings: [] });
    }
  }
  await repo.updateTask(taskId, { reworkRound: task.reworkRound + 1 });
  const fresh = (await repo.getTask(taskId))!;
  await setStatus(fresh, "reopen"); // → REVIEWING
  await emit({
    taskId,
    type: "STATUS_CHANGED",
    message: `Rework round ${fresh.reworkRound}: re-running ${reworkUnits.join(", ")}`,
    data: { round: fresh.reworkRound, reworkUnits },
  });
  await runPendingReviews(taskId);
}

// ---- helpers ----

async function requireTask(taskId: string): Promise<Task> {
  const task = await repo.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return task;
}

/** Run a step; on failure emit an ERROR event instead of crashing the request. */
async function guard<T>(taskId: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    await emit({
      taskId,
      type: "ERROR",
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function statusAllows(status: TaskStatus, action: "review" | "qa" | "reopen"): boolean {
  if (action === "review") return status === "ASSIGNED";
  if (action === "qa") return status === "QA_PENDING";
  return status === "QA_FAILED";
}
