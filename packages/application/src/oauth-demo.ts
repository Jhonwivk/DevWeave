import { randomUUID } from "node:crypto";
import { createFixtureRepo } from "@human-agent/workspace-git";
import type { ActorRef } from "@human-agent/domain";
import type { CommandEnvelope, CommandOk, createPlatform } from "./platform.ts";

const OAUTH_SPECIFICATION = `# OAuth Collaboration Demo

## REQ-AUTH Authorization
### AC-AUTHORIZE Local provider issues a one-time authorization code
### AC-TOKEN Token endpoint exchanges the code for an access token

## REQ-UI Login surface
### AC-LOGIN Login form is rendered by the local provider
`;

const DEMO_REPOSITORY_FILES = {
  "README.md":
    "# OAuth Collaboration Demo\n\nA deterministic fixture managed by TeamAgent.\n",
  "src/oauth.mjs": `const codes = new Map();

export function authorize(userId) {
  const code = \`code-\${userId}\`;
  codes.set(code, userId);
  return code;
}

export function exchangeCode(code) {
  const userId = codes.get(code);
  if (!userId) throw new Error("invalid authorization code");
  codes.delete(code);
  return { accessToken: \`token-\${userId}\`, tokenType: "Bearer" };
}

export function loginForm() {
  return '<form action="/oauth/authorize"><button>Continue</button></form>';
}
`,
  "contract/oauth.json": `${JSON.stringify(
    {
      version: 1,
      authorize: { method: "POST", path: "/oauth/authorize" },
      token: { method: "POST", path: "/oauth/token" },
    },
    null,
    2,
  )}\n`,
  "test/oauth.test.mjs": `import test from "node:test";
import assert from "node:assert/strict";
import { authorize, exchangeCode, loginForm } from "../src/oauth.mjs";

test("runs the local OAuth flow", () => {
  const code = authorize("demo-user");
  assert.deepEqual(exchangeCode(code), {
    accessToken: "token-demo-user",
    tokenType: "Bearer",
  });
  assert.match(loginForm(), /oauth\\/authorize/);
});
`,
};

const VERIFICATION_PROFILE = {
  version: "oauth-demo-v1",
  commands: [
    {
      name: "OAuth unit and contract test",
      command: "node",
      args: ["--test", "test/oauth.test.mjs"],
    },
  ],
};

const owner: ActorRef = {
  kind: "human",
  id: "human-owner",
  displayName: "Human Owner",
};

const frontendHuman: ActorRef = {
  kind: "human",
  id: "human-frontend",
  displayName: "Frontend Human",
};

type DemoPlatform = Pick<
  ReturnType<typeof createPlatform>,
  "handle" | "processJob" | "query"
>;

export type OAuthDemoResult = {
  projectId: string;
  name: string;
  stages: { id: string; label: string; status: "completed" }[];
  summary: {
    humans: number;
    agents: number;
    specifications: number;
    workItems: number;
    completedWorkItems: number;
    executions: number;
    failedExecutions: number;
    artifacts: number;
    conflicts: number;
    mergedCandidates: number;
    openInboxItems: number;
    domainEvents: number;
  };
};

export async function runOAuthDemo(platform: DemoPlatform): Promise<OAuthDemoResult> {
  const correlationId = `oauth-demo-${randomUUID()}`;
  const suffix = new Date().toISOString().replace("T", " ").slice(0, 16);
  const name = `OAuth Collaboration Demo · ${suffix}`;
  const repositoryPath = await createFixtureRepo(DEMO_REPOSITORY_FILES);

  const created = await mustOk(
    platform,
    command("CreateProject", owner, { name }, correlationId, { expectedVersion: 0 }),
  );
  const projectId = created.aggregateId;

  await mustOk(
    platform,
    command(
      "ImportGitRepository",
      owner,
      {
        projectId,
        repoPath: repositoryPath,
        baseBranch: "main",
        protectedBranch: "main",
        verificationProfile: VERIFICATION_PROFILE,
      },
      correlationId,
      { expectedVersion: 1 },
    ),
  );
  await mustOk(
    platform,
    command(
      "InviteHuman",
      owner,
      {
        projectId,
        humanId: frontendHuman.id,
        displayName: frontendHuman.displayName,
      },
      correlationId,
    ),
  );

  const specification = await mustOk(
    platform,
    command(
      "CreateSpecification",
      owner,
      { projectId, body: OAUTH_SPECIFICATION },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "ReviewSpecification",
      frontendHuman,
      { specId: specification.aggregateId },
      correlationId,
      { expectedVersion: 1 },
    ),
  );
  await mustOk(
    platform,
    command(
      "PublishSpecification",
      owner,
      { specId: specification.aggregateId },
      correlationId,
      { expectedVersion: 2 },
    ),
  );

  const backend = await createWorkItem(platform, correlationId, {
    actor: owner,
    projectId,
    specId: specification.aggregateId,
    goal: "Implement OAuth authorization and token endpoints",
    acceptanceCriteria: ["AC-AUTHORIZE", "AC-TOKEN"],
    requiredCapabilities: ["oauth.backend"],
    affectedScope: ["src/oauth.mjs", "contract/oauth.json"],
    risk: "high",
  });
  const frontend = await createWorkItem(platform, correlationId, {
    actor: frontendHuman,
    projectId,
    specId: specification.aggregateId,
    goal: "Build the local-provider login surface",
    acceptanceCriteria: ["AC-LOGIN"],
    requiredCapabilities: ["oauth.frontend"],
    affectedScope: ["src/oauth.mjs", "contract/oauth.json"],
    risk: "medium",
  });
  const qa = await createWorkItem(platform, correlationId, {
    actor: owner,
    projectId,
    specId: specification.aggregateId,
    goal: "Verify the end-to-end OAuth flow",
    acceptanceCriteria: ["AC-TOKEN", "AC-LOGIN"],
    requiredCapabilities: ["oauth.qa"],
    affectedScope: ["test/oauth.test.mjs"],
    risk: "low",
  });

  await mustOk(
    platform,
    command(
      "ProposeWorkGraph",
      owner,
      {
        projectId,
        edges: [
          { from: backend.aggregateId, to: frontend.aggregateId },
          { from: backend.aggregateId, to: qa.aggregateId },
        ],
      },
      correlationId,
    ),
  );

  const release = await mustOk(
    platform,
    command(
      "ImportDigitalEmployeeRelease",
      owner,
      {
        name: "OAuth Backend Digital Employee",
        releaseVersion: "1.0.0",
        provenance: "local-demo",
        capabilities: ["oauth.backend"],
        body: "Immutable OAuth backend employee release 1.0.0",
      },
      correlationId,
    ),
  );
  const digitalEmployee = await mustOk(
    platform,
    command(
      "AdoptDigitalEmployee",
      owner,
      { projectId, releaseId: release.aggregateId },
      correlationId,
    ),
  );
  const privateAgent = await mustOk(
    platform,
    command(
      "ImportPrivateAgent",
      frontendHuman,
      {
        projectId,
        name: "Frontend Human's Private Agent",
        configSummary: "A project-scoped copy of a Human-cultivated UI agent",
        manifest: { workspace: "src", specialty: "oauth-login" },
        capabilities: ["oauth.frontend"],
      },
      correlationId,
    ),
  );
  const generated = await mustOk(
    platform,
    command(
      "GenerateSystemAgent",
      owner,
      { projectId, gap: { capabilities: ["oauth.qa"] } },
      correlationId,
    ),
  );
  const systemAgent = await mustOk(
    platform,
    command(
      "QualifySystemAgent",
      owner,
      { candidateId: generated.aggregateId },
      correlationId,
    ),
  );

  const decision = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      {
        projectId,
        question: "Which OAuth provider should this acceptance demo use?",
        options: ["Local deterministic provider", "External provider"],
        impact:
          "Keeps the demo free of production credentials and network dependencies",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RecordDecision",
      frontendHuman,
      {
        decisionId: decision.aggregateId,
        result: "Local deterministic provider",
        rationale:
          "The Humans agreed offline; the platform records the result for traceability.",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RecordConsensus",
      owner,
      {
        projectId,
        result: "Approve the Work Graph and staff one Agent per Work Item",
        rationale: "Recorded after the team reviewed the plan offline",
      },
      correlationId,
    ),
  );

  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: backend.aggregateId, membershipId: digitalEmployee.aggregateId },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      frontendHuman,
      { workItemId: frontend.aggregateId, membershipId: privateAgent.aggregateId },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: qa.aggregateId, membershipId: systemAgent.aggregateId },
      correlationId,
    ),
  );

  await mustOk(
    platform,
    command(
      "SetContractOwnership",
      owner,
      {
        projectId,
        path: "contract/oauth.json",
        kind: "api",
        ownerMembershipId: digitalEmployee.aggregateId,
      },
      correlationId,
    ),
  );
  await registerIntent(platform, correlationId, {
    actor: owner,
    projectId,
    workItemId: backend.aggregateId,
    files: ["src/oauth.mjs", "contract/oauth.json"],
    symbols: ["authorize", "exchangeCode"],
    contracts: ["contract/oauth.json"],
    risk: "high",
    override: {
      reason: "The contract owner is the assigned backend Digital Employee",
      scope: "contract/oauth.json",
    },
  });
  await registerIntent(platform, correlationId, {
    actor: frontendHuman,
    projectId,
    workItemId: frontend.aggregateId,
    files: ["src/oauth.mjs", "contract/oauth.json"],
    symbols: ["loginForm"],
    contracts: ["contract/oauth.json"],
    risk: "medium",
    override: {
      reason:
        "Humans approved the consumer adaptation after reviewing the shared contract",
      scope: "contract/oauth.json",
    },
  });
  await registerIntent(platform, correlationId, {
    actor: owner,
    projectId,
    workItemId: qa.aggregateId,
    files: ["test/oauth.test.mjs"],
    symbols: ["oauth flow test"],
    contracts: [],
    risk: "low",
  });

  const contractV1 = await mustOk(
    platform,
    command(
      "PublishArtifact",
      owner,
      {
        projectId,
        workItemId: backend.aggregateId,
        kind: "contract",
        title: "OAuth API Contract v1",
        body: { version: 1, authorize: "/oauth/authorize", token: "/oauth/token" },
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "AdoptArtifact",
      frontendHuman,
      { artifactId: contractV1.aggregateId, consumerWorkItemId: frontend.aggregateId },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "PublishArtifact",
      owner,
      {
        projectId,
        workItemId: backend.aggregateId,
        kind: "contract",
        title: "OAuth API Contract v2",
        body: {
          version: 2,
          authorize: "/oauth/authorize",
          token: "/oauth/token",
          tokenType: "Bearer",
        },
        supersedes: contractV1.aggregateId,
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "ResolveStale",
      frontendHuman,
      { workItemId: frontend.aggregateId, action: "replan" },
      correlationId,
    ),
  );

  const failedBackend = await startAndWait(platform, correlationId, {
    actor: owner,
    workItemId: backend.aggregateId,
    scenario: "failure",
    prompt: "Implement the accepted OAuth contract",
  });
  if (failedBackend.status !== "failed") {
    throw new Error(
      `Expected the first backend attempt to fail, got ${failedBackend.status}`,
    );
  }

  const mergedExecutionIds: string[] = [];
  for (const item of [
    {
      actor: owner,
      workItemId: backend.aggregateId,
      prompt: "Implement the accepted OAuth contract",
    },
    {
      actor: frontendHuman,
      workItemId: frontend.aggregateId,
      prompt: "Implement the accepted OAuth contract",
    },
    {
      actor: owner,
      workItemId: qa.aggregateId,
      prompt: "Implement the accepted OAuth contract",
    },
  ]) {
    const execution = await startAndWait(platform, correlationId, {
      ...item,
      scenario: "success",
    });
    if (execution.status !== "completed") {
      throw new Error(
        `Execution ${execution.id} did not complete: ${execution.status}`,
      );
    }
    await mustOk(
      platform,
      command(
        "SelectCandidate",
        item.actor,
        { executionId: execution.id, reason: "Verification passed" },
        correlationId,
      ),
    );
    const candidate = await mustOk(
      platform,
      command(
        "CreateMergeCandidate",
        item.actor,
        { executionId: execution.id },
        correlationId,
      ),
    );
    const processed = await mustOk(
      platform,
      command("ProcessMergeQueue", owner, { projectId }, correlationId),
    );
    if (processed.body.status !== "mergeable") {
      throw new Error(
        `Merge candidate ${candidate.aggregateId} is ${String(processed.body.status)}`,
      );
    }
    await mustOk(
      platform,
      command(
        "MergeCandidate",
        owner,
        { mergeCandidateId: candidate.aggregateId },
        correlationId,
      ),
    );
    mergedExecutionIds.push(execution.id);
  }

  const inbox = await platform.query(
    `SELECT id FROM inbox_items WHERE project_id=$1 AND status='open' ORDER BY created_at`,
    [projectId],
  );
  for (const item of inbox.rows as { id: string }[]) {
    await mustOk(
      platform,
      command("ResolveInbox", owner, { inboxItemId: item.id }, correlationId),
    );
  }

  const summary = await loadSummary(platform, projectId);
  if (summary.completedWorkItems !== 3 || summary.mergedCandidates !== 3) {
    throw new Error("OAuth demo did not reach its completed merge state");
  }

  return {
    projectId,
    name,
    stages: [
      { id: "project", label: "Project and Git baseline", status: "completed" },
      { id: "spec", label: "Effective Specification", status: "completed" },
      { id: "team", label: "Human and Agent staffing", status: "completed" },
      {
        id: "coordination",
        label: "Contract conflict coordination",
        status: "completed",
      },
      { id: "execution", label: "Execution failure and recovery", status: "completed" },
      {
        id: "verification",
        label: "Verification and protected merge",
        status: "completed",
      },
    ],
    summary,
  };
}

function command(
  type: string,
  actor: ActorRef,
  payload: Record<string, unknown>,
  correlationId: string,
  extra: Pick<CommandEnvelope, "expectedVersion"> = {},
): CommandEnvelope {
  return {
    type,
    actor,
    payload,
    correlationId,
    idempotencyKey: randomUUID(),
    expectedVersion: extra.expectedVersion,
  };
}

async function mustOk(
  platform: DemoPlatform,
  envelope: CommandEnvelope,
): Promise<CommandOk> {
  const result = await platform.handle(envelope);
  if (!result.ok) {
    throw new Error(`${envelope.type}: ${result.error.code} ${result.error.message}`);
  }
  return result;
}

async function createWorkItem(
  platform: DemoPlatform,
  correlationId: string,
  input: {
    actor: ActorRef;
    projectId: string;
    specId: string;
    goal: string;
    acceptanceCriteria: string[];
    requiredCapabilities: string[];
    affectedScope: string[];
    risk: string;
  },
): Promise<CommandOk> {
  return mustOk(
    platform,
    command(
      "CreateWorkItem",
      input.actor,
      {
        projectId: input.projectId,
        specId: input.specId,
        goal: input.goal,
        acceptanceCriteria: input.acceptanceCriteria,
        requiredCapabilities: input.requiredCapabilities,
        affectedScope: input.affectedScope,
        risk: input.risk,
      },
      correlationId,
    ),
  );
}

async function registerIntent(
  platform: DemoPlatform,
  correlationId: string,
  input: {
    actor: ActorRef;
    projectId: string;
    workItemId: string;
    files: string[];
    symbols: string[];
    contracts: string[];
    risk: string;
    override?: { reason: string; scope: string };
  },
): Promise<void> {
  await mustOk(
    platform,
    command("RegisterChangeIntent", input.actor, input, correlationId),
  );
}

async function startAndWait(
  platform: DemoPlatform,
  correlationId: string,
  input: {
    actor: ActorRef;
    workItemId: string;
    scenario: "success" | "failure";
    prompt: string;
  },
): Promise<{ id: string; status: string }> {
  const execution = await mustOk(
    platform,
    command(
      "StartExecution",
      input.actor,
      {
        workItemId: input.workItemId,
        kernel: "mock",
        scenario: input.scenario,
        prompt: input.prompt,
      },
      correlationId,
    ),
  );

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const current = await platform.query(`SELECT status FROM executions WHERE id=$1`, [
      execution.aggregateId,
    ]);
    const status = String(
      (current.rows[0] as { status?: string } | undefined)?.status ?? "unknown",
    );
    if (
      ["completed", "failed", "cancelled", "unknown", "waiting_for_human"].includes(
        status,
      )
    ) {
      return { id: execution.aggregateId, status };
    }
    const processed = await platform.processJob(`oauth-demo-worker-${correlationId}`);
    if (!processed) await delay(20);
  }
  throw new Error(`Execution ${execution.aggregateId} did not settle`);
}

async function loadSummary(
  platform: DemoPlatform,
  projectId: string,
): Promise<OAuthDemoResult["summary"]> {
  const result = await platform.query(
    `SELECT
      (SELECT count(*)::int FROM human_memberships WHERE project_id=$1 AND removed_at IS NULL) AS humans,
      (SELECT count(*)::int FROM agent_memberships WHERE project_id=$1) AS agents,
      (SELECT count(*)::int FROM specifications WHERE project_id=$1) AS specifications,
      (SELECT count(*)::int FROM work_items WHERE project_id=$1) AS work_items,
      (SELECT count(*)::int FROM work_items WHERE project_id=$1 AND status='completed') AS completed_work_items,
      (SELECT count(*)::int FROM executions WHERE project_id=$1) AS executions,
      (SELECT count(*)::int FROM executions WHERE project_id=$1 AND status='failed') AS failed_executions,
      (SELECT count(*)::int FROM artifacts WHERE project_id=$1) AS artifacts,
      (SELECT count(*)::int FROM conflicts WHERE project_id=$1) AS conflicts,
      (SELECT count(*)::int FROM merge_candidates WHERE project_id=$1 AND status='merged') AS merged_candidates,
      (SELECT count(*)::int FROM inbox_items WHERE project_id=$1 AND status='open') AS open_inbox_items,
      (SELECT count(*)::int FROM domain_events WHERE project_id=$1) AS domain_events`,
    [projectId],
  );
  const row = result.rows[0] as Record<string, number | string>;
  return {
    humans: Number(row.humans),
    agents: Number(row.agents),
    specifications: Number(row.specifications),
    workItems: Number(row.work_items),
    completedWorkItems: Number(row.completed_work_items),
    executions: Number(row.executions),
    failedExecutions: Number(row.failed_executions),
    artifacts: Number(row.artifacts),
    conflicts: Number(row.conflicts),
    mergedCandidates: Number(row.merged_candidates),
    openInboxItems: Number(row.open_inbox_items),
    domainEvents: Number(row.domain_events),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
