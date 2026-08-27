import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentExecutor } from "./contract.ts";
import { isCapabilityMiss } from "./contract.ts";

export function defineExecutorContract(
  name: string,
  factory: () => AgentExecutor | Promise<AgentExecutor>,
): void {
  describe(`${name} executor contract`, () => {
    async function workspace(): Promise<string> {
      return mkdtemp(resolve(tmpdir(), "ha-executor-"));
    }

    it("declares required capabilities", async () => {
      const executor = await factory();
      const caps = executor.capabilities();
      expect(caps.start).toBe(true);
      expect(caps.interrupt).toBe(true);
      expect(caps.getState).toBe(true);
      expect(caps.subscribe).toBe(true);
    });

    it("starts, exposes observable state, and can interrupt", async () => {
      const executor = await factory();
      const workspacePath = await workspace();
      const started = await executor.start({
        executionId: "ex-contract-1",
        workspacePath,
        prompt: "contract",
        scenario: "pause",
      });
      expect(["starting", "running", "waiting_for_human", "paused"]).toContain(
        started.status,
      );
      const interrupted = await executor.interrupt("ex-contract-1");
      expect(["paused", "cancelled", "waiting_for_human", "unknown"]).toContain(
        interrupted.status,
      );
    });

    it("covers success, failure, timeout and unknown as observable statuses", async () => {
      const executor = await factory();
      const workspacePath = await workspace();
      const statuses: string[] = [];
      for (const scenario of ["success", "failure", "timeout", "unknown"]) {
        const state = await executor.start({
          executionId: `ex-${scenario}`,
          workspacePath,
          prompt: scenario,
          scenario,
        });
        statuses.push(state.status);
      }
      expect(statuses).toContain("completed");
      expect(statuses).toContain("failed");
      expect(statuses.some((status) => status === "paused" || status === "unknown")).toBe(
        true,
      );
    });

    it("returns a structured miss when optional capabilities are absent", async () => {
      const executor = await factory();
      const caps = executor.capabilities();
      if (!caps.forkFrom) {
        const result = await executor.forkFrom?.(
          { opaque: "missing", adapter: executor.name, protocolVersion: "1" },
          {
            executionId: "ex-fork",
            workspacePath: await workspace(),
            prompt: "fork",
          },
        );
        expect(result && isCapabilityMiss(result)).toBe(true);
      }
    });
  });
}
