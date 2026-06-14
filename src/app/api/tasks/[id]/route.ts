import { NextResponse } from "next/server";
import * as repo from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await repo.getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [subtasks, runs, events] = await Promise.all([
    repo.listSubtasks(id),
    repo.listRuns(id),
    repo.listEvents(id),
  ]);
  return NextResponse.json({ task, subtasks, runs, events });
}
