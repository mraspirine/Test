"use client";

import Link from "next/link";
import type { Task } from "@/domain/types";
import { StatusBadge } from "./StatusBadge";

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="muted">No tasks yet — create one to start a review.</p>;
  }
  return (
    <ul className="clean">
      {tasks.map((t) => (
        <li key={t.id} className="task-card">
          <div>
            <Link href={`/tasks/${t.id}`} style={{ fontWeight: 600 }}>
              {t.title}
            </Link>
            <div className="muted" style={{ fontSize: 12 }}>
              {t.target.type}: {t.target.value}
              {t.scopedUnits.length > 0 && ` · ${t.scopedUnits.length} units`}
              {t.reworkRound > 0 && ` · rework ${t.reworkRound}`}
            </div>
          </div>
          <StatusBadge status={t.status} />
        </li>
      ))}
    </ul>
  );
}
