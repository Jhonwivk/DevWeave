import type pg from "pg";
import type { ActorRef, EventLayer } from "@human-agent/domain";
import { newId } from "@human-agent/domain";

export type DomainEventRecord = {
  eventId: string;
  projectId: string;
  projectSequence: number;
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  type: string;
  actor: ActorRef;
  causationId?: string;
  correlationId: string;
  occurredAt: Date;
  payloadVersion: number;
  payload: Record<string, unknown>;
  layer: EventLayer;
};

export type WriteBatch = {
  statements: { sql: string; params: unknown[] }[];
  events: Omit<DomainEventRecord, "projectSequence">[];
  failAfterState?: boolean;
};

export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function commitWrite(
  client: pg.PoolClient,
  projectId: string,
  batch: WriteBatch,
): Promise<DomainEventRecord[]> {
  for (const statement of batch.statements) {
    await client.query(statement.sql, statement.params);
  }
  if (batch.failAfterState) {
    throw new Error("injected write failure");
  }

  const committed: DomainEventRecord[] = [];
  for (const event of batch.events) {
    const sequence = await nextProjectSequence(client, projectId);
    const record: DomainEventRecord = { ...event, projectSequence: sequence };
    await client.query(
      `
        INSERT INTO domain_events (
          event_id, project_id, project_sequence, aggregate_id, aggregate_type,
          aggregate_version, type, actor, causation_id, correlation_id,
          occurred_at, payload_version, payload, layer
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
      `,
      [
        record.eventId,
        record.projectId,
        record.projectSequence,
        record.aggregateId,
        record.aggregateType,
        record.aggregateVersion,
        record.type,
        record.actor,
        record.causationId ?? null,
        record.correlationId,
        record.occurredAt,
        record.payloadVersion,
        record.payload,
        record.layer,
      ],
    );
    await client.query(
      `
        INSERT INTO outbox (id, event_id, project_id, project_sequence)
        VALUES ($1,$2,$3,$4)
      `,
      [newId("outbox"), record.eventId, record.projectId, record.projectSequence],
    );
    committed.push(record);
  }
  return committed;
}

export async function loadIdempotency(
  client: pg.PoolClient,
  key: string,
): Promise<Record<string, unknown> | undefined> {
  const result = await client.query<{ result: Record<string, unknown> }>(
    "SELECT result FROM idempotency_records WHERE idempotency_key = $1",
    [key],
  );
  return result.rows[0]?.result;
}

export async function saveIdempotency(
  client: pg.PoolClient,
  key: string,
  commandType: string,
  actorId: string,
  result: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `
      INSERT INTO idempotency_records (idempotency_key, command_type, actor_id, result)
      VALUES ($1,$2,$3,$4)
    `,
    [key, commandType, actorId, result],
  );
}

async function nextProjectSequence(client: pg.PoolClient, projectId: string): Promise<number> {
  const upsert = await client.query<{ current_value: string }>(
    `
      INSERT INTO project_sequences (project_id, current_value)
      VALUES ($1, 1)
      ON CONFLICT (project_id)
      DO UPDATE SET current_value = project_sequences.current_value + 1
      RETURNING current_value
    `,
    [projectId],
  );
  const value = upsert.rows[0]?.current_value;
  if (!value) {
    throw new Error("project sequence update failed");
  }
  return Number(value);
}
