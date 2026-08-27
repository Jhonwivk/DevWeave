import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlatformHealth } from "@human-agent/shared-contracts";
import { HealthPage } from "./HealthPage.tsx";

const mixedAvailability: PlatformHealth = {
  server: { status: "available", detail: "Server 正在接受请求。" },
  worker: {
    status: "unavailable",
    detail: "请运行 pnpm --filter @human-agent/worker start",
  },
  postgres: {
    status: "unavailable",
    detail: "无法连接 PostgreSQL。请设置 DATABASE_URL 并运行 pnpm db:init。",
  },
};

function rowFor(component: string): HTMLElement {
  const header = screen.getByRole("rowheader", { name: component });
  const row = header.closest("tr");
  if (!row) {
    throw new Error(`Missing table row for ${component}`);
  }
  return row;
}

async function findRowFor(component: string): Promise<HTMLElement> {
  await screen.findByRole("rowheader", { name: component });
  return rowFor(component);
}

describe("HealthPage", () => {
  it("lists Server, Worker, and PostgreSQL statuses from the health query", async () => {
    render(<HealthPage fetchHealth={async () => mixedAvailability} />);

    expect(await findRowFor("Server")).toHaveTextContent("可用");
    expect(rowFor("Worker")).toHaveTextContent("不可用");
    expect(rowFor("Worker")).toHaveTextContent(
      "pnpm --filter @human-agent/worker start",
    );
    expect(rowFor("PostgreSQL")).toHaveTextContent("不可用");
    expect(rowFor("PostgreSQL")).toHaveTextContent("DATABASE_URL");
  });

  it("shows server unavailable with a start command when the health query cannot be reached", async () => {
    render(
      <HealthPage
        fetchHealth={async () => {
          throw new TypeError("Failed to fetch");
        }}
      />,
    );

    const serverRow = await findRowFor("Server");
    expect(serverRow).toHaveTextContent("不可用");
    expect(serverRow).toHaveTextContent("pnpm --filter @human-agent/server start");
    expect(rowFor("Worker")).toHaveTextContent("不可用");
    expect(rowFor("PostgreSQL")).toHaveTextContent("不可用");
  });
});
