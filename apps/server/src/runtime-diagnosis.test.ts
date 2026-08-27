import { describe, expect, it } from "vitest";
import { diagnoseRuntime, formatRuntimeReport } from "./runtime-diagnosis.ts";

describe("runtime diagnosis", () => {
  it("reports PostgreSQL off PATH with a PATH export action", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "24.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: {
        present: false,
        installedBin: "/opt/homebrew/opt/postgresql@16/bin/psql",
      },
      databaseUrl: "postgres://127.0.0.1:5432/human_agent",
    });

    expect(report.ok).toBe(false);
    const postgres = report.checks.find((check) => check.name === "PostgreSQL");
    expect(postgres?.status).toBe("unavailable");
    expect(postgres?.detail).toContain("PATH");
    expect(postgres?.detail).toContain("brew --prefix postgresql@16");
  });

  it("reports missing PostgreSQL with a Homebrew install action", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "24.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: false },
      databaseUrl: undefined,
    });

    expect(report.ok).toBe(false);
    const postgres = report.checks.find((check) => check.name === "PostgreSQL");
    expect(postgres?.status).toBe("unavailable");
    expect(postgres?.detail).toContain("brew install postgresql@16");
    expect(postgres?.detail).toContain("brew services start postgresql@16");
  });

  it("reports a missing DATABASE_URL with db:init as the next action", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "22.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: true, version: "16.15" },
      databaseUrl: undefined,
    });

    expect(report.ok).toBe(false);
    const databaseUrl = report.checks.find((check) => check.name === "DATABASE_URL");
    expect(databaseUrl?.status).toBe("unavailable");
    expect(databaseUrl?.detail).toContain(".env.example");
    expect(databaseUrl?.detail).toContain("pnpm db:init");
  });

  it("reports an unsupported Node version with an install action", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "18.20.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: true, version: "16.15" },
      databaseUrl: "postgres://127.0.0.1:5432/human_agent",
    });

    expect(report.ok).toBe(false);
    const node = report.checks.find((check) => check.name === "Node.js");
    expect(node?.status).toBe("unavailable");
    expect(node?.detail).toContain("22");
  });

  it("accepts a Node.js version reported with a v prefix", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "v24.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: true, version: "16.15" },
      databaseUrl: "postgres://127.0.0.1:5432/human_agent",
    });

    expect(report.ok).toBe(true);
    const node = report.checks.find((check) => check.name === "Node.js");
    expect(node?.status).toBe("available");
  });

  it("formats a passing report that names every required dependency", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "24.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: true, version: "16.15" },
      databaseUrl: "postgres://127.0.0.1:5432/human_agent",
    });

    expect(report.ok).toBe(true);
    const text = formatRuntimeReport(report);
    expect(text).toContain("Node.js");
    expect(text).toContain("pnpm");
    expect(text).toContain("Git");
    expect(text).toContain("PostgreSQL");
    expect(text).toContain("DATABASE_URL");
  });

  it("reports an unreachable database with db:init as the next action", () => {
    const report = diagnoseRuntime({
      node: { present: true, version: "24.14.0" },
      pnpm: { present: true, version: "9.15.4" },
      git: { present: true, version: "2.50.1" },
      postgres: { present: true, version: "16.15" },
      databaseUrl: "postgres://127.0.0.1:1/human_agent",
      postgresConnection: { status: "unavailable" },
    });

    expect(report.ok).toBe(false);
    const connection = report.checks.find((check) => check.name === "PostgreSQL 连接");
    expect(connection?.status).toBe("unavailable");
    expect(connection?.detail).toContain("pnpm db:init");
  });
});
