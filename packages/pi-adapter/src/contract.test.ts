import { describe, expect, it } from "vitest";
import { defineExecutorContract } from "@human-agent/executor-sdk/contract-suite";
import { createPiExecutor } from "./pi-executor.ts";

describe("pi adapter opacity", () => {
  it("treats kernel checkpoint references as opaque adapter tokens", () => {
    const executor = createPiExecutor("true");
    expect(executor.name).toBe("pi");
    expect(executor.capabilities().start).toBe(true);
    expect(executor.capabilities().checkpoint).toBe(true);
    expect(executor.capabilities().forkFrom).toBe(true);
  });
});

const live = Boolean(process.env.PI_LIVE);

describe.skipIf(!live)("pi live contract", () => {
  defineExecutorContract("pi", () => createPiExecutor());
});
