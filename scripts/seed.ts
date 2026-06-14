// Seeds demo review tasks via the running app's HTTP API.
// Usage: start the app (`npm run dev`) in one terminal, then `npm run seed`.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const DEMO_TASKS = [
  { title: "Review the pricing page", target: { type: "url", value: "https://example.com/pricing" } },
  { title: "Audit the signup modal (Figma)", target: { type: "figmaNode", value: "AbC123:4:56" } },
];

async function main() {
  for (const body of DEMO_TASKS) {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`✗ ${body.title}: ${res.status} ${await res.text()}`);
      continue;
    }
    const { task } = await res.json();
    console.log(`✓ created ${task.id} — ${task.title}`);
  }
  console.log(`\nOpen ${BASE} to watch the team triage and review.`);
}

main().catch((err) => {
  console.error("Seed failed. Is the dev server running?", err);
  process.exit(1);
});
