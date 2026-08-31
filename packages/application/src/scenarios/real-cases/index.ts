import { randomUUID } from "node:crypto";
import type { ScenarioPlatform } from "../helpers.ts";
import type { RealCasesResult, ScenarioResult } from "../types.ts";
import { runCase01 } from "./case-01-multi-constraint-planning.ts";
import { runCase02 } from "./case-02-multi-party-negotiation.ts";
import { runCase03 } from "./case-03-parallel-research.ts";
import { runCase04 } from "./case-04-dag-orchestration.ts";
import { runCase05 } from "./case-05-security-permissions.ts";
import { runCase06 } from "./case-06-causal-reasoning.ts";
import { runCase07 } from "./case-07-context-pollution.ts";
import { runCase08 } from "./case-08-infinite-loop.ts";
import { runCase09 } from "./case-09-partial-info.ts";

export type RealCaseRunner = (
  platform: ScenarioPlatform,
  correlationId: string,
) => Promise<ScenarioResult>;

export const REAL_CASE_RUNNERS: RealCaseRunner[] = [
  runCase01,
  runCase02,
  runCase03,
  runCase04,
  runCase05,
  runCase06,
  runCase07,
  runCase08,
  runCase09,
];

export async function runAllRealCases(platform: ScenarioPlatform): Promise<RealCasesResult> {
  const correlationId = `real-cases-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const scenarios: ScenarioResult[] = [];

  for (const runner of REAL_CASE_RUNNERS) {
    scenarios.push(await runner(platform, `${correlationId}-${scenarios.length + 1}`));
  }

  const passed = scenarios.filter((item) => item.passed).length;
  return {
    correlationId,
    startedAt,
    completedAt: new Date().toISOString(),
    total: scenarios.length,
    passed,
    failed: scenarios.length - passed,
    scenarios,
  };
}

export async function runRealCase(
  platform: ScenarioPlatform,
  caseId: string,
): Promise<ScenarioResult> {
  const runner = REAL_CASE_RUNNERS.find((_, index) => `case-0${index + 1}` === caseId || `case-${index + 1}` === caseId);
  if (!runner) {
    throw new Error(`Unknown real case id: ${caseId}`);
  }
  return runner(platform, `real-case-${caseId}-${randomUUID()}`);
}

export {
  runCase01,
  runCase02,
  runCase03,
  runCase04,
  runCase05,
  runCase06,
  runCase07,
  runCase08,
  runCase09,
};
