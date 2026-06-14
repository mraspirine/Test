"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityEvent, QaVerdict } from "@/domain/types";
import type { AgentVisualState, Pose } from "./types";

function poseFor(ev: ActivityEvent): Pose | null {
  switch (ev.type) {
    case "TRIAGE_DECISION":
      return "triaging";
    case "AGENT_STEP":
      return "thinking";
    case "MCP_CALL":
      return "inspecting";
    case "FINDING_ADDED":
      return "writing";
    case "QA_DECISION": {
      const v = ev.data?.verdict as QaVerdict | undefined;
      return v?.result === "PASSED" ? "verdict-pass" : "verdict-fail";
    }
    case "ERROR":
      return "alert";
    default:
      return null; // STATUS_CHANGED / CONSOLIDATED carry no agentId
  }
}

/**
 * Subscribe to an SSE event stream and reduce it into per-agent visual state.
 * `url` is either /api/tasks/[id]/events (per-task) or /api/events (global).
 */
export function useAgentActivity(url: string): Map<string, AgentVisualState> {
  const [states, setStates] = useState<Map<string, AgentVisualState>>(new Map());
  const seen = useRef<Set<string>>(new Set());
  const runByAgent = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    seen.current = new Set();
    runByAgent.current = new Map();
    setStates(new Map());

    const es = new EventSource(url);
    es.onmessage = (msg) => {
      let ev: ActivityEvent;
      try {
        ev = JSON.parse(msg.data);
      } catch {
        return;
      }
      if (seen.current.has(ev.id)) return;
      seen.current.add(ev.id);
      if (!ev.agentId) return;
      const pose = poseFor(ev);
      if (!pose) return;

      setStates((prev) => {
        const next = new Map(prev);
        const cur = next.get(ev.agentId!);

        // Reset finding counter when a new run begins for this agent.
        const lastRun = runByAgent.current.get(ev.agentId!);
        let findingCount = cur?.findingCount ?? 0;
        if (ev.runId !== lastRun) {
          runByAgent.current.set(ev.agentId!, ev.runId);
          findingCount = 0;
        }
        if (ev.type === "FINDING_ADDED") findingCount += 1;

        next.set(ev.agentId!, {
          agentId: ev.agentId!,
          pose,
          bubble: ev.message,
          findingCount,
          unit: ev.unit,
          taskId: ev.taskId,
          lastEventAt: Date.parse(ev.at) || Date.now(),
        });
        return next;
      });
    };
    es.onerror = () => {
      /* browser auto-reconnects; dedupe handles replay */
    };
    return () => es.close();
  }, [url]);

  return states;
}
