import { describe, expect, it } from "vitest";
import { parseSpecification } from "./spec-parse.ts";

describe("parseSpecification", () => {
  it("indexes stable requirement and acceptance criterion IDs", () => {
    const parsed = parseSpecification(`## REQ-AUTH Login
### AC-TOKEN Token endpoint returns JSON
`);
    expect(parsed.requirements[0]?.id).toBe("REQ-AUTH");
    expect(parsed.acceptanceCriteria[0]?.id).toBe("AC-TOKEN");
  });

  it("rejects duplicate IDs", () => {
    expect(() =>
      parseSpecification(`## REQ-A A
### AC-1 one
## REQ-A B
### AC-2 two
`),
    ).toThrow(/Duplicate/);
  });
});
