import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { name: "pi-adapter", environment: "node", include: ["src/**/*.test.ts"] },
});
