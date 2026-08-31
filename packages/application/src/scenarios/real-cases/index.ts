import { randomUUID } from "node:crypto";
import type { ScenarioPlatform } from "../helpers.ts";
import type { RealCasesResult, ScenarioResult } from "../types.ts";
import { requirePiKernel } from "../pi-env.ts";
import {
  runCase01,
  runCase02,
  runCase03,
  runCase04,
  runCase05,
  runCase06,
  runCase07,
  runCase08,
  runCase09,
} from "./case-runners.ts";

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
  await requirePiKernel();
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
  await requirePiKernel();
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
