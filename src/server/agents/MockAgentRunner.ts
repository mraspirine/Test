import { getUnitDef } from "@/domain/dimensions";
import { newId, now } from "@/domain/ids";
import type { Dimension, Finding, ReviewUnit, Severity } from "@/domain/types";
import type { McpServerConfig } from "@/server/mcpConfig";
import type { AgentRunner, RunContext, RunEvent } from "./AgentRunner";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface FindingTemplate {
  area: string;
  message: string;
  severity: Severity;
}

// A small catalogue of plausible findings per dimension. The mock picks a
// random subset so repeated runs look lively but deterministic-ish in shape.
const CATALOG: Record<Dimension, FindingTemplate[]> = {
  layout: [
    { area: "spacing", message: "Card padding is 18px but the 8pt grid expects 16px or 24px.", severity: "minor" },
    { area: "alignment", message: "Hero CTA is 3px off the baseline grid versus the heading.", severity: "minor" },
    { area: "grid", message: "Footer columns break alignment at the 1024px container.", severity: "major" },
  ],
  typography: [
    { area: "scale", message: "Body uses 15px, not on the type scale (14/16/18).", severity: "minor" },
    { area: "hierarchy", message: "H2 and H3 are visually indistinguishable (same weight).", severity: "major" },
    { area: "line-height", message: "Paragraph line-height 1.2 is too tight for readability.", severity: "minor" },
  ],
  color: [
    { area: "contrast", message: "Secondary text #9AA0A6 on white is 2.8:1 — fails WCAG AA.", severity: "major" },
    { area: "palette", message: "Button hover uses an off-brand blue not in the palette.", severity: "minor" },
    { area: "contrast", message: "Disabled label contrast is below 3:1.", severity: "info" },
  ],
  tokens: [
    { area: "token", message: "Primary button color is hardcoded #2D6CDF instead of color/brand/primary.", severity: "major" },
    { area: "token", message: "Spacing value 12px bypasses the spacing token scale.", severity: "minor" },
    { area: "token", message: "Radius uses literal 6px rather than radius/md token.", severity: "info" },
  ],
  fidelity: [
    { area: "diff", message: "Implemented card shadow differs from Figma (blur 24 vs 12).", severity: "minor" },
    { area: "diff", message: "Hero illustration is cropped 40px tighter than the design.", severity: "major" },
    { area: "diff", message: "Nav order differs: Pricing appears before Features.", severity: "blocker" },
  ],
  a11y: [
    { area: "focus", message: "Primary button has no visible focus ring (keyboard users blocked).", severity: "major" },
    { area: "aria", message: "Icon-only close button is missing an accessible name.", severity: "blocker" },
    { area: "tap-target", message: "Footer links are 32px tall, below the 44px minimum.", severity: "minor" },
  ],
  responsive: [
    { area: "breakpoint", message: "At 375px the pricing table overflows horizontally.", severity: "major" },
    { area: "breakpoint", message: "Sidebar does not collapse below 768px.", severity: "minor" },
  ],
  states: [
    { area: "state", message: "Form submit has no loading state; double-submit is possible.", severity: "major" },
    { area: "state", message: "Empty cart view is missing entirely.", severity: "minor" },
    { area: "state", message: "Input error state uses color only (no icon/text).", severity: "info" },
  ],
  content: [
    { area: "typo", message: '"Recieve updates" should be "Receive updates".', severity: "minor" },
    { area: "tone", message: "Error copy is blaming ('You did it wrong'); soften it.", severity: "info" },
    { area: "microcopy", message: "CTA says 'Submit'; 'Create account' is clearer.", severity: "minor" },
  ],
};

function pickSome<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.min(arr.length, min + Math.floor(Math.random() * (max - min + 1)));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function toolCallsForUnit(unit: ReviewUnit, servers: McpServerConfig[]): { server: string; tool: string }[] {
  const def = getUnitDef(unit);
  const calls: { server: string; tool: string }[] = [];
  for (const tool of def.tools) {
    const server = servers.find((s) => s.tools.includes(tool));
    if (server) calls.push({ server: server.name, tool });
  }
  if (calls.length === 0 && servers.length > 0 && servers[0].tools.length > 0) {
    calls.push({ server: servers[0].name, tool: servers[0].tools[0] });
  }
  return calls;
}

async function* runLead(ctx: RunContext): AsyncGenerator<RunEvent> {
  yield { type: "AGENT_STEP", message: `Triaging "${ctx.task.title}" (${ctx.task.target.type})` };
  await delay(500);

  // Figma-node targets can't exercise live behavior (responsive/states), so skip it.
  const allUnits: ReviewUnit[] = ["layout", "typography", "color", "tokens", "fidelity", "a11y", "behavior", "content"];
  const units =
    ctx.task.target.type === "figmaNode"
      ? allUnits.filter((u) => u !== "behavior")
      : allUnits;
  const rationale =
    ctx.task.target.type === "figmaNode"
      ? "Static Figma node — running design + a11y + content units, skipping live Behavior."
      : "Live URL — running the full set of review units.";

  await delay(400);
  yield { type: "TRIAGE_DECISION", units, rationale };
  yield { type: "DONE", outcome: { units } };
}

async function* runReviewer(ctx: RunContext): AsyncGenerator<RunEvent> {
  const unit = ctx.unit!;
  const def = getUnitDef(unit);
  yield { type: "AGENT_STEP", message: `${def.label} specialist picked up ${ctx.task.target.value}` };
  await delay(400);

  const calls = toolCallsForUnit(unit, ctx.mcpServers);
  const evidence: string[] = [];
  for (const { server, tool } of calls) {
    const evid = newId("ev");
    evidence.push(evid);
    yield {
      type: "MCP_CALL",
      server,
      tool,
      args: { target: ctx.task.target.value, ref: evid },
      message: `${server}.${tool}()`,
    };
    await delay(450);
  }

  const findings: Finding[] = [];
  for (const dimension of ctx.dimensions ?? def.dimensions) {
    const templates = pickSome(CATALOG[dimension], 1, 2);
    for (const t of templates) {
      const finding: Finding = {
        id: newId("find"),
        subtaskId: ctx.subtaskId!,
        unit,
        dimension,
        severity: t.severity,
        area: t.area,
        message: t.message,
        evidenceRef: evidence[0],
      };
      findings.push(finding);
      yield { type: "FINDING_ADDED", finding };
      await delay(350);
    }
  }

  yield { type: "AGENT_STEP", message: `Compiled ${findings.length} finding(s)` };
  yield { type: "DONE", outcome: { findings } };
}

async function* runQa(ctx: RunContext): AsyncGenerator<RunEvent> {
  const findings = ctx.findingsSoFar ?? [];
  const active = findings.filter((f) => !f.dedupOf);
  yield {
    type: "AGENT_STEP",
    message: `QA reviewing ${active.length} finding(s) across ${new Set(active.map((f) => f.unit)).size} unit(s)`,
  };
  await delay(600);

  const blocking = active.filter((f) => f.severity === "blocker" || f.severity === "major");
  const reworkUnits = Array.from(new Set(blocking.map((f) => f.unit))) as ReviewUnit[];
  const failed = blocking.length > 0;

  const verdict = {
    result: failed ? ("FAILED" as const) : ("PASSED" as const),
    summary: failed
      ? `${blocking.length} blocking issue(s) in ${reworkUnits.length} unit(s) need rework.`
      : `No blocking issues. ${active.length} non-blocking note(s) recorded.`,
    reworkUnits,
    round: ctx.reworkRound ?? 0,
    decidedAt: now(),
    qaAgentId: ctx.agentId,
  };

  await delay(400);
  yield { type: "QA_DECISION", verdict };
  yield { type: "DONE", outcome: { verdict } };
}

export class MockAgentRunner implements AgentRunner {
  async *run(ctx: RunContext): AsyncGenerator<RunEvent> {
    try {
      if (ctx.agentKind === "LEAD") {
        yield* runLead(ctx);
      } else if (ctx.agentKind === "REVIEWER") {
        yield* runReviewer(ctx);
      } else {
        yield* runQa(ctx);
      }
    } catch (err) {
      yield { type: "ERROR", message: err instanceof Error ? err.message : String(err) };
    }
  }
}
