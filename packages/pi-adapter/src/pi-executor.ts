import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type {
  AgentExecutor,
  ExecutorCapabilities,
  ExecutorStartInput,
  ExecutorState,
  KernelCheckpointRef,
} from "@human-agent/executor-sdk";
import { unsupported } from "@human-agent/executor-sdk";

const execFileAsync = promisify(execFile);

export function createPiExecutor(bin = process.env.PI_BIN ?? "pi"): AgentExecutor {
  const states = new Map<string, ExecutorState>();
  const listeners = new Map<string, Set<(state: ExecutorState) => void>>();
  const caps: ExecutorCapabilities = {
    start: true,
    interrupt: true,
    getState: true,
    subscribe: true,
    send: true,
    resume: false,
    checkpoint: true,
    forkFrom: true,
  };

  function emit(state: ExecutorState): void {
    for (const listener of listeners.get(state.executionId) ?? []) {
      listener(state);
    }
  }

  async function runPi(args: string[], cwd: string): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      await execFileAsync(bin, args, { cwd, timeout: 60_000, env: process.env });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "pi failed" };
    }
  }

  return {
    name: "pi",
    capabilities: () => caps,
    start: async (input: ExecutorStartInput) => {
      const sessionDir = input.sessionDir ?? resolve(input.workspacePath, ".pi-session");
      await mkdir(sessionDir, { recursive: true });
      const opaque = `pi:${input.executionId}`;
      const result = await runPi(["-p", input.prompt, "--session-dir", sessionDir], input.workspacePath);
      const state: ExecutorState = {
        executionId: input.executionId,
        status: result.ok ? "completed" : "unknown",
        lastMessage: result.ok ? "Pi execution completed." : result.message,
        kernelRef: { opaque, adapter: "pi", protocolVersion: "1" },
      };
      states.set(input.executionId, state);
      emit(state);
      return state;
    },
    interrupt: async (executionId) => {
      const current = states.get(executionId) ?? { executionId, status: "unknown" as const };
      current.status = current.status === "running" ? "paused" : current.status;
      current.lastMessage = "Interrupted.";
      states.set(executionId, current);
      emit(current);
      return current;
    },
    getState: async (executionId) => states.get(executionId) ?? { executionId, status: "unknown" },
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
      emit(current);
      return current;
    },
    resume: async () => unsupported("resume"),
    checkpoint: async (executionId) => {
      const current = states.get(executionId);
      if (!current?.kernelRef) return unsupported("checkpoint");
      return current.kernelRef;
    },
    forkFrom: async (ref: KernelCheckpointRef, input: ExecutorStartInput) => {
      if (ref.adapter !== "pi") return unsupported("forkFrom");
      const sessionDir = input.sessionDir ?? resolve(input.workspacePath, ".pi-session");
      await mkdir(sessionDir, { recursive: true });
      await runPi(["--fork", ref.opaque, "--session-dir", sessionDir], input.workspacePath);
      return {
        executionId: input.executionId,
        status: "queued",
        kernelRef: { opaque: `pi:${input.executionId}`, adapter: "pi", protocolVersion: "1" },
      };
    },
  };
}
