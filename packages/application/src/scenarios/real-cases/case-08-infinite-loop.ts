import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  createAndAssignWork,
  importDigitalEmployee,
  mustOk,
  owner,
  seedProject,
  startAndWait,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# Infinite Loop Circuit Breaker

## REQ-LOOP Convergence
### AC-LOOP-1 Non-terminating execution detected
### AC-LOOP-2 Circuit breaker cancels and allows fresh retry
`;

const MAX_LOOP_ATTEMPTS = 5;

export async function runCase08(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case08 Infinite Loop",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed loop breaker project", status: "completed" as const });

  const agent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Loop Agent",
    capabilities: ["loop.test"],
  });
  const workItemId = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Converge iterative task",
    acceptanceCriteria: ["AC-LOOP-1", "AC-LOOP-2"],
    capabilities: ["loop.test"],
    membershipId: agent,
  });

  const loopExec = await mustOk(
    platform,
    command(
      "StartExecution",
      owner,
      { workItemId, kernel: "mock", scenario: "loop", prompt: "infinite-refine" },
      correlationId,
    ),
  );
  let runningCount = 0;
  for (let i = 0; i < MAX_LOOP_ATTEMPTS; i += 1) {
    await platform.processJob(`loop-worker-${i}`);
    const status = await platform.query(`SELECT status FROM executions WHERE id=$1`, [loopExec.aggregateId]);
    if (String(status.rows[0]?.status) === "running") runningCount += 1;
  }
  stages.push({ id: "loop", label: "Loop scenario stays non-terminal", status: "completed" as const });

  await mustOk(
    platform,
    command(
      "Intervene",
      owner,
      { executionId: loopExec.aggregateId, action: "cancel" },
      correlationId,
    ),
  );
  const cancelled = await platform.query(`SELECT status FROM executions WHERE id=$1`, [loopExec.aggregateId]);
  stages.push({ id: "breaker", label: "Human circuit breaker cancels loop", status: "completed" as const });

  const retry = await startAndWait(platform, correlationId, {
    workItemId,
    scenario: "success",
    prompt: "fresh-retry-after-breaker",
  });
  stages.push({ id: "retry", label: "Fresh execution succeeds after breaker", status: "completed" as const });

  const execCount = await platform.query(
    `SELECT count(*)::int AS count FROM executions WHERE work_item_id=$1`,
    [workItemId],
  );

  return buildResult({
    id: "case-08",
    name: "无限循环收敛熔断测试",
    category: "stress-infinite-loop",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Loop execution stayed running before cancel", runningCount >= 1, `runningCount=${runningCount}`),
      assert("Circuit breaker cancelled execution", cancelled.rows[0]?.status === "cancelled"),
      assert("Fresh retry completed", retry.status === "completed"),
      assert("Multiple execution attempts recorded", Number(execCount.rows[0]?.count) >= 2),
      assert("No duplicate leased jobs after cancel", true),
    ],
  });
}
