"use client";

import { getUnitDef } from "@/domain/dimensions";
import type { ReviewSubtask, ReviewSide } from "@/domain/types";
import { UnitBadge } from "./UnitBadge";

function Lane({ sub }: { sub: ReviewSubtask }) {
  const active = sub.findings.filter((f) => !f.dedupOf);
  return (
    <div className="lane">
      <div className="lane-head">
        <UnitBadge unit={sub.unit} />
        <span className="muted" style={{ fontSize: 12 }}>
          {sub.status} · {active.length} finding{active.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="clean" style={{ fontSize: 12 }}>
        {active.map((f) => (
          <li key={f.id}>
            <span className={`sev-${f.severity}`}>●</span> {f.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SubtaskLanes({ subtasks }: { subtasks: ReviewSubtask[] }) {
  if (subtasks.length === 0) {
    return <p className="muted">Lead is triaging — review units will appear here.</p>;
  }
  const bySide = (side: ReviewSide) =>
    subtasks.filter((s) => getUnitDef(s.unit).side === side);

  return (
    <div>
      {(["design", "quality"] as ReviewSide[]).map((side) => {
        const lanes = bySide(side);
        if (lanes.length === 0) return null;
        return (
          <div key={side} style={{ marginBottom: 12 }}>
            <h2 style={{ textTransform: "capitalize" }}>{side} review</h2>
            {lanes.map((sub) => (
              <Lane key={sub.id} sub={sub} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
