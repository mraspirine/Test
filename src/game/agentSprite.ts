import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { poseEmoji, type AgentVisualState, type Pose } from "./types";

export interface StationDef {
  agentId: string;
  name: string;
  x: number;
  y: number;
  accent: number;
}

const NAME_STYLE = new TextStyle({ fill: "#c9d3e0", fontSize: 12, fontWeight: "600" });
const COUNT_STYLE = new TextStyle({ fill: "#e6edf3", fontSize: 11, fontWeight: "700" });
const BUBBLE_STYLE = new TextStyle({
  fill: "#0b0e14",
  fontSize: 11,
  wordWrap: true,
  wordWrapWidth: 150,
  lineHeight: 13,
});
const EMOJI_STYLE = new TextStyle({ fontSize: 18 });

export class AgentSprite extends Container {
  private avatar: Container;
  private emoji: Text;
  private bubbleBg: Graphics;
  private bubbleText: Text;
  private counter: Text;
  private deskY: number;
  private monitorY: number;
  private idleTint: number;
  private accent: number;

  constructor(def: StationDef) {
    super();
    this.x = def.x;
    this.y = def.y;
    this.accent = def.accent;
    this.idleTint = 0x39414f;
    this.deskY = 8;
    this.monitorY = -26;

    // Desk
    const desk = new Graphics().roundRect(-34, 20, 68, 14, 4).fill(0x222b38);
    this.addChild(desk);
    // Monitor / screen the agent walks up to
    const monitor = new Graphics()
      .roundRect(-16, -44, 32, 22, 3)
      .fill(0x10151e)
      .stroke({ color: 0x3a4456, width: 1.5 });
    this.addChild(monitor);

    // Avatar (body + head) that moves between desk and monitor
    this.avatar = new Container();
    const body = new Graphics().roundRect(-10, -4, 20, 22, 6).fill(def.accent);
    const head = new Graphics().circle(0, -10, 7).fill(0xf1d4b5);
    this.avatar.addChild(body, head);
    this.avatar.y = this.deskY;
    this.addChild(this.avatar);

    // Pose emoji above head
    this.emoji = new Text({ text: "💤", style: EMOJI_STYLE });
    this.emoji.anchor.set(0.5);
    this.emoji.y = -34;
    this.avatar.addChild(this.emoji);

    // Name label
    const name = new Text({ text: def.name, style: NAME_STYLE });
    name.anchor.set(0.5, 0);
    name.y = 38;
    this.addChild(name);

    // Finding counter chip
    this.counter = new Text({ text: "", style: COUNT_STYLE });
    this.counter.anchor.set(0.5, 0);
    this.counter.x = 30;
    this.counter.y = -44;
    this.addChild(this.counter);

    // Speech bubble
    this.bubbleBg = new Graphics();
    this.bubbleText = new Text({ text: "", style: BUBBLE_STYLE });
    this.bubbleText.x = 44;
    this.bubbleText.y = -54;
    this.addChild(this.bubbleBg, this.bubbleText);
    this.setBubble("");
  }

  private setBubble(text: string) {
    this.bubbleText.text = text;
    this.bubbleBg.clear();
    if (!text) {
      this.bubbleText.visible = false;
      return;
    }
    this.bubbleText.visible = true;
    const w = Math.min(160, this.bubbleText.width + 12);
    const h = this.bubbleText.height + 10;
    this.bubbleBg
      .roundRect(this.bubbleText.x - 6, this.bubbleText.y - 5, w, h, 6)
      .fill(0xe6edf3);
  }

  update(state: AgentVisualState | undefined, idleAfterMs: number, now: number, dt: number) {
    let pose: Pose = "idle";
    if (state) {
      const stale = now - state.lastEventAt > idleAfterMs;
      pose = stale && !isTerminalPose(state.pose) ? "idle" : state.pose;
      this.counter.text = state.findingCount > 0 ? `📝 ${state.findingCount}` : "";
      this.setBubble(pose === "idle" ? "" : state.bubble.slice(0, 90));
    } else {
      this.counter.text = "";
      this.setBubble("");
    }

    this.emoji.text = poseEmoji(pose);

    // Walk to the monitor when inspecting, otherwise sit at the desk.
    const targetY = pose === "inspecting" ? this.monitorY : this.deskY;
    this.avatar.y += (targetY - this.avatar.y) * Math.min(1, dt * 0.18);

    // Tint body via alpha pulse when active
    const active = pose !== "idle";
    this.avatar.alpha += ((active ? 1 : 0.55) - this.avatar.alpha) * Math.min(1, dt * 0.2);
  }
}

function isTerminalPose(pose: Pose): boolean {
  return pose === "verdict-pass" || pose === "verdict-fail" || pose === "alert";
}
