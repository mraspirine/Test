// Typed persistence layer over the JSON store. This is the single boundary to
// swap for SQLite later — nothing above it reads the file directly.
import { mutateDb, readDb } from "./db";
import type {
  ActivityEvent,
  Agent,
  AgentRun,
  ReviewSubtask,
  ReviewUnit,
  Task,
} from "@/domain/types";

// ---- Agents ----

export async function listAgents(): Promise<Agent[]> {
  return (await readDb()).agents;
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  return (await readDb()).agents.find((a) => a.id === id);
}

export async function getReviewerForUnit(unit: ReviewUnit): Promise<Agent | undefined> {
  return (await readDb()).agents.find(
    (a) => a.kind === "REVIEWER" && a.unit === unit,
  );
}

// ---- Tasks ----

export async function listTasks(): Promise<Task[]> {
  return [...(await readDb()).tasks].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getTask(id: string): Promise<Task | undefined> {
  return (await readDb()).tasks.find((t) => t.id === id);
}

export async function insertTask(task: Task): Promise<Task> {
  return mutateDb((db) => {
    db.tasks.push(task);
    return task;
  });
}

export async function updateTask(
  id: string,
  patch: Partial<Task>,
): Promise<Task | undefined> {
  return mutateDb((db) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    return task;
  });
}

// ---- Subtasks ----

export async function listSubtasks(taskId: string): Promise<ReviewSubtask[]> {
  return (await readDb()).subtasks.filter((s) => s.taskId === taskId);
}

export async function getSubtask(id: string): Promise<ReviewSubtask | undefined> {
  return (await readDb()).subtasks.find((s) => s.id === id);
}

export async function insertSubtasks(subtasks: ReviewSubtask[]): Promise<void> {
  await mutateDb((db) => {
    db.subtasks.push(...subtasks);
  });
}

export async function updateSubtask(
  id: string,
  patch: Partial<ReviewSubtask>,
): Promise<ReviewSubtask | undefined> {
  return mutateDb((db) => {
    const sub = db.subtasks.find((s) => s.id === id);
    if (!sub) return undefined;
    Object.assign(sub, patch);
    return sub;
  });
}

// ---- Runs ----

export async function listRuns(taskId: string): Promise<AgentRun[]> {
  return (await readDb()).runs.filter((r) => r.taskId === taskId);
}

export async function insertRun(run: AgentRun): Promise<AgentRun> {
  return mutateDb((db) => {
    db.runs.push(run);
    return run;
  });
}

export async function updateRun(
  id: string,
  patch: Partial<AgentRun>,
): Promise<AgentRun | undefined> {
  return mutateDb((db) => {
    const run = db.runs.find((r) => r.id === id);
    if (!run) return undefined;
    Object.assign(run, patch);
    return run;
  });
}

// ---- Events ----

export async function listEvents(taskId: string): Promise<ActivityEvent[]> {
  return (await readDb()).events
    .filter((e) => e.taskId === taskId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function listAllEvents(limit = 500): Promise<ActivityEvent[]> {
  const all = [...(await readDb()).events].sort((a, b) => a.at.localeCompare(b.at));
  return all.slice(-limit);
}

export async function insertEvent(event: ActivityEvent): Promise<ActivityEvent> {
  return mutateDb((db) => {
    db.events.push(event);
    return event;
  });
}
