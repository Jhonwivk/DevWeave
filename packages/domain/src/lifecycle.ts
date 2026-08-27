import { DomainError } from "./ids.ts";

export type SpecStatus = "draft" | "in_review" | "effective" | "superseded" | "withdrawn";
export type WorkItemStatus =
  | "draft"
  | "ready"
  | "assigned"
  | "in_progress"
  | "waiting_for_human"
  | "blocked"
  | "ready_for_review"
  | "completed"
  | "cancelled"
  | "stale_spec";
export type ExecutionStatus =
  | "queued"
  | "starting"
  | "running"
  | "waiting_for_human"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";
export type ArtifactStatus = "draft" | "published" | "superseded" | "deprecated";
export type DecisionStatus = "proposed" | "decided" | "superseded" | "withdrawn";
export type ChangeIntentStatus =
  | "proposed"
  | "reserved"
  | "active"
  | "released"
  | "superseded"
  | "conflicted";
export type MergeCandidateStatus =
  | "created"
  | "queued"
  | "rebasing"
  | "validating"
  | "mergeable"
  | "merged"
  | "conflicted"
  | "validation_failed"
  | "cancelled"
  | "stale";
export type CoverageStatus = "uncovered" | "planned" | "implemented" | "verified" | "waived";
export type AgentSourceType = "digital_employee" | "private_agent" | "system_generated";
export type TrustStatus = "candidate" | "trial" | "qualified" | "revoked";
export type HumanRole = "owner" | "member";
export type BranchKind = "original" | "exact" | "reconstructed";
export type ConflictKind = "text" | "symbol" | "contract" | "semantic";
export type EventLayer = "domain" | "telemetry" | "audit";

const transitions: Record<string, Record<string, readonly string[]>> = {
  specification: {
    draft: ["in_review", "withdrawn"],
    in_review: ["effective", "draft", "withdrawn"],
    effective: ["superseded", "withdrawn"],
    superseded: [],
    withdrawn: [],
  },
  workItem: {
    draft: ["ready", "cancelled"],
    ready: ["assigned", "blocked", "cancelled", "stale_spec"],
    assigned: ["in_progress", "ready", "cancelled", "stale_spec"],
    in_progress: [
      "waiting_for_human",
      "blocked",
      "ready_for_review",
      "assigned",
      "cancelled",
      "stale_spec",
    ],
    waiting_for_human: ["in_progress", "blocked", "cancelled", "stale_spec"],
    blocked: ["ready", "assigned", "cancelled", "stale_spec"],
    ready_for_review: ["completed", "in_progress", "cancelled", "stale_spec"],
    completed: [],
    cancelled: [],
    stale_spec: ["ready", "assigned", "cancelled"],
  },
  execution: {
    queued: ["starting", "cancelled"],
    starting: ["running", "failed", "unknown", "cancelled"],
    running: [
      "waiting_for_human",
      "paused",
      "completed",
      "failed",
      "cancelled",
      "unknown",
    ],
    waiting_for_human: ["running", "paused", "cancelled", "failed", "unknown"],
    paused: ["running", "cancelled", "unknown"],
    completed: [],
    failed: [],
    cancelled: [],
    unknown: ["running", "failed", "cancelled"],
  },
  artifact: {
    draft: ["published", "deprecated"],
    published: ["superseded", "deprecated"],
    superseded: [],
    deprecated: [],
  },
  decision: {
    proposed: ["decided", "withdrawn"],
    decided: ["superseded", "withdrawn"],
    superseded: [],
    withdrawn: [],
  },
  changeIntent: {
    proposed: ["reserved", "superseded"],
    reserved: ["active", "released", "superseded", "conflicted"],
    active: ["released", "superseded", "conflicted"],
    released: [],
    superseded: [],
    conflicted: ["released", "superseded"],
  },
  mergeCandidate: {
    created: ["queued", "cancelled"],
    queued: ["rebasing", "cancelled", "stale"],
    rebasing: ["validating", "conflicted", "cancelled", "stale"],
    validating: ["mergeable", "validation_failed", "conflicted", "cancelled", "stale"],
    mergeable: ["merged", "stale", "cancelled"],
    merged: [],
    conflicted: ["queued", "cancelled"],
    validation_failed: ["queued", "cancelled"],
    cancelled: [],
    stale: ["queued", "cancelled"],
  },
};

export function assertTransition(
  machine: keyof typeof transitions,
  from: string,
  to: string,
): void {
  const allowed = transitions[machine]?.[from] ?? [];
  if (!allowed.includes(to)) {
    throw new DomainError(
      "invalid",
      `Illegal ${machine} transition ${from} → ${to}.`,
      { machine, from, to },
    );
  }
}

export function canTransition(
  machine: keyof typeof transitions,
  from: string,
  to: string,
): boolean {
  return (transitions[machine]?.[from] ?? []).includes(to);
}
