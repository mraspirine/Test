import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { AgentSprite, type StationDef } from "./agentSprite";
import type { AgentVisualState } from "./types";

const STAGE_W = 1000;
const STAGE_H = 600;
const IDLE_AFTER_MS = 3000;

const PURPLE = 0xa371f7;
const BLUE = 0x4c8dff;
const GREEN = 0x3fb950;

// Fixed office floor plan. agentIds match the seeded roster.
const STATIONS: StationDef[] = [
  { agentId: "lead-1", name: "Mira · Lead", x: 150, y: 120, accent: PURPLE },
  // design zone (row)
  { agentId: "rev-layout", name: "Lin · Layout", x: 140, y: 290, accent: PURPLE },
  { agentId: "rev-type", name: "Theo · Type", x: 315, y: 290, accent: PURPLE },
  { agentId: "rev-color", name: "Cora · Color", x: 490, y: 290, accent: PURPLE },
  { agentId: "rev-tokens", name: "Toby · Tokens", x: 665, y: 290, accent: PURPLE },
  { agentId: "rev-fidelity", name: "Faye · Fidelity", x: 840, y: 290, accent: PURPLE },
  // quality zone (row)
  { agentId: "rev-a11y", name: "Ada · A11y", x: 230, y: 470, accent: BLUE },
  { agentId: "rev-behavior", name: "Bex · Behavior", x: 500, y: 470, accent: BLUE },
  { agentId: "rev-content", name: "Cleo · Content", x: 770, y: 470, accent: BLUE },
  // QA room
  { agentId: "qa-1", name: "Quin · QA", x: 870, y: 120, accent: GREEN },
];

const ZONE_LABEL = new TextStyle({ fill: "#6b7689", fontSize: 13, fontWeight: "700" });

function drawZone(root: Container, x: number, y: number, w: number, h: number, label: string, color: number) {
  const g = new Graphics().roundRect(x, y, w, h, 12).fill({ color: 0x141a24 }).stroke({ color, width: 1, alpha: 0.5 });
  root.addChild(g);
  const t = new Text({ text: label, style: ZONE_LABEL });
  t.x = x + 12;
  t.y = y + 8;
  root.addChild(t);
}

export interface OfficeScene {
  setStates(states: Map<string, AgentVisualState>): void;
  destroy(): void;
}

export async function createOfficeScene(parent: HTMLElement): Promise<OfficeScene> {
  const app = new Application();
  await app.init({
    width: STAGE_W,
    height: STAGE_H,
    background: 0x0b0e14,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });

  app.canvas.style.width = "100%";
  app.canvas.style.height = "auto";
  app.canvas.style.display = "block";
  parent.appendChild(app.canvas);

  const root = new Container();
  app.stage.addChild(root);

  // Zone backdrops
  drawZone(root, 30, 40, 320, 160, "INTAKE · LEAD", PURPLE);
  drawZone(root, 700, 40, 270, 160, "QA ROOM", GREEN);
  drawZone(root, 30, 230, 940, 130, "DESIGN REVIEW", PURPLE);
  drawZone(root, 30, 400, 940, 150, "QUALITY REVIEW", BLUE);

  // Intake board near the Lead
  const board = new Graphics().roundRect(250, 70, 80, 60, 6).fill(0x1c2330).stroke({ color: 0x3a4456, width: 1.5 });
  root.addChild(board);
  const boardLabel = new Text({ text: "📋\ntasks", style: new TextStyle({ fill: "#7d8aa0", fontSize: 11, align: "center" }) });
  boardLabel.anchor.set(0.5);
  boardLabel.x = 290;
  boardLabel.y = 100;
  root.addChild(boardLabel);

  const sprites = new Map<string, AgentSprite>();
  for (const def of STATIONS) {
    const sprite = new AgentSprite(def);
    sprites.set(def.agentId, sprite);
    root.addChild(sprite);
  }

  let latest = new Map<string, AgentVisualState>();

  app.ticker.add((ticker) => {
    const now = Date.now();
    const dt = ticker.deltaTime;
    for (const [agentId, sprite] of sprites) {
      sprite.update(latest.get(agentId), IDLE_AFTER_MS, now, dt);
    }
  });

  return {
    setStates(states) {
      latest = states;
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
