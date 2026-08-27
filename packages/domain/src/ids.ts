export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ProjectId = Brand<string, "ProjectId">;
export type HumanId = Brand<string, "HumanId">;
export type MembershipId = Brand<string, "MembershipId">;
export type AgentMembershipId = Brand<string, "AgentMembershipId">;
export type SpecId = Brand<string, "SpecId">;
export type RequirementId = Brand<string, "RequirementId">;
export type AcceptanceCriterionId = Brand<string, "AcceptanceCriterionId">;
export type WorkItemId = Brand<string, "WorkItemId">;
export type ExecutionId = Brand<string, "ExecutionId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type ArtifactId = Brand<string, "ArtifactId">;
export type DecisionId = Brand<string, "DecisionId">;
export type ChangeIntentId = Brand<string, "ChangeIntentId">;
export type MergeCandidateId = Brand<string, "MergeCandidateId">;
export type EventId = Brand<string, "EventId">;
export type InboxItemId = Brand<string, "InboxItemId">;

export type ActorRef = {
  kind: "human" | "agent" | "system";
  id: string;
  displayName: string;
};

export class DomainError extends Error {
  constructor(
    readonly code:
      | "conflict"
      | "forbidden"
      | "invalid"
      | "not_found"
      | "unsupported"
      | "restore_failed",
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
