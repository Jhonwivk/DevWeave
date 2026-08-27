import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { findWorkspaceRoot } from "./load-env.ts";

const { Client, Pool } = pg;

export type PostgresPing = { ok: true } | { ok: false; error: string };

export type WorkerHeartbeat = {
  workerId: string;
  lastSeenAt: Date;
};

export type DatabasePool = pg.Pool;

export function createPool(databaseUrl: string): DatabasePool {
  return new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 3_000,
  });
}

export async function pingPostgres(pool: pg.Pool): Promise<PostgresPing> {
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ping failed",
    };
  }
}

export async function initializeDatabase(databaseUrl: string): Promise<void> {
  await ensureDatabaseExists(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await migrate(client);
  } finally {
    await client.end();
  }
}

export async function recordWorkerHeartbeat(
  pool: pg.Pool,
  workerId: string,
  lastSeenAt: Date,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO worker_heartbeats (worker_id, last_seen_at)
      VALUES ($1, $2)
      ON CONFLICT (worker_id)
      DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
    `,
    [workerId, lastSeenAt],
  );
}

export async function readLatestWorkerHeartbeat(
  pool: pg.Pool,
): Promise<WorkerHeartbeat | undefined> {
  const result = await pool.query<{ worker_id: string; last_seen_at: Date }>(
    `
      SELECT worker_id, last_seen_at
      FROM worker_heartbeats
      ORDER BY last_seen_at DESC
      LIMIT 1
    `,
  );
  const row = result.rows[0];
  if (!row) {
    return undefined;
  }
  return { workerId: row.worker_id, lastSeenAt: row.last_seen_at };
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (databaseName.length === 0) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";
  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

async function migrate(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = resolve(findWorkspaceRoot(), "packages/persistence/migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1",
      [file],
    );
    if ((applied.rowCount ?? 0) > 0) {
      continue;
    }

    const sql = await readFile(resolve(migrationsDir, file), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
  }
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}
