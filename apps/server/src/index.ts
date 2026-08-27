import { serve } from "@hono/node-server";
import { createPlatform } from "@human-agent/application";
import { createMockExecutor } from "@human-agent/mock-adapter";
import { createPool, loadWorkspaceEnv } from "@human-agent/persistence";
import { createPiExecutor } from "@human-agent/pi-adapter";
import { createApp } from "./app.ts";
import { createLiveHealthProbes } from "./live-probes.ts";
import { DEFAULT_WORKER_STALE_AFTER_MS } from "./platform-health.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.DATABASE_URL;
const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.SERVER_PORT ?? "3001", 10);
const workerStaleAfterMs = Number.parseInt(
  process.env.WORKER_STALE_AFTER_MS ?? String(DEFAULT_WORKER_STALE_AFTER_MS),
  10,
);

const pool = databaseUrl ? createPool(databaseUrl) : undefined;
const platform = pool
  ? createPlatform(pool, { executors: { mock: createMockExecutor(), pi: createPiExecutor() } })
  : undefined;
const app = createApp(createLiveHealthProbes(pool, { workerStaleAfterMs }), platform);

const server = serve({ fetch: app.fetch, hostname: host, port }, () => {
  process.stdout.write(`Server listening on http://${host}:${String(port)}\n`);
});

async function shutdown(): Promise<void> {
  server.close();
  await pool?.end();
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
