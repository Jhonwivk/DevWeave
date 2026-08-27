import { defineExecutorContract } from "@human-agent/executor-sdk";
import { createMockExecutor } from "./mock-executor.ts";

defineExecutorContract("mock", () => createMockExecutor());
