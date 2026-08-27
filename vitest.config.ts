import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/server",
      "apps/web",
      "packages/persistence",
      "packages/domain",
      "packages/mock-adapter",
      "packages/application",
      "packages/workspace-git",
      "packages/pi-adapter",
    ],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
