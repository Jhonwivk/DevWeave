import { describe, expect, it } from "vitest";
import { DomainError } from "./ids.ts";
import { assertTransition, canTransition } from "./lifecycle.ts";

describe("lifecycle machines", () => {
  it("allows Specification draft to become effective through in_review", () => {
    assertTransition("specification", "draft", "in_review");
    assertTransition("specification", "in_review", "effective");
    expect(canTransition("specification", "effective", "draft")).toBe(false);
  });

  it("rejects rewriting an effective Specification in place", () => {
    expect(() => assertTransition("specification", "effective", "draft")).toThrow(
      DomainError,
    );
  });

  it("keeps Work Item out of failed when an Execution fails", () => {
    expect(canTransition("workItem", "in_progress", "failed")).toBe(false);
    assertTransition("execution", "running", "failed");
  });

  it("allows Execution unknown after a reconnect failure without implying completion", () => {
    assertTransition("execution", "running", "unknown");
    expect(canTransition("execution", "unknown", "completed")).toBe(false);
  });
});
