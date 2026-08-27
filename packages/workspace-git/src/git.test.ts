import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  checkpointWorkspace,
  createFixtureRepo,
  createWorktree,
  inspectRepository,
  rebaseOnto,
  restoreWorkspace,
  workspaceStatus,
} from "./git.ts";

describe("workspace git", () => {
  const repos: string[] = [];

  afterAll(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(repos.map((path) => rm(path, { recursive: true, force: true })));
  });

  it("isolates concurrent worktrees without changing the original working tree", async () => {
    const repo = await createFixtureRepo({ "README.md": "base\n" });
    repos.push(repo);
    await writeFile(resolve(repo, "dirty.txt"), "uncommitted\n", "utf8");
    const inspected = await inspectRepository(repo);
    expect(inspected.branches).toContain("main");

    const first = await createWorktree({ repoPath: repo, executionId: "ex-a", baseCommit: inspected.head });
    const second = await createWorktree({ repoPath: repo, executionId: "ex-b", baseCommit: inspected.head });
    await writeFile(resolve(first.path, "README.md"), "agent-a\n", "utf8");
    await writeFile(resolve(second.path, "README.md"), "agent-b\n", "utf8");

    const original = await workspaceStatus(repo);
    expect(original.dirty).toBe(true);
    expect(await workspaceStatus(first.path)).toMatchObject({ dirty: true });
    expect((await workspaceStatus(second.path)).diff).toContain("agent-b");
    expect((await workspaceStatus(first.path)).diff).toContain("agent-a");
  });

  it("creates a workspace checkpoint that restore can reopen", async () => {
    const repo = await createFixtureRepo({ "file.txt": "one\n" });
    repos.push(repo);
    const tree = await createWorktree({
      repoPath: repo,
      executionId: "ex-cp",
      baseCommit: (await inspectRepository(repo)).head,
    });
    await writeFile(resolve(tree.path, "file.txt"), "two\n", "utf8");
    const commit = await checkpointWorkspace(tree.path);
    const restored = await restoreWorkspace(repo, "ex-restore", commit);
    expect((await workspaceStatus(restored)).commit).toBe(commit);
  });

  it("records a rebase text conflict without modifying the protected branch", async () => {
    const repo = await createFixtureRepo({ "README.md": "base\n" });
    repos.push(repo);
    const head = (await inspectRepository(repo)).head;
    const left = await createWorktree({ repoPath: repo, executionId: "left", baseCommit: head });
    const right = await createWorktree({ repoPath: repo, executionId: "right", baseCommit: head });
    await writeFile(resolve(left.path, "README.md"), "left\n", "utf8");
    await writeFile(resolve(right.path, "README.md"), "right\n", "utf8");
    const leftCommit = await checkpointWorkspace(left.path);
    await checkpointWorkspace(right.path);
    const rebase = await rebaseOnto(right.path, leftCommit);
    expect(rebase.ok).toBe(false);
    if (rebase.ok === false) {
      expect(rebase.kind).toBe("text");
    }
    expect((await inspectRepository(repo)).head).toBe(head);
  });
});
