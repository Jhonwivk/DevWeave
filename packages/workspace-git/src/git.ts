import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export type GitIdentity = { repoPath: string; commit: string; branch: string };

export async function inspectRepository(repoPath: string): Promise<{
  branches: string[];
  head: string;
}> {
  await git(repoPath, ["rev-parse", "--is-inside-work-tree"]);
  const { stdout: branchOut } = await git(repoPath, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  const { stdout: head } = await git(repoPath, ["rev-parse", "HEAD"]);
  return {
    branches: branchOut.trim().split("\n").filter(Boolean),
    head: head.trim(),
  };
}

export async function commitAt(repoPath: string, branch: string): Promise<string> {
  const { stdout } = await git(repoPath, ["rev-parse", branch]);
  return stdout.trim();
}

export async function createWorktree(input: {
  repoPath: string;
  executionId: string;
  baseCommit: string;
}): Promise<{ path: string; branch: string }> {
  const branch = `ha/execution/${input.executionId}`;
  const path = resolve(input.repoPath, "..", `.ha-worktrees`, input.executionId);
  await mkdir(dirname(path), { recursive: true });
  await git(input.repoPath, ["worktree", "add", "-B", branch, path, input.baseCommit]);
  return { path, branch };
}

export async function workspaceStatus(workspacePath: string): Promise<{
  dirty: boolean;
  diff: string;
  commit: string;
}> {
  const { stdout: status } = await git(workspacePath, ["status", "--porcelain"]);
  const { stdout: diff } = await git(workspacePath, ["diff", "HEAD"]);
  const { stdout: commit } = await git(workspacePath, ["rev-parse", "HEAD"]);
  return { dirty: status.trim().length > 0, diff, commit: commit.trim() };
}

export async function checkpointWorkspace(workspacePath: string): Promise<string> {
  await git(workspacePath, ["add", "-A"]);
  const { stdout: status } = await git(workspacePath, ["status", "--porcelain"]);
  if (status.trim().length > 0) {
    await git(workspacePath, ["-c", "user.email=platform@human-agent.local", "-c", "user.name=Platform", "commit", "-m", "checkpoint"]);
  }
  const { stdout } = await git(workspacePath, ["rev-parse", "HEAD"]);
  return stdout.trim();
}

export async function restoreWorkspace(repoPath: string, executionId: string, commit: string): Promise<string> {
  const { path } = await createWorktree({ repoPath, executionId, baseCommit: commit });
  return path;
}

export async function rebaseOnto(workspacePath: string, baseline: string): Promise<{ ok: true } | { ok: false; kind: "text" }> {
  try {
    await git(workspacePath, ["rebase", baseline]);
    return { ok: true };
  } catch {
    await git(workspacePath, ["rebase", "--abort"]).catch(() => undefined);
    return { ok: false, kind: "text" };
  }
}

export async function mergeToProtected(
  repoPath: string,
  sourceBranch: string,
  protectedBranch: string,
): Promise<string> {
  await git(repoPath, ["checkout", protectedBranch]);
  await git(repoPath, ["merge", "--no-ff", "-m", `merge ${sourceBranch}`, sourceBranch]);
  const { stdout } = await git(repoPath, ["rev-parse", "HEAD"]);
  return stdout.trim();
}

export async function createFixtureRepo(files: Record<string, string>): Promise<string> {
  const path = await mkdtemp(resolve(tmpdir(), "ha-git-"));
  await git(path, ["init", "-b", "main"]);
  for (const [relative, content] of Object.entries(files)) {
    const full = resolve(path, relative);
    await mkdir(dirname(full), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(full, content, "utf8");
  }
  await git(path, ["add", "-A"]);
  await git(path, ["-c", "user.email=fixture@human-agent.local", "-c", "user.name=Fixture", "commit", "-m", "init"]);
  return path;
}

export async function removeWorktree(repoPath: string, workspacePath: string): Promise<void> {
  await git(repoPath, ["worktree", "remove", "--force", workspacePath]).catch(async () => {
    await rm(workspacePath, { recursive: true, force: true });
  });
}

async function git(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFile("git", ["-C", cwd, ...args], { timeout: 15_000 });
}
