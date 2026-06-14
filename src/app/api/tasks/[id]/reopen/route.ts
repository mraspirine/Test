import { NextResponse } from "next/server";
import * as repo from "@/server/repo";
import { reopen, statusAllows } from "@/server/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await repo.getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!statusAllows(task.status, "reopen")) {
    return NextResponse.json({ error: `Cannot reopen from status ${task.status}` }, { status: 409 });
  }
  void reopen(id);
  return NextResponse.json({ accepted: true }, { status: 202 });
}
