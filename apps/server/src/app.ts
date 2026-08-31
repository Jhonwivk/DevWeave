import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { DomainError } from "@human-agent/domain";
import { runAllRealCases, runOAuthDemo, runRealCase, type createPlatform } from "@human-agent/application";
import { getPlatformHealth, type HealthProbes } from "./platform-health.ts";

export type { HealthProbes } from "./platform-health.ts";

export function createApp(
  probes: HealthProbes,
  platform?: ReturnType<typeof createPlatform>,
): Hono {
  const app = new Hono();

  app.get("/health", async (context) => context.json(await getPlatformHealth(probes)));

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: "not_found",
          message: "接口不存在。若刚更新代码，请重启 `pnpm dev` 后再创建 Project。",
        },
      },
      404,
    ),
  );

  if (!platform) {
    const unavailable = () =>
      ({
        ok: false,
        error: {
          code: "unavailable",
          message:
            "Command API 未启用。请确认 `.env` 中的 DATABASE_URL，运行 `pnpm db:init` 后重启 `pnpm dev`。",
        },
      }) as const;
    app.get("/projects", (context) => context.json(unavailable(), 503));
    app.post("/commands", (context) => context.json(unavailable(), 503));
    app.post("/demos/oauth", (context) => context.json(unavailable(), 503));
    app.post("/demos/real-cases", (context) => context.json(unavailable(), 503));
    return app;
  }

  app.post("/demos/oauth", async (context) => {
    const result = await runOAuthDemo(platform);
    return context.json(result, 201);
  });

  app.post("/demos/real-cases", async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const caseId = typeof body.caseId === "string" ? body.caseId : undefined;
    const result = caseId ? await runRealCase(platform, caseId) : await runAllRealCases(platform);
    return context.json(result, 201);
  });

  app.get("/projects", async (context) => {
    const result = await platform.query(
      `SELECT * FROM projects ORDER BY created_at DESC`,
    );
    return context.json({ projects: result.rows });
  });

  app.post("/commands", async (context) => {
    const envelope = await context.req.json();
    const result = await platform.handle(envelope);
    if (!result.ok) {
      const status =
        result.error.code === "conflict"
          ? 409
          : result.error.code === "forbidden"
            ? 403
            : 400;
      return context.json(result, status);
    }
    return context.json(result, 200);
  });

  app.get("/projects/:id", async (context) => {
    const id = context.req.param("id");
    const result = await platform.query(`SELECT * FROM projects WHERE id=$1`, [id]);
    const project = result.rows[0];
    if (!project)
      return context.json(
        { error: { code: "not_found", message: "Project not found" } },
        404,
      );
    const events = await platform.query(
      `SELECT * FROM domain_events WHERE project_id=$1 ORDER BY project_sequence DESC LIMIT 20`,
      [id],
    );
    const health = await getPlatformHealth(probes);
    return context.json({ project, recent: events.rows, health });
  });

  app.get("/projects/:id/events", async (context) => {
    const id = context.req.param("id");
    const cursor = Number(context.req.query("cursor") ?? 0);
    return streamSSE(context, async (stream) => {
      const seen = new Set<number>();
      const history = await platform.query(
        `SELECT * FROM domain_events WHERE project_id=$1 AND project_sequence > $2 ORDER BY project_sequence`,
        [id, cursor],
      );
      for (const row of history.rows) {
        seen.add(Number(row.project_sequence));
        await stream.writeSSE({
          id: String(row.project_sequence),
          data: JSON.stringify(row),
        });
      }
      const unsubscribe = platform.subscribe(id, (event) => {
        if (event.projectSequence <= cursor || seen.has(event.projectSequence)) return;
        seen.add(event.projectSequence);
        void stream.writeSSE({
          id: String(event.projectSequence),
          data: JSON.stringify(event),
        });
      });
      try {
        while (true) {
          await stream.sleep(15_000);
        }
      } finally {
        unsubscribe();
      }
    });
  });

  app.get("/projects/:id/team", async (context) => {
    const id = context.req.param("id");
    const humans = await platform.query(
      `SELECT m.*, h.display_name FROM human_memberships m JOIN humans h ON h.id=m.human_id WHERE m.project_id=$1 AND m.removed_at IS NULL`,
      [id],
    );
    const agents = await platform.query(
      `SELECT * FROM agent_memberships WHERE project_id=$1`,
      [id],
    );
    const gaps = await platform.query(
      `SELECT required_capabilities FROM work_items WHERE project_id=$1`,
      [id],
    );
    return context.json({
      humans: humans.rows,
      agents: agents.rows,
      capabilityNeeds: gaps.rows,
    });
  });

  app.get("/projects/:id/work", async (context) => {
    const id = context.req.param("id");
    const items = await platform.query(
      `SELECT * FROM work_items WHERE project_id=$1 ORDER BY created_at`,
      [id],
    );
    const specs = await platform.query(
      `SELECT * FROM specifications WHERE project_id=$1 ORDER BY version_number`,
      [id],
    );
    const coverage = coverageMatrix(specs.rows, items.rows);
    return context.json({
      workItems: items.rows,
      specifications: specs.rows,
      coverage,
    });
  });

  app.get("/projects/:id/inbox", async (context) => {
    const items = await platform.query(
      `SELECT * FROM inbox_items WHERE project_id=$1 AND status='open' ORDER BY created_at`,
      [context.req.param("id")],
    );
    return context.json({ items: items.rows });
  });

  app.get("/projects/:id/executions", async (context) => {
    const executions = await platform.query(
      `SELECT * FROM executions WHERE project_id=$1 ORDER BY created_at`,
      [context.req.param("id")],
    );
    return context.json({ executions: executions.rows });
  });

  app.get("/projects/:id/executions/:executionId", async (context) => {
    const execution = await platform.query(`SELECT * FROM executions WHERE id=$1`, [
      context.req.param("executionId"),
    ]);
    const row = execution.rows[0];
    if (!row) return context.json({ error: { code: "not_found" } }, 404);
    return context.json({ execution: row });
  });

  app.get("/projects/:id/timeline", async (context) => {
    const layer = context.req.query("layer") ?? "all";
    const events =
      layer === "all"
        ? await platform.query(
            `SELECT * FROM domain_events WHERE project_id=$1 ORDER BY project_sequence`,
            [context.req.param("id")],
          )
        : await platform.query(
            `SELECT * FROM domain_events WHERE project_id=$1 AND layer=$2 ORDER BY project_sequence`,
            [context.req.param("id"), layer],
          );
    return context.json({ events: events.rows });
  });

  app.get("/projects/:id/artifacts", async (context) => {
    const projectId = context.req.param("id");
    const artifacts = await platform.query(
      `SELECT * FROM artifacts WHERE project_id=$1`,
      [projectId],
    );
    const decisions = await platform.query(
      `SELECT * FROM decisions WHERE project_id=$1 ORDER BY created_at`,
      [projectId],
    );
    return context.json({ artifacts: artifacts.rows, decisions: decisions.rows });
  });

  app.get("/projects/:id/merge", async (context) => {
    const candidates = await platform.query(
      `SELECT * FROM merge_candidates WHERE project_id=$1 ORDER BY queue_order NULLS LAST`,
      [context.req.param("id")],
    );
    const conflicts = await platform.query(
      `SELECT * FROM conflicts WHERE project_id=$1 ORDER BY created_at`,
      [context.req.param("id")],
    );
    return context.json({ candidates: candidates.rows, conflicts: conflicts.rows });
  });

  app.get("/projects/:id/decisions", async (context) => {
    const decisions = await platform.query(
      `SELECT * FROM decisions WHERE project_id=$1 ORDER BY created_at`,
      [context.req.param("id")],
    );
    return context.json({ decisions: decisions.rows });
  });

  app.onError((error, context) => {
    if (error instanceof DomainError) {
      return context.json({ error: { code: error.code, message: error.message } }, 400);
    }
    return context.json({ error: { code: "internal", message: error.message } }, 500);
  });

  return app;
}

function coverageMatrix(
  specs: Record<string, unknown>[],
  items: Record<string, unknown>[],
): { id: string; status: string }[] {
  const effective = specs.filter((spec) => spec.status === "effective").at(-1);
  const criteria =
    (effective?.acceptance_criteria as { id: string }[] | undefined) ?? [];
  return criteria.map((criterion) => {
    const related = items.filter((item) =>
      (item.acceptance_criteria as string[]).includes(criterion.id),
    );
    const statuses = related.flatMap((item) =>
      ((item.coverage as { id: string; status: string }[]) ?? [])
        .filter((entry) => entry.id === criterion.id)
        .map((entry) => entry.status),
    );
    const status = statuses.includes("verified")
      ? "verified"
      : statuses.includes("waived")
        ? "waived"
        : statuses.includes("implemented")
          ? "implemented"
          : statuses.includes("planned")
            ? "planned"
            : "uncovered";
    return { id: criterion.id, status };
  });
}
