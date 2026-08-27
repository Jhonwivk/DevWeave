export type ParsedSpec = {
  requirements: { id: string; title: string }[];
  acceptanceCriteria: { id: string; requirementId: string; text: string }[];
};

export function parseSpecification(body: string): ParsedSpec {
  const requirements: ParsedSpec["requirements"] = [];
  const acceptanceCriteria: ParsedSpec["acceptanceCriteria"] = [];
  let currentReq: string | undefined;
  const seen = new Set<string>();

  for (const line of body.split("\n")) {
    const req = /^##\s+(REQ-[A-Z0-9-]+)\s+(.+)$/.exec(line.trim());
    if (req) {
      const id = req[1] ?? "";
      if (seen.has(id)) {
        throw new Error(`Duplicate Requirement ID ${id}`);
      }
      seen.add(id);
      currentReq = id;
      requirements.push({ id, title: req[2] ?? "" });
      continue;
    }
    const ac = /^###\s+(AC-[A-Z0-9-]+)\s+(.+)$/.exec(line.trim());
    if (ac) {
      const id = ac[1] ?? "";
      if (seen.has(id)) {
        throw new Error(`Duplicate Acceptance Criterion ID ${id}`);
      }
      if (!currentReq) {
        throw new Error(`Acceptance Criterion ${id} is missing a Requirement parent`);
      }
      seen.add(id);
      acceptanceCriteria.push({
        id,
        requirementId: currentReq,
        text: ac[2] ?? "",
      });
    }
  }

  if (requirements.length === 0 || acceptanceCriteria.length === 0) {
    throw new Error("Specification must include Requirement and Acceptance Criterion IDs");
  }
  return { requirements, acceptanceCriteria };
}
