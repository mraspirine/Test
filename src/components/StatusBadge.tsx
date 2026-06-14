import type { TaskStatus } from "@/domain/types";

const COLOR: Record<TaskStatus, string> = {
  CREATED: "var(--dim)",
  TRIAGING: "var(--purple)",
  ASSIGNED: "var(--accent)",
  REVIEWING: "var(--amber)",
  CONSOLIDATING: "var(--purple)",
  REVIEW_DONE: "var(--accent)",
  QA_PENDING: "var(--amber)",
  QA_PASSED: "var(--green)",
  QA_FAILED: "var(--red)",
  ESCALATED: "var(--red)",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const color = COLOR[status] ?? "var(--dim)";
  return (
    <span className="badge" style={{ color, borderColor: color }}>
      {status}
    </span>
  );
}
