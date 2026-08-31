import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  countRows,
  createAndAssignWork,
  importDigitalEmployee,
  mustOk,
  owner,
  seedProject,
  startAndWait,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# Parallel Research

## REQ-RESEARCH Evidence
### AC-RES-1 Independent research branches complete
### AC-RES-2 Contradictions surfaced without forced merge
`;

export async function runCase03(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case03 Parallel Research",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed research project", status: "completed" as const });

  const agentA = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Research Agent Alpha",
    capabilities: ["research.market"],
  });
  const agentB = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Research Agent Beta",
    capabilities: ["research.market"],
  });

  const workA = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Market sizing branch A",
    acceptanceCriteria: ["AC-RES-1"],
    capabilities: ["research.market"],
    membershipId: agentA,
    kind: "exploration",
    risk: "low",
  });
  const workB = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Market sizing branch B",
    acceptanceCriteria: ["AC-RES-1"],
    capabilities: ["research.market"],
    membershipId: agentB,
    kind: "exploration",
    risk: "low",
  });
  stages.push({ id: "parallel", label: "Two parallel exploration branches", status: "completed" as const });

  const execA = await startAndWait(platform, correlationId, { workItemId: workA, scenario: "success" });
  const execB = await startAndWait(platform, correlationId, { workItemId: workB, scenario: "success" });

  const artifactA = await mustOk(
    platform,
    command(
      "PublishArtifact",
      owner,
      {
        projectId,
        workItemId: workA,
        executionId: execA.executionId,
        kind: "evidence",
        title: "Market evidence A",
        body: { metric: "tam", value: 1200000000, source: "vendor-a" },
      },
      correlationId,
    ),
  );
  const artifactB = await mustOk(
    platform,
    command(
      "PublishArtifact",
      owner,
      {
        projectId,
        workItemId: workB,
        executionId: execB.executionId,
        kind: "evidence",
        title: "Market evidence B",
        body: { metric: "tam", value: 450000000, source: "vendor-b" },
      },
      correlationId,
    ),
  );
  stages.push({ id: "artifacts", label: "Publish contradictory evidence artifacts", status: "completed" as const });

  const contradiction = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      {
        projectId,
        question: "TAM contradiction detected between branch A and B",
        options: [
          "Keep both findings — do not merge",
          "Commission third study",
          "Human selects one source",
        ],
        impact: "Evidence conflict must not be silently flattened",
        evidence: {
          artifactA: artifactA.aggregateId,
          artifactB: artifactB.aggregateId,
          delta: "1200M vs 450M",
        },
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RecordDecision",
      owner,
      {
        decisionId: contradiction.aggregateId,
        result: "Keep both findings — do not merge",
        rationale: "Contradiction preserved; no forced consensus on numeric fact.",
      },
      correlationId,
    ),
  );
  stages.push({ id: "decision", label: "Record contradiction without forced merge", status: "completed" as const });

  const tamValues = await platform.query(
    `SELECT body FROM artifacts WHERE project_id=$1 AND kind='evidence'`,
    [projectId],
  );

  return buildResult({
    id: "case-03",
    name: "并行多分支调研与证据交叉校验",
    category: "parallel-research",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Two parallel executions completed", execA.status === "completed" && execB.status === "completed"),
      assert("Two distinct evidence artifacts published", tamValues.rows.length === 2),
      assert(
        "Contradictory values preserved",
        tamValues.rows.some((row) => (row.body as { value?: number }).value === 1200000000) &&
          tamValues.rows.some((row) => (row.body as { value?: number }).value === 450000000),
      ),
      assert(
        "Decision explicitly rejects forced merge",
        (await platform.query(`SELECT result FROM decisions WHERE id=$1`, [contradiction.aggregateId])).rows[0]?.result ===
          "Keep both findings — do not merge",
      ),
      assert("No stale_spec forced on exploration items", (await countRows(platform, `SELECT count(*)::int AS count FROM work_items WHERE project_id=$1 AND kind='exploration' AND status='stale_spec'`, [projectId])) === 0),
    ],
  });
}
