import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "application",
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
