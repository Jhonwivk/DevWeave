import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { createPool, loadWorkspaceEnv, pingPostgres } from "@human-agent/persistence";
import {
  diagnoseRuntime,
  formatRuntimeReport,
  type RuntimeObservation,
} from "./runtime-diagnosis.ts";

const execFileAsync = promisify(execFile);

const POSTGRES_CANDIDATE_BINS = [
  "/opt/homebrew/opt/postgresql@16/bin/psql",
  "/usr/local/opt/postgresql@16/bin/psql",
];

async function probeVersion(
  command: string,
  args: string[],
): Promise<{ present: true; version: string } | { present: false }> {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout: 5_000 });
    const version = stdout.trim().split("\n")[0]?.trim() ?? "";
    return version.length > 0 ? { present: true, version } : { present: false };
  } catch {
    return { present: false };
  }
}

async function probePostgres(): Promise<RuntimeObservation["postgres"]> {
  const onPath = await probeVersion("psql", ["--version"]);
  if (onPath.present) {
    return {
      present: true,
      version: onPath.version.replace(/^psql \(PostgreSQL\) /i, ""),
    };
  }

  const installedBin = POSTGRES_CANDIDATE_BINS.find((bin) => existsSync(bin));
  if (installedBin) {
    return { present: false, installedBin };
  }

  return { present: false };
}

export async function observeRuntime(): Promise<RuntimeObservation> {
  loadWorkspaceEnv();

  const [node, pnpm, gitRaw, postgres] = await Promise.all([
    probeVersion("node", ["-v"]),
    probeVersion("pnpm", ["-v"]),
    probeVersion("git", ["--version"]),
    probePostgres(),
  ]);

  const git = gitRaw.present
    ? {
        present: true as const,
        version: gitRaw.version.replace(/^git version /i, ""),
      }
    : gitRaw;

  const databaseUrl = process.env.DATABASE_URL;
  const postgresConnection = await probePostgresConnection(databaseUrl);

  return {
    node,
    pnpm,
    git,
    postgres,
    databaseUrl,
    postgresConnection,
  };
}

async function probePostgresConnection(
  databaseUrl: string | undefined,
): Promise<NonNullable<RuntimeObservation["postgresConnection"]>> {
  if (!databaseUrl) {
    return { status: "skipped" };
  }

  const pool = createPool(databaseUrl);
  try {
    const ping = await pingPostgres(pool);
    return ping.ok ? { status: "available" } : { status: "unavailable" };
  } finally {
    await pool.end();
  }
}

export async function runCheckEnv(): Promise<{ ok: boolean; text: string }> {
  const report = diagnoseRuntime(await observeRuntime());
  return { ok: report.ok, text: formatRuntimeReport(report) };
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return resolve(entry) === fileURLToPath(import.meta.url);
}

if (isCliEntry()) {
  const { ok, text } = await runCheckEnv();
  process.stdout.write(text);
  process.exitCode = ok ? 0 : 1;
}
