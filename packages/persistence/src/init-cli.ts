import { initializeDatabase, loadWorkspaceEnv } from "./index.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write(
    "未设置 DATABASE_URL。请复制 `.env.example` 为 `.env` 后再运行 `pnpm db:init`。\n",
  );
  process.exitCode = 1;
} else {
  await initializeDatabase(databaseUrl);
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (testDatabaseUrl && testDatabaseUrl !== databaseUrl) {
    await initializeDatabase(testDatabaseUrl);
  }
  process.stdout.write("Database initialized.\n");
}
