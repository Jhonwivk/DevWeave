import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PiKernelStatus = {
  available: boolean;
  bin?: string;
  version?: string;
  reason?: string;
};

export async function probePiKernel(
  bin = process.env.PI_BIN ?? "pi",
): Promise<PiKernelStatus> {
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], { timeout: 5_000 });
    const version = stdout.trim().split("\n")[0]?.trim();
    return { available: true, bin, version };
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof Error
          ? error.message
          : "Pi CLI 不可用。请安装 pi 或设置 PI_BIN 环境变量。",
    };
  }
}

export async function requirePiKernel(): Promise<string> {
  const status = await probePiKernel();
  if (!status.available || !status.bin) {
    throw new Error(
      status.reason ??
        "真实 Kernel 不可用。真实案例 Project 必须使用 Pi 执行；请安装 pi 并配置凭证后设置 PI_BIN。",
    );
  }
  return status.bin;
}
