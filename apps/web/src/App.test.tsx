import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import type { PlatformClient } from "./api.ts";

function memoryClient(): PlatformClient {
  const projectId = "project_test";
  return {
    command: async () => ({
      ok: true,
      aggregateId: projectId,
      version: 1,
      body: { name: "OAuth" },
    }),
    runOAuthDemo: async () => ({
      projectId,
      name: "OAuth Collaboration Demo",
      stages: [{ id: "project", label: "Project", status: "completed" }],
      summary: {
        humans: 2,
        agents: 3,
        specifications: 1,
        workItems: 3,
        completedWorkItems: 3,
        executions: 4,
        failedExecutions: 1,
        artifacts: 2,
        conflicts: 1,
        mergedCandidates: 3,
        openInboxItems: 0,
        domainEvents: 20,
      },
    }),
    listProjects: async () => [{ id: projectId, name: "OAuth", version: 1 }],
    getProject: async () => ({
      project: { name: "OAuth", version: 1 },
      recent: [
        {
          event_id: "event1",
          type: "ProjectCreated",
          project_sequence: 1,
          actor: { id: "h1", kind: "human" },
          payload: { name: "OAuth" },
        },
      ],
      health: {
        server: { status: "available" },
        worker: { status: "available" },
        postgres: { status: "available" },
      },
    }),
    getWork: async () => ({
      workItems: [
        {
          id: "wi1",
          goal: "Backend",
          status: "completed",
          acceptance_criteria: ["AC-TOKEN"],
          context: { baseline: "abc123" },
        },
      ],
      specifications: [
        {
          id: "spec1",
          status: "effective",
          body: "# OAuth\n### AC-TOKEN Token works",
        },
      ],
      coverage: [{ id: "AC-TOKEN", status: "verified" }],
    }),
    getTeam: async () => ({
      humans: [
        { human_id: "h1", role: "owner", display_name: "Owner" },
        { human_id: "h2", role: "member", display_name: "Member" },
      ],
      agents: [
        {
          id: "a1",
          source_type: "digital_employee",
          display_name: "DE",
          trust_status: "qualified",
        },
        {
          id: "a2",
          source_type: "private_agent",
          display_name: "PA",
          trust_status: "qualified",
        },
        {
          id: "a3",
          source_type: "system_generated",
          display_name: "SGA",
          trust_status: "trial",
        },
      ],
    }),
    getInbox: async () => ({
      items: [{ id: "in1", title: "Verification 失败", reason: "Workspace 保留" }],
    }),
    getExecutions: async () => ({
      executions: [
        {
          id: "ex1",
          status: "failed",
          branch_kind: "original",
          kernel: "mock",
          input_snapshot: { prompt: "Implement OAuth" },
          last_output: { message: "Mock execution failed" },
        },
        { id: "ex2", status: "completed", branch_kind: "exact", kernel: "mock" },
      ],
    }),
    getArtifacts: async () => ({
      artifacts: [
        {
          id: "art1",
          title: "OAuth contract v2",
          status: "published",
          version_number: 2,
          body: { tokenType: "Bearer" },
        },
      ],
      decisions: [
        {
          id: "dec1",
          question: "Use local provider?",
          status: "decided",
          result: "Local provider",
          rationale: "No production credentials",
        },
      ],
    }),
    getMerge: async () => ({
      candidates: [{ id: "mc1", status: "merged" }],
      conflicts: [{ id: "cf1", kind: "semantic" }],
    }),
    getTimeline: async () => ({
      events: [
        {
          event_id: "event9",
          type: "Merged",
          aggregate_type: "MergeCandidate",
          project_sequence: 9,
          payload: { sharedCommit: "abc123" },
        },
      ],
    }),
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

  it("shows an actionable error when create Project fails", async () => {
    const user = userEvent.setup();
    const client = memoryClient();
    client.command = async () => {
      throw new Error(
        "Command API 不可用。请确认 PostgreSQL 已初始化（`pnpm db:init`）后重启 `pnpm dev`。",
      );
    };
    render(<App client={client} />);
    await user.click(screen.getByRole("button", { name: "创建 Project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Command API 不可用");
  });

  it("runs the OAuth demo from the launcher and opens its completed dashboard", async () => {
    const user = userEvent.setup();
    render(<App client={memoryClient()} />);

    await user.click(screen.getByRole("button", { name: "一键从 0 到 1 跑通" }));

    expect(await screen.findByText("OAuth Demo 已完整跑通")).toBeInTheDocument();
    expect(screen.getByText(/3 个 Work Item/)).toBeInTheDocument();
    expect(screen.getByText(/Project Dashboard/)).toBeInTheDocument();
  });

  it("opens complete record details from project views", async () => {
    const user = userEvent.setup();
    render(<App client={memoryClient()} />);
    await user.click(screen.getByRole("button", { name: "创建 Project" }));

    await user.click(
      await screen.findByRole("button", { name: "查看事件 ProjectCreated" }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("ProjectCreated");
    expect(screen.getByRole("dialog")).toHaveTextContent('"name": "OAuth"');
    await user.click(screen.getByRole("button", { name: "关闭详情" }));

    await user.click(screen.getByRole("button", { name: "Work" }));
    await user.click(
      await screen.findByRole("button", { name: "查看 Work Item Backend" }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("AC-TOKEN");
    expect(screen.getByRole("dialog")).toHaveTextContent("abc123");
    await user.click(screen.getByRole("button", { name: "关闭详情" }));

    await user.click(screen.getByRole("button", { name: "Artifacts" }));
    await user.click(
      await screen.findByRole("button", {
        name: "查看 Artifact OAuth contract v2",
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Bearer");
    await user.click(screen.getByRole("button", { name: "关闭详情" }));
    await user.click(
      screen.getByRole("button", {
        name: "查看 Decision Use local provider?",
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("No production credentials");
  });
});
