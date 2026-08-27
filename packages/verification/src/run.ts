import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type VerificationProfile = {
  version: string;
  commands: { name: string; command: string; args: string[] }[];
};

export type VerificationEvidence = {
  profileVersion: string;
  startedAt: string;
  finishedAt: string;
  passed: boolean;
  steps: {
    name: string;
    command: string;
    args: string[];
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  }[];
};

export async function runVerification(
  workspacePath: string,
  profile: VerificationProfile,
): Promise<VerificationEvidence> {
  const startedAt = new Date().toISOString();
  const steps: VerificationEvidence["steps"] = [];
  let passed = true;
  for (const step of profile.commands) {
    const begin = Date.now();
    try {
      const result = await execFileAsync(step.command, step.args, {
        cwd: workspacePath,
        timeout: 30_000,
      });
      steps.push({
        name: step.name,
        command: step.command,
        args: step.args,
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: Date.now() - begin,
      });
    } catch (error) {
      passed = false;
      const err = error as { code?: number; stdout?: string; stderr?: string };
      steps.push({
        name: step.name,
        command: step.command,
        args: step.args,
        exitCode: typeof err.code === "number" ? err.code : 1,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? (error instanceof Error ? error.message : "failed"),
        durationMs: Date.now() - begin,
      });
      break;
    }
  }
  return {
    profileVersion: profile.version,
    startedAt,
    finishedAt: new Date().toISOString(),
    passed,
    steps,
  };
}
