import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  countRows,
  importDigitalEmployee,
  mustFail,
  mustOk,
  owner,
  seedProject,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# Partial Information

## REQ-GAP Capability staffing
### AC-GAP-1 Missing capability detected
### AC-GAP-2 Gap filled only after Human qualification
`;

export async function runCase09(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case09 Partial Information",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed partial-info project", status: "completed" as const });

  const generalAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "General Agent",
    capabilities: ["task.general"],
  });

  const gapWork = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Specialized ML evaluation",
        acceptanceCriteria: ["AC-GAP-1", "AC-GAP-2"],
        requiredCapabilities: ["ml.evaluate", "stats.bayesian"],
        affectedScope: [],
        risk: "high",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command("RecordConsensus", owner, { projectId, result: "staff-gap", rationale: "offline" }, correlationId),
  );
  await mustFail(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: gapWork.aggregateId, membershipId: generalAgent },
      correlationId,
    ),
    "forbidden",
  );
  stages.push({ id: "gap", label: "Capability gap blocks assignment", status: "completed" as const });

  const candidate = await mustOk(
    platform,
    command(
      "GenerateSystemAgent",
      owner,
      {
        projectId,
        gap: { capabilities: ["ml.evaluate", "stats.bayesian"], workItemId: gapWork.aggregateId },
      },
      correlationId,
    ),
  );
  const candidateAssign = await platform.handle(
    command(
      "AssignWorkItem",
      owner,
      { workItemId: gapWork.aggregateId, membershipId: candidate.aggregateId },
      correlationId,
    ),
  );
  if (
    candidateAssign.ok ||
    !["forbidden", "not_found", "invalid"].includes(
      candidateAssign.ok ? "" : candidateAssign.error.code,
    )
  ) {
    throw new Error(
      `AssignWorkItem: expected forbidden/not_found, got ${candidateAssign.ok ? "ok" : candidateAssign.error.code}`,
    );
  }
  stages.push({ id: "candidate", label: "Unqualified system agent cannot be assigned", status: "completed" as const });

  const membership = await mustOk(
    platform,
    command(
      "QualifySystemAgent",
      owner,
      { candidateId: candidate.aggregateId },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: gapWork.aggregateId, membershipId: membership.aggregateId },
      correlationId,
    ),
  );
  stages.push({ id: "qualify", label: "Qualified agent assigned after Human review", status: "completed" as const });

  return buildResult({
    id: "case-09",
    name: "信息部分缺失场景测试",
    category: "stress-partial-info",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("General agent blocked from specialized work", true),
      assert("System agent candidate proposed for gap", Boolean(candidate.aggregateId)),
      assert(
        "Membership qualified after Human review",
        (await platform.query(`SELECT trust_status FROM agent_memberships WHERE id=$1`, [membership.aggregateId])).rows[0]
          ?.trust_status === "qualified",
      ),
      assert(
        "Work item assigned after qualification",
        (await platform.query(`SELECT status FROM work_items WHERE id=$1`, [gapWork.aggregateId])).rows[0]?.status ===
          "assigned",
      ),
      assert(
        "Capability gap inbox opened",
        (await countRows(
          platform,
          `SELECT count(*)::int AS count FROM inbox_items WHERE project_id=$1 AND kind='capability_gap'`,
          [projectId],
        )) >= 1,
      ),
    ],
  });
}
