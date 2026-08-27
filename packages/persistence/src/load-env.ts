import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export function findWorkspaceRoot(
  startDir = fileURLToPath(new URL(".", import.meta.url)),
): string {
  let current = startDir;
  while (true) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Unable to locate workspace root (pnpm-workspace.yaml).");
    }
    current = parent;
  }
}

export function loadWorkspaceEnv(): void {
  const envPath = resolve(findWorkspaceRoot(), ".env");
  if (existsSync(envPath)) {
    config({ path: envPath });
  }
}
