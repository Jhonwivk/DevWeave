import {
  pingPostgres,
  readLatestWorkerHeartbeat,
  type DatabasePool,
} from "@human-agent/persistence";
import { DEFAULT_WORKER_STALE_AFTER_MS, type HealthProbes } from "./platform-health.ts";

export function createLiveHealthProbes(
  pool: DatabasePool | undefined,
  options: { now?: () => Date; workerStaleAfterMs?: number } = {},
): HealthProbes {
  return {
    pingPostgres: async () => {
      if (!pool) {
        return { ok: false, error: "DATABASE_URL is not set" };
      }
      return pingPostgres(pool);
    },
    readLatestHeartbeat: async () => {
      if (!pool) {
        return { ok: false, error: "DATABASE_URL is not set" };
      }
      try {
        const latest = await readLatestWorkerHeartbeat(pool);
        return { ok: true, lastSeenAt: latest?.lastSeenAt ?? null };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "heartbeat read failed",
        };
      }
    },
    now: options.now ?? (() => new Date()),
    workerStaleAfterMs: options.workerStaleAfterMs ?? DEFAULT_WORKER_STALE_AFTER_MS,
  };
}
