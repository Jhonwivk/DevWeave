import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  AgentExecutor,
  ExecutorCapabilities,
  ExecutorStartInput,
  ExecutorState,
  KernelCheckpointRef,
} from "@human-agent/executor-sdk";
import { unsupported } from "@human-agent/executor-sdk";

type Internal = ExecutorState & { scenario: string; workspacePath: string };

export function createMockExecutor(
  options: { forkFrom?: boolean; failFork?: boolean; failCheckpoint?: boolean } = {},
): AgentExecutor {
  const states = new Map<string, Internal>();
  const listeners = new Map<string, Set<(state: ExecutorState) => void>>();

  const caps: ExecutorCapabilities = {
    start: true,
    interrupt: true,
    getState: true,
    subscribe: true,
    send: true,
    resume: true,
    checkpoint: !options.failCheckpoint,
    forkFrom: options.forkFrom !== false,
  };

  function emit(state: Internal): void {
    for (const listener of listeners.get(state.executionId) ?? []) {
      listener(state);
    }
  }

  async function applyScenario(input: ExecutorStartInput): Promise<Internal> {
    const scenario = input.scenario ?? "success";
    const base: Internal = {
      executionId: input.executionId,
      status: "running",
      scenario,
      workspacePath: input.workspacePath,
      lastMessage: input.prompt,
    };
    if (scenario === "success") {
      await mkdir(input.workspacePath, { recursive: true });
      await writeFile(resolve(input.workspacePath, "mock-output.txt"), `${input.prompt}\n`, "utf8");
      base.status = "completed";
      base.lastMessage = "Mock execution completed.";
    } else if (scenario === "failure") {
      base.status = "failed";
      base.lastMessage = "Mock execution failed.";
    } else if (scenario === "pause") {
      base.status = "waiting_for_human";
      base.lastMessage = "Mock execution waiting for Human.";
    } else if (scenario === "timeout") {
      base.status = "failed";
      base.lastMessage = "Mock execution interrupted after timeout.";
    } else if (scenario === "loop") {
      base.status = "running";
      base.lastMessage = "Mock execution looping without convergence.";
    } else {
      base.status = "unknown";
      base.lastMessage = "Kernel state could not be confirmed.";
    }
    states.set(input.executionId, base);
    emit(base);
    return base;
  }

  return {
    name: "mock",
    capabilities: () => caps,
    start: applyScenario,
    interrupt: async (executionId) => {
      const current = states.get(executionId);
      if (!current) {
        return { executionId, status: "unknown", lastMessage: "unknown execution" };
      }
      current.status = current.status === "running" ? "paused" : current.status;
      current.lastMessage = "Interrupted.";
      emit(current);
      return current;
    },
    getState: async (executionId) =>
      states.get(executionId) ?? { executionId, status: "unknown" },
    subscribe: (executionId, listener) => {
      const set = listeners.get(executionId) ?? new Set();
      set.add(listener);
      listeners.set(executionId, set);
      return () => set.delete(listener);
    },
    send: async (executionId, message) => {
      const current = states.get(executionId);
      if (!current) return { executionId, status: "unknown" };
      current.lastMessage = message;
      current.status = "running";
      emit(current);
      return current;
    },
    resume: async (executionId) => {
      const current = states.get(executionId);
      if (!current) return { executionId, status: "unknown" };
      current.status = "running";
      emit(current);
      return current;
    },
    checkpoint: async (executionId) => {
      if (options.failCheckpoint) {
        return unsupported("checkpoint");
      }
      const current = states.get(executionId);
      if (!current) {
        return unsupported("checkpoint");
      }
      const ref: KernelCheckpointRef = {
        opaque: `mock:${executionId}:${String(Date.now())}`,
        adapter: "mock",
        protocolVersion: "1",
      };
      current.kernelRef = ref;
      return ref;
    },
    forkFrom: async (ref, input) => {
      if (options.forkFrom === false || options.failFork || !ref.opaque.startsWith("mock:")) {
        return unsupported("forkFrom");
      }
      return applyScenario({ ...input, scenario: "success" });
    },
  };
}
