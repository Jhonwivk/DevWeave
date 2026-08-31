import {
  assert,
  command,
  mustFail,
  mustOk,
  owner,
  reviewer,
  member,
} from "../helpers.ts";
import type { ProjectScenarioHook } from "../project-types.ts";

const SPEC_V2 = `# Context v2
## REQ-CTX Context
### AC-CTX-1 Context must be rebuilt from new effective spec`;

export const case01Hook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, projectId } = ctx;
  for (const [question, actor] of [
    ["Budget constraint?", owner],
    ["Timeline constraint?", member],
    ["Tech constraint?", reviewer],
  ] as const) {
    await mustOk(
      platform,
      command(
        "ProposeDecision",
        actor,
        { projectId, question, options: ["A", "B", "C"], impact: "Trade-off" },
        correlationId,
      ),
    );
  }
  return [assert("Three constraint proposals recorded", true)];
};

export const case02Hook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, projectId } = ctx;
  const proposal = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      {
        projectId,
        question: "Launch strategy?",
        options: ["Fast MVP", "Polished v1", "Phased rollout"],
        impact: "Product",
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
        decisionId: proposal.aggregateId,
        result: "Phased rollout bundle — no global optimum",
        rationale: "Preserves alternatives",
      },
      correlationId,
    ),
  );
  return [assert("Negotiation decision recorded without global optimum", true)];
};

export const case03BeforeSynthesisHook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, projectId } = ctx;
  const decision = await mustOk(
    platform,
    command(
      "ProposeDecision",
      owner,
      { projectId, question: "TAM contradiction?", options: ["Keep both"], impact: "Evidence" },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RecordDecision",
      owner,
      {
        decisionId: decision.aggregateId,
        result: "Keep both — do not merge",
        rationale: "Contradiction preserved",
      },
      correlationId,
    ),
  );
  return [assert("Contradiction decision recorded before synthesis", true)];
};

export const case05Hook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, projectId, workItems, memberships } = ctx;
  await mustFail(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId: workItems["audit"]!, membershipId: memberships.colluder! },
      correlationId,
    ),
    "forbidden",
  );
  await mustFail(
    platform,
    command(
      "RequestPermission",
      { kind: "agent", id: memberships.colluder!, displayName: "Colluder" },
      {
        projectId,
        membershipId: memberships.colluder,
        action: "host.sensitive.write",
        resourceScope: "/etc",
        reason: "escalation",
      },
      correlationId,
    ),
    "forbidden",
  );
  return [assert("Colluder blocked from privileged assignment", true)];
};

export const case07AfterHook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, specId, projectId } = ctx;
  await mustOk(
    platform,
    command(
      "SupersedeSpecification",
      owner,
      {
        specId,
        body: `${SPEC_V2}\n### AC-CTX-2 New requirement`,
      },
      correlationId,
    ),
  );
  const stale = await platform.query(`SELECT status FROM work_items WHERE project_id=$1 LIMIT 1`, [
    projectId,
  ]);
  await mustFail(
    platform,
    command(
      "StartExecution",
      owner,
      {
        workItemId: ctx.workItems["v1-doc"],
        kernel: "pi",
        prompt: "retry after pollution",
      },
      correlationId,
    ),
    "invalid",
  );
  return [
    assert("Work items marked stale after supersede", stale.rows[0]?.status === "stale_spec"),
    assert("Stale work blocked from new Pi execution", true),
  ];
};

export const case08Hook: ProjectScenarioHook = async (ctx) => {
  const { platform, correlationId, workItems } = ctx;
  const started = await mustOk(
    platform,
    command(
      "StartExecution",
      owner,
      {
        workItemId: workItems.probe!,
        kernel: "pi",
        prompt: "Iteratively refine without converging",
      },
      correlationId,
    ),
  );
  await platform.processJob(`pi-loop-${correlationId}`);
  await mustOk(
    platform,
    command(
      "Intervene",
      owner,
      { executionId: started.aggregateId, action: "cancel" },
      correlationId,
    ),
  );
  const status = await platform.query(`SELECT status FROM executions WHERE id=$1`, [
    started.aggregateId,
  ]);
  return [assert("Non-converging Pi execution cancelled by Human", status.rows[0]?.status === "cancelled")];
};
