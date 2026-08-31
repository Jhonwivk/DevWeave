import type { ScenarioPlatform } from "../helpers.ts";
import { runProjectCase } from "../project-runner.ts";
import type { ScenarioResult } from "../types.ts";
import {
  CASE_01_DEFINITION,
  CASE_02_DEFINITION,
  CASE_03_DEFINITION,
  CASE_04_DEFINITION,
  CASE_05_DEFINITION,
  CASE_06_DEFINITION,
  CASE_07_DEFINITION,
  CASE_08_DEFINITION,
  CASE_09_DEFINITION,
} from "../projects/definitions.ts";
import {
  case01Hook,
  case02Hook,
  case03BeforeSynthesisHook,
  case05Hook,
  case07AfterHook,
  case08Hook,
} from "../projects/hooks.ts";

export async function runCase01(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_01_DEFINITION, case01Hook);
}

export async function runCase02(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_02_DEFINITION, case02Hook);
}

export async function runCase03(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_03_DEFINITION, undefined, undefined, {
    synthesis: case03BeforeSynthesisHook,
  });
}

export async function runCase04(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_04_DEFINITION);
}

export async function runCase05(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_05_DEFINITION, case05Hook);
}

export async function runCase06(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_06_DEFINITION);
}

export async function runCase07(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_07_DEFINITION, undefined, case07AfterHook);
}

export async function runCase08(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_08_DEFINITION, case08Hook);
}

export async function runCase09(_platform: ScenarioPlatform, _correlationId: string): Promise<ScenarioResult> {
  return runProjectCase(_platform, CASE_09_DEFINITION);
}
