export type DependencyStatus = "available" | "unavailable";

export type RuntimeObservation = {
  node: { present: true; version: string } | { present: false };
  pnpm: { present: true; version: string } | { present: false };
  git: { present: true; version: string } | { present: false };
  postgres:
    { present: true; version: string } | { present: false; installedBin?: string };
  databaseUrl: string | undefined;
  postgresConnection?:
    { status: "skipped" } | { status: "available" } | { status: "unavailable" };
};

export type RuntimeCheck = {
  name: "Node.js" | "pnpm" | "Git" | "PostgreSQL" | "DATABASE_URL" | "PostgreSQL 连接";
  status: DependencyStatus;
  detail: string;
};

export type RuntimeReport = {
  ok: boolean;
  checks: RuntimeCheck[];
};

const MINIMUM_NODE_MAJOR = 22;

export function diagnoseRuntime(observation: RuntimeObservation): RuntimeReport {
  const checks: RuntimeCheck[] = [
    diagnoseNode(observation.node),
    diagnoseNamedBinary(
      "pnpm",
      observation.pnpm,
      "请安装 pnpm 9：`corepack enable && corepack prepare pnpm@9.15.4 --activate`。",
    ),
    diagnoseNamedBinary(
      "Git",
      observation.git,
      "请安装 Git，并确认 `git` 已在 PATH 中。",
    ),
    diagnosePostgres(observation.postgres),
    diagnoseDatabaseUrl(observation.databaseUrl),
    ...diagnosePostgresConnection(observation.postgresConnection),
  ];

  return {
    ok: checks.every((check) => check.status === "available"),
    checks,
  };
}

export function formatRuntimeReport(report: RuntimeReport): string {
  const lines = report.checks.map((check) => {
    const mark = check.status === "available" ? "ok" : "missing";
    return `[${mark}] ${check.name}: ${check.detail}`;
  });

  lines.push(
    report.ok
      ? "运行环境检查通过。下一步：`pnpm db:init`，然后 `pnpm dev`。"
      : "运行环境检查未通过。请按上面的说明修复后重新运行 `pnpm check-env`。",
  );

  return `${lines.join("\n")}\n`;
}

function diagnoseNode(node: RuntimeObservation["node"]): RuntimeCheck {
  if (!node.present) {
    return {
      name: "Node.js",
      status: "unavailable",
      detail: `未检测到 Node.js。请安装 Node.js ${MINIMUM_NODE_MAJOR} 或更高版本。`,
    };
  }

  const normalized = node.version.replace(/^v/i, "");
  const major = Number.parseInt(normalized.split(".")[0] ?? "0", 10);
  if (Number.isNaN(major) || major < MINIMUM_NODE_MAJOR) {
    return {
      name: "Node.js",
      status: "unavailable",
      detail: `当前 Node.js 为 ${node.version}，需要 ${MINIMUM_NODE_MAJOR} 或更高版本。可使用 nvm：\`nvm install ${MINIMUM_NODE_MAJOR}\`。`,
    };
  }

  return {
    name: "Node.js",
    status: "available",
    detail: `Node.js ${node.version}`,
  };
}

function diagnoseNamedBinary(
  name: "pnpm" | "Git",
  binary: { present: true; version: string } | { present: false },
  missingDetail: string,
): RuntimeCheck {
  if (!binary.present) {
    return { name, status: "unavailable", detail: missingDetail };
  }

  return {
    name,
    status: "available",
    detail: `${name} ${binary.version}`,
  };
}

function diagnosePostgres(postgres: RuntimeObservation["postgres"]): RuntimeCheck {
  if (postgres.present) {
    return {
      name: "PostgreSQL",
      status: "available",
      detail: `PostgreSQL ${postgres.version}`,
    };
  }

  if (postgres.installedBin) {
    return {
      name: "PostgreSQL",
      status: "unavailable",
      detail:
        'PostgreSQL 已安装但不在 PATH。请执行 `export PATH="$(brew --prefix postgresql@16)/bin:$PATH"` 后重新运行 `pnpm check-env`。',
    };
  }

  return {
    name: "PostgreSQL",
    status: "unavailable",
    detail:
      "未检测到 PostgreSQL 客户端。macOS 可用 Homebrew 安装：`brew install postgresql@16 && brew services start postgresql@16`，然后将 `$(brew --prefix postgresql@16)/bin` 加入 PATH。",
  };
}

function diagnosePostgresConnection(
  postgresConnection: RuntimeObservation["postgresConnection"],
): RuntimeCheck[] {
  if (!postgresConnection || postgresConnection.status === "skipped") {
    return [];
  }

  if (postgresConnection.status === "available") {
    return [
      {
        name: "PostgreSQL 连接",
        status: "available",
        detail: "PostgreSQL 接受了连通性检查。",
      },
    ];
  }

  return [
    {
      name: "PostgreSQL 连接",
      status: "unavailable",
      detail:
        "无法连接 DATABASE_URL 指向的数据库。请确认 PostgreSQL 已启动，然后运行 `pnpm db:init`。",
    },
  ];
}

function diagnoseDatabaseUrl(databaseUrl: string | undefined): RuntimeCheck {
  if (!databaseUrl) {
    return {
      name: "DATABASE_URL",
      status: "unavailable",
      detail:
        "未设置 DATABASE_URL。请复制 `.env.example` 为 `.env`，确认连接串后运行 `pnpm db:init`。",
    };
  }

  return {
    name: "DATABASE_URL",
    status: "available",
    detail: "DATABASE_URL 已设置",
  };
}
