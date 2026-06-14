import type { ReviewUnit } from "@/domain/types";

export type Pose =
  | "idle"
  | "thinking"
  | "triaging"
  | "inspecting"
  | "writing"
  | "assembling"
  | "verdict-pass"
  | "verdict-fail"
  | "alert";

export interface AgentVisualState {
  agentId: string;
  pose: Pose;
  bubble: string;
  findingCount: number;
  unit: ReviewUnit | null;
  taskId: string | null;
  lastEventAt: number; // ms epoch
}

export function poseEmoji(pose: Pose): string {
  switch (pose) {
    case "thinking":
      return "💭";
    case "triaging":
      return "🗂️";
    case "inspecting":
      return "🔍";
    case "writing":
      return "✍️";
    case "assembling":
      return "📋";
    case "verdict-pass":
      return "✅";
    case "verdict-fail":
      return "❌";
    case "alert":
      return "⚠️";
    case "idle":
    default:
      return "💤";
  }
}
