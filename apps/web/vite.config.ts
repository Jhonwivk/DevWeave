import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:3001",
      "/commands": "http://127.0.0.1:3001",
      "/demos": "http://127.0.0.1:3001",
      "/projects": "http://127.0.0.1:3001",
    },
  },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
