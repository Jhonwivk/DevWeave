import { randomUUID } from "node:crypto";
import { createFixtureRepo } from "@human-agent/workspace-git";
import type { ScenarioAssertion, ScenarioResult, ScenarioStage } from "./types.ts";
import {
  assert,
  buildResult,
  command,
  member,
  mustOk,
  owner,
  type ScenarioPlatform,
} from "./helpers.ts";
import type { ProjectDefinition, ProjectRunContext, ProjectScenarioHook } from "./project-types.ts";
import { requirePiKernel } from "./pi-env.ts";

const KERNEL = "pi" as const;

export type ProjectSummary = {
  completedWorkItems: number;
  totalWorkItems: number;
  mergedCandidates: number;
  executions: number;
  failedExecutions: number;
  openInboxItems: number;
};

export async function runProjectCase(
  platform: ScenarioPlatform,
  definition: ProjectDefinition,
  hook?: ProjectScenarioHook,
  afterHook?: ProjectScenarioHook,
  beforeRequiredKey?: Record<string, ProjectScenarioHook>,
): Promise<ScenarioResult> {
  await requirePiKernel();
  const startedAt = Date.now();
  const correlationId = `project-${definition.id}-${randomUUID()}`;
  const stages: ScenarioStage[] = [];

  const repoPath = await createFixtureRepo(definition.repoFiles);
  const created = await mustOk(
    platform,
    command("CreateProject", owner, { name: definition.name }, correlationId, {
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
        verificationProfile: definition.verificationProfile,
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
      { projectId, humanId: member.id, displayName: member.displayName },
      correlationId,
    ),
  );
  stages.push({ id: "bootstrap", label: "Project + Git + Team", status: "completed" });

  const spec = await mustOk(
    platform,
    command("CreateSpecification", owner, { projectId, body: definition.specBody }, correlationId),
  );
  await mustOk(
    platform,
    command("ReviewSpecification", member, { specId: spec.aggregateId }, correlationId, {
      expectedVersion: 1,
    }),
  );
  await mustOk(
    platform,
    command("PublishSpecification", owner, { specId: spec.aggregateId }, correlationId, {
      expectedVersion: 2,
    }),
  );
  stages.push({ id: "spec", label: "Effective Specification", status: "completed" });

  const workItems: Record<string, string> = {};
  for (const item of definition.workItems) {
    const createdItem = await mustOk(
      platform,
      command(
        item.kind === "exploration" ? "CreateExplorationWorkItem" : "CreateWorkItem",
        owner,
        {
          projectId,
          specId: spec.aggregateId,
          goal: item.goal,
          acceptanceCriteria: item.acceptanceCriteria,
          requiredCapabilities: item.capabilities,
          affectedScope: item.affectedScope ?? [],
          risk: item.risk,
          explorationBound: item.kind === "exploration" ? "research only" : undefined,
        },
        correlationId,
      ),
    );
    workItems[item.key] = createdItem.aggregateId;
  }

  if (definition.graphEdges?.length) {
    await mustOk(
      platform,
      command(
        "ProposeWorkGraph",
        owner,
        {
          projectId,
          edges: definition.graphEdges.map((edge) => ({
            from: workItems[edge.from],
            to: workItems[edge.to],
          })),
        },
        correlationId,
      ),
    );
  }
  stages.push({ id: "work-graph", label: "Work Graph", status: "completed" });

  const memberships: Record<string, string> = {};
  for (const agent of definition.agents) {
    if (agent.source === "digital_employee") {
      const release = await mustOk(
        platform,
        command(
          "ImportDigitalEmployeeRelease",
          owner,
          {
            name: agent.name,
            releaseVersion: "1",
            provenance: "real-case",
            capabilities: agent.capabilities,
            body: agent.name,
          },
          correlationId,
        ),
      );
      const membership = await mustOk(
        platform,
        command("AdoptDigitalEmployee", owner, { projectId, releaseId: release.aggregateId }, correlationId),
      );
      memberships[agent.key] = membership.aggregateId;
    } else if (agent.source === "private") {
      const membership = await mustOk(
        platform,
        command(
          "ImportPrivateAgent",
          agent.cultivator ?? member,
          {
            projectId,
            name: agent.name,
            configSummary: agent.name,
            manifest: { specialty: agent.key },
            capabilities: agent.capabilities,
          },
          correlationId,
        ),
      );
      memberships[agent.key] = membership.aggregateId;
    } else {
      const candidate = await mustOk(
        platform,
        command(
          "GenerateSystemAgent",
          owner,
          { projectId, gap: { capabilities: agent.capabilities } },
          correlationId,
        ),
      );
      const membership = await mustOk(
        platform,
        command(
          "QualifySystemAgent",
          owner,
          { candidateId: candidate.aggregateId },
          correlationId,
        ),
      );
      memberships[agent.key] = membership.aggregateId;
    }
  }
  stages.push({ id: "team", label: "Agent Memberships", status: "completed" });

  await mustOk(
    platform,
    command(
      "RecordConsensus",
      owner,
      { projectId, result: "approve-work-graph", rationale: "offline consensus" },
      correlationId,
    ),
  );

  for (const item of definition.workItems) {
    const membershipId = memberships[item.assigneeKey];
    if (!membershipId) {
      throw new Error(`Missing membership for assignee ${item.assigneeKey}`);
    }
    await mustOk(
      platform,
      command(
        "AssignWorkItem",
        owner,
        { workItemId: workItems[item.key], membershipId },
        correlationId,
      ),
    );
  }

  const ctx: ProjectRunContext = {
    platform,
    correlationId,
    projectId,
    specId: spec.aggregateId,
    workItems,
    memberships,
  };

  const hookAssertions = hook ? await hook(ctx) : [];
  stages.push({ id: "scenario", label: "Scenario-specific setup", status: "completed" });

  const mergedKeys: string[] = [];
  const midAssertions: ScenarioAssertion[] = [];
  for (const key of definition.requiredCompletedKeys) {
    const beforeKeyHook = beforeRequiredKey?.[key];
    if (beforeKeyHook) {
      midAssertions.push(...(await beforeKeyHook(ctx)));
    }
    const workItemId = workItems[key];
    const itemDef = definition.workItems.find((item) => item.key === key);
    if (!workItemId || !itemDef) {
      throw new Error(`Unknown required work item key: ${key}`);
    }
    const execution = await executePiWorkItem(platform, correlationId, workItemId, itemDef.piPrompt);
    if (execution.status !== "completed") {
      throw new Error(
        `Pi execution for ${key} ended with ${execution.status}; project ${definition.id} not complete`,
      );
    }
    await mustOk(
      platform,
      command(
        "SelectCandidate",
        owner,
        { executionId: execution.executionId, reason: "Pi + verification passed" },
        correlationId,
      ),
    );
    const candidate = await mustOk(
      platform,
      command("CreateMergeCandidate", owner, { executionId: execution.executionId }, correlationId),
    );
    const processed = await mustOk(
      platform,
      command("ProcessMergeQueue", owner, { projectId }, correlationId),
    );
    if (processed.body.status !== "mergeable") {
      throw new Error(`Merge candidate for ${key} is ${String(processed.body.status)}`);
    }
    await mustOk(
      platform,
      command("MergeCandidate", owner, { mergeCandidateId: candidate.aggregateId }, correlationId),
    );
    mergedKeys.push(key);
  }
  stages.push({ id: "pi-executions", label: "Pi Kernel executions + verified merge", status: "completed" });

  const afterAssertions = afterHook ? await afterHook(ctx) : [];

  const summary = await loadProjectSummary(platform, projectId);
  const assertions: ScenarioAssertion[] = [
    assert("Project uses Pi kernel", true, KERNEL),
    assert(
      "Required work items merged",
      mergedKeys.length === definition.requiredCompletedKeys.length,
      mergedKeys.join(","),
    ),
    assert(
      "Project completion: all required work items done",
      summary.completedWorkItems >= definition.requiredCompletedKeys.length,
      `${summary.completedWorkItems}/${definition.requiredCompletedKeys.length}`,
    ),
    assert(
      "Project completion: merges recorded",
      summary.mergedCandidates >= definition.requiredCompletedKeys.length,
      String(summary.mergedCandidates),
    ),
    assert("No open inbox blockers", summary.openInboxItems === 0, String(summary.openInboxItems)),
    ...hookAssertions,
    ...midAssertions,
    ...afterAssertions,
  ];

  return buildResult({
    id: definition.id,
    name: definition.name,
    category: definition.category,
    projectId,
    startedAt,
    stages,
    assertions,
  });
}

export async function executePiWorkItem(
  platform: ScenarioPlatform,
  correlationId: string,
  workItemId: string,
  prompt: string,
): Promise<{ executionId: string; status: string }> {
  const execution = await mustOk(
    platform,
    command(
      "StartExecution",
      owner,
      { workItemId, kernel: KERNEL, prompt },
      correlationId,
    ),
  );
  const workerId = `pi-worker-${correlationId}`;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const current = await platform.query(`SELECT status, kernel FROM executions WHERE id=$1`, [
      execution.aggregateId,
    ]);
    const row = current.rows[0] as { status?: string; kernel?: string } | undefined;
    const status = String(row?.status ?? "unknown");
    if (["completed", "failed", "cancelled", "unknown"].includes(status)) {
      return { executionId: execution.aggregateId, status };
    }
    await platform.processJob(workerId);
    await delay(100);
  }
  throw new Error(`Pi execution ${execution.aggregateId} did not settle`);
}

async function loadProjectSummary(
  platform: ScenarioPlatform,
  projectId: string,
): Promise<ProjectSummary> {
  const result = await platform.query(
    `SELECT
      (SELECT count(*)::int FROM work_items WHERE project_id=$1) AS total_work_items,
      (SELECT count(*)::int FROM work_items WHERE project_id=$1 AND status='completed') AS completed_work_items,
      (SELECT count(*)::int FROM merge_candidates WHERE project_id=$1 AND status='merged') AS merged_candidates,
      (SELECT count(*)::int FROM executions WHERE project_id=$1) AS executions,
      (SELECT count(*)::int FROM executions WHERE project_id=$1 AND status='failed') AS failed_executions,
      (SELECT count(*)::int FROM inbox_items WHERE project_id=$1 AND status='open') AS open_inbox_items`,
    [projectId],
  );
  const row = result.rows[0] as Record<string, number | string>;
  return {
    totalWorkItems: Number(row.total_work_items),
    completedWorkItems: Number(row.completed_work_items),
    mergedCandidates: Number(row.merged_candidates),
    executions: Number(row.executions),
    failedExecutions: Number(row.failed_executions),
    openInboxItems: Number(row.open_inbox_items),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
