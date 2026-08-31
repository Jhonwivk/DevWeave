import { describe, expect, it } from "vitest";
import { createApp, type HealthProbes } from "./app.ts";

function jsonProbes(overrides: Partial<HealthProbes> = {}): HealthProbes {
  return {
    pingPostgres: async () => ({ ok: true }),
    readLatestHeartbeat: async () => ({
      ok: true,
      lastSeenAt: new Date("2026-08-28T00:00:10.000Z"),
    }),
    now: () => new Date("2026-08-28T00:00:15.000Z"),
    workerStaleAfterMs: 15_000,
    ...overrides,
  };
}

async function getHealth(probes: HealthProbes) {
  const response = await createApp(probes).request("/health");
  return {
    status: response.status,
    body: (await response.json()) as {
      server: { status: string; detail: string };
      worker: { status: string; detail: string };
      postgres: { status: string; detail: string };
    },
  };
}

describe("GET /health", () => {
  it("reports server, worker, and postgres as available when probes succeed", async () => {
    const { status, body } = await getHealth(jsonProbes());

    expect(status).toBe(200);
    expect(body.server.status).toBe("available");
    expect(body.worker.status).toBe("available");
    expect(body.postgres.status).toBe("available");
    expect(body.server.detail).toMatch(/Server/);
    expect(body.worker.detail).toMatch(/心跳/);
    expect(body.postgres.detail).toMatch(/PostgreSQL/);
  });

  it("reports postgres unavailable with an actionable install path when the database ping fails", async () => {
    const { body } = await getHealth(
      jsonProbes({
        pingPostgres: async () => ({ ok: false, error: "ECONNREFUSED" }),
      }),
    );

    expect(body.postgres.status).toBe("unavailable");
    expect(body.postgres.detail).toContain("DATABASE_URL");
    expect(body.postgres.detail).toContain("pnpm check-env");
    expect(body.postgres.detail).toContain("pnpm db:init");
  });

  it("does not claim worker availability when postgres cannot be queried", async () => {
    const { body } = await getHealth(
      jsonProbes({
        pingPostgres: async () => ({ ok: false, error: "ECONNREFUSED" }),
        readLatestHeartbeat: async () => ({ ok: false, error: "ECONNREFUSED" }),
      }),
    );

    expect(body.worker.status).toBe("unavailable");
    expect(body.worker.detail).toContain("PostgreSQL");
    expect(body.worker.detail).toMatch(/Worker/);
  });

  it("reports worker unavailable with db:init when a heartbeat cannot be read", async () => {
    const { body } = await getHealth(
      jsonProbes({
        readLatestHeartbeat: async () => ({
          ok: false,
          error: "relation worker_heartbeats does not exist",
        }),
      }),
    );

    expect(body.postgres.status).toBe("available");
    expect(body.worker.status).toBe("unavailable");
    expect(body.worker.detail).toContain("pnpm db:init");
    expect(body.worker.detail).toContain("pnpm --filter @human-agent/worker start");
  });

  it("reports worker unavailable with a start command when the heartbeat is stale", async () => {
    const { body } = await getHealth(
      jsonProbes({
        readLatestHeartbeat: async () => ({
          ok: true,
          lastSeenAt: new Date("2026-08-28T00:00:00.000Z"),
        }),
        now: () => new Date("2026-08-28T00:00:20.000Z"),
        workerStaleAfterMs: 15_000,
      }),
    );

    expect(body.worker.status).toBe("unavailable");
    expect(body.worker.detail).toContain("pnpm --filter @human-agent/worker start");
  });

  it("reports worker unavailable with a start command when no heartbeat exists", async () => {
    const { body } = await getHealth(
      jsonProbes({
        readLatestHeartbeat: async () => ({ ok: true, lastSeenAt: null }),
      }),
    );

    expect(body.worker.status).toBe("unavailable");
    expect(body.worker.detail).toContain("pnpm --filter @human-agent/worker start");
  });
});

describe("Command API without a platform", () => {
  it("returns JSON 503 for project list and commands instead of a text 404", async () => {
    const app = createApp(jsonProbes());
    const list = await app.request("/projects");
    const created = await app.request("/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "CreateProject" }),
    });

    expect(list.status).toBe(503);
    expect(created.status).toBe(503);
    expect(list.headers.get("content-type")).toMatch(/json/);
    const body = (await list.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/DATABASE_URL|db:init|pnpm dev/);
  });
});
