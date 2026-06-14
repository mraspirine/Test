import { NextResponse } from "next/server";
import { readMcpConfig, writeMcpConfig } from "@/server/mcpConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readMcpConfig();
  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const saved = await writeMcpConfig(body);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid config" },
      { status: 400 },
    );
  }
}
