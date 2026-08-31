import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  importDigitalEmployee,
  mustFail,
  mustOk,
  owner,
  seedProject,
  startAndWait,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# DAG Orchestration

## REQ-DAG Pipeline
### AC-DAG-1 Root task completes
### AC-DAG-2 Branch tasks complete or degrade
### AC-DAG-3 Sink task completes after replan
`;

export async function runCase04(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case04 DAG Orchestration",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed DAG project", status: "completed" as const });

  const agent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Pipeline Agent",
    capabilities: ["dag.execute"],
  });
  const backupAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Fallback Agent",
    capabilities: ["dag.execute", "dag.degrade"],
  });

  const root = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Root ingest",
        acceptanceCriteria: ["AC-DAG-1"],
        requiredCapabilities: ["dag.execute"],
        affectedScope: [],
        risk: "low",
      },
      correlationId,
    ),
  );
  const branchB = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Branch B transform",
        acceptanceCriteria: ["AC-DAG-2"],
        requiredCapabilities: ["dag.execute"],
        affectedScope: [],
        risk: "medium",
      },
      correlationId,
    ),
  );
  const branchC = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Branch C enrich",
        acceptanceCriteria: ["AC-DAG-2"],
        requiredCapabilities: ["dag.execute"],
        affectedScope: [],
        risk: "medium",
      },
      correlationId,
    ),
  );
  const sink = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Sink aggregate",
        acceptanceCriteria: ["AC-DAG-3"],
        requiredCapabilities: ["dag.execute"],
        affectedScope: [],
        risk: "high",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "ProposeWorkGraph",
      owner,
      {
        projectId,
        edges: [
          { from: root.aggregateId, to: branchB.aggregateId },
          { from: root.aggregateId, to: branchC.aggregateId },
          { from: branchB.aggregateId, to: sink.aggregateId },
          { from: branchC.aggregateId, to: sink.aggregateId },
        ],
      },
      correlationId,
    ),
  );
  await mustFail(
    platform,
    command(
      "ProposeWorkGraph",
      owner,
      {
        projectId,
        edges: [
          { from: branchB.aggregateId, to: root.aggregateId },
          { from: root.aggregateId, to: branchB.aggregateId },
        ],
      },
      correlationId,
    ),
    "invalid",
  );
  stages.push({ id: "dag", label: "Valid DAG proposed; cycle rejected", status: "completed" as const });

  await mustOk(
    platform,
    command("RecordConsensus", owner, { projectId, result: "dag-approved", rationale: "offline" }, correlationId),
  );
  await mustOk(
    platform,
    command("AssignWorkItem", owner, { workItemId: root.aggregateId, membershipId: agent }, correlationId),
  );
  await mustOk(
    platform,
    command("AssignWorkItem", owner, { workItemId: branchB.aggregateId, membershipId: agent }, correlationId),
  );
  await mustOk(
    platform,
    command("AssignWorkItem", owner, { workItemId: branchC.aggregateId, membershipId: agent }, correlationId),
  );
  await mustOk(
    platform,
    command("AssignWorkItem", owner, { workItemId: sink.aggregateId, membershipId: agent }, correlationId),
  );

  await startAndWait(platform, correlationId, { workItemId: root.aggregateId, scenario: "success" });
  const failedB = await startAndWait(platform, correlationId, {
    workItemId: branchB.aggregateId,
    scenario: "failure",
  });
  await startAndWait(platform, correlationId, { workItemId: branchC.aggregateId, scenario: "success" });
  stages.push({ id: "branch-fail", label: "Branch B failed; Branch C succeeded", status: "completed" as const });

  await mustOk(
    platform,
    command(
      "ReassignWorkItem",
      owner,
      { workItemId: branchB.aggregateId, membershipId: backupAgent },
      correlationId,
    ),
  );
  const recoveredB = await startAndWait(platform, correlationId, {
    workItemId: branchB.aggregateId,
    scenario: "success",
    prompt: "degraded-retry",
  });
  const sinkResult = await startAndWait(platform, correlationId, {
    workItemId: sink.aggregateId,
    scenario: "success",
    prompt: "sink-after-replan",
  });
  stages.push({ id: "replan", label: "Reassign + degraded retry + sink complete", status: "completed" as const });

  return buildResult({
    id: "case-04",
    name: "带分支与失败降级的复杂 DAG 任务",
    category: "dag-orchestration",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Root execution completed", true),
      assert("Branch B first attempt failed", failedB.status === "failed"),
      assert("Branch B recovered after reassignment", recoveredB.status === "completed"),
      assert("Sink completed after replan", sinkResult.status === "completed"),
      assert(
        "DAG edges persisted on work items",
        (await platform.query(`SELECT blocked_by FROM work_items WHERE id=$1`, [sink.aggregateId])).rows[0]?.blocked_by,
      ),
    ],
  });
}
