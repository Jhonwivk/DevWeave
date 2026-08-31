export type ScenarioCategory =
  | "business-conflict"
  | "parallel-research"
  | "dag-orchestration"
  | "security-permissions"
  | "causal-reasoning"
  | "stress-context-pollution"
  | "stress-infinite-loop"
  | "stress-partial-info";

export type ScenarioAssertion = {
  label: string;
  passed: boolean;
  detail?: string;
};

export type ScenarioStage = {
  id: string;
  label: string;
  status: "completed" | "failed";
};

export type ScenarioResult = {
  id: string;
  name: string;
  category: ScenarioCategory;
  passed: boolean;
  stages: ScenarioStage[];
  assertions: ScenarioAssertion[];
  projectId: string;
  durationMs: number;
};

export type RealCasesResult = {
  correlationId: string;
  startedAt: string;
  completedAt: string;
  total: number;
  passed: number;
  failed: number;
  scenarios: ScenarioResult[];
};
