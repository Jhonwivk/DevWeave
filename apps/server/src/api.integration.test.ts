import { rm } from "node:fs/promises";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createPlatform, type CommandEnvelope } from "@human-agent/application";
import { createMockExecutor } from "@human-agent/mock-adapter";
import {
  createPool,
  initializeDatabase,
  loadWorkspaceEnv,
} from "@human-agent/persistence";
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

function command(
  type: string,
  payload: Record<string, unknown>,
  extra: Partial<CommandEnvelope> = {},
): CommandEnvelope {
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

  afterEach(async () => {
    const workspaces = await pool.query(
      `SELECT workspace_path FROM executions WHERE workspace_path IS NOT NULL`,
    );
    const repositories = await pool.query(
      `SELECT git_repo_path FROM projects WHERE git_repo_path IS NOT NULL`,
    );
    await Promise.all(
      workspaces.rows.map((row) =>
        rm(String(row.workspace_path), { recursive: true, force: true }),
      ),
    );
    await Promise.all(
      repositories.rows.map((row) =>
        rm(String(row.git_repo_path), { recursive: true, force: true }),
      ),
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a project over HTTP and resumes SSE from a cursor without duplicating events", async () => {
    const created = await app.request("/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        command("CreateProject", { name: "Dashboard" }, { expectedVersion: 0 }),
      ),
    });
    expect(created.status).toBe(200);
    const body = (await created.json()) as { aggregateId: string; version: number };
    const dashboard = await app.request(`/projects/${body.aggregateId}`);
    expect(dashboard.status).toBe(200);
    const page = (await dashboard.json()) as {
      project: { name: string };
      recent: unknown[];
    };
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

    const replay = await app.request(
      `/projects/${body.aggregateId}/events?cursor=${firstId ?? "1"}`,
    );
    const replayReader = replay.body?.getReader();
    if (!replayReader) throw new Error("missing replay body");
    await replayReader.cancel();
    expect(buffer.match(/id: 1/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it("runs the OAuth demo from Project creation through verified merges", async () => {
    const response = await app.request("/demos/oauth", { method: "POST" });
    expect(response.status).toBe(201);

    const demo = (await response.json()) as {
      projectId: string;
      stages: { status: string }[];
      summary: Record<string, number>;
    };
    expect(demo.stages.every((stage) => stage.status === "completed")).toBe(true);
    expect(demo.summary).toMatchObject({
      humans: 2,
      agents: 3,
      specifications: 1,
      workItems: 3,
      completedWorkItems: 3,
      executions: 4,
      failedExecutions: 1,
      artifacts: 2,
      conflicts: 1,
      mergedCandidates: 3,
      openInboxItems: 0,
    });

    const work = await app.request(`/projects/${demo.projectId}/work`);
    const workBody = (await work.json()) as {
      workItems: { status: string }[];
      coverage: { status: string }[];
    };
    expect(workBody.workItems.every((item) => item.status === "completed")).toBe(true);
    expect(
      workBody.coverage.every((criterion) => criterion.status === "verified"),
    ).toBe(true);

    const dashboard = await app.request(`/projects/${demo.projectId}`);
    const dashboardBody = (await dashboard.json()) as {
      recent: { type: string; payload: Record<string, unknown> }[];
    };
    expect(dashboardBody.recent[0]).toHaveProperty("payload");

    const timeline = await app.request(`/projects/${demo.projectId}/timeline`);
    const timelineBody = (await timeline.json()) as {
      events: { project_sequence: number; layer: string }[];
    };
    expect(timelineBody.events).toHaveLength(Number(demo.summary.domainEvents));
    expect(new Set(timelineBody.events.map((event) => event.layer))).toEqual(
      new Set(["domain", "telemetry"]),
    );

    const artifacts = await app.request(`/projects/${demo.projectId}/artifacts`);
    const artifactBody = (await artifacts.json()) as {
      artifacts: { body: Record<string, unknown> }[];
      decisions: { result: string; rationale: string }[];
    };
    expect(artifactBody.artifacts.some((artifact) => artifact.body.version === 2)).toBe(
      true,
    );
    expect(artifactBody.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ result: "Local deterministic provider" }),
      ]),
    );

    const merge = await app.request(`/projects/${demo.projectId}/merge`);
    const mergeBody = (await merge.json()) as {
      candidates: { status: string }[];
      conflicts: { kind: string }[];
    };
    expect(mergeBody.candidates.map((candidate) => candidate.status)).toEqual([
      "merged",
      "merged",
      "merged",
    ]);
    expect(mergeBody.conflicts.map((conflict) => conflict.kind)).toContain("contract");

    const repeated = await app.request("/demos/oauth", { method: "POST" });
    expect(repeated.status).toBe(201);
    const repeatedDemo = (await repeated.json()) as { projectId: string };
    expect(repeatedDemo.projectId).not.toBe(demo.projectId);
    const releases = await pool.query(
      `SELECT count(*)::int AS count FROM digital_employee_releases
       WHERE name='OAuth Backend Digital Employee' AND release_version='1.0.0'`,
    );
    expect(releases.rows[0]?.count).toBe(1);
  });
});
