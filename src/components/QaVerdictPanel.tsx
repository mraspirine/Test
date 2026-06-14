"use client";

import { getUnitDef } from "@/domain/dimensions";
import type { QaVerdict } from "@/domain/types";

export function QaVerdictPanel({ verdict }: { verdict: QaVerdict | null }) {
  if (!verdict) return <p className="muted">No QA verdict yet.</p>;
  const color = verdict.result === "PASSED" ? "var(--green)" : "var(--red)";
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>
        {verdict.result === "PASSED" ? "✅ PASSED" : "❌ FAILED"}
        <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          {" "}
          · round {verdict.round}
        </span>
      </div>
      <p>{verdict.summary}</p>
      {verdict.reworkUnits.length > 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          Rework units: {verdict.reworkUnits.map((u) => getUnitDef(u).label).join(", ")}
        </p>
      )}
    </div>
  );
}
