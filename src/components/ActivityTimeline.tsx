"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityEvent } from "@/domain/types";

const ICON: Record<string, string> = {
  STATUS_CHANGED: "🔁",
  TRIAGE_DECISION: "🗂️",
  AGENT_STEP: "💭",
  MCP_CALL: "🔌",
  FINDING_ADDED: "📝",
  CONSOLIDATED: "🧹",
  QA_DECISION: "⚖️",
  ERROR: "⚠️",
};

export function ActivityTimeline({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seen.current = new Set();
    setEvents([]);
    const es = new EventSource(`/api/tasks/${taskId}/events`);
    es.onmessage = (msg) => {
      let ev: ActivityEvent;
      try {
        ev = JSON.parse(msg.data);
      } catch {
        return;
      }
      if (seen.current.has(ev.id)) return;
      seen.current.add(ev.id);
      setEvents((prev) => [...prev, ev]);
    };
    return () => es.close();
  }, [taskId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <div className="timeline" ref={boxRef}>
      {events.length === 0 && <p className="muted">No activity yet.</p>}
      {events.map((ev) => (
        <div className="ev" key={ev.id}>
          <span className="muted">{new Date(ev.at).toLocaleTimeString()} </span>
          {ICON[ev.type] ?? "•"} {ev.unit ? `[${ev.unit}] ` : ""}
          {ev.message}
        </div>
      ))}
    </div>
  );
}
