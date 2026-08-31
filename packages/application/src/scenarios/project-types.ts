import type { ActorRef } from "@human-agent/domain";
import type { ScenarioAssertion, ScenarioCategory } from "./types.ts";
import type { ScenarioPlatform } from "./helpers.ts";

export type VerificationProfile = {
  version: string;
  commands: { name: string; command: string; args: string[] }[];
};

export type ProjectAgentDef = {
  key: string;
  name: string;
  capabilities: string[];
  source: "digital_employee" | "private" | "system_generated";
  cultivator?: ActorRef;
};

export type ProjectWorkItemDef = {
  key: string;
  goal: string;
  acceptanceCriteria: string[];
  capabilities: string[];
  risk: string;
  assigneeKey: string;
  piPrompt: string;
  affectedScope?: string[];
  kind?: "formal" | "exploration";
};

export type ProjectDefinition = {
  id: string;
  name: string;
  category: ScenarioCategory;
  specBody: string;
  repoFiles: Record<string, string>;
  verificationProfile: VerificationProfile;
  agents: ProjectAgentDef[];
  workItems: ProjectWorkItemDef[];
  graphEdges?: { from: string; to: string }[];
  /** Formal work items that must reach completed + merged for project done */
  requiredCompletedKeys: string[];
};

export type ProjectRunContext = {
  platform: ScenarioPlatform;
  correlationId: string;
  projectId: string;
  specId: string;
  workItems: Record<string, string>;
  memberships: Record<string, string>;
};

export type ProjectScenarioHook = (
  ctx: ProjectRunContext,
) => Promise<ScenarioAssertion[]>;
