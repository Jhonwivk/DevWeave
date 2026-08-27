import { createPlatform } from "@human-agent/application";
import { createMockExecutor } from "@human-agent/mock-adapter";
import {
  createPool,
  loadWorkspaceEnv,
  recordWorkerHeartbeat,
} from "@human-agent/persistence";
import { createPiExecutor } from "@human-agent/pi-adapter";

loadWorkspaceEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write(
    "未设置 DATABASE_URL。请复制 `.env.example` 为 `.env`，运行 `pnpm db:init` 后再启动 Worker。\n",
  );
  process.exit(1);
}

const workerId = process.env.WORKER_ID ?? "local-worker";
const intervalMs = Number.parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? "5000", 10);
const pool = createPool(databaseUrl);
const platform = createPlatform(pool, {
  executors: { mock: createMockExecutor(), pi: createPiExecutor() },
});

async function beat(): Promise<void> {
  await recordWorkerHeartbeat(pool, workerId, new Date());
  await platform.processJob(workerId);
}

await beat();
process.stdout.write(`Worker ${workerId} heartbeat and job loop started.\n`);

const timer = setInterval(() => {
  void beat().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "heartbeat failed";
    process.stderr.write(`Worker loop failed: ${message}\n`);
  });
}, intervalMs);

async function shutdown(): Promise<void> {
  clearInterval(timer);
  await pool.end();
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
