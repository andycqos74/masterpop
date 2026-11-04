import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "migrations");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function connectWithRetry() {
  for (let i = 0; i < 30; i++) {
    try {
      await client.connect();
      return;
    } catch (e) {
      console.log("waiting for database...", e.code ?? e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("database not reachable");
}

await connectWithRetry();
await client.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
);
const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  console.log("applying", file);
  try {
    await client.query("BEGIN");
    await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
    await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [file]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
await client.end();
console.log("migrations up to date");
