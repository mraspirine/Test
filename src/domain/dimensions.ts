import type { Dimension, ReviewSide, ReviewUnit } from "./types";

// The 9 review dimensions, grouped into 8 specialist units.
// Design-side dimensions are split 1:1 into their own units so each is owned by
// a dedicated specialist. Quality-side groups Responsive + States under "behavior".

export interface UnitDef {
  unit: ReviewUnit;
  label: string;
  side: ReviewSide;
  dimensions: Dimension[];
  // Default MCP tool names this unit relies on (resolved against enabled servers).
  tools: string[];
  // Suggested specialist agent id + display name.
  agentId: string;
  agentName: string;
}

export const UNIT_DEFS: UnitDef[] = [
  {
    unit: "layout",
    label: "Layout / Spacing",
    side: "design",
    dimensions: ["layout"],
    tools: ["get_screenshot", "get_metadata", "get_variable_defs"],
    agentId: "rev-layout",
    agentName: "Lin (Layout)",
  },
  {
    unit: "typography",
    label: "Typography",
    side: "design",
    dimensions: ["typography"],
    tools: ["get_variable_defs", "get_design_context"],
    agentId: "rev-type",
    agentName: "Theo (Type)",
  },
  {
    unit: "color",
    label: "Color & Contrast",
    side: "design",
    dimensions: ["color"],
    tools: ["get_variable_defs", "get_screenshot"],
    agentId: "rev-color",
    agentName: "Cora (Color)",
  },
  {
    unit: "tokens",
    label: "Design Tokens / Style",
    side: "design",
    dimensions: ["tokens"],
    tools: ["get_variable_defs", "get_code_connect_map", "get_design_context"],
    agentId: "rev-tokens",
    agentName: "Toby (Tokens)",
  },
  {
    unit: "fidelity",
    label: "Design Fidelity",
    side: "design",
    dimensions: ["fidelity"],
    tools: ["get_screenshot", "get_design_context", "get_metadata"],
    agentId: "rev-fidelity",
    agentName: "Faye (Fidelity)",
  },
  {
    unit: "a11y",
    label: "Accessibility",
    side: "quality",
    dimensions: ["a11y"],
    tools: ["get_screenshot"],
    agentId: "rev-a11y",
    agentName: "Ada (A11y)",
  },
  {
    unit: "behavior",
    label: "Behavior (Responsive + States)",
    side: "quality",
    dimensions: ["responsive", "states"],
    tools: ["get_screenshot"],
    agentId: "rev-behavior",
    agentName: "Bex (Behavior)",
  },
  {
    unit: "content",
    label: "Content / Copy",
    side: "quality",
    dimensions: ["content"],
    tools: ["get_design_context"],
    agentId: "rev-content",
    agentName: "Cleo (Content)",
  },
];

export const ALL_UNITS: ReviewUnit[] = UNIT_DEFS.map((u) => u.unit);

export function getUnitDef(unit: ReviewUnit): UnitDef {
  const def = UNIT_DEFS.find((u) => u.unit === unit);
  if (!def) throw new Error(`Unknown review unit: ${unit}`);
  return def;
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  layout: "Layout / Spacing",
  typography: "Typography",
  color: "Color & Contrast",
  tokens: "Design Tokens / Style",
  fidelity: "Design Fidelity",
  a11y: "Accessibility",
  responsive: "Responsive",
  states: "States",
  content: "Content / Copy",
};
