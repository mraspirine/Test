import { promises as fs } from "node:fs";
import path from "node:path";
import type { Agent, DbShape } from "@/domain/types";
import { UNIT_DEFS } from "@/domain/dimensions";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function seedAgents(): Agent[] {
  const lead: Agent = { id: "lead-1", name: "Mira (Lead)", kind: "LEAD" };
  const reviewers: Agent[] = UNIT_DEFS.map((u) => ({
    id: u.agentId,
    name: u.agentName,
    kind: "REVIEWER" as const,
    unit: u.unit,
    side: u.side,
  }));
  const qa: Agent = { id: "qa-1", name: "Quin (QA)", kind: "QA" };
  return [lead, ...reviewers, qa];
}

function emptyDb(): DbShape {
  return {
    tasks: [],
    subtasks: [],
    runs: [],
    events: [],
    agents: seedAgents(),
  };
}

let cache: DbShape | null = null;
// Serialize all writes so concurrent route handlers don't clobber the file.
let writeChain: Promise<void> = Promise.resolve();

async function loadFromDisk(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    // Make sure the roster exists even if an older file lacked it.
    if (!parsed.agents || parsed.agents.length === 0) {
      parsed.agents = seedAgents();
    }
    return parsed;
  } catch {
    const fresh = emptyDb();
    await persist(fresh);
    return fresh;
  }
}

async function persist(db: DbShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

export async function readDb(): Promise<DbShape> {
  if (!cache) cache = await loadFromDisk();
  return cache;
}

/**
 * Mutate the database under a write lock and persist atomically.
 * The mutator receives the live in-memory db and may return a value.
 */
export async function mutateDb<T>(mutator: (db: DbShape) => T | Promise<T>): Promise<T> {
  let result: T;
  const run = async () => {
    const db = await readDb();
    result = await mutator(db);
    await persist(db);
  };
  writeChain = writeChain.then(run, run);
  await writeChain;
  return result!;
}
