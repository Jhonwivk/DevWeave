import type { ComponentHealth, PlatformHealth } from "@human-agent/shared-contracts";
import { useEffect, useState } from "react";

const SERVER_UNREACHABLE_DETAIL =
  "无法连接 Server。请运行 `pnpm --filter @human-agent/server start`，并确认 Web 开发代理指向 Server 端口（默认 3001）。";

const WORKER_UNKNOWN_DETAIL = "Server 不可用，无法查询 Worker 状态。";

const POSTGRES_UNKNOWN_DETAIL = "Server 不可用，无法查询 PostgreSQL 状态。";

async function defaultFetchHealth(): Promise<PlatformHealth> {
  const response = await fetch("/health");
  if (!response.ok) {
    throw new Error(`Health query failed with HTTP ${String(response.status)}`);
  }
  return (await response.json()) as PlatformHealth;
}

export function HealthPage({
  fetchHealth = defaultFetchHealth,
}: {
  fetchHealth?: () => Promise<PlatformHealth>;
}) {
  const health = useHealth(fetchHealth);

  return (
    <main>
      <h1>平台运行健康</h1>
      <p>分别检查 Server、Worker 和 PostgreSQL 是否可用于本地原生运行。</p>
      {health ? <HealthTable health={health} /> : <p>正在检查组件状态…</p>}
    </main>
  );
}

function useHealth(fetchHealth: () => Promise<PlatformHealth>): PlatformHealth | null {
  const [health, setHealth] = useState<PlatformHealth | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then((result) => {
        if (!cancelled) {
          setHealth(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            server: { status: "unavailable", detail: SERVER_UNREACHABLE_DETAIL },
            worker: { status: "unavailable", detail: WORKER_UNKNOWN_DETAIL },
            postgres: { status: "unavailable", detail: POSTGRES_UNKNOWN_DETAIL },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchHealth]);

  return health;
}

function HealthTable({ health }: { health: PlatformHealth }) {
  return (
    <table>
      <caption>组件可用状态</caption>
      <thead>
        <tr>
          <th scope="col">组件</th>
          <th scope="col">状态</th>
          <th scope="col">说明</th>
        </tr>
      </thead>
      <tbody>
        <HealthRow name="Server" health={health.server} />
        <HealthRow name="Worker" health={health.worker} />
        <HealthRow name="PostgreSQL" health={health.postgres} />
      </tbody>
    </table>
  );
}

function HealthRow({ name, health }: { name: string; health: ComponentHealth }) {
  return (
    <tr>
      <th scope="row">{name}</th>
      <td>{health.status === "available" ? "可用" : "不可用"}</td>
      <td>{health.detail}</td>
    </tr>
  );
}
