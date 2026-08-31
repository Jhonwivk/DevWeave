import { defineExecutorContract } from "@human-agent/executor-sdk/contract-suite";
import { createMockExecutor } from "./mock-executor.ts";

defineExecutorContract("mock", () => createMockExecutor());
