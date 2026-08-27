export type CommandResult = {
  ok: boolean;
  aggregateId?: string;
  version?: number;
  body?: Record<string, unknown>;
  error?: { code: string; message: string };
};

export type PlatformClient = {
  command: (envelope: Record<string, unknown>) => Promise<CommandResult>;
  listProjects: () => Promise<{ id: string; name: string; version: number }[]>;
  getProject: (id: string) => Promise<{
    project: Record<string, unknown>;
    recent: { type: string; project_sequence: number }[];
    health: { server: { status: string }; worker: { status: string }; postgres: { status: string } };
  }>;
  getWork: (id: string) => Promise<{
    workItems: Record<string, unknown>[];
    specifications: Record<string, unknown>[];
    coverage: { id: string; status: string }[];
  }>;
  getTeam: (id: string) => Promise<{
    humans: Record<string, unknown>[];
    agents: Record<string, unknown>[];
  }>;
  getInbox: (id: string) => Promise<{ items: Record<string, unknown>[] }>;
  getExecutions: (id: string) => Promise<{ executions: Record<string, unknown>[] }>;
  getArtifacts: (id: string) => Promise<{ artifacts: Record<string, unknown>[] }>;
  getMerge: (id: string) => Promise<{
    candidates: Record<string, unknown>[];
    conflicts: Record<string, unknown>[];
  }>;
  getTimeline: (id: string) => Promise<{ events: Record<string, unknown>[] }>;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  return (await response.json()) as T;
}

export const liveClient: PlatformClient = {
  command: (envelope) =>
    json<CommandResult>("/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
    }),
  listProjects: async () => {
    const body = await json<{ projects: { id: string; name: string; version: number }[] }>("/projects");
    return body.projects;
  },
  getProject: (id) => json(`/projects/${id}`),
  getWork: (id) => json(`/projects/${id}/work`),
  getTeam: (id) => json(`/projects/${id}/team`),
  getInbox: (id) => json(`/projects/${id}/inbox`),
  getExecutions: (id) => json(`/projects/${id}/executions`),
  getArtifacts: (id) => json(`/projects/${id}/artifacts`),
  getMerge: (id) => json(`/projects/${id}/merge`),
  getTimeline: (id) => json(`/projects/${id}/timeline`),
};

export function envelope(
  type: string,
  payload: Record<string, unknown>,
  actor = { kind: "human", id: "human-owner", displayName: "Owner" },
): Record<string, unknown> {
  return {
    type,
    payload,
    actor,
    idempotencyKey: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
    expectedVersion: type === "CreateProject" ? 0 : undefined,
  };
}
