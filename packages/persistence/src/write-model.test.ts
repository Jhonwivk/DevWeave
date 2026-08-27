import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newId } from "@human-agent/domain";
import {
  commitWrite,
  createPool,
  initializeDatabase,
  loadWorkspaceEnv,
  withTransaction,
} from "./index.ts";

loadWorkspaceEnv();

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("缺少 TEST_DATABASE_URL 或 DATABASE_URL。");
}

describe("write-model atomicity", () => {
  const pool = createPool(databaseUrl);

  beforeAll(async () => {
    await initializeDatabase(databaseUrl);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rolls back state, domain events and outbox together", async () => {
    const projectId = newId("project");
    await pool.query(`INSERT INTO humans (id, display_name) VALUES ($1,'Owner') ON CONFLICT DO NOTHING`, [
      "human-write-model",
    ]);

    await expect(
      withTransaction(pool, async (client) => {
        await commitWrite(client, projectId, {
          statements: [
            {
              sql: `INSERT INTO projects (id, name, owner_id, version) VALUES ($1,'atomic','human-write-model',1)`,
              params: [projectId],
            },
          ],
          events: [
            {
              eventId: newId("evt"),
              projectId,
              aggregateId: projectId,
              aggregateType: "Project",
              aggregateVersion: 1,
              type: "ProjectCreated",
              actor: { kind: "human", id: "human-write-model", displayName: "Owner" },
              correlationId: "corr-atomic",
              occurredAt: new Date(),
              payloadVersion: 1,
              payload: {},
              layer: "domain",
            },
          ],
          failAfterState: true,
        });
      }),
    ).rejects.toThrow("injected write failure");

    const projects = await pool.query(`SELECT id FROM projects WHERE id=$1`, [projectId]);
    const events = await pool.query(`SELECT event_id FROM domain_events WHERE project_id=$1`, [projectId]);
    const outbox = await pool.query(`SELECT id FROM outbox WHERE project_id=$1`, [projectId]);
    expect(projects.rowCount).toBe(0);
    expect(events.rowCount).toBe(0);
    expect(outbox.rowCount).toBe(0);
  });
});
