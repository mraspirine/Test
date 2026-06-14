import type { ActivityEvent } from "@/domain/types";

type Listener = (event: ActivityEvent) => void;

interface Bus {
  perTask: Map<string, Set<Listener>>;
  global: Set<Listener>;
}

// Survive Next.js dev hot-reloads by stashing the bus on globalThis.
const g = globalThis as unknown as { __uiReviewBus?: Bus };
const bus: Bus =
  g.__uiReviewBus ?? (g.__uiReviewBus = { perTask: new Map(), global: new Set() });

export function publish(event: ActivityEvent): void {
  bus.global.forEach((l) => l(event));
  bus.perTask.get(event.taskId)?.forEach((l) => l(event));
}

export function subscribeTask(taskId: string, listener: Listener): () => void {
  let set = bus.perTask.get(taskId);
  if (!set) {
    set = new Set();
    bus.perTask.set(taskId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) bus.perTask.delete(taskId);
  };
}

export function subscribeGlobal(listener: Listener): () => void {
  bus.global.add(listener);
  return () => {
    bus.global.delete(listener);
  };
}
