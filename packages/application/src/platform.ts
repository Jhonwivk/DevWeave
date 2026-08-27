import { createHash } from "node:crypto";
import { createMockExecutor } from "@human-agent/mock-adapter";
import {
  DomainError,
  assertTransition,
  newId,
  type ActorRef,
} from "@human-agent/domain";
import type { AgentExecutor } from "@human-agent/executor-sdk";
import { isCapabilityMiss } from "@human-agent/executor-sdk";
import {
  commitWrite,
  loadIdempotency,
  saveIdempotency,
  withTransaction,
  type DomainEventRecord,
} from "@human-agent/persistence";
import { runVerification, type VerificationProfile } from "@human-agent/verification";
import {
  checkpointWorkspace,
  commitAt,
  createWorktree,
  inspectRepository,
  mergeToProtected,
  rebaseOnto,
  restoreWorkspace,
} from "@human-agent/workspace-git";
import type pg from "pg";
import { parseSpecification } from "./spec-parse.ts";

export type CommandEnvelope = {
  type: string;
  idempotencyKey: string;
  actor: ActorRef;
  expectedVersion?: number;
  correlationId: string;
  causationId?: string;
  payload: Record<string, unknown>;
};

export type CommandOk = {
  ok: true;
  aggregateId: string;
  version: number;
  body: Record<string, unknown>;
  events: DomainEventRecord[];
};

export type CommandErr = {
  ok: false;
  error: {
    code: string;
    message: string;
    actor?: ActorRef;
    causationId?: string;
    correlationId?: string;
    details?: Record<string, unknown>;
  };
};

export type PlatformClock = { now: () => Date };

const DEFAULT_POLICY = ["workspace.read", "workspace.write", "git.commit"];
const BASELINE_RULES = ["host.sensitive", "secrets", "history.immutable", "branch.protected"];

export function createPlatform(
  pool: pg.Pool,
  options: {
    executors?: Record<string, AgentExecutor>;
    clock?: PlatformClock;
    leaseMs?: number;
  } = {},
) {
  const executors = options.executors ?? { mock: createMockExecutor() };
  const clock = options.clock ?? { now: () => new Date() };
  const leaseMs = options.leaseMs ?? 15_000;
  const listeners = new Map<string, Set<(event: DomainEventRecord) => void>>();

  async function handle(command: CommandEnvelope): Promise<CommandOk | CommandErr> {
    try {
      const result = await withTransaction(pool, async (client) => {
        const existing = await loadIdempotency(client, command.idempotencyKey);
        if (existing) {
          return existing as CommandOk;
        }
        const dispatched = await dispatch(client, command);
        await saveIdempotency(
          client,
          command.idempotencyKey,
          command.type,
          command.actor.id,
          dispatched,
        );
        return dispatched;
      });
      if (result.ok) {
        for (const record of result.events) {
          emit(record);
        }
      }
      return result;
    } catch (error) {
      if (error instanceof DomainError) {
        return {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            actor: command.actor,
            causationId: command.causationId,
            correlationId: command.correlationId,
            details: error.details,
          },
        };
      }
      throw error;
    }
  }

  function emit(event: DomainEventRecord): void {
    for (const listener of listeners.get(event.projectId) ?? []) {
      listener(event);
    }
  }

  function subscribe(
    projectId: string,
    listener: (event: DomainEventRecord) => void,
  ): () => void {
    const set = listeners.get(projectId) ?? new Set();
    set.add(listener);
    listeners.set(projectId, set);
    return () => set.delete(listener);
  }

  async function dispatch(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    switch (command.type) {
      case "CreateHuman":
        return createHuman(client, command);
      case "CreateProject":
        return createProject(client, command);
      case "ImportGitRepository":
        return importGit(client, command);
      case "InviteHuman":
        return inviteHuman(client, command);
      case "ImportDigitalEmployeeRelease":
        return importRelease(client, command);
      case "AdoptDigitalEmployee":
        return adoptDigitalEmployee(client, command);
      case "ImportPrivateAgent":
        return importPrivateAgent(client, command);
      case "GenerateSystemAgent":
        return generateSystemAgent(client, command);
      case "QualifySystemAgent":
        return qualifySystemAgent(client, command);
      case "CreateSpecification":
        return createSpecification(client, command);
      case "ReviewSpecification":
        return moveSpec(client, command, "in_review");
      case "PublishSpecification":
        return moveSpec(client, command, "effective");
      case "SupersedeSpecification":
        return supersedeSpec(client, command);
      case "WithdrawSpecification":
        return moveSpec(client, command, "withdrawn");
      case "CreateWorkItem":
        return createWorkItem(client, command, "formal");
      case "CreateExplorationWorkItem":
        return createWorkItem(client, command, "exploration");
      case "ProposeWorkGraph":
        return proposeWorkGraph(client, command);
      case "RecordConsensus":
        return recordConsensus(client, command);
      case "AssignWorkItem":
        return assignWorkItem(client, command);
      case "RaiseAssignmentConcern":
        return raiseConcern(client, command);
      case "ReassignWorkItem":
        return reassignWorkItem(client, command);
      case "RequestPermission":
        return requestPermission(client, command);
      case "DecidePermission":
        return decidePermission(client, command);
      case "StartExecution":
        return startExecution(client, command);
      case "Intervene":
        return intervene(client, command);
      case "CreateCheckpoint":
        return createCheckpoint(client, command);
      case "ForkExecution":
        return forkExecution(client, command);
      case "SelectCandidate":
        return selectCandidate(client, command);
      case "PublishArtifact":
        return publishArtifact(client, command);
      case "AdoptArtifact":
        return adoptArtifact(client, command);
      case "ProposeDecision":
        return proposeDecision(client, command);
      case "RecordDecision":
        return recordDecision(client, command);
      case "RegisterChangeIntent":
        return registerChangeIntent(client, command);
      case "SetContractOwnership":
        return setContractOwnership(client, command);
      case "CreateMergeCandidate":
        return createMergeCandidate(client, command);
      case "ProcessMergeQueue":
        return processMergeQueue(client, command);
      case "MergeCandidate":
        return mergeCandidate(client, command);
      case "ResolveStale":
        return resolveStale(client, command);
      case "ResolveInbox":
        return resolveInbox(client, command);
      case "RepairCandidate":
        return repairCandidate(client, command);
      default:
        throw new DomainError("invalid", `Unknown command ${command.type}`);
    }
  }

  async function createHuman(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = String(command.payload.id ?? newId("human"));
    const displayName = required(command.payload.displayName, "displayName");
    await client.query(
      `INSERT INTO humans (id, display_name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`,
      [id, displayName],
    );
    return ok(id, 1, { id, displayName }, []);
  }

  async function createProject(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    await ensureHuman(client, command.actor);
    const id = newId("project");
    const name = required(command.payload.name, "name");
    const expected = command.expectedVersion ?? 0;
    if (expected !== 0) {
      throw conflict(command, "CreateProject expected version must be 0");
    }
    const membershipId = newId("hm");
    await client.query(`INSERT INTO humans (id, display_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      command.actor.id,
      command.actor.displayName,
    ]);
    const events = await write(client, id, command, [
      {
        sql: `INSERT INTO projects (id, name, owner_id, version) VALUES ($1,$2,$3,1)`,
        params: [id, name, command.actor.id],
      },
      {
        sql: `INSERT INTO human_memberships (id, project_id, human_id, role, version) VALUES ($1,$2,$3,'owner',1)`,
        params: [membershipId, id, command.actor.id],
      },
    ], [
      event(command, id, "Project", 1, "ProjectCreated", {
        name,
        ownerId: command.actor.id,
      }),
    ]);
    return ok(id, 1, { id, name, ownerId: command.actor.id, version: 1 }, events);
  }

  async function importGit(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    await assertOwner(client, project.id, command.actor.id);
    assertExpected(command, project.version);
    const repoPath = required(command.payload.repoPath, "repoPath");
    const baseBranch = required(command.payload.baseBranch, "baseBranch");
    const protectedBranch = required(command.payload.protectedBranch, "protectedBranch");
    const profile = (command.payload.verificationProfile ?? defaultProfile()) as VerificationProfile;
    if (!Array.isArray(profile.commands) || profile.commands.length === 0) {
      throw new DomainError("invalid", "Verification Profile must include commands");
    }
    const inspected = await inspectRepository(repoPath);
    if (!inspected.branches.includes(baseBranch) || !inspected.branches.includes(protectedBranch)) {
      throw new DomainError("invalid", "base branch or protected branch does not exist");
    }
    const baseline = await commitAt(repoPath, baseBranch);
    const version = project.version + 1;
    const events = await write(client, project.id, command, [
      {
        sql: `UPDATE projects SET git_repo_path=$2, base_branch=$3, protected_branch=$4, baseline_commit=$5, verification_profile=$6, version=$7 WHERE id=$1`,
        params: [project.id, repoPath, baseBranch, protectedBranch, baseline, profile, version],
      },
    ], [
      event(command, project.id, "Project", version, "GitRepositoryImported", {
        repoPath,
        baseBranch,
        protectedBranch,
        baseline,
      }),
    ]);
    return ok(project.id, version, { ...project, repoPath, baseBranch, protectedBranch, baseline, version }, events);
  }

  async function inviteHuman(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    await assertOwner(client, project.id, command.actor.id);
    const humanId = required(command.payload.humanId, "humanId");
    const displayName = required(command.payload.displayName, "displayName");
    await client.query(
      `INSERT INTO humans (id, display_name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name`,
      [humanId, displayName],
    );
    const existing = await client.query(`SELECT id FROM human_memberships WHERE project_id=$1 AND human_id=$2 AND removed_at IS NULL`, [
      project.id,
      humanId,
    ]);
    if (existing.rowCount) {
      return ok(String(existing.rows[0]?.id), project.version, { duplicate: true }, []);
    }
    const id = newId("hm");
    const version = project.version + 1;
    const events = await write(client, project.id, command, [
      {
        sql: `INSERT INTO human_memberships (id, project_id, human_id, role, version) VALUES ($1,$2,$3,'member',1)`,
        params: [id, project.id, humanId],
      },
      { sql: `UPDATE projects SET version=$2 WHERE id=$1`, params: [project.id, version] },
    ], [
      event(command, id, "HumanMembership", 1, "HumanInvited", { humanId, role: "member" }),
    ]);
    return ok(id, version, { id, humanId, role: "member" }, events);
  }

  async function importRelease(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const body = required(command.payload.body, "body");
    const contentHash = hash(body);
    if (command.payload.contentHash && command.payload.contentHash !== contentHash) {
      throw new DomainError("invalid", "Digital Employee Release content hash mismatch");
    }
    const id = newId("rel");
    await client.query(
      `INSERT INTO digital_employee_releases (id, name, release_version, provenance, capabilities, content_hash, body)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        required(command.payload.name, "name"),
        required(command.payload.releaseVersion, "releaseVersion"),
        required(command.payload.provenance, "provenance"),
        jsonb(command.payload.capabilities ?? []),
        contentHash,
        body,
      ],
    );
    return ok(id, 1, { id, contentHash }, []);
  }

  async function adoptDigitalEmployee(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    await assertOwner(client, project.id, command.actor.id);
    const release = await one(client, `SELECT * FROM digital_employee_releases WHERE id=$1`, [
      required(command.payload.releaseId, "releaseId"),
    ]);
    const id = newId("am");
    const events = await insertAgentMembership(client, command, project.id, {
      id,
      sourceType: "digital_employee",
      displayName: String(release.name),
      releaseId: String(release.id),
      snapshotHash: String(release.content_hash),
      capabilities: release.capabilities,
    });
    return ok(id, 1, { id, sourceType: "digital_employee" }, events);
  }

  async function importPrivateAgent(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    const manifest = JSON.stringify(command.payload.manifest ?? {});
    const contentHash = hash(manifest);
    if (command.payload.contentHash && command.payload.contentHash !== contentHash) {
      throw new DomainError("invalid", "Private Agent content hash mismatch");
    }
    const copyId = newId("pac");
    const membershipId = newId("am");
    await client.query(
      `INSERT INTO private_agent_copies (id, project_id, cultivator_id, name, manifest, config_summary, permission_demand, content_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        copyId,
        project.id,
        command.actor.id,
        required(command.payload.name, "name"),
        command.payload.manifest ?? {},
        required(command.payload.configSummary, "configSummary"),
        jsonb(command.payload.permissionDemand ?? []),
        contentHash,
      ],
    );
    const events = await insertAgentMembership(client, command, project.id, {
      id: membershipId,
      sourceType: "private_agent",
      displayName: required(command.payload.name, "name"),
      copyId,
      snapshotHash: contentHash,
      capabilities: command.payload.capabilities ?? [],
      cultivatorId: command.actor.id,
    });
    return ok(membershipId, 1, { id: membershipId, copyId, sourceType: "private_agent" }, events);
  }

  async function generateSystemAgent(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    const id = newId("sga");
    await client.query(
      `INSERT INTO system_generated_candidates (id, project_id, gap, config, status)
       VALUES ($1,$2,$3,$4,'candidate')`,
      [id, project.id, command.payload.gap ?? {}, command.payload.config ?? {}],
    );
    await openInbox(client, project.id, "capability_gap", "System-Generated Agent 待准入", "需要 Human 确认 qualification", `/projects/${project.id}/team`, { candidateId: id });
    const events = await write(client, project.id, command, [], [
      event(command, id, "SystemGeneratedAgent", 1, "SystemAgentProposed", { gap: command.payload.gap }),
    ]);
    return ok(id, 1, { id, status: "candidate" }, events);
  }

  async function qualifySystemAgent(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const candidate = await one(client, `SELECT * FROM system_generated_candidates WHERE id=$1`, [
      required(command.payload.candidateId, "candidateId"),
    ]);
    const trial = Boolean(command.payload.trial);
    const membershipId = newId("am");
    await insertAgentMembership(client, command, String(candidate.project_id), {
      id: membershipId,
      sourceType: "system_generated",
      displayName: "System-Generated Agent",
      snapshotHash: hash(JSON.stringify(candidate.config)),
      capabilities: (candidate.gap as { capabilities?: string[] }).capabilities ?? [],
      trustStatus: trial ? "trial" : "qualified",
    });
    await client.query(`UPDATE system_generated_candidates SET status=$2, membership_id=$3 WHERE id=$1`, [
      candidate.id,
      trial ? "trial" : "qualified",
      membershipId,
    ]);
    return ok(membershipId, 1, { id: membershipId, trial }, []);
  }

  async function createSpecification(
    client: pg.PoolClient,
    command: CommandEnvelope,
  ): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    if (!project.git_repo_path) {
      throw new DomainError("invalid", "Project has no Git repository");
    }
    const body = required(command.payload.body, "body");
    const parsed = parseSpecOrThrow(body);
    const id = newId("spec");
    const familyId = String(command.payload.familyId ?? id);
    const gitCommit = await commitAt(String(project.git_repo_path), String(project.base_branch ?? "main"));
    const events = await write(client, project.id, command, [
      {
        sql: `INSERT INTO specifications (id, project_id, family_id, version_number, status, git_commit, body, body_hash, requirements, acceptance_criteria, version)
              VALUES ($1,$2,$3,1,'draft',$4,$5,$6,$7,$8,1)`,
        params: [id, project.id, familyId, gitCommit, body, hash(body), jsonb(parsed.requirements), jsonb(parsed.acceptanceCriteria)],
      },
    ], [
      event(command, id, "Specification", 1, "SpecificationCreated", { familyId, gitCommit }),
    ]);
    return ok(id, 1, { id, status: "draft", ...parsed, gitCommit }, events);
  }

  async function moveSpec(
    client: pg.PoolClient,
    command: CommandEnvelope,
    to: "in_review" | "effective" | "withdrawn",
  ): Promise<CommandOk> {
    const spec = await one(client, `SELECT * FROM specifications WHERE id=$1`, [
      required(command.payload.specId, "specId"),
    ]);
    assertExpected(command, Number(spec.version));
    assertTransition("specification", String(spec.status), to);
    const version = Number(spec.version) + 1;
    const review = to === "effective" ? { result: "approved", reviewer: command.actor.id } : spec.review_result;
    const events = await write(client, String(spec.project_id), command, [
      {
        sql: `UPDATE specifications SET status=$2, review_result=$3, version=$4 WHERE id=$1`,
        params: [spec.id, to, review, version],
      },
    ], [
      event(command, String(spec.id), "Specification", version, "SpecificationTransitioned", { to }),
    ]);
    return ok(String(spec.id), version, { id: spec.id, status: to, version }, events);
  }

  async function supersedeSpec(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const spec = await one(client, `SELECT * FROM specifications WHERE id=$1`, [
      required(command.payload.specId, "specId"),
    ]);
    assertTransition("specification", String(spec.status), "superseded");
    const body = required(command.payload.body, "body");
    const parsed = parseSpecOrThrow(body);
    const newIdSpec = newId("spec");
    const versionNumber = Number(spec.version_number) + 1;
    await write(client, String(spec.project_id), command, [
      {
        sql: `UPDATE specifications SET status='superseded', version=version+1 WHERE id=$1`,
        params: [spec.id],
      },
      {
        sql: `INSERT INTO specifications (id, project_id, family_id, version_number, status, git_commit, body, body_hash, requirements, acceptance_criteria, supersedes, version)
              VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,1)`,
        params: [
          newIdSpec,
          spec.project_id,
          spec.family_id,
          versionNumber,
          spec.git_commit,
          body,
          hash(body),
          jsonb(parsed.requirements),
          jsonb(parsed.acceptanceCriteria),
          spec.id,
        ],
      },
    ], [
      event(command, newIdSpec, "Specification", 1, "SpecificationSuperseded", { previous: spec.id }),
    ]);
    const nextById = new Map(parsed.acceptanceCriteria.map((item) => [item.id, item.text]));
    const previous = spec.acceptance_criteria as { id: string; text?: string }[];
    const stale = previous.some(
      (item) => nextById.get(item.id) !== item.text || Boolean(command.payload.forceStale),
    );
    if (stale) {
      await client.query(
        `UPDATE work_items SET status='stale_spec', stale_reason=$2 WHERE spec_id=$1 AND kind='formal' AND status NOT IN ('completed','cancelled')`,
        [spec.id, "Acceptance Criterion changed in a new Effective Specification"],
      );
    }
    await openInbox(client, String(spec.project_id), "stale", "Specification 失效", "相关 Work Item 需要处理 stale_spec", `/projects/${String(spec.project_id)}/work`, {});
    return ok(newIdSpec, 1, { id: newIdSpec, supersedes: spec.id }, []);
  }

  async function createWorkItem(
    client: pg.PoolClient,
    command: CommandEnvelope,
    kind: "formal" | "exploration",
  ): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    const specId = command.payload.specId ? String(command.payload.specId) : undefined;
    const criteria = (command.payload.acceptanceCriteria as string[] | undefined) ?? [];
    if (kind === "formal") {
      if (!specId) throw new DomainError("invalid", "Formal Work Item requires a Specification");
      const spec = await one(client, `SELECT * FROM specifications WHERE id=$1`, [specId]);
      if (spec.status !== "effective") {
        throw new DomainError("invalid", "Work Item must reference an Effective Specification");
      }
      const known = new Set((spec.acceptance_criteria as { id: string }[]).map((item) => item.id));
      for (const id of criteria) {
        if (!known.has(id)) throw new DomainError("invalid", `Unknown Acceptance Criterion ${id}`);
      }
    }
    const id = newId("wi");
    const coverage = criteria.map((id) => ({ id, status: "planned" }));
    const events = await write(client, project.id, command, [
      {
        sql: `INSERT INTO work_items (id, project_id, spec_id, kind, goal, acceptance_criteria, risk, affected_scope, required_capabilities, status, coverage, exploration_bound, version)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,1)`,
        params: [
          id,
          project.id,
          specId ?? null,
          kind,
          required(command.payload.goal, "goal"),
          jsonb(criteria),
          required(command.payload.risk, "risk"),
          jsonb(command.payload.affectedScope ?? []),
          jsonb(command.payload.requiredCapabilities ?? []),
          jsonb(coverage),
          command.payload.explorationBound ?? null,
        ],
      },
    ], [
      event(command, id, "WorkItem", 1, "WorkItemCreated", { kind }),
    ]);
    return ok(id, 1, { id, kind, status: "draft" }, events);
  }

  async function proposeWorkGraph(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const projectId = required(command.payload.projectId, "projectId");
    const edges = (command.payload.edges as { from: string; to: string }[]) ?? [];
    const ids = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
    for (const id of ids) {
      await one(client, `SELECT id FROM work_items WHERE id=$1 AND project_id=$2`, [id, projectId]);
    }
    if (hasCycle(edges)) {
      throw new DomainError("invalid", "Work Graph contains a cycle");
    }
    for (const edge of edges) {
      await client.query(`UPDATE work_items SET blocked_by = blocked_by || $2::jsonb WHERE id=$1`, [
        edge.to,
        JSON.stringify([edge.from]),
      ]);
    }
    const events = await write(client, projectId, command, [], [
      event(command, projectId, "WorkGraph", 1, "WorkGraphProposed", { edges, approved: false }),
    ]);
    return ok(projectId, 1, { edges, approved: false }, events);
  }

  async function recordConsensus(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const projectId = required(command.payload.projectId, "projectId");
    const id = newId("rc");
    const disclaimer = "Recorded Consensus 只保存线下结果与登记者，不表示平台验证了全员一致。";
    const events = await write(client, projectId, command, [
      {
        sql: `INSERT INTO recorded_consensus (id, project_id, result, recorder_id, rationale, disclaimer) VALUES ($1,$2,$3,$4,$5,$6)`,
        params: [
          id,
          projectId,
          required(command.payload.result, "result"),
          command.actor.id,
          required(command.payload.rationale, "rationale"),
          disclaimer,
        ],
      },
    ], [
      event(command, id, "RecordedConsensus", 1, "ConsensusRecorded", { disclaimer }),
    ]);
    await client.query(`UPDATE work_items SET status='ready' WHERE project_id=$1 AND status='draft'`, [projectId]);
    return ok(id, 1, { id, disclaimer }, events);
  }

  async function assignWorkItem(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const item = await one(client, `SELECT * FROM work_items WHERE id=$1`, [
      required(command.payload.workItemId, "workItemId"),
    ]);
    const membership = await one(client, `SELECT * FROM agent_memberships WHERE id=$1`, [
      required(command.payload.membershipId, "membershipId"),
    ]);
    const requiredCaps = item.required_capabilities as string[];
    const have = membership.capabilities as string[];
    const missing = requiredCaps.filter((cap) => !have.includes(cap));
    const override = command.payload.override as { reason: string; scope: string } | undefined;
    if (missing.length > 0 && !override) {
      throw new DomainError("forbidden", "Assignment fails hard capability constraints", { missing });
    }
    if (membership.trust_status === "candidate") {
      throw new DomainError("forbidden", "Candidate cannot be assigned");
    }
    assertTransition("workItem", String(item.status), "assigned");
    const assignment = {
      membershipId: membership.id,
      version: 1,
      override,
      concerns: [],
      actor: command.actor.id,
    };
    const events = await write(client, String(item.project_id), command, [
      {
        sql: `UPDATE work_items SET status='assigned', assignment=$2, version=version+1 WHERE id=$1`,
        params: [item.id, assignment],
      },
    ], [
      event(command, String(item.id), "WorkItem", Number(item.version) + 1, "WorkItemAssigned", assignment),
    ]);
    return ok(String(item.id), Number(item.version) + 1, { assignment }, events);
  }

  async function raiseConcern(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const item = await one(client, `SELECT * FROM work_items WHERE id=$1`, [
      required(command.payload.workItemId, "workItemId"),
    ]);
    const assignment = { ...(item.assignment as Record<string, unknown>), concerns: [command.payload.concern] };
    await client.query(`UPDATE work_items SET assignment=$2, version=version+1 WHERE id=$1`, [item.id, assignment]);
    return ok(String(item.id), Number(item.version) + 1, { assignment }, []);
  }

  async function reassignWorkItem(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const item = await one(client, `SELECT * FROM work_items WHERE id=$1`, [
      required(command.payload.workItemId, "workItemId"),
    ]);
    const previous = item.assignment;
    const assignment = {
      membershipId: required(command.payload.membershipId, "membershipId"),
      version: Number((previous as { version?: number } | null)?.version ?? 0) + 1,
      previous,
      actor: command.actor.id,
    };
    await client.query(`UPDATE work_items SET assignment=$2, version=version+1 WHERE id=$1`, [item.id, assignment]);
    return ok(String(item.id), Number(item.version) + 1, { assignment }, []);
  }

  async function requestPermission(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = newId("perm");
    const projectId = required(command.payload.projectId, "projectId");
    const action = required(command.payload.action, "action");
    if (BASELINE_RULES.some((rule) => action.startsWith(rule))) {
      throw new DomainError("forbidden", "Platform baseline rules cannot be overridden");
    }
    const expiresAt = new Date(clock.now().getTime() + Number(command.payload.ttlMs ?? 3_600_000));
    await write(client, projectId, command, [
      {
        sql: `INSERT INTO permission_requests (id, project_id, membership_id, action, resource_scope, reason, expires_at, status, version)
              VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',1)`,
        params: [
          id,
          projectId,
          required(command.payload.membershipId, "membershipId"),
          action,
          required(command.payload.resourceScope, "resourceScope"),
          required(command.payload.reason, "reason"),
          expiresAt,
        ],
      },
    ], [event(command, id, "PermissionRequest", 1, "PermissionRequested", { action })]);
    await openInbox(client, projectId, "permission", "Permission Request", action, `/projects/${projectId}/team`, { id });
    return ok(id, 1, { id, status: "pending", expiresAt: expiresAt.toISOString() }, []);
  }

  async function decidePermission(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const req = await one(client, `SELECT * FROM permission_requests WHERE id=$1`, [
      required(command.payload.requestId, "requestId"),
    ]);
    const status = command.payload.approve ? "approved" : "rejected";
    await client.query(`UPDATE permission_requests SET status=$2, decided_by=$3 WHERE id=$1`, [
      req.id,
      status,
      command.actor.id,
    ]);
    if (command.payload.approve) {
      await client.query(
        `UPDATE agent_memberships SET approved_permissions = approved_permissions || $2::jsonb WHERE id=$1`,
        [req.membership_id, JSON.stringify([req.action])],
      );
    }
    return ok(String(req.id), 1, { status }, []);
  }

  async function startExecution(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const item = await one(client, `SELECT * FROM work_items WHERE id=$1`, [
      required(command.payload.workItemId, "workItemId"),
    ]);
    if (item.kind === "exploration" && command.payload.completeCoverage) {
      throw new DomainError("forbidden", "Exploration Work Item cannot directly become verified shared product results");
    }
    if (item.status === "stale_spec") {
      throw new DomainError("invalid", "Work Item is stale_spec");
    }
    const project = await loadProject(client, String(item.project_id));
    const kernel = String(command.payload.kernel ?? (executors.pi ? "pi" : "mock"));
    const executor = executors[kernel] ?? executors.mock;
    if (!executor) throw new DomainError("invalid", `Kernel ${kernel} is not on the allowlist`);
    const context = await buildContext(client, item, project, command.actor);
    const id = newId("ex");
    let workspacePath: string | undefined;
    let gitBranch: string | undefined;
    const baseCommit = String(project.baseline_commit ?? "");
    if (project.git_repo_path) {
      const tree = await createWorktree({
        repoPath: String(project.git_repo_path),
        executionId: id,
        baseCommit,
      });
      workspacePath = tree.path;
      gitBranch = tree.branch;
    }
    const input = {
      prompt: String(command.payload.prompt ?? item.goal),
      scenario: command.payload.scenario ?? "success",
      kernel,
    };
    await client.query(
      `UPDATE change_intents SET status='active' WHERE work_item_id=$1 AND status='reserved'`,
      [item.id],
    );
    const events = await write(client, project.id, command, [
      {
        sql: `INSERT INTO executions (id, project_id, work_item_id, parent_execution_id, checkpoint_id, branch_kind, status, kernel, scenario, workspace_path, git_branch, base_commit, input_snapshot, context_package, version)
              VALUES ($1,$2,$3,$4,$5,'original','queued',$6,$7,$8,$9,$10,$11,$12,1)`,
        params: [
          id,
          project.id,
          item.id,
          command.payload.parentExecutionId ?? null,
          command.payload.checkpointId ?? null,
          kernel,
          input.scenario,
          workspacePath ?? null,
          gitBranch ?? null,
          baseCommit,
          input,
          context,
        ],
      },
      {
        sql: `INSERT INTO jobs (id, execution_id, project_id, status, payload) VALUES ($1,$2,$3,'available',$4)`,
        params: [newId("job"), id, project.id, { executionId: id }],
      },
      {
        sql: `UPDATE work_items SET status='in_progress' WHERE id=$1 AND status IN ('assigned','ready','draft')`,
        params: [item.id],
      },
    ], [event(command, id, "Execution", 1, "ExecutionQueued", { kernel, workItemId: item.id })]);
    return ok(id, 1, { id, status: "queued", kernel, workspacePath, gitBranch, context }, events);
  }

  async function intervene(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [
      required(command.payload.executionId, "executionId"),
    ]);
    const action = required(command.payload.action, "action") as
      | "send"
      | "pause"
      | "resume"
      | "interrupt"
      | "cancel";
    const executor = executors[String(execution.kernel)] ?? executors.mock;
    if (!executor) throw new DomainError("invalid", "missing executor");
    let next = String(execution.status);
    if (action === "cancel") {
      assertTransition("execution", next, "cancelled");
      next = "cancelled";
      await executor.interrupt(String(execution.id));
    } else if (action === "pause" || action === "interrupt") {
      await executor.interrupt(String(execution.id));
      next = "paused";
    } else if (action === "resume") {
      const result = await executor.resume?.(String(execution.id));
      if (result && isCapabilityMiss(result)) throw new DomainError("unsupported", "resume unsupported");
      next = "running";
    } else {
      const result = await executor.send?.(String(execution.id), String(command.payload.message ?? ""));
      if (result && isCapabilityMiss(result)) throw new DomainError("unsupported", "send unsupported");
    }
    await write(client, String(execution.project_id), command, [
      { sql: `UPDATE executions SET status=$2, version=version+1 WHERE id=$1`, params: [execution.id, next] },
    ], [
      event(command, String(execution.id), "Execution", Number(execution.version) + 1, "InterventionApplied", { action }),
    ]);
    return ok(String(execution.id), Number(execution.version) + 1, { status: next, action }, []);
  }

  async function createCheckpoint(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [
      required(command.payload.executionId, "executionId"),
    ]);
    const executor = executors[String(execution.kernel)] ?? executors.mock;
    const id = newId("cp");
    let workspaceCommit: string | undefined;
    let kernelRef: Record<string, unknown> | undefined;
    let failure: Record<string, unknown> | undefined;
    try {
      if (!execution.workspace_path) throw new Error("missing workspace");
      workspaceCommit = await checkpointWorkspace(String(execution.workspace_path));
      const ref = await executor?.checkpoint?.(String(execution.id));
      if (!ref || isCapabilityMiss(ref)) throw new Error("kernel checkpoint failed");
      kernelRef = ref;
    } catch (error) {
      failure = { message: error instanceof Error ? error.message : "checkpoint failed" };
    }
    const published = Boolean(workspaceCommit && kernelRef && !failure);
    await write(client, String(execution.project_id), command, [
      {
        sql: `INSERT INTO checkpoints (id, execution_id, project_id, workspace_commit, kernel_ref, project_version, input_version, published, failure_evidence)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        params: [
          id,
          execution.id,
          execution.project_id,
          workspaceCommit ?? null,
          kernelRef ?? null,
          (await loadProject(client, String(execution.project_id))).version,
          execution.version,
          published,
          failure ?? null,
        ],
      },
    ], [
      event(command, id, "Checkpoint", 1, published ? "CheckpointPublished" : "CheckpointFailed", {
        executionId: execution.id,
        published,
      }),
    ]);
    return ok(id, 1, { id, published, workspaceCommit, kernelRef, failure }, []);
  }

  async function forkExecution(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const checkpoint = await one(client, `SELECT * FROM checkpoints WHERE id=$1`, [
      required(command.payload.checkpointId, "checkpointId"),
    ]);
    if (!checkpoint.published) {
      throw new DomainError("restore_failed", "Checkpoint is not published");
    }
    const original = await one(client, `SELECT * FROM executions WHERE id=$1`, [checkpoint.execution_id]);
    const project = await loadProject(client, String(original.project_id));
    const executor = executors[String(original.kernel)] ?? executors.mock;
    const reconstructed = Boolean(command.payload.reconstructed) || !executor?.capabilities().forkFrom;
    const id = newId("ex");
    try {
      if (!checkpoint.workspace_commit || !project.git_repo_path) {
        throw new Error("workspace restore failed");
      }
      const path = await restoreWorkspace(
        String(project.git_repo_path),
        id,
        String(checkpoint.workspace_commit),
      );
      if (!reconstructed) {
        const forked = await executor?.forkFrom?.(checkpoint.kernel_ref as never, {
          executionId: id,
          workspacePath: path,
          prompt: String(command.payload.prompt ?? "fork"),
        });
        if (!forked || isCapabilityMiss(forked)) {
          throw new DomainError("restore_failed", "Kernel restore failed");
        }
      }
      await write(client, project.id, command, [
        {
          sql: `INSERT INTO executions (id, project_id, work_item_id, parent_execution_id, checkpoint_id, branch_kind, status, kernel, scenario, workspace_path, git_branch, base_commit, input_snapshot, context_package, version)
                VALUES ($1,$2,$3,$4,$5,$6,'queued',$7,$8,$9,$10,$11,$12,$13,1)`,
          params: [
            id,
            project.id,
            original.work_item_id,
            original.id,
            checkpoint.id,
            reconstructed ? "reconstructed" : "exact",
            original.kernel,
            reconstructed ? "success" : original.scenario,
            path,
            `ha/execution/${id}`,
            checkpoint.workspace_commit,
            { ...(original.input_snapshot as object), prompt: command.payload.prompt },
            original.context_package,
          ],
        },
        {
          sql: `INSERT INTO jobs (id, execution_id, project_id, status, payload) VALUES ($1,$2,$3,'available',$4)`,
          params: [newId("job"), id, project.id, { executionId: id }],
        },
      ], [
        event(command, id, "Execution", 1, "ExecutionBranched", {
          kind: reconstructed ? "reconstructed" : "exact",
          checkpointId: checkpoint.id,
        }),
      ]);
      return ok(id, 1, { id, branchKind: reconstructed ? "reconstructed" : "exact" }, []);
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError("restore_failed", error instanceof Error ? error.message : "restore failed");
    }
  }

  async function selectCandidate(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [
      required(command.payload.executionId, "executionId"),
    ]);
    await client.query(`UPDATE executions SET selected=FALSE WHERE work_item_id=$1`, [execution.work_item_id]);
    await write(client, String(execution.project_id), command, [
      { sql: `UPDATE executions SET selected=TRUE WHERE id=$1`, params: [execution.id] },
    ], [
      event(command, String(execution.id), "Execution", Number(execution.version), "CandidateSelected", {
        reason: command.payload.reason ?? "",
      }),
    ]);
    return ok(String(execution.id), Number(execution.version), { selected: true }, []);
  }

  async function publishArtifact(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = newId("art");
    const body = command.payload.body ?? {};
    const contentHash = hash(JSON.stringify(body));
    const projectId = required(command.payload.projectId, "projectId");
    await write(client, projectId, command, [
      {
        sql: `INSERT INTO artifacts (id, project_id, work_item_id, producer_execution_id, kind, title, status, version_number, content_hash, body, version)
              VALUES ($1,$2,$3,$4,$5,$6,'published',1,$7,$8,1)`,
        params: [
          id,
          projectId,
          required(command.payload.workItemId, "workItemId"),
          command.payload.executionId ?? null,
          required(command.payload.kind, "kind"),
          required(command.payload.title, "title"),
          contentHash,
          body,
        ],
      },
    ], [event(command, id, "Artifact", 1, "ArtifactPublished", { contentHash })]);
    if (command.payload.supersedes) {
      await client.query(`UPDATE artifacts SET status='superseded', supersedes=NULL WHERE id=$1`, [
        command.payload.supersedes,
      ]);
      await client.query(
        `UPDATE work_items SET status='stale_spec', stale_reason='Adopted Contract version was superseded' WHERE id IN (SELECT consumer_work_item_id FROM artifact_adoptions WHERE artifact_id=$1)`,
        [command.payload.supersedes],
      );
      await openInbox(client, projectId, "stale", "Contract 失效", "Consumer 需要采用新版本", `/projects/${projectId}/artifacts`, {});
    }
    return ok(id, 1, { id, contentHash, status: "published" }, []);
  }

  async function adoptArtifact(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const artifact = await one(client, `SELECT * FROM artifacts WHERE id=$1`, [
      required(command.payload.artifactId, "artifactId"),
    ]);
    if (artifact.status !== "published") {
      throw new DomainError("invalid", "Consumer can only adopt a published Artifact version");
    }
    const id = newId("adopt");
    await client.query(
      `INSERT INTO artifact_adoptions (id, artifact_id, artifact_version, consumer_work_item_id, actor_id) VALUES ($1,$2,$3,$4,$5)`,
      [id, artifact.id, artifact.version_number, required(command.payload.consumerWorkItemId, "consumerWorkItemId"), command.actor.id],
    );
    return ok(id, 1, { id, artifactId: artifact.id }, []);
  }

  async function proposeDecision(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = newId("dec");
    const projectId = required(command.payload.projectId, "projectId");
    await write(client, projectId, command, [
      {
        sql: `INSERT INTO decisions (id, project_id, status, question, options, evidence, impact, proposer_id, version)
              VALUES ($1,$2,'proposed',$3,$4,$5,$6,$7,1)`,
        params: [
          id,
          projectId,
          required(command.payload.question, "question"),
          jsonb(command.payload.options ?? []),
          command.payload.evidence ?? null,
          required(command.payload.impact, "impact"),
          command.actor.id,
        ],
      },
    ], [event(command, id, "Decision", 1, "DecisionProposed", {})]);
    return ok(id, 1, { id, status: "proposed" }, []);
  }

  async function recordDecision(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const decision = await one(client, `SELECT * FROM decisions WHERE id=$1`, [
      required(command.payload.decisionId, "decisionId"),
    ]);
    assertTransition("decision", String(decision.status), "decided");
    await write(client, String(decision.project_id), command, [
      {
        sql: `UPDATE decisions SET status='decided', result=$2, rationale=$3, recorder_id=$4, version=version+1 WHERE id=$1`,
        params: [
          decision.id,
          required(command.payload.result, "result"),
          required(command.payload.rationale, "rationale"),
          command.actor.id,
        ],
      },
    ], [event(command, String(decision.id), "Decision", Number(decision.version) + 1, "DecisionRecorded", {
      disclaimer: "Recorder is not a platform-verified unique Decision Maker.",
    })]);
    return ok(String(decision.id), Number(decision.version) + 1, { status: "decided" }, []);
  }

  async function registerChangeIntent(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = newId("ci");
    const projectId = required(command.payload.projectId, "projectId");
    const files = (command.payload.files as string[]) ?? [];
    const symbols = (command.payload.symbols as string[]) ?? [];
    const contracts = (command.payload.contracts as string[]) ?? [];
    const owned = await client.query(`SELECT * FROM contract_ownership WHERE project_id=$1`, [projectId]);
    const hitsOwnership = owned.rows.some((row) =>
      files.some((file) => file === String(row.path) || file.startsWith(`${String(row.path)}/`)) ||
      contracts.includes(String(row.path)),
    );
    if (hitsOwnership && !command.payload.override) {
      throw new DomainError("forbidden", "Ownership rules require Human override", {
        paths: owned.rows.map((row) => row.path),
      });
    }
    const overlap = await client.query(
      `SELECT * FROM change_intents WHERE project_id=$1 AND status IN ('reserved','active')`,
      [projectId],
    );
    const overlapping = overlap.rows.filter((row) => {
      const otherFiles = row.files as string[];
      const otherSymbols = row.symbols as string[];
      const otherContracts = row.contracts as string[];
      return (
        files.some((file) => otherFiles.includes(file)) ||
        symbols.some((symbol) => otherSymbols.includes(symbol)) ||
        contracts.some((contract) => otherContracts.includes(contract))
      );
    });
    const kind =
      overlapping.some((row) => (row.contracts as string[]).some((item) => contracts.includes(item))) || hitsOwnership
        ? "contract"
        : overlapping.some((row) => (row.symbols as string[]).some((item) => symbols.includes(item)))
          ? "symbol"
          : overlapping.length > 0
            ? "text"
            : undefined;
    const events = await write(client, projectId, command, [
      {
        sql: `INSERT INTO change_intents (id, project_id, work_item_id, status, files, symbols, contracts, risk, version)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)`,
        params: [
          id,
          projectId,
          required(command.payload.workItemId, "workItemId"),
          "reserved",
          jsonb(files),
          jsonb(symbols),
          jsonb(contracts),
          required(command.payload.risk, "risk"),
        ],
      },
    ], [
      event(command, id, "ChangeIntent", 1, kind ? "ReservationOverlap" : "ChangeIntentReserved", {
        warning: Boolean(kind),
        kind,
        locked: false,
      }),
    ]);
    if (kind && overlapping[0]) {
      await client.query(
        `INSERT INTO conflicts (id, project_id, kind, left_work_item_id, right_work_item_id, details)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          newId("cf"),
          projectId,
          kind,
          command.payload.workItemId,
          overlapping[0].work_item_id,
          { files, symbols, contracts },
        ],
      );
      if (kind === "contract") {
        await openInbox(client, projectId, "conflict", "Contract Conflict", "需要 Human 处理所有权和失效传播", `/projects/${projectId}/merge`, { id });
      }
    }
    return ok(id, 1, { id, overlap: Boolean(kind), kind, locked: false }, events);
  }

  async function setContractOwnership(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const id = newId("own");
    await client.query(
      `INSERT INTO contract_ownership (id, project_id, path, kind, owner_membership_id, rules)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (project_id, path) DO UPDATE SET rules=EXCLUDED.rules, owner_membership_id=EXCLUDED.owner_membership_id`,
      [
        id,
        required(command.payload.projectId, "projectId"),
        required(command.payload.path, "path"),
        required(command.payload.kind, "kind"),
        command.payload.ownerMembershipId ?? null,
        command.payload.rules ?? { requireHumanOverride: true },
      ],
    );
    return ok(id, 1, { id }, []);
  }

  async function createMergeCandidate(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [
      required(command.payload.executionId, "executionId"),
    ]);
    if (!execution.selected) {
      throw new DomainError("invalid", "Only the selected candidate can enter the merge queue");
    }
    const max = await client.query<{ max: number }>(
      `SELECT COALESCE(MAX(queue_order),0) AS max FROM merge_candidates WHERE project_id=$1`,
      [execution.project_id],
    );
    const id = newId("mc");
    await write(client, String(execution.project_id), command, [
      {
        sql: `INSERT INTO merge_candidates (id, project_id, execution_id, status, queue_order, version)
              VALUES ($1,$2,$3,'queued',$4,1)`,
        params: [id, execution.project_id, execution.id, Number(max.rows[0]?.max ?? 0) + 1],
      },
    ], [event(command, id, "MergeCandidate", 1, "MergeCandidateQueued", {})]);
    return ok(id, 1, { id, status: "queued" }, []);
  }

  async function processMergeQueue(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const project = await loadProject(client, required(command.payload.projectId, "projectId"));
    const candidate = await client.query(
      `SELECT * FROM merge_candidates WHERE project_id=$1 AND status='queued' ORDER BY queue_order ASC LIMIT 1`,
      [project.id],
    );
    const row = candidate.rows[0];
    if (!row) return ok(project.id, project.version, { processed: false }, []);
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [row.execution_id]);
    const profile = (project.verification_profile ?? defaultProfile()) as VerificationProfile;
    await client.query(`UPDATE merge_candidates SET status='rebasing' WHERE id=$1`, [row.id]);
    if (execution.workspace_path && project.baseline_commit) {
      const rebase = await rebaseOnto(String(execution.workspace_path), String(project.baseline_commit));
      if (!rebase.ok) {
        await client.query(`UPDATE merge_candidates SET status='conflicted' WHERE id=$1`, [row.id]);
        await client.query(
          `INSERT INTO conflicts (id, project_id, kind, details) VALUES ($1,$2,'text',$3)`,
          [newId("cf"), project.id, { candidateId: row.id }],
        );
        return ok(String(row.id), 1, { status: "conflicted", kind: "text" }, []);
      }
    }
    await client.query(`UPDATE merge_candidates SET status='validating' WHERE id=$1`, [row.id]);
    const evidence = execution.workspace_path
      ? await runVerification(String(execution.workspace_path), profile)
      : { profileVersion: profile.version, passed: true, steps: [], startedAt: clock.now().toISOString(), finishedAt: clock.now().toISOString() };
    if (!evidence.passed) {
      await client.query(`UPDATE merge_candidates SET status='validation_failed', verification=$2 WHERE id=$1`, [
        row.id,
        evidence,
      ]);
      await client.query(
        `INSERT INTO conflicts (id, project_id, kind, details) VALUES ($1,$2,'semantic',$3)`,
        [newId("cf"), project.id, { candidateId: row.id, evidence }],
      );
      await openInbox(client, project.id, "failure", "Semantic Conflict", "clean merge 后验证失败", `/projects/${project.id}/merge`, { id: row.id });
      return ok(String(row.id), 1, { status: "validation_failed", kind: "semantic", evidence }, []);
    }
    await client.query(`UPDATE merge_candidates SET status='mergeable', verification=$2, baseline_commit=$3 WHERE id=$1`, [
      row.id,
      evidence,
      project.baseline_commit,
    ]);
    return ok(String(row.id), 1, { status: "mergeable", evidence }, []);
  }

  async function mergeCandidate(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const candidate = await one(client, `SELECT * FROM merge_candidates WHERE id=$1`, [
      required(command.payload.mergeCandidateId, "mergeCandidateId"),
    ]);
    if (candidate.status !== "mergeable") {
      throw new DomainError("forbidden", "Only mergeable candidates can enter the protected branch");
    }
    const project = await loadProject(client, String(candidate.project_id));
    const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [candidate.execution_id]);
    let sharedCommit = "local";
    if (project.git_repo_path && execution.git_branch && project.protected_branch) {
      sharedCommit = await mergeToProtected(
        String(project.git_repo_path),
        String(execution.git_branch),
        String(project.protected_branch),
      );
    }
    const events = await write(client, project.id, command, [
      {
        sql: `UPDATE merge_candidates SET status='merged', shared_commit=$2 WHERE id=$1`,
        params: [candidate.id, sharedCommit],
      },
      {
        sql: `UPDATE projects SET baseline_commit=$2, version=version+1 WHERE id=$1`,
        params: [project.id, sharedCommit],
      },
      {
        sql: `UPDATE work_items SET status='completed', coverage = (
          SELECT jsonb_agg(jsonb_set(elem, '{status}', '"verified"')) FROM jsonb_array_elements(coverage) elem
        ) WHERE id=$1`,
        params: [execution.work_item_id],
      },
      {
        sql: `UPDATE change_intents SET status='released' WHERE work_item_id=$1 AND status IN ('reserved','active')`,
        params: [execution.work_item_id],
      },
    ], [event(command, String(candidate.id), "MergeCandidate", 1, "Merged", { sharedCommit })]);
    return ok(String(candidate.id), 1, { status: "merged", sharedCommit }, events);
  }

  async function resolveStale(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const item = await one(client, `SELECT * FROM work_items WHERE id=$1`, [
      required(command.payload.workItemId, "workItemId"),
    ]);
    const action = required(command.payload.action, "action");
    const next = action === "pause" ? "blocked" : "ready";
    await write(client, String(item.project_id), command, [
      { sql: `UPDATE work_items SET status=$2, stale_reason=NULL WHERE id=$1`, params: [item.id, next] },
    ], [event(command, String(item.id), "WorkItem", Number(item.version) + 1, "StaleResolved", { action })]);
    return ok(String(item.id), Number(item.version) + 1, { status: next, action }, []);
  }

  async function resolveInbox(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    await client.query(`UPDATE inbox_items SET status='resolved', resolved_at=now() WHERE id=$1`, [
      required(command.payload.inboxItemId, "inboxItemId"),
    ]);
    return ok(String(command.payload.inboxItemId), 1, { status: "resolved" }, []);
  }

  async function repairCandidate(client: pg.PoolClient, command: CommandEnvelope): Promise<CommandOk> {
    const candidate = await one(client, `SELECT * FROM merge_candidates WHERE id=$1`, [
      required(command.payload.mergeCandidateId, "mergeCandidateId"),
    ]);
    const highRisk = Boolean(command.payload.highRisk) || Number(command.payload.attempts ?? 0) > 2;
    if (highRisk) {
      await openInbox(client, String(candidate.project_id), "failure", "修复升级 Human", "高风险或超预算停止自动化", `/projects/${String(candidate.project_id)}/merge`, { id: candidate.id });
      return ok(String(candidate.id), 1, { escalated: true }, []);
    }
    await client.query(`UPDATE merge_candidates SET status='queued' WHERE id=$1`, [candidate.id]);
    return ok(String(candidate.id), 1, { status: "queued", attempt: true }, []);
  }

  async function processJob(workerId: string): Promise<boolean> {
    const committed: DomainEventRecord[] = [];
    const did = await withTransaction(pool, async (client) => {
      const now = clock.now();
      await client.query(
        `UPDATE jobs SET status='available', lease_owner=NULL WHERE status='leased' AND lease_until < $1`,
        [now],
      );
      const claimed = await client.query(
        `UPDATE jobs SET status='leased', lease_owner=$1, lease_until=$2, heartbeat_at=$3, attempts=attempts+1
         WHERE id = (SELECT id FROM jobs WHERE status='available' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
         RETURNING *`,
        [workerId, new Date(now.getTime() + leaseMs), now],
      );
      const job = claimed.rows[0];
      if (!job) return false;
      const duplicate = await client.query(
        `SELECT id FROM jobs WHERE execution_id=$1 AND status='leased' AND id <> $2`,
        [job.execution_id, job.id],
      );
      if (duplicate.rowCount) {
        await client.query(`UPDATE jobs SET status='available', lease_owner=NULL WHERE id=$1`, [job.id]);
        return false;
      }
      await client.query(
        `UPDATE jobs SET status='cancelled' WHERE execution_id=$1 AND id <> $2 AND status='available'`,
        [job.execution_id, job.id],
      );
      const execution = await one(client, `SELECT * FROM executions WHERE id=$1`, [job.execution_id]);
      const executor = executors[String(execution.kernel)] ?? executors.mock;
      await client.query(`UPDATE executions SET status='starting' WHERE id=$1`, [execution.id]);
      await client.query(`UPDATE executions SET status='running' WHERE id=$1`, [execution.id]);
      try {
        const state = await executor?.start({
          executionId: String(execution.id),
          workspacePath: String(execution.workspace_path ?? process.cwd()),
          prompt: String((execution.input_snapshot as { prompt?: string }).prompt ?? ""),
          scenario: String(execution.scenario ?? "success"),
        });
        const status = state?.status ?? "unknown";
        let lastOutput: Record<string, unknown> | undefined = state
          ? { ...state }
          : undefined;
        if (status === "completed" && execution.workspace_path) {
          const project = await loadProject(client, String(execution.project_id));
          if (project.verification_profile) {
            const evidence = await runVerification(
              String(execution.workspace_path),
              project.verification_profile as VerificationProfile,
            );
            lastOutput = { ...lastOutput, evidence };
            if (!evidence.passed) {
              committed.push(
                ...(await write(
                  client,
                  String(execution.project_id),
                  systemCommand(workerId, String(execution.project_id)),
                  [
                    { sql: `UPDATE executions SET status='failed', last_output=$2, version=version+1 WHERE id=$1`, params: [execution.id, lastOutput] },
                    { sql: `UPDATE jobs SET status='done' WHERE id=$1`, params: [job.id] },
                    {
                      sql: `UPDATE change_intents SET status='released' WHERE work_item_id=$1 AND status='active'`,
                      params: [execution.work_item_id],
                    },
                  ],
                  [event(systemCommand(workerId, String(execution.project_id)), String(execution.id), "Execution", Number(execution.version) + 1, "ExecutionStatusChanged", { status: "failed" }, "telemetry")],
                )),
              );
              await openInbox(client, String(execution.project_id), "failure", "Verification 失败", "Workspace 保留", `/projects/${String(execution.project_id)}/executions/${String(execution.id)}`, {});
              return true;
            }
            await client.query(
              `UPDATE work_items SET coverage = (
                SELECT jsonb_agg(jsonb_set(elem, '{status}', '"implemented"')) FROM jsonb_array_elements(coverage) elem
              ) WHERE id=$1`,
              [execution.work_item_id],
            );
          }
        }
        if (status === "unknown") {
          await openInbox(client, String(execution.project_id), "unknown", "Execution 状态未知", "Workspace 已保留，不会自动重跑或删除", `/projects/${String(execution.project_id)}/executions/${String(execution.id)}`, {});
        }
        if (status === "failed" || status === "cancelled" || status === "completed") {
          await client.query(
            `UPDATE change_intents SET status='released' WHERE work_item_id=$1 AND status='active'`,
            [execution.work_item_id],
          );
        }
        committed.push(
          ...(await write(
            client,
            String(execution.project_id),
            systemCommand(workerId, String(execution.project_id)),
            [
              { sql: `UPDATE executions SET status=$2, last_output=$3, version=version+1 WHERE id=$1`, params: [execution.id, status, lastOutput ?? null] },
              { sql: `UPDATE jobs SET status='done' WHERE id=$1`, params: [job.id] },
            ],
            [event(systemCommand(workerId, String(execution.project_id)), String(execution.id), "Execution", Number(execution.version) + 1, "ExecutionStatusChanged", { status }, "telemetry")],
          )),
        );
      } catch (error) {
        committed.push(
          ...(await write(
            client,
            String(execution.project_id),
            systemCommand(workerId, String(execution.project_id)),
            [
              { sql: `UPDATE executions SET status='unknown', last_output=$2, version=version+1 WHERE id=$1`, params: [execution.id, { error: error instanceof Error ? error.message : "unknown" }] },
              { sql: `UPDATE jobs SET status='available', lease_owner=NULL WHERE id=$1`, params: [job.id] },
            ],
            [event(systemCommand(workerId, String(execution.project_id)), String(execution.id), "Execution", Number(execution.version) + 1, "ExecutionStatusChanged", { status: "unknown" }, "telemetry")],
          )),
        );
        await openInbox(client, String(execution.project_id), "unknown", "Worker 无法确认 Kernel", "不会自动删除 Workspace", `/projects/${String(execution.project_id)}/executions/${String(execution.id)}`, {});
      }
      return true;
    });
    for (const record of committed) {
      emit(record);
    }
    return did;
  }

  async function query(sql: string, params: unknown[] = []) {
    return pool.query(sql, params);
  }

  return { handle, subscribe, processJob, query, clock, leaseMs };
}

async function insertAgentMembership(
  client: pg.PoolClient,
  command: CommandEnvelope,
  projectId: string,
  input: {
    id: string;
    sourceType: string;
    displayName: string;
    releaseId?: string;
    copyId?: string;
    snapshotHash: string;
    capabilities: unknown;
    cultivatorId?: string;
    trustStatus?: string;
  },
) {
  const declared = (command.payload.declaredPermissions as string[]) ?? DEFAULT_POLICY;
  const ceiling = (command.payload.policyCeiling as string[]) ?? DEFAULT_POLICY;
  const approved = (command.payload.approvedPermissions as string[]) ?? DEFAULT_POLICY;
  const effective = declared.filter((item) => ceiling.includes(item) && approved.includes(item));
  await client.query(
    `INSERT INTO agent_memberships (
      id, project_id, source_type, display_name, release_id, copy_id, snapshot_hash, capabilities,
      declared_permissions, policy_ceiling, approved_permissions, sponsor_id, cultivator_id, trust_status, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1)`,
    [
      input.id,
      projectId,
      input.sourceType,
      input.displayName,
      input.releaseId ?? null,
      input.copyId ?? null,
      input.snapshotHash,
      jsonb(input.capabilities ?? []),
      jsonb(declared),
      jsonb(ceiling),
      jsonb(effective),
      command.actor.id,
      input.cultivatorId ?? null,
      input.trustStatus ?? "qualified",
    ],
  );
  return write(client, projectId, command, [], [
    event(command, input.id, "AgentMembership", 1, "AgentMembershipCreated", { sourceType: input.sourceType }),
  ]);
}

async function buildContext(
  client: pg.PoolClient,
  item: Record<string, unknown>,
  project: Record<string, unknown>,
  actor: ActorRef,
) {
  const spec = item.spec_id
    ? await client.query(`SELECT * FROM specifications WHERE id=$1`, [item.spec_id])
    : { rows: [] };
  const adopted = await client.query(
    `SELECT a.* FROM artifacts a JOIN artifact_adoptions ad ON ad.artifact_id=a.id WHERE ad.consumer_work_item_id=$1 AND a.status='published'`,
    [item.id],
  );
  const decisions = await client.query(`SELECT * FROM decisions WHERE project_id=$1 AND status='decided'`, [
    project.id,
  ]);
  return {
    workItemId: item.id,
    specification: spec.rows[0] ? { id: spec.rows[0].id, version: spec.rows[0].version_number, status: spec.rows[0].status } : null,
    adoptedArtifacts: adopted.rows.map((row) => ({ id: row.id, version: row.version_number, hash: row.content_hash })),
    decisions: decisions.rows.map((row) => ({ id: row.id, result: row.result })),
    baseline: project.baseline_commit,
    actor: actor.id,
    secrets: undefined,
  };
}

async function openInbox(
  client: pg.PoolClient,
  projectId: string,
  kind: string,
  title: string,
  reason: string,
  href: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const existing = await client.query(
    `SELECT id FROM inbox_items WHERE project_id=$1 AND kind=$2 AND status='open' AND title=$3`,
    [projectId, kind, title],
  );
  if (existing.rowCount) return;
  await client.query(
    `INSERT INTO inbox_items (id, project_id, kind, title, reason, href, payload, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'open')`,
    [newId("inbox"), projectId, kind, title, reason, href, payload],
  );
}

async function write(
  client: pg.PoolClient,
  projectId: string,
  command: CommandEnvelope,
  statements: { sql: string; params: unknown[] }[],
  events: Parameters<typeof commitWrite>[2]["events"],
  failAfterState = Boolean(command.payload.__failAfterState),
) {
  return commitWrite(client, projectId, {
    statements,
    events: events.map((item) => ({ ...item, projectId })),
    failAfterState,
  });
}

function parseSpecOrThrow(body: string) {
  try {
    return parseSpecification(body);
  } catch (error) {
    throw new DomainError("invalid", error instanceof Error ? error.message : "invalid specification");
  }
}

function systemCommand(workerId: string, projectId: string): CommandEnvelope {
  return {
    type: "SystemJob",
    idempotencyKey: newId("sys"),
    actor: { kind: "system", id: workerId, displayName: workerId },
    correlationId: `job:${workerId}`,
    payload: { projectId },
  };
}

function event(
  command: CommandEnvelope,
  aggregateId: string,
  aggregateType: string,
  aggregateVersion: number,
  type: string,
  payload: Record<string, unknown>,
  layer: "domain" | "telemetry" | "audit" = "domain",
): Parameters<typeof commitWrite>[2]["events"][number] {
  return {
    eventId: newId("evt"),
    projectId: String(payload.projectId ?? aggregateType === "Project" ? aggregateId : command.payload.projectId ?? aggregateId),
    aggregateId,
    aggregateType,
    aggregateVersion,
    type,
    actor: command.actor,
    causationId: command.causationId,
    correlationId: command.correlationId,
    occurredAt: new Date(),
    payloadVersion: 1,
    payload,
    layer,
  };
}

function ok(
  aggregateId: string,
  version: number,
  body: Record<string, unknown>,
  events: DomainEventRecord[],
): CommandOk {
  return { ok: true, aggregateId, version, body, events };
}

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("invalid", `${name} is required`);
  }
  return value;
}

function assertExpected(command: CommandEnvelope, actual: number): void {
  if (command.expectedVersion !== undefined && command.expectedVersion !== actual) {
    throw new DomainError("conflict", "expected version mismatch", {
      expected: command.expectedVersion,
      actual,
    });
  }
}

function conflict(command: CommandEnvelope, message: string): DomainError {
  return new DomainError("conflict", message, {
    actor: command.actor,
    causationId: command.causationId,
    correlationId: command.correlationId,
  });
}

async function loadProject(client: pg.PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM projects WHERE id=$1`, [id]);
  const row = result.rows[0];
  if (!row) throw new DomainError("not_found", "Project not found");
  return row as { id: string; version: number; git_repo_path?: string; baseline_commit?: string; base_branch?: string; protected_branch?: string; verification_profile?: unknown; owner_id: string };
}

async function assertOwner(client: pg.PoolClient, projectId: string, humanId: string): Promise<void> {
  const result = await client.query(
    `SELECT role FROM human_memberships WHERE project_id=$1 AND human_id=$2 AND removed_at IS NULL`,
    [projectId, humanId],
  );
  if (result.rows[0]?.role !== "owner") {
    throw new DomainError("forbidden", "Owner role required");
  }
}

async function ensureHuman(client: pg.PoolClient, actor: ActorRef): Promise<void> {
  if (actor.kind !== "human") return;
  await client.query(`INSERT INTO humans (id, display_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
    actor.id,
    actor.displayName,
  ]);
}

async function one(client: pg.PoolClient, sql: string, params: unknown[]) {
  const result = await client.query(sql, params);
  const row = result.rows[0];
  if (!row) throw new DomainError("not_found", "aggregate not found");
  return row as Record<string, unknown>;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonb(value: unknown): string {
  return JSON.stringify(value);
}

function defaultProfile(): VerificationProfile {
  return { version: "1", commands: [{ name: "true", command: "true", args: [] }] };
}

function hasCycle(edges: { from: string; to: string }[]): boolean {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...graph.keys()].some(visit);
}
