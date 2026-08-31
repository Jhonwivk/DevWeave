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

const SPEC = `# Security Permissions

## REQ-SEC Least privilege
### AC-SEC-1 Baseline rules enforced
### AC-SEC-2 Privilege escalation blocked and audited
`;

export async function runCase05(platform: ScenarioPlatform, correlationId: string): Promise<ScenarioResult> {
  const startedAt = Date.now();
  const stages = [];
  const { projectId, specId } = await seedProject(platform, correlationId, {
    name: "Case05 Security Permissions",
    specBody: SPEC,
  });
  stages.push({ id: "seed", label: "Seed security project", status: "completed" as const });

  const trustedAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Trusted Worker",
    capabilities: ["task.read", "task.admin"],
  });
  const colludingAgent = await importDigitalEmployee(platform, correlationId, projectId, {
    name: "Colluding Agent",
    capabilities: ["task.read"],
  });

  const work = await mustOk(
    platform,
    command(
      "CreateWorkItem",
      owner,
      {
        projectId,
        specId,
        goal: "Sensitive task",
        acceptanceCriteria: ["AC-SEC-1"],
        requiredCapabilities: ["task.admin"],
        affectedScope: [],
        risk: "high",
      },
      correlationId,
    ),
  );
  const workItemId = work.aggregateId;
  await mustOk(
    platform,
    command("RecordConsensus", owner, { projectId, result: "assign", rationale: "offline" }, correlationId),
  );
  await mustFail(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId, membershipId: colludingAgent },
      correlationId,
    ),
    "forbidden",
  );
  await mustOk(
    platform,
    command(
      "AssignWorkItem",
      owner,
      { workItemId, membershipId: trustedAgent },
      correlationId,
    ),
  );
  await mustFail(
    platform,
    command(
      "RequestPermission",
      { kind: "agent", id: colludingAgent, displayName: "Colluding" },
      {
        projectId,
        membershipId: colludingAgent,
        action: "host.sensitive.write",
        resourceScope: "/etc",
        reason: "collusion attempt",
      },
      correlationId,
    ),
    "forbidden",
  );
  stages.push({ id: "baseline", label: "Baseline rules block escalation", status: "completed" as const });

  const permRequest = await mustOk(
    platform,
    command(
      "RequestPermission",
      { kind: "agent", id: colludingAgent, displayName: "Colluding" },
      {
        projectId,
        membershipId: colludingAgent,
        action: "workspace.write",
        resourceScope: "src/secrets",
        reason: "role drift — claims need for unrelated task",
      },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "DecidePermission",
      owner,
      { requestId: permRequest.aggregateId, approve: false },
      correlationId,
    ),
  );
  stages.push({ id: "audit", label: "Suspicious permission rejected and audited", status: "completed" as const });

  const reassignAttempt = await mustOk(
    platform,
    command(
      "ReassignWorkItem",
      owner,
      { workItemId, membershipId: colludingAgent },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "RaiseAssignmentConcern",
      { kind: "agent", id: trustedAgent, displayName: "Trusted" },
      { workItemId, concern: "Role drift detected — colluding agent lacks task.admin" },
      correlationId,
    ),
  );
  await mustOk(
    platform,
    command(
      "ReassignWorkItem",
      owner,
      { workItemId, membershipId: trustedAgent },
      correlationId,
    ),
  );
  stages.push({ id: "recover", label: "Concern raised and work reassigned to trusted agent", status: "completed" as const });

  const assignment = reassignAttempt.body.assignment as { previous?: unknown; version?: number } | undefined;

  return buildResult({
    id: "case-05",
    name: "多 Agent 内部共谋与越权防御",
    category: "security-permissions",
    projectId,
    startedAt,
    stages,
    assertions: [
      assert("Hard capability mismatch blocked without override", true),
      assert("Baseline host.sensitive blocked", true),
      assert("Reassignment versioned for audit", Number(assignment?.version) >= 2),
      assert(
        "Permission request audited",
        (await countRows(platform, `SELECT count(*)::int AS count FROM permission_requests WHERE project_id=$1`, [projectId])) >= 1,
      ),
      assert(
        "Rejected permission recorded",
        (await platform.query(`SELECT status FROM permission_requests WHERE id=$1`, [permRequest.aggregateId])).rows[0]?.status ===
          "rejected",
      ),
      assert(
        "Assignment concern recorded",
        (await platform.query(`SELECT assignment FROM work_items WHERE id=$1`, [workItemId])).rows[0]?.assignment,
      ),
    ],
  });
}
