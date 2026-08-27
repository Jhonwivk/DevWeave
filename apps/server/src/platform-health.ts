import type { ComponentHealth, PlatformHealth } from "@human-agent/shared-contracts";

export const DEFAULT_WORKER_STALE_AFTER_MS = 15_000;

export type PostgresPing = { ok: true } | { ok: false; error: string };

export type HeartbeatRead =
  { ok: true; lastSeenAt: Date | null } | { ok: false; error: string };

export type HealthProbes = {
  pingPostgres: () => Promise<PostgresPing>;
  readLatestHeartbeat: () => Promise<HeartbeatRead>;
  now: () => Date;
  workerStaleAfterMs: number;
};

export async function getPlatformHealth(probes: HealthProbes): Promise<PlatformHealth> {
  const postgres = await probePostgres(probes);
  const worker = await probeWorker(probes, postgres.status === "available");

  return {
    server: {
      status: "available",
      detail: "Server 正在接受请求。",
    },
    worker,
    postgres,
  };
}

async function probePostgres(probes: HealthProbes): Promise<ComponentHealth> {
  const result = await probes.pingPostgres();
  if (result.ok) {
    return {
      status: "available",
      detail: "PostgreSQL 连接检查成功。",
    };
  }

  return {
    status: "unavailable",
    detail:
      "无法连接 PostgreSQL。请确认已安装并启动 PostgreSQL，已设置 DATABASE_URL，然后运行 `pnpm check-env` 与 `pnpm db:init`。",
  };
}

async function probeWorker(
  probes: HealthProbes,
  postgresAvailable: boolean,
): Promise<ComponentHealth> {
  if (!postgresAvailable) {
    return {
      status: "unavailable",
      detail:
        "无法读取 Worker 心跳，因为 PostgreSQL 不可用。请先修复 PostgreSQL，再启动 Worker。",
    };
  }

  const result = await probes.readLatestHeartbeat();
  if (!result.ok) {
    return {
      status: "unavailable",
      detail:
        "无法读取 Worker 心跳。请运行 `pnpm db:init`，然后执行 `pnpm --filter @human-agent/worker start`。",
    };
  }

  if (
    result.lastSeenAt &&
    probes.now().getTime() - result.lastSeenAt.getTime() <= probes.workerStaleAfterMs
  ) {
    return {
      status: "available",
      detail: "Worker 心跳正常。",
    };
  }

  return {
    status: "unavailable",
    detail:
      "Worker 在过期时间内没有心跳。请在 PostgreSQL 可用后运行 `pnpm --filter @human-agent/worker start`。",
  };
}
