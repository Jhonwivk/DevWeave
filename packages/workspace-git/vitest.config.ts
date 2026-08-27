import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { name: "workspace-git", environment: "node", include: ["src/**/*.test.ts"] },
});
