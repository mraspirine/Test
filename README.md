# UI Review Task System

A web app where a team of **AI agents** reviews UI. A **Lead** agent triages each task and
hands work to **specialist reviewers** (one per review unit), who inspect the target via
**MCP tools** (e.g. Figma). A **QA** agent consolidates findings and decides PASS / FAIL with a
bounded rework loop. A **2D office** (PixiJS) shows each agent working in real time, driven by
the same event stream as the activity timeline.

Runs **mock-first** (no API key needed). The agent execution sits behind a clean `AgentRunner`
seam, so swapping in the real Claude API is a single implementation change.

## The team (10 agents)

| Agent | Role |
|---|---|
| Lead (`lead-1`) | Triage: pick relevant review units, assign specialists; assemble the final report |
| 5 design reviewers | Layout/Spacing, Typography, Color & Contrast, Design Tokens/Style, Design Fidelity |
| 3 quality reviewers | Accessibility, Behavior (Responsive + States), Content/Copy |
| QA (`qa-1`) | Severity-gated verdict (fail only on blocker/major), names units to rework |

## Workflow

```
CREATED → TRIAGING → ASSIGNED → REVIEWING → CONSOLIDATING → REVIEW_DONE → QA_PENDING
   → QA_PASSED                          (pass)
   → QA_FAILED → (reopen failed units) → REVIEWING …   (max 2 rework rounds)
   → ESCALATED                          (still failing after 2 rounds)
```

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  (AGENT_RUNNER defaults to "mock")
npm run seed         # optional: create demo tasks (dev server must be running)
```

Then:

1. Create a task (or run the seed). The Lead triages it → status `ASSIGNED`.
2. Open the task → **Office** view shows the team. Click **Run Reviewers** to watch specialists
   inspect (walk to their monitor on each MCP call), write findings, then hand off to QA.
3. **Run QA** → `QA_PASSED`, or `QA_FAILED` with rework units. **Reopen** re-runs only the failed
   units; after 2 rounds it `ESCALATED`s.
4. **Office (global)** (`/office`) shows every agent across all active tasks.
5. **MCP Config** (`/settings/mcp`) toggles which MCP servers/tools reviewers use — the next run
   logs calls for exactly the enabled set.

## Switch to the real Claude API later

No UI / route / game changes needed:

1. Set in `.env`: `AGENT_RUNNER=claude`, `ANTHROPIC_API_KEY=…`, `CLAUDE_MODEL=claude-fable-5`.
2. Implement `src/server/agents/ClaudeAgentRunner.ts` (scaffolding + reference in the file) to call
   `client.beta.messages.create` with the same `mcpServers` config mapped into MCP connectors, and
   translate the response into the same `RunEvent` stream the mock emits.
3. `getRunner()` (`src/server/agents/index.ts`) picks it up from the env var.

## Layout

- `src/domain` — types, the 9 dimensions / 8 units, state machine
- `src/server` — JSON store (`db`/`repo`), `eventBus` (SSE fan-out), `mcpConfig`, `orchestrator`,
  and the `agents` seam (`AgentRunner`, `MockAgentRunner`, `ClaudeAgentRunner`)
- `src/app/api` — route handlers (tasks CRUD, reviewer/qa/reopen triggers, SSE, MCP config)
- `src/game` — PixiJS office scene + the `useAgentActivity` reducer
- `src/components`, `src/app` — React UI
