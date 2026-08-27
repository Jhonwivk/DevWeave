import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import type { PlatformClient } from "./api.ts";

function memoryClient(): PlatformClient {
  const projectId = "project_test";
  return {
    command: async () => ({ ok: true, aggregateId: projectId, version: 1, body: { name: "OAuth" } }),
    listProjects: async () => [{ id: projectId, name: "OAuth", version: 1 }],
    getProject: async () => ({
      project: { name: "OAuth", version: 1 },
      recent: [{ type: "ProjectCreated", project_sequence: 1 }],
      health: {
        server: { status: "available" },
        worker: { status: "available" },
        postgres: { status: "available" },
      },
    }),
    getWork: async () => ({
      workItems: [{ id: "wi1", goal: "Backend", status: "completed" }],
      specifications: [{ id: "spec1", status: "effective" }],
      coverage: [{ id: "AC-TOKEN", status: "verified" }],
    }),
    getTeam: async () => ({
      humans: [
        { human_id: "h1", role: "owner", display_name: "Owner" },
        { human_id: "h2", role: "member", display_name: "Member" },
      ],
      agents: [
        { id: "a1", source_type: "digital_employee", display_name: "DE", trust_status: "qualified" },
        { id: "a2", source_type: "private_agent", display_name: "PA", trust_status: "qualified" },
        { id: "a3", source_type: "system_generated", display_name: "SGA", trust_status: "trial" },
      ],
    }),
    getInbox: async () => ({
      items: [{ id: "in1", title: "Verification 失败", reason: "Workspace 保留" }],
    }),
    getExecutions: async () => ({
      executions: [
        { id: "ex1", status: "failed", branch_kind: "original", kernel: "mock" },
        { id: "ex2", status: "completed", branch_kind: "exact", kernel: "mock" },
      ],
    }),
    getArtifacts: async () => ({
      artifacts: [{ id: "art1", title: "OAuth contract v2", status: "published" }],
    }),
    getMerge: async () => ({
      candidates: [{ id: "mc1", status: "merged" }],
      conflicts: [{ id: "cf1", kind: "semantic" }],
    }),
    getTimeline: async () => ({ events: [{ type: "Merged", project_sequence: 9 }] }),
  };
}

describe("Project UI", () => {
  it("creates a project and shows dashboard, work, team, execution, inbox and merge views", async () => {
    const user = userEvent.setup();
    render(<App client={memoryClient()} />);

    await user.click(screen.getByRole("button", { name: "创建 Project" }));
    expect(await screen.findByText(/Project Dashboard/)).toBeInTheDocument();
    expect(screen.getByText("ProjectCreated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Work" }));
    expect(await screen.findByText("Coverage Matrix")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(await screen.findByText(/digital_employee/)).toBeInTheDocument();
    expect(screen.getByText(/private_agent/)).toBeInTheDocument();
    expect(screen.getByText(/system_generated/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Execution" }));
    expect(await screen.findByText(/failed/)).toBeInTheDocument();
    expect(screen.getByText(/exact/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inbox" }));
    expect(await screen.findByText(/Verification 失败/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Merge" }));
    expect(await screen.findByText("semantic")).toBeInTheDocument();
    expect(screen.getByText("merged")).toBeInTheDocument();
  });
});
