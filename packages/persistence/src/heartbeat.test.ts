import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createPool,
  initializeDatabase,
  pingPostgres,
  readLatestWorkerHeartbeat,
  recordWorkerHeartbeat,
} from "./index.ts";
import { loadWorkspaceEnv } from "./load-env.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "缺少 TEST_DATABASE_URL 或 DATABASE_URL。请复制 `.env.example` 为 `.env`，安装 PostgreSQL 后运行 `pnpm db:init`。",
  );
}

describe("PostgreSQL persistence", () => {
  const pool = createPool(databaseUrl);

  beforeAll(async () => {
    await initializeDatabase(databaseUrl);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE worker_heartbeats");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("accepts a connectivity check after initialization", async () => {
    await expect(pingPostgres(pool)).resolves.toEqual({ ok: true });
  });

  it("makes a recorded worker heartbeat readable as the latest heartbeat", async () => {
    const workerId = `test-worker-${randomUUID()}`;
    const lastSeenAt = new Date("2026-08-28T01:02:03.000Z");

    await recordWorkerHeartbeat(pool, workerId, lastSeenAt);
    const latest = await readLatestWorkerHeartbeat(pool);

    expect(latest?.workerId).toBe(workerId);
    expect(latest?.lastSeenAt.toISOString()).toBe(lastSeenAt.toISOString());
  });

  it("replaces the previous heartbeat for the same worker", async () => {
    const workerId = `test-worker-${randomUUID()}`;

    await recordWorkerHeartbeat(pool, workerId, new Date("2026-08-28T00:00:00.000Z"));
    await recordWorkerHeartbeat(pool, workerId, new Date("2026-08-28T00:00:30.000Z"));

    const latest = await readLatestWorkerHeartbeat(pool);
    expect(latest?.workerId).toBe(workerId);
    expect(latest?.lastSeenAt.toISOString()).toBe("2026-08-28T00:00:30.000Z");
  });
});
