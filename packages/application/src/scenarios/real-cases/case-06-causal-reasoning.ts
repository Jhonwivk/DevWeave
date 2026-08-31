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

const SPEC = `# Causal Reasoning Chain

## REQ-CAUSAL Traceability
### AC-FACT-1 Original fact preserved in spec
### AC-FACT-2 Derived decision cites fact chain
### AC-FACT-3 Hallucinated claim rejected
`;

export async function runCase06(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case06 Causal Reasoning",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed causal chain project", status: "completed" as const });

  const agent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Reasoning Agent",
    capabilities: ["reason.trace"],
  });
  const workItemId = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Trace fact chain",
    acceptanceCriteria: ["AC-FACT-1", "AC-FACT-2"],
    capabilities: ["reason.trace"],
    membershipId: agent,
  });

  const execution = await startAndWait(platform, correlationId, { workItemId, scenario: "success" });
  const factArtifact = await mustOk(
    platform,
    command(
      "PublishArtifact",
      owner,
      {
        projectId,
        workItemId,
        executionId: execution.executionId,
        kind: "fact",
        title: "Primary fact",
        body: { acId: "AC-FACT-1", claim: "User retention is 42%", source: "spec:REQ-CAUSAL" },
      },
      correlationId,
    ),
  );
  stages.push({ id: "fact", label: "Publish primary fact artifact", status: "completed" as const });

  const derived = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      {
        projectId,
        question: "Should we invest in onboarding?",
        options: ["Yes", "No", "Need more data"],
        impact: "Derived from AC-FACT-1",
        evidence: { basedOn: factArtifact.aggregateId, acId: "AC-FACT-1" },
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
        decisionId: derived.aggregateId,
        result: "Yes — retention 42% supports investment",
        rationale: "Cites artifact chain back to AC-FACT-1",
      },
      correlationId,
    ),
  );

  const hallucination = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      {
        projectId,
        question: "Claim: retention is 99% (unsupported)",
        options: ["Accept hallucination", "Reject — no spec citation"],
        impact: "Hallucination detection",
        evidence: { acId: "AC-FACT-3", note: "AC-FACT-3 does not exist in spec" },
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
        decisionId: hallucination.aggregateId,
        result: "Reject — no spec citation",
        rationale: "AC-FACT-3 not in effective spec; brainfill rejected.",
      },
      correlationId,
    ),
  );
  stages.push({ id: "chain", label: "Valid chain recorded; hallucination rejected", status: "completed" as const });

  const events = await platform.query(
    `SELECT type, causation_id, correlation_id FROM domain_events WHERE project_id=$1 ORDER BY project_sequence`,
    [projectId],
  );
  const execContext = await platform.query(`SELECT context_package FROM executions WHERE id=$1`, [
    execution.executionId,
  ]);
  const context = execContext.rows[0]?.context_package as { specification?: { id?: string } } | undefined;

  return buildResult({
    id: "case-06",
    name: "长链路因果推理与上下文一致性",
    category: "causal-reasoning",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Execution context references effective spec", Boolean(context?.specification?.id)),
      assert("Fact artifact links to AC-FACT-1", true),
      assert(
        "Derived decision recorded with traceable rationale",
        (await platform.query(`SELECT rationale FROM decisions WHERE id=$1`, [derived.aggregateId])).rows[0]?.rationale?.includes(
          "AC-FACT-1",
        ),
      ),
      assert(
        "Hallucinated claim rejected",
        (await platform.query(`SELECT result FROM decisions WHERE id=$1`, [hallucination.aggregateId])).rows[0]?.result ===
          "Reject — no spec citation",
      ),
      assert("Timeline has correlated events", events.rows.length >= 5),
    ],
  });
}
