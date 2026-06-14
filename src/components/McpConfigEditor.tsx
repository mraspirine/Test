"use client";

import { useEffect, useState } from "react";
import type { McpConfig } from "@/server/mcpConfig";

export function McpConfigEditor() {
  const [config, setConfig] = useState<McpConfig | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    fetch("/api/mcp")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  if (!config) return <p className="muted">Loading config…</p>;

  function toggle(i: number) {
    setConfig((c) => {
      if (!c) return c;
      const servers = c.servers.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s));
      return { servers };
    });
  }

  function addServer() {
    setConfig((c) => ({
      servers: [
        ...(c?.servers ?? []),
        { name: "new-server", type: "url", url: "https://", enabled: false, tools: [] },
      ],
    }));
  }

  function update(i: number, patch: Partial<McpConfig["servers"][number]>) {
    setConfig((c) => {
      if (!c) return c;
      const servers = c.servers.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      return { servers };
    });
  }

  function remove(i: number) {
    setConfig((c) => (c ? { servers: c.servers.filter((_, idx) => idx !== i) } : c));
  }

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/mcp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setStatus(res.ok ? "Saved ✓" : "Save failed");
    setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div>
      <ul className="clean">
        {config.servers.map((s, i) => (
          <li key={i} className="lane">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => toggle(i)}
                  style={{ marginRight: 8 }}
                />
                <strong>{s.name}</strong> <span className="muted">({s.type})</span>
              </label>
              <button className="secondary" onClick={() => remove(i)}>
                Remove
              </button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="name"
                style={{ width: 140 }}
              />
              <input
                value={s.url ?? s.command ?? ""}
                onChange={(e) =>
                  update(i, s.type === "url" ? { url: e.target.value } : { command: e.target.value })
                }
                placeholder={s.type === "url" ? "url" : "command"}
                style={{ flex: 1 }}
              />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              tools: {s.tools.join(", ") || "—"}
            </div>
          </li>
        ))}
      </ul>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={addServer}>
          + Add server
        </button>
        <button onClick={save}>Save config</button>
        <span className="muted">{status}</span>
      </div>
    </div>
  );
}
