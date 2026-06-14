import { NextResponse } from "next/server";
import * as repo from "@/server/repo";
import { startQa, statusAllows } from "@/server/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await repo.getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!statusAllows(task.status, "qa")) {
    return NextResponse.json({ error: `Cannot run QA from status ${task.status}` }, { status: 409 });
  }
  void startQa(id);
  return NextResponse.json({ accepted: true }, { status: 202 });
}
