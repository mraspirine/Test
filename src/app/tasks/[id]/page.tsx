"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReviewSubtask, Task } from "@/domain/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SubtaskLanes } from "@/components/SubtaskLanes";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { QaVerdictPanel } from "@/components/QaVerdictPanel";
import { ViewToggle } from "@/components/ViewToggle";

const OfficeGame = dynamic(() => import("@/components/OfficeGame"), { ssr: false });

type View = "office" | "timeline";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<ReviewSubtask[]>([]);
  const [view, setView] = useState<View>("office");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setTask(data.task);
    setSubtasks(data.subtasks ?? []);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [load]);

  async function act(action: "reviewer" | "qa" | "reopen") {
    setBusy(true);
    try {
      await fetch(`/api/tasks/${id}/${action}`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!task) return <p className="muted">Loading…</p>;

  const canReview = task.status === "ASSIGNED";
  const canQa = task.status === "QA_PENDING";
  const canReopen = task.status === "QA_FAILED";

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{task.title}</h1>
          <div className="muted" style={{ fontSize: 12 }}>
            {task.target.type}: {task.target.value} · rework round {task.reworkRound}
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="row" style={{ margin: "14px 0" }}>
        <button onClick={() => act("reviewer")} disabled={!canReview || busy}>
          ▶ Run Reviewers
        </button>
        <button onClick={() => act("qa")} disabled={!canQa || busy}>
          ⚖️ Run QA
        </button>
        <button className="secondary" onClick={() => act("reopen")} disabled={!canReopen || busy}>
          ↻ Reopen ({task.reworkRound}/2)
        </button>
        <div style={{ marginLeft: "auto" }}>
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "office", label: "🏢 Office" },
              { value: "timeline", label: "📜 Timeline" },
            ]}
          />
        </div>
      </div>

      {view === "office" ? (
        <OfficeGame scope={{ type: "task", taskId: id }} />
      ) : (
        <div className="grid-2">
          <div className="panel">
            <h2>Review units</h2>
            <SubtaskLanes subtasks={subtasks} />
          </div>
          <div className="panel">
            <h2>Activity</h2>
            <ActivityTimeline taskId={id} />
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>QA verdict</h2>
        <QaVerdictPanel verdict={task.qaVerdict} />
      </div>
    </div>
  );
}
