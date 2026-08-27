import { Hono } from "hono";
import { getPlatformHealth, type HealthProbes } from "./platform-health.ts";

export type { HealthProbes } from "./platform-health.ts";

export function createApp(probes: HealthProbes): Hono {
  const app = new Hono();

  app.get("/health", async (context) => {
    return context.json(await getPlatformHealth(probes));
  });

  return app;
}
