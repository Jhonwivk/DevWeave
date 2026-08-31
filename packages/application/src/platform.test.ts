import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { rm } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockExecutor } from "@human-agent/mock-adapter";
import { createPool, initializeDatabase, loadWorkspaceEnv } from "@human-agent/persistence";
import { createFixtureRepo, workspaceStatus } from "@human-agent/workspace-git";
import {
  createPlatform,
  type CommandEnvelope,
  type CommandOk,
} from "./platform.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("缺少 TEST_DATABASE_URL 或 DATABASE_URL。");
}

const OAUTH_SPEC = `# OAuth

## REQ-AUTH Authorization
### AC-AUTHORIZE Local provider issues an authorization code
### AC-TOKEN Token endpoint returns an access token

## REQ-UI Surfaces
### AC-LOGIN Login form is rendered by the local provider
`;

const TRUE_PROFILE = { version: "1", commands: [{ name: "ok", command: "true", args: [] }] };
const FAIL_PROFILE = { version: "1", commands: [{ name: "fail", command: "false", args: [] }] };

type Actor = CommandEnvelope["actor"];

function cmd(
  type: string,
  actor: Actor,
  payload: Record<string, unknown>,
  extra: Partial<CommandEnvelope> = {},
): CommandEnvelope {
  return {
    type,
    idempotencyKey: extra.idempotencyKey ?? randomUUID(),
    actor,
    correlationId: extra.correlationId ?? "corr-1",
    causationId: extra.causationId,
    expectedVersion: extra.expectedVersion,
    payload,
  };
}

async function mustOk(
  platform: ReturnType<typeof createPlatform>,
  command: CommandEnvelope,
): Promise<CommandOk> {
  const result = await platform.handle(command);
  if (!result.ok) {
    throw new Error(`${command.type}: ${result.error.code} ${result.error.message}`);
  }
  return result;
}

const TRUNCATE = `
  TRUNCATE
    inbox_items, jobs, merge_candidates, conflicts, change_intents, decisions,
    artifact_adoptions, artifacts, checkpoints, executions, permission_requests,
    recorded_consensus, work_items, specifications, system_generated_candidates,
    agent_memberships, private_agent_copies, digital_employee_releases,
    human_memberships, outbox, domain_events, idempotency_records,
    project_sequences, contract_ownership, projects, humans
  RESTART IDENTITY CASCADE
`;

describe("platform commands", () => {
  const pool = createPool(databaseUrl);
  const fixtures: string[] = [];
  const owner: Actor = { kind: "human", id: "human-owner", displayName: "Owner" };
  const member: Actor = { kind: "human", id: "human-member", displayName: "Member" };

  beforeAll(async () => {
    await initializeDatabase(databaseUrl);
  });

  beforeEach(async () => {
    await pool.query(TRUNCATE);
  });

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map(async (repo) => {
        await rm(resolve(dirname(repo), ".ha-worktrees"), { recursive: true, force: true }).catch(
          () => undefined,
        );
        await rm(repo, { recursive: true, force: true });
      }),
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function fixtureRepo(files: Record<string, string> = { "README.md": "oauth\n" }): Promise<string> {
    const path = await createFixtureRepo(files);
    fixtures.push(path);
    return path;
  }

  async function seededProject(
    platform = createPlatform(pool, { executors: { mock: createMockExecutor() } }),
    profile: typeof TRUE_PROFILE = TRUE_PROFILE,
  ) {
    const repo = await fixtureRepo({
      "README.md": "oauth fixture\n",
      "src/oauth.ts": "export const provider = 'local'\n",
      "src/contract.json": '{"version":1}\n',
    });
    const created = await mustOk(platform, cmd("CreateProject", owner, { name: "OAuth" }, { expectedVersion: 0 }));
    await mustOk(
      platform,
      cmd("ImportGitRepository", owner, {
        projectId: created.aggregateId,
        repoPath: repo,
        baseBranch: "main",
        protectedBranch: "main",
        verificationProfile: profile,
      }, { expectedVersion: 1 }),
    );
    await mustOk(
      platform,
      cmd("InviteHuman", owner, {
        projectId: created.aggregateId,
        humanId: member.id,
        displayName: member.displayName,
      }),
    );
    return { platform, repo, projectId: created.aggregateId };
  }

  async function effectiveSpec(platform: ReturnType<typeof createPlatform>, projectId: string, body = OAUTH_SPEC) {
    const spec = await mustOk(platform, cmd("CreateSpecification", owner, { projectId, body }));
    await mustOk(platform, cmd("ReviewSpecification", owner, { specId: spec.aggregateId }, { expectedVersion: 1 }));
    await mustOk(platform, cmd("PublishSpecification", owner, { specId: spec.aggregateId }, { expectedVersion: 2 }));
    return spec.aggregateId;
  }

  it("creates a Project atomically with events, outbox, idempotency and expected version", async () => {
    const platform = createPlatform(pool, { executors: { mock: createMockExecutor() } });
    const created = await mustOk(
      platform,
      cmd("CreateProject", owner, { name: "Alpha" }, { expectedVersion: 0, idempotencyKey: "proj-1" }),
    );
    expect(created.body.ownerId).toBe(owner.id);
    expect(created.version).toBe(1);
    const again = await mustOk(
      platform,
      cmd("CreateProject", owner, { name: "Alpha" }, { expectedVersion: 0, idempotencyKey: "proj-1" }),
    );
    expect(again.aggregateId).toBe(created.aggregateId);
    const count = await pool.query(`SELECT count(*)::int AS n FROM projects`);
    expect(count.rows[0]?.n).toBe(1);
    const events = await pool.query(`SELECT * FROM domain_events WHERE project_id=$1`, [created.aggregateId]);
    const outbox = await pool.query(`SELECT * FROM outbox WHERE project_id=$1`, [created.aggregateId]);
    expect(events.rowCount).toBe(outbox.rowCount);
    expect(events.rowCount).toBeGreaterThan(0);

    await expect(
      platform.handle(
        cmd("CreateProject", owner, { name: "Boom", __failAfterState: true }, { expectedVersion: 0 }),
      ),
    ).rejects.toThrow("injected write failure");
    const afterFail = await pool.query(`SELECT count(*)::int AS n FROM projects`);
    expect(afterFail.rows[0]?.n).toBe(1);

    const conflict = await platform.handle(
      cmd(
        "CreateProject",
        owner,
        { name: "Nope" },
        { expectedVersion: 7, causationId: "cause-9", correlationId: "corr-9" },
      ),
    );
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe("conflict");
      expect(conflict.error.actor?.id).toBe(owner.id);
      expect(conflict.error.causationId).toBe("cause-9");
      expect(conflict.error.correlationId).toBe("corr-9");
    }
  });

  it("imports a Git baseline without mutating the existing working tree", async () => {
    const platform = createPlatform(pool, { executors: { mock: createMockExecutor() } });
    const repo = await fixtureRepo({ "README.md": "keep\n" });
    await writeFile(resolve(repo, "local-only.txt"), "dirty\n", "utf8");
    const created = await mustOk(platform, cmd("CreateProject", owner, { name: "Git" }, { expectedVersion: 0 }));
    const before = await workspaceStatus(repo);
    const imported = await mustOk(
      platform,
      cmd("ImportGitRepository", owner, {
        projectId: created.aggregateId,
        repoPath: repo,
        baseBranch: "main",
        protectedBranch: "main",
        verificationProfile: TRUE_PROFILE,
      }, { expectedVersion: 1 }),
    );
    const after = await workspaceStatus(repo);
    expect(after.dirty).toBe(true);
    expect(after.commit).toBe(before.commit);
    expect(imported.body.baseline).toBe(before.commit);
  });

  it("parses Git-backed specifications and rejects illegal lifecycle transitions", async () => {
    const { platform, projectId } = await seededProject();
    const invalid = await platform.handle(
      cmd("CreateSpecification", owner, { projectId, body: "# no ids" }),
    );
    expect(invalid.ok).toBe(false);
    const specId = await effectiveSpec(platform, projectId);
    const staleAttempt = await platform.handle(
      cmd("ReviewSpecification", owner, { specId }, { expectedVersion: 1 }),
    );
    expect(staleAttempt.ok).toBe(false);
    if (!staleAttempt.ok) expect(staleAttempt.error.code).toBe("conflict");
  });

  it("keeps Work Item coverage separate from a failed Execution", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const work = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "Backend token",
        acceptanceCriteria: ["AC-TOKEN"],
        risk: "low",
        requiredCapabilities: ["oauth.backend"],
      }),
    );
    const release = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: "Backend DE",
        releaseVersion: "1.0.0",
        provenance: "signed-local",
        capabilities: ["oauth.backend"],
        body: "immutable-release",
      }),
    );
    const membership = await mustOk(
      platform,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    await mustOk(
      platform,
      cmd("RecordConsensus", owner, { projectId, result: "assign backend", rationale: "offline agreement" }),
    );
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: membership.aggregateId }),
    );
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, {
        workItemId: work.aggregateId,
        kernel: "mock",
        scenario: "failure",
      }),
    );
    await platform.processJob("worker-1");
    const item = await pool.query(`SELECT status FROM work_items WHERE id=$1`, [work.aggregateId]);
    const run = await pool.query(`SELECT status FROM executions WHERE id=$1`, [execution.aggregateId]);
    expect(item.rows[0]?.status).not.toBe("failed");
    expect(run.rows[0]?.status).toBe("failed");
  });

  it("reuses an identical immutable Digital Employee Release across Projects", async () => {
    const platform = createPlatform(pool, { executors: { mock: createMockExecutor() } });
    const releasePayload = {
      name: "Reusable OAuth DE",
      releaseVersion: "1.0.0",
      provenance: "signed-local",
      capabilities: ["oauth.backend"],
      body: "immutable-release",
    };
    const first = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, releasePayload),
    );
    const reused = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, releasePayload),
    );
    expect(reused.aggregateId).toBe(first.aggregateId);
    expect(reused.body.reused).toBe(true);
    const mutation = await platform.handle(
      cmd("ImportDigitalEmployeeRelease", owner, { ...releasePayload, body: "mutated-release" }),
    );
    expect(mutation.ok).toBe(false);
    if (!mutation.ok) expect(mutation.error.code).toBe("invalid");
    const stored = await pool.query(
      `SELECT count(*)::int AS count FROM digital_employee_releases WHERE name=$1 AND release_version=$2`,
      [releasePayload.name, releasePayload.releaseVersion],
    );
    expect(stored.rows[0]?.count).toBe(1);
  });

  it("rejects cyclic work graphs and records consensus with a disclaimer", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const a = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "A",
        acceptanceCriteria: ["AC-TOKEN"],
        risk: "low",
      }),
    );
    const b = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "B",
        acceptanceCriteria: ["AC-LOGIN"],
        risk: "low",
      }),
    );
    const cyclic = await platform.handle(
      cmd("ProposeWorkGraph", owner, {
        projectId,
        edges: [
          { from: a.aggregateId, to: b.aggregateId },
          { from: b.aggregateId, to: a.aggregateId },
        ],
      }),
    );
    expect(cyclic.ok).toBe(false);
    const consensus = await mustOk(
      platform,
      cmd("RecordConsensus", owner, { projectId, result: "A then B", rationale: "whiteboard" }),
    );
    expect(String(consensus.body.disclaimer)).toMatch(/线下/);
  });

  it("requires qualification before a System-Generated Agent can be assigned", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const work = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "QA",
        acceptanceCriteria: ["AC-LOGIN"],
        risk: "low",
        requiredCapabilities: ["oauth.qa"],
      }),
    );
    const candidate = await mustOk(
      platform,
      cmd("GenerateSystemAgent", owner, { projectId, gap: { capabilities: ["oauth.qa"] } }),
    );
    const inbox = await pool.query(`SELECT kind FROM inbox_items WHERE project_id=$1 AND status='open'`, [projectId]);
    expect(inbox.rows.some((row) => row.kind === "capability_gap")).toBe(true);
    await mustOk(platform, cmd("RecordConsensus", owner, { projectId, result: "staff qa", rationale: "gap" }));
    const qualified = await mustOk(
      platform,
      cmd("QualifySystemAgent", owner, { candidateId: candidate.aggregateId }),
    );
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: qualified.aggregateId }),
    );
  });

  it("intersects agent permissions and blocks baseline rule overrides", async () => {
    const { platform, projectId } = await seededProject();
    const privateAgent = await mustOk(
      platform,
      cmd("ImportPrivateAgent", member, {
        projectId,
        name: "Frontend PA",
        configSummary: "local oauth ui",
        manifest: { tools: ["editor"] },
        capabilities: ["oauth.frontend"],
        declaredPermissions: ["workspace.write", "branch.protected"],
        policyCeiling: ["workspace.write"],
        approvedPermissions: ["workspace.write", "branch.protected"],
      }),
    );
    const membership = await pool.query(`SELECT approved_permissions FROM agent_memberships WHERE id=$1`, [
      privateAgent.aggregateId,
    ]);
    expect(membership.rows[0]?.approved_permissions).toEqual(["workspace.write"]);
    const blocked = await platform.handle(
      cmd("RequestPermission", member, {
        projectId,
        membershipId: privateAgent.aggregateId,
        action: "branch.protected.merge",
        resourceScope: "main",
        reason: "shortcut",
      }),
    );
    expect(blocked.ok).toBe(false);
  });

  it("isolates mock executions in worktrees and keeps the original tree intact", async () => {
    const { platform, projectId, repo } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const work = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "Backend",
        acceptanceCriteria: ["AC-AUTHORIZE"],
        risk: "low",
        requiredCapabilities: ["oauth.backend"],
      }),
    );
    const release = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: "DE",
        releaseVersion: "1",
        provenance: "local",
        capabilities: ["oauth.backend"],
        body: "de",
      }),
    );
    const membership = await mustOk(
      platform,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    await mustOk(platform, cmd("RecordConsensus", owner, { projectId, result: "go", rationale: "ok" }));
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: membership.aggregateId }),
    );
    const before = await workspaceStatus(repo);
    const first = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: work.aggregateId, kernel: "mock", scenario: "success" }),
    );
    const second = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: work.aggregateId, kernel: "mock", scenario: "success" }),
    );
    await platform.processJob("w1");
    await platform.processJob("w1");
    const after = await workspaceStatus(repo);
    expect(after.commit).toBe(before.commit);
    expect(first.body.workspacePath).not.toBe(second.body.workspacePath);
    expect(String(first.body.gitBranch)).toMatch(/^ha\/execution\//);
  });

  it("marks unknown instead of auto-retrying when kernel state cannot be confirmed", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const work = await mustOk(
      platform,
      cmd("CreateExplorationWorkItem", owner, {
        projectId,
        specId,
        goal: "explore provider",
        risk: "low",
        explorationBound: "read-only",
        acceptanceCriteria: [],
      }),
    );
    const release = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: "Explorer",
        releaseVersion: "1",
        provenance: "local",
        capabilities: [],
        body: "ex",
      }),
    );
    const membership = await mustOk(
      platform,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    await mustOk(platform, cmd("RecordConsensus", owner, { projectId, result: "explore", rationale: "spike" }));
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: membership.aggregateId }),
    );
    const forbidden = await platform.handle(
      cmd("StartExecution", owner, {
        workItemId: work.aggregateId,
        kernel: "mock",
        completeCoverage: true,
      }),
    );
    expect(forbidden.ok).toBe(false);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: work.aggregateId, kernel: "mock", scenario: "unknown" }),
    );
    await platform.processJob("w1");
    const row = await pool.query(`SELECT status, workspace_path FROM executions WHERE id=$1`, [
      execution.aggregateId,
    ]);
    expect(row.rows[0]?.status).toBe("unknown");
    expect(row.rows[0]?.workspace_path).toBeTruthy();
    const inbox = await pool.query(`SELECT kind FROM inbox_items WHERE project_id=$1 AND kind='unknown'`, [
      projectId,
    ]);
    expect(Number(inbox.rowCount)).toBeGreaterThan(0);
  });

  it("publishes composite checkpoints and refuses mismatched restores", async () => {
    const failing = createPlatform(pool, {
      executors: { mock: createMockExecutor({ failCheckpoint: true }) },
    });
    const { projectId } = await seededProject(failing);
    const specId = await effectiveSpec(failing, projectId);
    const work = await mustOk(
      failing,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "cp",
        acceptanceCriteria: ["AC-TOKEN"],
        risk: "low",
        requiredCapabilities: ["oauth.backend"],
      }),
    );
    const release = await mustOk(
      failing,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: "DE",
        releaseVersion: "cp",
        provenance: "local",
        capabilities: ["oauth.backend"],
        body: "cp",
      }),
    );
    const membership = await mustOk(
      failing,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    await mustOk(failing, cmd("RecordConsensus", owner, { projectId, result: "cp", rationale: "cp" }));
    await mustOk(
      failing,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: membership.aggregateId }),
    );
    const execution = await mustOk(
      failing,
      cmd("StartExecution", owner, { workItemId: work.aggregateId, kernel: "mock", scenario: "pause" }),
    );
    await failing.processJob("w1");
    const failed = await mustOk(
      failing,
      cmd("CreateCheckpoint", owner, { executionId: execution.aggregateId }),
    );
    expect(failed.body.published).toBe(false);
    const fork = await failing.handle(
      cmd("ForkExecution", owner, { checkpointId: failed.aggregateId }),
    );
    expect(fork.ok).toBe(false);
  });

  it("creates an exact branch from a published checkpoint without mutating the original", async () => {
    const { platform, projectId } = await seededProject();
    const prepared = await prepareAssignedWork(platform, projectId, "AC-TOKEN", ["oauth.backend"]);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: prepared.workItemId, kernel: "mock", scenario: "pause" }),
    );
    await platform.processJob("w1");
    const checkpoint = await mustOk(
      platform,
      cmd("CreateCheckpoint", owner, { executionId: execution.aggregateId }),
    );
    expect(checkpoint.body.published).toBe(true);
    const branch = await mustOk(
      platform,
      cmd("ForkExecution", owner, { checkpointId: checkpoint.aggregateId, prompt: "retry" }),
    );
    expect(branch.body.branchKind).toBe("exact");
    const original = await pool.query(`SELECT status FROM executions WHERE id=$1`, [execution.aggregateId]);
    expect(original.rows[0]?.status).toBe("waiting_for_human");
  });

  it("labels reconstructed branches when fork is unsupported", async () => {
    const platform = createPlatform(pool, {
      executors: { mock: createMockExecutor({ forkFrom: false }) },
    });
    const { projectId } = await seededProject(platform);
    const prepared = await prepareAssignedWork(platform, projectId, "AC-AUTHORIZE", ["oauth.backend"]);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: prepared.workItemId, kernel: "mock", scenario: "pause" }),
    );
    await platform.processJob("w1");
    const checkpoint = await mustOk(
      platform,
      cmd("CreateCheckpoint", owner, { executionId: execution.aggregateId }),
    );
    const branch = await mustOk(
      platform,
      cmd("ForkExecution", owner, { checkpointId: checkpoint.aggregateId, reconstructed: true }),
    );
    expect(branch.body.branchKind).toBe("reconstructed");
  });

  it("propagates stale work after a contract artifact is superseded", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const producer = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "contract",
        acceptanceCriteria: ["AC-TOKEN"],
        risk: "high",
      }),
    );
    const consumer = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "frontend",
        acceptanceCriteria: ["AC-LOGIN"],
        risk: "low",
      }),
    );
    const artifact = await mustOk(
      platform,
      cmd("PublishArtifact", owner, {
        projectId,
        workItemId: producer.aggregateId,
        kind: "contract",
        title: "OAuth contract v1",
        body: { version: 1 },
      }),
    );
    await mustOk(
      platform,
      cmd("AdoptArtifact", member, {
        artifactId: artifact.aggregateId,
        consumerWorkItemId: consumer.aggregateId,
      }),
    );
    const replacement = await mustOk(
      platform,
      cmd("PublishArtifact", owner, {
        projectId,
        workItemId: producer.aggregateId,
        kind: "contract",
        title: "OAuth contract v2",
        body: { version: 2 },
        supersedes: artifact.aggregateId,
      }),
    );
    const stale = await pool.query(`SELECT status, stale_reason FROM work_items WHERE id=$1`, [
      consumer.aggregateId,
    ]);
    expect(stale.rows[0]?.status).toBe("stale_spec");
    const versions = await pool.query(
      `SELECT id, status, version_number, supersedes FROM artifacts WHERE project_id=$1 ORDER BY version_number`,
      [projectId],
    );
    expect(versions.rows).toMatchObject([
      { id: artifact.aggregateId, status: "superseded", version_number: 1 },
      {
        id: replacement.aggregateId,
        status: "published",
        version_number: 2,
        supersedes: artifact.aggregateId,
      },
    ]);
  });

  it("classifies text, symbol and contract overlaps without locking files", async () => {
    const { platform, projectId } = await seededProject();
    const specId = await effectiveSpec(platform, projectId);
    const left = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "left",
        acceptanceCriteria: ["AC-TOKEN"],
        risk: "low",
      }),
    );
    const right = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "right",
        acceptanceCriteria: ["AC-LOGIN"],
        risk: "low",
      }),
    );
    await mustOk(
      platform,
      cmd("SetContractOwnership", owner, { projectId, path: "src/contract.json", kind: "api" }),
    );
    await mustOk(
      platform,
      cmd("RegisterChangeIntent", owner, {
        projectId,
        workItemId: left.aggregateId,
        files: ["src/oauth.ts"],
        symbols: ["token"],
        contracts: [],
        risk: "low",
      }),
    );
    const overlap = await mustOk(
      platform,
      cmd("RegisterChangeIntent", owner, {
        projectId,
        workItemId: right.aggregateId,
        files: ["src/oauth.ts"],
        symbols: ["token"],
        contracts: [],
        risk: "low",
      }),
    );
    expect(overlap.body.locked).toBe(false);
    expect(overlap.body.kind).toBe("symbol");
    const blocked = await platform.handle(
      cmd("RegisterChangeIntent", owner, {
        projectId,
        workItemId: right.aggregateId,
        files: ["src/contract.json"],
        symbols: [],
        contracts: ["src/contract.json"],
        risk: "high",
      }),
    );
    expect(blocked.ok).toBe(false);
    const overridden = await mustOk(
      platform,
      cmd("RegisterChangeIntent", owner, {
        projectId,
        workItemId: right.aggregateId,
        files: ["src/contract.json"],
        symbols: [],
        contracts: ["src/contract.json"],
        risk: "high",
        override: { reason: "sponsor approved", scope: "contract" },
      }),
    );
    expect(overridden.body.kind).toBe("contract");
  });

  it("records semantic conflict when verification fails after a clean rebase", async () => {
    const { platform, projectId } = await seededProject(undefined, FAIL_PROFILE);
    const prepared = await prepareAssignedWork(platform, projectId, "AC-TOKEN", ["oauth.backend"]);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: prepared.workItemId, kernel: "mock", scenario: "success" }),
    );
    await platform.processJob("w1");
    await mustOk(platform, cmd("SelectCandidate", owner, { executionId: execution.aggregateId, reason: "only one" }));
    const candidate = await mustOk(
      platform,
      cmd("CreateMergeCandidate", owner, { executionId: execution.aggregateId }),
    );
    const processed = await mustOk(
      platform,
      cmd("ProcessMergeQueue", owner, { projectId }),
    );
    expect(processed.body.status).toBe("validation_failed");
    expect(processed.body.kind).toBe("semantic");
    const merge = await platform.handle(
      cmd("MergeCandidate", owner, { mergeCandidateId: candidate.aggregateId }),
    );
    expect(merge.ok).toBe(false);
    const escalated = await mustOk(
      platform,
      cmd("RepairCandidate", owner, { mergeCandidateId: candidate.aggregateId, highRisk: true }),
    );
    expect(escalated.body.escalated).toBe(true);
  });

  it("merges a verified selected candidate into the protected branch", async () => {
    const { platform, projectId } = await seededProject();
    const prepared = await prepareAssignedWork(platform, projectId, "AC-TOKEN", ["oauth.backend"]);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: prepared.workItemId, kernel: "mock", scenario: "success" }),
    );
    await platform.processJob("w1");
    await mustOk(platform, cmd("SelectCandidate", owner, { executionId: execution.aggregateId, reason: "green" }));
    const candidate = await mustOk(
      platform,
      cmd("CreateMergeCandidate", owner, { executionId: execution.aggregateId }),
    );
    const processed = await mustOk(platform, cmd("ProcessMergeQueue", owner, { projectId }));
    expect(processed.body.status).toBe("mergeable");
    const merged = await mustOk(
      platform,
      cmd("MergeCandidate", owner, { mergeCandidateId: candidate.aggregateId }),
    );
    expect(merged.body.status).toBe("merged");
    const item = await pool.query(`SELECT status, coverage FROM work_items WHERE id=$1`, [prepared.workItemId]);
    expect(item.rows[0]?.status).toBe("completed");
  });

  it("reclaims expired leases and cancels duplicate jobs for the same execution", async () => {
    let now = new Date("2026-08-28T00:00:00.000Z");
    const platform = createPlatform(pool, {
      executors: { mock: createMockExecutor() },
      clock: { now: () => now },
      leaseMs: 1_000,
    });
    const { projectId } = await seededProject(platform);
    const prepared = await prepareAssignedWork(platform, projectId, "AC-LOGIN", ["oauth.backend"]);
    const execution = await mustOk(
      platform,
      cmd("StartExecution", owner, { workItemId: prepared.workItemId, kernel: "mock", scenario: "success" }),
    );
    await pool.query(
      `UPDATE jobs SET status='leased', lease_owner='old', lease_until=$2 WHERE execution_id=$1`,
      [execution.aggregateId, new Date("2026-08-27T00:00:00.000Z")],
    );
    await pool.query(
      `INSERT INTO jobs (id, execution_id, project_id, status, payload) VALUES ($1,$2,$3,'available',$4)`,
      ["job_dup", execution.aggregateId, projectId, { executionId: execution.aggregateId }],
    );
    now = new Date("2026-08-28T00:00:05.000Z");
    await platform.processJob("new-worker");
    const jobs = await pool.query(`SELECT status FROM jobs WHERE execution_id=$1 ORDER BY created_at`, [
      execution.aggregateId,
    ]);
    expect(jobs.rows.map((row) => row.status)).toContain("done");
    expect(jobs.rows.map((row) => row.status)).toContain("cancelled");
  });

  it("runs the OAuth happy path, agent failure recovery, and contract conflict scenarios", async () => {
    for (const variant of ["normal", "failure", "contract"] as const) {
      await pool.query(TRUNCATE);
      const { platform, projectId } = await seededProject();
      await runOauthScenario(platform, projectId, variant);
    }
  });

  async function prepareAssignedWork(
    platform: ReturnType<typeof createPlatform>,
    projectId: string,
    criterion: string,
    capabilities: string[],
  ) {
    const specId = await effectiveSpec(platform, projectId);
    const work = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: criterion,
        acceptanceCriteria: [criterion],
        risk: "low",
        requiredCapabilities: capabilities,
      }),
    );
    const release = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: `DE-${criterion}-${randomUUID()}`,
        releaseVersion: "1",
        provenance: "local",
        capabilities,
        body: criterion,
      }),
    );
    const membership = await mustOk(
      platform,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    await mustOk(platform, cmd("RecordConsensus", owner, { projectId, result: "assign", rationale: "offline" }));
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: work.aggregateId, membershipId: membership.aggregateId }),
    );
    return { workItemId: work.aggregateId, membershipId: membership.aggregateId, specId };
  }

  async function runOauthScenario(
    platform: ReturnType<typeof createPlatform>,
    projectId: string,
    variant: "normal" | "failure" | "contract",
  ) {
    const specId = await effectiveSpec(platform, projectId);
    const backend = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "Backend",
        acceptanceCriteria: ["AC-AUTHORIZE", "AC-TOKEN"],
        risk: "low",
        requiredCapabilities: ["oauth.backend"],
      }),
    );
    const frontend = await mustOk(
      platform,
      cmd("CreateWorkItem", member, {
        projectId,
        specId,
        goal: "Frontend",
        acceptanceCriteria: ["AC-LOGIN"],
        risk: "low",
        requiredCapabilities: ["oauth.frontend"],
      }),
    );
    const qa = await mustOk(
      platform,
      cmd("CreateWorkItem", owner, {
        projectId,
        specId,
        goal: "QA",
        acceptanceCriteria: ["AC-TOKEN", "AC-LOGIN"],
        risk: "low",
        requiredCapabilities: ["oauth.qa"],
      }),
    );
    const release = await mustOk(
      platform,
      cmd("ImportDigitalEmployeeRelease", owner, {
        name: `oauth-de-${variant}`,
        releaseVersion: "1",
        provenance: "local",
        capabilities: ["oauth.backend"],
        body: "de",
      }),
    );
    const digital = await mustOk(
      platform,
      cmd("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }),
    );
    const privateAgent = await mustOk(
      platform,
      cmd("ImportPrivateAgent", member, {
        projectId,
        name: "Frontend PA",
        configSummary: "ui",
        manifest: { cwd: "src" },
        capabilities: ["oauth.frontend"],
      }),
    );
    const generated = await mustOk(
      platform,
      cmd("GenerateSystemAgent", owner, { projectId, gap: { capabilities: ["oauth.qa"] } }),
    );
    const system = await mustOk(
      platform,
      cmd("QualifySystemAgent", owner, { candidateId: generated.aggregateId }),
    );
    await mustOk(
      platform,
      cmd("RecordConsensus", owner, { projectId, result: "staff three agents", rationale: "offline planning" }),
    );
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: backend.aggregateId, membershipId: digital.aggregateId }),
    );
    await mustOk(
      platform,
      cmd("AssignWorkItem", member, { workItemId: frontend.aggregateId, membershipId: privateAgent.aggregateId }),
    );
    await mustOk(
      platform,
      cmd("AssignWorkItem", owner, { workItemId: qa.aggregateId, membershipId: system.aggregateId }),
    );
    const decision = await mustOk(
      platform,
      cmd("ProposeDecision", owner, {
        projectId,
        question: "Use local provider?",
        options: ["local"],
        impact: "no production credentials",
      }),
    );
    await mustOk(
      platform,
      cmd("RecordDecision", owner, {
        decisionId: decision.aggregateId,
        result: "local provider only",
        rationale: "acceptance fixture",
      }),
    );

    if (variant === "failure") {
      const failed = await mustOk(
        platform,
        cmd("StartExecution", owner, {
          workItemId: backend.aggregateId,
          kernel: "mock",
          scenario: "failure",
        }),
      );
      await platform.processJob("w1");
      const status = await pool.query(`SELECT status FROM executions WHERE id=$1`, [failed.aggregateId]);
      expect(status.rows[0]?.status).toBe("failed");
      const retry = await mustOk(
        platform,
        cmd("StartExecution", owner, {
          workItemId: backend.aggregateId,
          kernel: "mock",
          scenario: "success",
        }),
      );
      await platform.processJob("w1");
      await mustOk(platform, cmd("SelectCandidate", owner, { executionId: retry.aggregateId, reason: "recovered" }));
      const candidate = await mustOk(
        platform,
        cmd("CreateMergeCandidate", owner, { executionId: retry.aggregateId }),
      );
      await mustOk(platform, cmd("ProcessMergeQueue", owner, { projectId }));
      await mustOk(platform, cmd("MergeCandidate", owner, { mergeCandidateId: candidate.aggregateId }));
      const original = await pool.query(`SELECT status FROM executions WHERE id=$1`, [failed.aggregateId]);
      expect(original.rows[0]?.status).toBe("failed");
      return;
    }

    if (variant === "contract") {
      const artifact = await mustOk(
        platform,
        cmd("PublishArtifact", owner, {
          projectId,
          workItemId: backend.aggregateId,
          kind: "contract",
          title: "v1",
          body: { version: 1 },
        }),
      );
      await mustOk(
        platform,
        cmd("AdoptArtifact", member, {
          artifactId: artifact.aggregateId,
          consumerWorkItemId: frontend.aggregateId,
        }),
      );
      await mustOk(
        platform,
        cmd("PublishArtifact", owner, {
          projectId,
          workItemId: backend.aggregateId,
          kind: "contract",
          title: "v2",
          body: { version: 2 },
          supersedes: artifact.aggregateId,
        }),
      );
      const stale = await pool.query(`SELECT status FROM work_items WHERE id=$1`, [frontend.aggregateId]);
      expect(stale.rows[0]?.status).toBe("stale_spec");
      await mustOk(
        platform,
        cmd("ResolveStale", member, { workItemId: frontend.aggregateId, action: "replan" }),
      );
      return;
    }

    for (const item of [backend, frontend, qa]) {
      const execution = await mustOk(
        platform,
        cmd("StartExecution", owner, { workItemId: item.aggregateId, kernel: "mock", scenario: "success" }),
      );
      await platform.processJob("w1");
      await mustOk(platform, cmd("SelectCandidate", owner, { executionId: execution.aggregateId, reason: "green" }));
      const candidate = await mustOk(
        platform,
        cmd("CreateMergeCandidate", owner, { executionId: execution.aggregateId }),
      );
      await mustOk(platform, cmd("ProcessMergeQueue", owner, { projectId }));
      await mustOk(platform, cmd("MergeCandidate", owner, { mergeCandidateId: candidate.aggregateId }));
    }
    const completed = await pool.query(
      `SELECT count(*)::int AS n FROM work_items WHERE project_id=$1 AND status='completed'`,
      [projectId],
    );
    expect(completed.rows[0]?.n).toBe(3);
  }
});
