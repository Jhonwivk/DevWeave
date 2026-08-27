export type HealthStatus = "available" | "unavailable";

export type ComponentHealth = {
  status: HealthStatus;
  detail: string;
};

export type PlatformHealth = {
  server: ComponentHealth;
  worker: ComponentHealth;
  postgres: ComponentHealth;
};
