import { McpConfigEditor } from "@/components/McpConfigEditor";

export default function McpSettingsPage() {
  return (
    <div>
      <h1>MCP configuration</h1>
      <p className="muted">
        Reviewers call the enabled servers&apos; tools when inspecting UI. Toggle or add servers — the
        next review run logs MCP calls for exactly the enabled set.
      </p>
      <div className="panel">
        <McpConfigEditor />
      </div>
    </div>
  );
}
