import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockExecutor } from "@human-agent/mock-adapter";
import { createPiExecutor } from "@human-agent/pi-adapter";
import { createPool, initializeDatabase, loadWorkspaceEnv } from "@human-agent/persistence";
import { createPlatform } from "../platform.ts";
import { probePiKernel } from "./pi-env.ts";
import { runAllRealCases, runRealCase } from "./real-cases/index.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("缺少 TEST_DATABASE_URL 或 DATABASE_URL。");
}

const piStatus = await probePiKernel();

const TRUNCATE = `
  TRUNCATE
    inbox_items, jobs, merge_candidates, conflicts, change_intents, decisions,
    artifact_adoptions, artifacts, checkpoints, executions, permission_requests,
    recorded_consensus, work_items, specifications, system_generated_candidates,
    agent_memberships, private_agent_copies, digital_employee_releases,
    human_memberships, outbox, domain_events, idempotency_records,
    project_sequences, contract_ownership, projects, humans
  RESTART IDENTITY CASCADE
`;

describe.skipIf(!piStatus.available)("real-case Pi project scenarios", () => {
  const pool = createPool(databaseUrl);
  const fixtures: string[] = [];

  beforeAll(async () => {
    await initializeDatabase(databaseUrl);
  });

  beforeEach(async () => {
    await pool.query(TRUNCATE);
  });

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map(async (repo) => {
        await rm(resolve(dirname(repo), ".ha-worktrees"), { recursive: true, force: true }).catch(
          () => undefined,
        );
        await rm(repo, { recursive: true, force: true });
      }),
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  function platform() {
    return createPlatform(pool, {
      executors: {
        mock: createMockExecutor(),
        pi: createPiExecutor(piStatus.bin),
      },
    });
  }

  it("runs all 9 completed projects with real Pi kernel", async () => {
    const result = await runAllRealCases(platform());
    expect(result.total).toBe(9);
    expect(result.failed).toBe(0);
    for (const scenario of result.scenarios) {
      expect(scenario.passed, `${scenario.id} ${scenario.name}`).toBe(true);
    }
  }, 1_800_000);

  it.each([
    ["case-01", "多约束产品方案推演"],
    ["case-02", "多方利益博弈谈判"],
    ["case-03", "并行多分支调研与证据交叉校验"],
    ["case-04", "带分支与失败降级的复杂 DAG 任务"],
    ["case-05", "多 Agent 内部共谋与越权防御"],
    ["case-06", "长链路因果推理与上下文一致性"],
    ["case-07", "上下文污染测试"],
    ["case-08", "无限循环收敛熔断测试"],
    ["case-09", "信息部分缺失场景测试"],
  ])("completes project %s with Pi kernel", async (caseId, name) => {
    const result = await runRealCase(platform(), caseId);
    expect(result.id).toBe(caseId);
    expect(result.name).toBe(name);
    expect(result.passed).toBe(true);
  }, 600_000);
});

if (!piStatus.available) {
  describe("real-case Pi project scenarios (skipped)", () => {
    it("requires Pi CLI — install pi or set PI_BIN", () => {
      expect(piStatus.reason).toBeTruthy();
    });
  });
}
