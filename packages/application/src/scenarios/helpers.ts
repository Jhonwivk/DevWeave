import { randomUUID } from "node:crypto";
import { createFixtureRepo } from "@human-agent/workspace-git";
import type { ActorRef } from "@human-agent/domain";
import type { CommandEnvelope, CommandOk, createPlatform } from "../platform.ts";
import type { ScenarioAssertion, ScenarioResult, ScenarioStage } from "./types.ts";

export type ScenarioPlatform = Pick<
  ReturnType<typeof createPlatform>,
  "handle" | "processJob" | "query"
>;

export const TRUE_PROFILE = {
  version: "1",
  commands: [{ name: "ok", command: "true", args: [] as string[] }],
};

export const owner: ActorRef = {
  kind: "human",
  id: "human-owner",
  displayName: "Owner",
};

export const member: ActorRef = {
  kind: "human",
  id: "human-member",
  displayName: "Member",
};

export const reviewer: ActorRef = {
  kind: "human",
  id: "human-reviewer",
  displayName: "Reviewer",
};

export function command(
  type: string,
  actor: ActorRef,
  payload: Record<string, unknown>,
  correlationId: string,
  extra: Partial<CommandEnvelope> = {},
): CommandEnvelope {
  return {
    type,
    actor,
    payload,
    correlationId,
    idempotencyKey: extra.idempotencyKey ?? randomUUID(),
    expectedVersion: extra.expectedVersion,
    causationId: extra.causationId,
  };
}

export async function mustOk(
  platform: ScenarioPlatform,
  envelope: CommandEnvelope,
): Promise<CommandOk> {
  const result = await platform.handle(envelope);
  if (!result.ok) {
    throw new Error(`${envelope.type}: ${result.error.code} ${result.error.message}`);
  }
  return result;
}

export async function mustFail(
  platform: ScenarioPlatform,
  envelope: CommandEnvelope,
  code?: string,
): Promise<void> {
  const result = await platform.handle(envelope);
  if (result.ok) {
    throw new Error(`${envelope.type}: expected failure but succeeded`);
  }
  if (code && result.error.code !== code) {
    throw new Error(`${envelope.type}: expected ${code}, got ${result.error.code}`);
  }
}

export async function seedProject(
  platform: ScenarioPlatform,
  correlationId: string,
  options: {
    name?: string;
    specBody?: string;
    repoFiles?: Record<string, string>;
    inviteMember?: boolean;
  } = {},
): Promise<{ projectId: string; specId: string; repoPath: string }> {
  const repoPath = await createFixtureRepo(
    options.repoFiles ?? {
      "README.md": "# fixture\n",
      "src/main.ts": "export const version = 1\n",
    },
  );
  const created = await mustOk(
    platform,
    command("CreateProject", owner, { name: options.name ?? "Real Case" }, correlationId, {
      expectedVersion: 0,
    }),
  );
  const projectId = created.aggregateId;
  await mustOk(
    platform,
    command(
      "ImportGitRepository",
      owner,
      {
        projectId,
        repoPath,
        baseBranch: "main",
        protectedBranch: "main",
        verificationProfile: TRUE_PROFILE,
      },
      correlationId,
      { expectedVersion: 1 },
    ),
  );
  if (options.inviteMember !== false) {
    await mustOk(
      platform,
      command(
        "InviteHuman",
        owner,
        { projectId, humanId: member.id, displayName: member.displayName },
        correlationId,
      ),
    );
  }
  const specBody =
    options.specBody ??
    `# Product Spec

## REQ-CORE Core
### AC-CORE-1 Core capability delivered
### AC-CORE-2 Core capability verified
`;
  const spec = await mustOk(
    platform,
    command("CreateSpecification", owner, { projectId, body: specBody }, correlationId),
  );
  await mustOk(
    platform,
    command("ReviewSpecification", owner, { specId: spec.aggregateId }, correlationId, {
      expectedVersion: 1,
    }),
  );
  await mustOk(
    platform,
    command("PublishSpecification", owner, { specId: spec.aggregateId }, correlationId, {
      expectedVersion: 2,
    }),
  );
  return { projectId, specId: spec.aggregateId, repoPath };
}

export async function importDigitalEmployee(
  platform: ScenarioPlatform,
  correlationId: string,
  projectId: string,
  input: { name: string; capabilities: string[] },
): Promise<string> {
  const release = await mustOk(
    platform,
    command(
      "ImportDigitalEmployeeRelease",
      owner,
      {
        name: input.name,
        releaseVersion: "1",
        provenance: "local",
        capabilities: input.capabilities,
        body: input.name,
      },
      correlationId,
    ),
  );
  const membership = await mustOk(
    platform,
    command("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }, correlationId),
  );
  return membership.aggregateId;
}

export async function createAndAssignWork(
  platform: ScenarioPlatform,
  correlationId: string,
  input: {
    projectId: string;
    specId: string;
    goal: string;
    acceptanceCriteria: string[];
    capabilities: string[];
    membershipId: string;
    risk?: string;
    kind?: "formal" | "exploration";
  },
): Promise<string> {
  const work = await mustOk(
    platform,
    command(
      input.kind === "exploration" ? "CreateExplorationWorkItem" : "CreateWorkItem",
      owner,
      {
        projectId: input.projectId,
        specId: input.specId,
        goal: input.goal,
        acceptanceCriteria: input.acceptanceCriteria,
        requiredCapabilities: input.capabilities,
        affectedScope: [],
        risk: input.risk ?? "medium",
        explorationBound: input.kind === "exploration" ? "research only" : undefined,
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command("RecordConsensus", owner, { projectId: input.projectId, result: "assign", rationale: "offline" }, correlationId),
  );
  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: work.aggregateId, membershipId: input.membershipId },
      correlationId,
    ),
  );
  return work.aggregateId;
}

export async function startAndWait(
  platform: ScenarioPlatform,
  correlationId: string,
  input: {
    workItemId: string;
    scenario?: string;
    prompt?: string;
    workerId?: string;
    maxAttempts?: number;
  },
): Promise<{ executionId: string; status: string }> {
  const execution = await mustOk(
    platform,
    command(
      "StartExecution",
      owner,
      {
        workItemId: input.workItemId,
        kernel: "mock",
        scenario: input.scenario ?? "success",
        prompt: input.prompt ?? "execute",
      },
      correlationId,
    ),
  );
  const workerId = input.workerId ?? `worker-${correlationId}`;
  const maxAttempts = input.maxAttempts ?? 100;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await platform.query(`SELECT status FROM executions WHERE id=$1`, [
      execution.aggregateId,
    ]);
    const status = String(
      (current.rows[0] as { status?: string } | undefined)?.status ?? "unknown",
    );
    if (
      ["completed", "failed", "cancelled", "unknown", "waiting_for_human", "paused"].includes(
        status,
      )
    ) {
      return { executionId: execution.aggregateId, status };
    }
    const processed = await platform.processJob(workerId);
    if (!processed) await delay(15);
  }
  throw new Error(`Execution ${execution.aggregateId} did not settle`);
}

export async function countRows(
  platform: ScenarioPlatform,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const result = await platform.query(sql, params);
  return Number((result.rows[0] as { count?: number | string }).count ?? 0);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assert(label: string, condition: boolean, detail?: string): ScenarioAssertion {
  return { label, passed: condition, detail };
}

export function buildResult(input: {
  id: string;
  name: string;
  category: ScenarioResult["category"];
  projectId: string;
  startedAt: number;
  stages: ScenarioStage[];
  assertions: ScenarioAssertion[];
}): ScenarioResult {
  const passed = input.assertions.every((item) => item.passed);
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    passed,
    stages: input.stages,
    assertions: input.assertions,
    projectId: input.projectId,
    durationMs: Date.now() - input.startedAt,
  };
}
