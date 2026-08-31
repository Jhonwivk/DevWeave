import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  countRows,
  createAndAssignWork,
  importDigitalEmployee,
  mustFail,
  mustOk,
  owner,
  seedProject,
  startAndWait,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC_V1 = `# Context Baseline v1

## REQ-CTX Context
### AC-CTX-1 Context built from effective spec only
`;

const SPEC_V2 = `# Context Baseline v2

## REQ-CTX Context
### AC-CTX-1 Context must be rebuilt from new effective spec
### AC-CTX-2 New requirement added in v2
`;

export async function runCase07(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case07 Context Pollution",
    specBody: SPEC_V1,
  });
  stages.push({ id: "seed", label: "Seed v1 spec", status: "completed" as const });

  const agent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Context Agent",
    capabilities: ["ctx.build"],
  });
  const workItemId = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Build context package",
    acceptanceCriteria: ["AC-CTX-1"],
    capabilities: ["ctx.build"],
    membershipId: agent,
  });

  const paused = await startAndWait(platform, correlationId, {
    workItemId,
    scenario: "pause",
    prompt: "capture-context-before-spec-change",
  });
  stages.push({ id: "pause", label: "Pause execution before spec supersede", status: "completed" as const });

  await mustOk(
    platform,
    command(
      "SupersedeSpecification",
      owner,
      { specId, body: SPEC_V2 },
      correlationId,
    ),
  );
  stages.push({ id: "supersede", label: "Supersede spec while execution paused", status: "completed" as const });

  await mustFail(
    platform,
    command(
      "StartExecution",
      owner,
      { workItemId, kernel: "mock", scenario: "success", prompt: "polluted-retry" },
      correlationId,
    ),
    "invalid",
  );
  stages.push({ id: "block", label: "Stale work blocked from silent retry", status: "completed" as const });

  const execBefore = await platform.query(`SELECT context_package FROM executions WHERE id=$1`, [
    paused.executionId,
  ]);
  const ctxBefore = execBefore.rows[0]?.context_package as { specification?: { version?: number } } | undefined;
  const workStatus = await platform.query(`SELECT status, stale_reason FROM work_items WHERE id=$1`, [workItemId]);

  return buildResult({
    id: "case-07",
    name: "上下文污染测试",
    category: "stress-context-pollution",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Execution paused before spec change", paused.status === "waiting_for_human"),
      assert("Work item marked stale_spec", workStatus.rows[0]?.status === "stale_spec"),
      assert("Stale reason recorded", Boolean(workStatus.rows[0]?.stale_reason)),
      assert("New execution blocked on stale item", true),
      assert("Original context pinned to v1 spec version", ctxBefore?.specification?.version === 1),
      assert(
        "Stale inbox notification opened",
        (await countRows(platform, `SELECT count(*)::int AS count FROM inbox_items WHERE project_id=$1 AND kind='stale'`, [projectId])) >= 1,
      ),
    ],
  });
}
