import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createPool,
  initializeDatabase,
  loadWorkspaceEnv,
  recordWorkerHeartbeat,
} from "@human-agent/persistence";
import { createApp } from "./app.ts";
import { createLiveHealthProbes } from "./live-probes.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "缺少 TEST_DATABASE_URL 或 DATABASE_URL。请复制 `.env.example` 为 `.env`，安装 PostgreSQL 后运行 `pnpm db:init`。",
  );
}

describe("GET /health with PostgreSQL", () => {
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

  it("reports worker available after a heartbeat is recorded", async () => {
    await recordWorkerHeartbeat(pool, `health-${randomUUID()}`, new Date());

    const response = await createApp(
      createLiveHealthProbes(pool, { workerStaleAfterMs: 15_000 }),
    ).request("/health");
    const body = (await response.json()) as {
      server: { status: string };
      worker: { status: string };
      postgres: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.server.status).toBe("available");
    expect(body.postgres.status).toBe("available");
    expect(body.worker.status).toBe("available");
  });
});
