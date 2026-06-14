"use client";

import { useState } from "react";
import type { TargetRef } from "@/domain/types";

export function CreateTaskForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TargetRef["type"]>("url");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !value.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, target: { type, value } }),
      });
      setTitle("");
      setValue("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>New review task</h2>
      <div style={{ marginBottom: 10 }}>
        <label>Title</label>
        <input
          style={{ width: "100%" }}
          value={title}
          placeholder="Review the pricing page"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div>
          <label>Target type</label>
          <select value={type} onChange={(e) => setType(e.target.value as TargetRef["type"])}>
            <option value="url">URL</option>
            <option value="figmaNode">Figma node</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Target</label>
          <input
            style={{ width: "100%" }}
            value={value}
            placeholder={type === "url" ? "https://example.com/pricing" : "fileKey:1:23"}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create & triage"}
      </button>
    </form>
  );
}
