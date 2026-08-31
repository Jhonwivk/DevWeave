import type { ScenarioPlatform } from "../helpers.ts";
import {
  assert,
  buildResult,
  command,
  importDigitalEmployee,
  member,
  mustOk,
  owner,
  seedProject,
} from "../helpers.ts";
import type { ScenarioResult } from "../types.ts";

const SPEC = `# Stakeholder Negotiation

## REQ-NEGOTIATE Outcome
### AC-NEG-1 Stakeholder positions documented
### AC-NEG-2 Selected alternative recorded without claiming global optimum
`;

export async function runCase02(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId } = await seedProject(platform, correlationId, {
    name: "Case02 Multi-Party Negotiation",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed negotiation project", status: "completed" as const });

  const productAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Product Agent",
    capabilities: ["negotiate.product"],
  });
  const engAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Engineering Agent",
    capabilities: ["negotiate.engineering"],
  });
  const opsAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Operations Agent",
    capabilities: ["negotiate.ops"],
  });

  const proposals = await Promise.all([
    mustOk(
      platform,
      command(
        "ProposeDecision",
        { kind: "agent", id: productAgent, displayName: "Product" },
        {
          projectId,
          question: "Launch strategy?",
          options: ["Fast MVP", "Polished v1", "Phased rollout"],
          impact: "Product velocity vs quality",
        },
        correlationId,
      ),
    ),
    mustOk(
      platform,
      command(
        "ProposeDecision",
        { kind: "agent", id: engAgent, displayName: "Engineering" },
        {
          projectId,
          question: "Architecture choice?",
          options: ["Monolith", "Modular monolith", "Microservices"],
          impact: "Engineering sustainability",
        },
        correlationId,
      ),
    ),
    mustOk(
      platform,
      command(
        "ProposeDecision",
        { kind: "agent", id: opsAgent, displayName: "Operations" },
        {
          projectId,
          question: "Operational model?",
          options: ["On-call rotation", "Follow-the-sun", "Vendor SRE"],
          impact: "Reliability vs cost",
        },
        correlationId,
      ),
    ),
  ]);
  stages.push({ id: "proposals", label: "Three stakeholder proposals", status: "completed" as const });

  await mustOk(
    platform,
    command(
      "RecordDecision",
      owner,
      {
        decisionId: proposals[0].aggregateId,
        result: "Phased rollout + modular monolith + follow-the-sun (no global optimum claimed)",
        rationale:
          "Each stakeholder keeps documented alternatives; selected path is a negotiated bundle, not a single winner.",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RecordConsensus",
      member,
      {
        projectId,
        result: "Alternatives A/B/C preserved for product, eng, ops",
        rationale: "Offline negotiation — platform does not verify unanimity",
      },
      correlationId,
    ),
  );
  stages.push({ id: "consensus", label: "Record bundle without global optimum", status: "completed" as const });

  const decided = await platform.query(
    `SELECT result, rationale FROM decisions WHERE project_id=$1 AND status='decided'`,
    [projectId],
  );

  return buildResult({
    id: "case-02",
    name: "多方利益博弈谈判",
    category: "business-conflict",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Three independent proposals exist", proposals.length === 3),
      assert(
        "Decision documents no global optimum",
        String(decided.rows[0]?.result ?? "").includes("no global optimum"),
      ),
      assert(
        "Consensus disclaimer preserved",
        (await platform.query(`SELECT disclaimer FROM recorded_consensus WHERE project_id=$1`, [projectId])).rows.length >= 1,
      ),
      assert("Unresolved proposals remain proposed", (await platform.query(`SELECT count(*)::int AS count FROM decisions WHERE project_id=$1 AND status='proposed'`, [projectId])).rows[0]?.count >= 2),
    ],
  });
}
