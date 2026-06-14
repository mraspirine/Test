import { NextResponse } from "next/server";
import * as repo from "@/server/repo";
import { createTask, startTask } from "@/server/orchestrator";
import type { TargetRef } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = await repo.listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  let body: { title?: string; target?: TargetRef };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  const target = body.target;
  if (!title || !target || (target.type !== "url" && target.type !== "figmaNode") || !target.value?.trim()) {
    return NextResponse.json({ error: "title and target {type,value} are required" }, { status: 400 });
  }

  const task = await createTask({ title, target: { type: target.type, value: target.value.trim() } });
  // Kick off Lead triage in the background; respond immediately.
  void startTask(task.id);
  return NextResponse.json({ task }, { status: 201 });
}
