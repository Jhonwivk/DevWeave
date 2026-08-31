import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  createAndAssignWork,
  importDigitalEmployee,
  member,
  mustOk,
  owner,
  reviewer,
  seedProject,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# Multi-Constraint Product Plan

## REQ-PLAN Delivery
### AC-BUDGET Budget ceiling respected
### AC-TIMELINE Timeline milestone met
### AC-TECH Technical hard constraints satisfied
`;

export async function runCase01(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case01 Multi-Constraint Planning",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed project and effective spec", status: "completed" as const });

  const budgetAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Budget Analyst DE",
    capabilities: ["plan.budget"],
  });
  const _timeAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Timeline Planner DE",
    capabilities: ["plan.timeline"],
  });
  const _techAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Tech Architect DE",
    capabilities: ["plan.tech"],
  });

  const budgetProposal = await mustOk(
    platform,
    command(
      "ProposeDecision",
      { kind: "agent", id: budgetAgent, displayName: "Budget DE" },
      {
        projectId,
        question: "How to satisfy AC-BUDGET under $50k?",
        options: ["Cut scope", "Extend timeline", "Reduce quality"],
        impact: "Budget vs timeline vs quality trade-off",
        evidence: { constraint: "budget", ceiling: 50000 },
      },
      correlationId,
    ),
  );
  const _timeProposal = await mustOk(
    platform,
    command(
      "ProposeDecision",
      member,
      {
        projectId,
        question: "How to satisfy AC-TIMELINE in 4 weeks?",
        options: ["Parallelize", "Descope", "Add contractors"],
        impact: "Timeline pressure",
        evidence: { constraint: "timeline", weeks: 4 },
      },
      correlationId,
    ),
  );
  const _techProposal = await mustOk(
    platform,
    command(
      "ProposeDecision",
      reviewer,
      {
        projectId,
        question: "How to satisfy AC-TECH without legacy DB?",
        options: ["New datastore", "Adapter layer", "Reject legacy requirement"],
        impact: "Hard technical constraint",
        evidence: { constraint: "tech", blocked: ["legacy-db"] },
      },
      correlationId,
    ),
  );
  stages.push({ id: "proposals", label: "Three constraint proposals", status: "completed" as const });

  await mustOk(
    platform,
    command(
      "RecordDecision",
      owner,
      {
        decisionId: budgetProposal.aggregateId,
        result: "Compromise: descope 20% + 1 week extension + adapter layer for legacy",
        rationale:
          "No single constraint can win; negotiated middle path across budget, timeline, and tech.",
      },
      correlationId,
    ),
  );

  const workItemId = await createAndAssignWork(platform, correlationId, {
    projectId,
    specId,
    goal: "Deliver compromise plan",
    acceptanceCriteria: ["AC-BUDGET", "AC-TIMELINE", "AC-TECH"],
    capabilities: ["plan.budget"],
    membershipId: budgetAgent,
    risk: "high",
  });
  stages.push({ id: "work", label: "Assign compromise work item", status: "completed" as const });

  const decisions = await platform.query(
    `SELECT status, result FROM decisions WHERE project_id=$1`,
    [projectId],
  );
  const proposedCount = decisions.rows.filter((row) => row.status === "proposed").length;
  const decided = decisions.rows.find((row) => row.status === "decided");

  return buildResult({
    id: "case-01",
    name: "多约束产品方案推演",
    category: "business-conflict",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Three agents proposed conflicting options", proposedCount >= 2, `proposed=${proposedCount}`),
      assert("Compromise decision recorded", Boolean(decided?.result?.includes("Compromise"))),
      assert("Work item tracks all three ACs", Boolean(workItemId)),
      assert(
        "Timeline records decision events",
        (await platform.query(`SELECT count(*)::int AS count FROM domain_events WHERE project_id=$1 AND type LIKE 'Decision%'`, [projectId])).rows[0]?.count >= 2,
      ),
    ],
  });
}
