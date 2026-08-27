import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPlatform, type CommandEnvelope } from "@human-agent/application";
import { createMockExecutor } from "@human-agent/mock-adapter";
import { createPool, initializeDatabase, loadWorkspaceEnv } from "@human-agent/persistence";
import { createApp } from "./app.ts";
import type { HealthProbes } from "./platform-health.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("缺少 TEST_DATABASE_URL 或 DATABASE_URL。");
}

const probes: HealthProbes = {
  pingPostgres: async () => ({ ok: true }),
  readLatestHeartbeat: async () => ({ ok: true, lastSeenAt: new Date() }),
  now: () => new Date(),
  workerStaleAfterMs: 15_000,
};

function command(type: string, payload: Record<string, unknown>, extra: Partial<CommandEnvelope> = {}): CommandEnvelope {
  return {
    type,
    idempotencyKey: extra.idempotencyKey ?? crypto.randomUUID(),
    actor: extra.actor ?? { kind: "human", id: "human-owner", displayName: "Owner" },
    correlationId: extra.correlationId ?? "corr-http",
    causationId: extra.causationId,
    expectedVersion: extra.expectedVersion,
    payload,
  };
}

describe("HTTP commands and SSE", () => {
  const pool = createPool(databaseUrl);
  const platform = createPlatform(pool, { executors: { mock: createMockExecutor() } });
  const app = createApp(probes, platform);

  beforeAll(async () => {
    await initializeDatabase(databaseUrl);
  });

  beforeEach(async () => {
    await pool.query(`
      TRUNCATE
        inbox_items, jobs, merge_candidates, conflicts, change_intents, decisions,
        artifact_adoptions, artifacts, checkpoints, executions, permission_requests,
        recorded_consensus, work_items, specifications, system_generated_candidates,
        agent_memberships, private_agent_copies, digital_employee_releases,
        human_memberships, outbox, domain_events, idempotency_records,
        project_sequences, contract_ownership, projects, humans
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a project over HTTP and resumes SSE from a cursor without duplicating events", async () => {
    const created = await app.request("/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command("CreateProject", { name: "Dashboard" }, { expectedVersion: 0 })),
    });
    expect(created.status).toBe(200);
    const body = (await created.json()) as { aggregateId: string; version: number };
    const dashboard = await app.request(`/projects/${body.aggregateId}`);
    expect(dashboard.status).toBe(200);
    const page = (await dashboard.json()) as { project: { name: string }; recent: unknown[] };
    expect(page.project.name).toBe("Dashboard");

    const stream = await app.request(`/projects/${body.aggregateId}/events?cursor=0`);
    expect(stream.status).toBe(200);
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("missing SSE body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (!buffer.includes("data:")) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
    }
    await reader.cancel();
    const firstId = /id: (\d+)/.exec(buffer)?.[1];
    expect(firstId).toBeDefined();

    const replay = await app.request(`/projects/${body.aggregateId}/events?cursor=${firstId ?? "1"}`);
    const replayReader = replay.body?.getReader();
    if (!replayReader) throw new Error("missing replay body");
    await replayReader.cancel();
    expect(buffer.match(/id: 1/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
