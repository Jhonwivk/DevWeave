import type { ExecutionStatus } from "@human-agent/domain";

export type ExecutorCapabilities = {
  start: true;
  interrupt: true;
  getState: true;
  subscribe: true;
  send: boolean;
  resume: boolean;
  checkpoint: boolean;
  forkFrom: boolean;
};

export type KernelCheckpointRef = {
  opaque: string;
  adapter: string;
  protocolVersion: string;
};

export type ExecutorStartInput = {
  executionId: string;
  workspacePath: string;
  prompt: string;
  scenario?: string;
  sessionDir?: string;
};

export type ExecutorState = {
  executionId: string;
  status: ExecutionStatus;
  lastMessage?: string;
  kernelRef?: KernelCheckpointRef;
};

export type CapabilityMiss = {
  ok: false;
  code: "unsupported";
  capability: keyof ExecutorCapabilities;
};

export type AgentExecutor = {
  name: string;
  capabilities(): ExecutorCapabilities;
  start(input: ExecutorStartInput): Promise<ExecutorState>;
  interrupt(executionId: string): Promise<ExecutorState>;
  getState(executionId: string): Promise<ExecutorState>;
  subscribe(
    executionId: string,
    listener: (state: ExecutorState) => void,
  ): () => void;
  send?(executionId: string, message: string): Promise<ExecutorState | CapabilityMiss>;
  resume?(executionId: string): Promise<ExecutorState | CapabilityMiss>;
  checkpoint?(executionId: string): Promise<KernelCheckpointRef | CapabilityMiss>;
  forkFrom?(
    ref: KernelCheckpointRef,
    input: ExecutorStartInput,
  ): Promise<ExecutorState | CapabilityMiss>;
};

export function unsupported(capability: keyof ExecutorCapabilities): CapabilityMiss {
  return { ok: false, code: "unsupported", capability };
}

export function isCapabilityMiss(value: unknown): value is CapabilityMiss {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      (value as CapabilityMiss).ok === false,
  );
}
