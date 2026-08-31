export type CommandResult = {
  ok: boolean;
  aggregateId?: string;
  version?: number;
  body?: Record<string, unknown>;
  error?: { code: string; message: string };
};

export type OAuthDemoResult = {
  projectId: string;
  name: string;
  stages: { id: string; label: string; status: "completed" }[];
  summary: {
    humans: number;
    agents: number;
    specifications: number;
    workItems: number;
    completedWorkItems: number;
    executions: number;
    failedExecutions: number;
    artifacts: number;
    conflicts: number;
    mergedCandidates: number;
    openInboxItems: number;
    domainEvents: number;
  };
};

export type PlatformClient = {
  command: (envelope: Record<string, unknown>) => Promise<CommandResult>;
  runOAuthDemo: () => Promise<OAuthDemoResult>;
  listProjects: () => Promise<{ id: string; name: string; version: number }[]>;
  getProject: (id: string) => Promise<{
    project: Record<string, unknown>;
    recent: Record<string, unknown>[];
    health: {
      server: { status: string };
      worker: { status: string };
      postgres: { status: string };
    };
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
  getArtifacts: (id: string) => Promise<{
    artifacts: Record<string, unknown>[];
    decisions: Record<string, unknown>[];
  }>;
  getMerge: (id: string) => Promise<{
    candidates: Record<string, unknown>[];
    conflicts: Record<string, unknown>[];
  }>;
  getTimeline: (id: string) => Promise<{ events: Record<string, unknown>[] }>;
};

const SERVER_UNREACHABLE =
  "无法连接 Server。请运行 `pnpm dev`，并确认 Web 开发代理指向 Server 端口（默认 3001）。";

const COMMAND_API_HINT =
  "Command API 不可用。请确认 PostgreSQL 已初始化（`pnpm db:init`）后重启 `pnpm dev`。";

async function readJson(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error(SERVER_UNREACHABLE);
  }
  const text = await response.text();
  if (text.length === 0) {
    throw new Error(response.ok ? "Server 返回了空响应。" : COMMAND_API_HINT);
  }
  try {
    return { status: response.status, body: JSON.parse(text) as unknown };
  } catch {
    throw new Error(COMMAND_API_HINT);
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (typeof error?.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }
  return fallback;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body } = await readJson(path, init);
  if (status >= 400) {
    throw new Error(errorMessage(body, COMMAND_API_HINT));
  }
  return body as T;
}

export const liveClient: PlatformClient = {
  command: async (envelope) => {
    const { body } = await readJson("/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (body && typeof body === "object" && "ok" in body) {
      return body as CommandResult;
    }
    throw new Error(errorMessage(body, COMMAND_API_HINT));
  },
  listProjects: async () => {
    const payload = await json<{
      projects: { id: string; name: string; version: number }[];
    }>("/projects");
    return payload.projects ?? [];
  },
  runOAuthDemo: () =>
    json<OAuthDemoResult>("/demos/oauth", {
      method: "POST",
      headers: { "content-type": "application/json" },
    }),
  getProject: (id) => json(`/projects/${id}`),
  getWork: (id) => json(`/projects/${id}/work`),
  getTeam: (id) => json(`/projects/${id}/team`),
  getInbox: (id) => json(`/projects/${id}/inbox`),
  getExecutions: (id) => json(`/projects/${id}/executions`),
  getArtifacts: (id) => json(`/projects/${id}/artifacts`),
  getMerge: (id) => json(`/projects/${id}/merge`),
  getTimeline: (id) => json(`/projects/${id}/timeline?layer=all`),
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
