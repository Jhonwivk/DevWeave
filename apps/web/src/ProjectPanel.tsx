import { useEffect, useState } from "react";
import type { PlatformClient } from "./api.ts";
import type { ProjectTab } from "./App.tsx";
import { RecordInspector, type InspectorDetail } from "./RecordInspector.tsx";

type PanelTab = Exclude<ProjectTab, "health">;

export function ProjectPanel({
  client,
  projectId,
  tab,
}: {
  client: PlatformClient;
  projectId: string;
  tab: PanelTab;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>();
  const [detail, setDetail] = useState<InspectorDetail>();

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(undefined);
    setDetail(undefined);
    loadTab(client, projectId, tab)
      .then((loaded) => {
        if (!cancelled) setData(loaded as Record<string, unknown>);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "无法加载当前视图");
      });
    return () => {
      cancelled = true;
    };
  }, [client, projectId, tab]);

  if (error)
    return (
      <EmptyState icon="!" title="当前视图无法加载" description={error} tone="danger" />
    );
  if (!data)
    return (
      <div className="loading-state" role="status">
        <span className="spinner" />
        <span>正在同步 Project State…</span>
      </div>
    );

  let content;
  switch (tab) {
    case "dashboard":
      content = <Dashboard data={data} onInspect={setDetail} />;
      break;
    case "timeline":
      content = <TimelineView data={data} onInspect={setDetail} />;
      break;
    case "spec":
      content = <SpecificationView data={data} onInspect={setDetail} />;
      break;
    case "work":
      content = <WorkView data={data} onInspect={setDetail} />;
      break;
    case "team":
      content = <TeamView data={data} onInspect={setDetail} />;
      break;
    case "execution":
      content = <ExecutionView data={data} onInspect={setDetail} />;
      break;
    case "artifacts":
      content = <ArtifactView data={data} onInspect={setDetail} />;
      break;
    case "inbox":
      content = <InboxView data={data} onInspect={setDetail} />;
      break;
    case "merge":
      content = <MergeView data={data} onInspect={setDetail} />;
      break;
  }

  return (
    <>
      {content}
      {detail ? (
        <RecordInspector detail={detail} onClose={() => setDetail(undefined)} />
      ) : null}
    </>
  );
}

async function loadTab(client: PlatformClient, projectId: string, tab: PanelTab) {
  if (tab === "dashboard") return client.getProject(projectId);
  if (tab === "timeline") return client.getTimeline(projectId);
  if (tab === "spec" || tab === "work") return client.getWork(projectId);
  if (tab === "team") return client.getTeam(projectId);
  if (tab === "execution") return client.getExecutions(projectId);
  if (tab === "artifacts") return client.getArtifacts(projectId);
  if (tab === "inbox") return client.getInbox(projectId);
  return client.getMerge(projectId);
}

type Inspect = (detail: InspectorDetail) => void;

function Dashboard({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const project = (data.project ?? {}) as {
    name?: string;
    version?: number;
    base_branch?: string;
  };
  const health = (data.health ?? {}) as Record<
    string,
    { status?: string; detail?: string }
  >;
  const recent =
    (data.recent as ({ type: string; project_sequence?: number } & Record<
      string,
      unknown
    >)[]) ?? [];
  const available = [health.server, health.worker, health.postgres].filter(
    (entry) => entry?.status === "available",
  ).length;
  const hasMerged = recent.some((event) => event.type === "Merged");
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Project overview"
        title="Project Dashboard"
        description="共享工程状态，而不是 Agent 对话列表。"
        badge="Live"
      />
      <div className="metric-grid">
        <Metric
          label="Project version"
          value={`v${project.version ?? "—"}`}
          detail="Optimistic concurrency"
        />
        <Metric
          label="Domain events"
          value={String(recent.length)}
          detail="最近 20 条关键事实"
        />
        <Metric
          label="Runtime health"
          value={`${available}/3`}
          detail="Server · Worker · PostgreSQL"
          tone={available === 3 ? "good" : "warn"}
        />
        <Metric
          label="Baseline"
          value={project.base_branch ?? "Not set"}
          detail="Git integration branch"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeading
            title="Recent activity"
            description="按 Project sequence 排序的领域事实"
          />
          {recent.length ? (
            <ol className="timeline-list">
              {recent.map((event, index) => (
                <li key={`${event.type}-${String(event.project_sequence ?? index)}`}>
                  <button
                    className="timeline-event"
                    type="button"
                    aria-label={`查看事件 ${event.type}`}
                    onClick={() =>
                      onInspect({
                        category: "Domain Event",
                        title: event.type,
                        record: event,
                      })
                    }
                  >
                    <span className="timeline-marker" />
                    <span className="timeline-copy">
                      <strong>{event.type}</strong>
                      <small>
                        Sequence {event.project_sequence ?? recent.length - index}
                      </small>
                    </span>
                    <Status value="recorded" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon="↗"
              title="还没有领域事件"
              description="重要操作会按因果顺序出现在这里。"
            />
          )}
        </section>
        <section className="panel">
          <PanelHeading
            title="Platform runtime"
            description="Execution 依赖的本地组件"
          />
          <div className="health-list">
            <HealthLine label="Server" item={health.server} />
            <HealthLine label="Worker" item={health.worker} />
            <HealthLine label="PostgreSQL" item={health.postgres} />
          </div>
          <div className="next-step">
            <span className="next-step-number">{hasMerged ? "✓" : "01"}</span>
            <div>
              <strong>
                {hasMerged ? "验证合并已进入共享基线" : "下一步：建立工程基线"}
              </strong>
              <p>
                {hasMerged
                  ? "候选已通过 Verification，可从各视图回溯 Specification、Execution 与冲突记录。"
                  : "导入 Git repository，并发布第一版 Effective Specification。"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TimelineView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const events =
    (data.events as ({
      event_id?: string;
      type: string;
      aggregate_type?: string;
      project_sequence?: number;
      occurred_at?: string;
    } & Record<string, unknown>)[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Audit & causality"
        title="Project Timeline"
        description="查看完整领域事件、Actor、Payload、Correlation 与因果顺序。"
        badge={`${events.length} events`}
      />
      <section className="panel panel-flush">
        {events.length ? (
          <div className="timeline-table">
            {events.map((event) => (
              <button
                className="timeline-record"
                type="button"
                key={
                  event.event_id ?? `${event.type}-${String(event.project_sequence)}`
                }
                aria-label={`查看 Timeline 事件 ${event.type}`}
                onClick={() =>
                  onInspect({
                    category: "Domain Event",
                    title: event.type,
                    record: event,
                  })
                }
              >
                <span className="timeline-sequence">
                  {event.project_sequence ?? "—"}
                </span>
                <span className="timeline-record-copy">
                  <strong>{event.type}</strong>
                  <small>
                    {event.aggregate_type ?? "Aggregate"}
                    {event.occurred_at ? ` · ${formatDate(event.occurred_at)}` : ""}
                  </small>
                </span>
                <span className="inspect-chevron">→</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="T"
            title="Timeline 还是空的"
            description="Project 中的领域操作会按不可重复的 sequence 记录在这里。"
          />
        )}
      </section>
    </div>
  );
}

function SpecificationView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const specs =
    (data.specifications as ({
      id: string;
      status: string;
      version_number?: number;
      git_commit?: string;
    } & Record<string, unknown>)[]) ?? [];
  const coverage = (data.coverage as { id: string; status: string }[]) ?? [];
  const verified = coverage.filter((row) => row.status === "verified").length;
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Intent & acceptance"
        title="Specification"
        description="版本化管理项目意图、约束与验收标准。"
      />
      <div className="summary-strip">
        <SummaryItem label="Versions" value={specs.length} />
        <SummaryItem
          label="Effective"
          value={specs.filter((spec) => spec.status === "effective").length}
        />
        <SummaryItem label="Acceptance criteria" value={coverage.length} />
        <SummaryItem label="Verified" value={verified} />
      </div>
      <div className="content-grid wide-main">
        <section className="panel">
          <PanelHeading
            title="Specification versions"
            description="Effective 内容不会被原地覆盖"
          />
          {specs.length ? (
            <div className="record-list">
              {specs.map((spec) => (
                <button
                  className="record-row inspectable-record"
                  type="button"
                  key={spec.id}
                  aria-label={`查看 Specification ${spec.id}`}
                  onClick={() =>
                    onInspect({
                      category: "Specification",
                      title: `Specification v${String(spec.version_number ?? 1)}`,
                      record: spec,
                    })
                  }
                >
                  <span className="record-icon">S{spec.version_number ?? ""}</span>
                  <div>
                    <strong>{spec.id}</strong>
                    <small>
                      {spec.git_commit
                        ? `Git ${short(spec.git_commit)}`
                        : "Git-backed Markdown"}
                    </small>
                  </div>
                  <Status value={spec.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="S"
              title="还没有 Specification"
              description="创建 draft 并完成 Human review 后，正式工作才能从 Effective Specification 派生。"
            />
          )}
        </section>
        <CoverageTable coverage={coverage} />
      </div>
    </div>
  );
}

function WorkView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const items =
    (data.workItems as ({
      id: string;
      goal: string;
      status: string;
      risk?: string;
      blocked_by?: string[];
      kind?: string;
    } & Record<string, unknown>)[]) ?? [];
  const coverage = (data.coverage as { id: string; status: string }[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Plan & ownership"
        title="Work Graph"
        description="把 Effective Specification 切成可追溯、可并行的 Work Items。"
      />
      <div className="summary-strip">
        <SummaryItem label="Work Items" value={items.length} />
        <SummaryItem
          label="Ready"
          value={items.filter((item) => item.status === "ready").length}
        />
        <SummaryItem
          label="In progress"
          value={items.filter((item) => item.status === "in_progress").length}
        />
        <SummaryItem
          label="Blocked"
          value={items.filter((item) => item.status === "blocked").length}
        />
      </div>
      <div className="content-grid wide-main">
        <section className="panel">
          <PanelHeading
            title="Work Items"
            description="Work Item 与 Execution 生命周期保持分离"
          />
          {items.length ? (
            <div className="work-list">
              {items.map((item, index) => (
                <button
                  className="work-card inspectable-record"
                  type="button"
                  key={item.id}
                  aria-label={`查看 Work Item ${item.goal}`}
                  onClick={() =>
                    onInspect({
                      category: "Work Item",
                      title: item.goal,
                      record: item,
                    })
                  }
                >
                  <span className="work-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="work-copy">
                    <strong>{item.goal}</strong>
                    <small>
                      {item.id} · {item.kind ?? "formal"} · Risk {item.risk ?? "normal"}
                    </small>
                  </div>
                  <Status value={item.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="W"
              title="Work Graph 还是空的"
              description="从 Effective Specification 创建 Work Item，并登记 Human 的线下共识结果。"
            />
          )}
        </section>
        <CoverageTable coverage={coverage} />
      </div>
    </div>
  );
}

function TeamView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const humans =
    (data.humans as ({
      human_id: string;
      role: string;
      display_name: string;
    } & Record<string, unknown>)[]) ?? [];
  const agents =
    (data.agents as ({
      id: string;
      source_type: string;
      display_name: string;
      trust_status: string;
    } & Record<string, unknown>)[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="People & digital workforce"
        title="Team"
        description="Human 保持责任，三类 Agent 通过统一 Membership 参与 Project。"
      />
      <div className="summary-strip">
        <SummaryItem label="Humans" value={humans.length} />
        <SummaryItem label="Agent Memberships" value={agents.length} />
        <SummaryItem
          label="Qualified"
          value={agents.filter((agent) => agent.trust_status === "qualified").length}
        />
        <SummaryItem
          label="Restricted trial"
          value={agents.filter((agent) => agent.trust_status === "trial").length}
        />
      </div>
      <section className="panel">
        <PanelHeading title="Human members" description="Owner / Member 两级项目责任" />
        <div className="people-grid">
          {humans.map((human) => (
            <PersonCard
              key={human.human_id}
              name={human.display_name}
              meta="Human"
              status={human.role}
              onClick={() =>
                onInspect({
                  category: "Human Membership",
                  title: human.display_name,
                  record: human,
                })
              }
            />
          ))}
          {!humans.length ? (
            <EmptyState
              icon="H"
              title="还没有 Human Member"
              description="邀请另一名 Human 参与 review 与 Recorded Consensus。"
            />
          ) : null}
        </div>
      </section>
      <section className="panel">
        <PanelHeading
          title="Agent Memberships"
          description="手动引入、项目固化、最小权限"
        />
        <div className="people-grid">
          {agents.map((agent) => (
            <PersonCard
              key={agent.id}
              name={agent.display_name}
              meta={agent.source_type}
              status={agent.trust_status}
              agent
              onClick={() =>
                onInspect({
                  category: "Agent Membership",
                  title: agent.display_name,
                  record: agent,
                })
              }
            />
          ))}
          {!agents.length ? (
            <EmptyState
              icon="A"
              title="还没有 Agent Membership"
              description="可手动引入 Digital Employee 或 Private Agent，也可针对 Capability Gap 生成 Candidate。"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ExecutionView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const executions =
    (data.executions as ({
      id: string;
      status: string;
      branch_kind: string;
      kernel: string;
      created_at?: string;
      selected?: boolean;
    } & Record<string, unknown>)[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Attempts & intervention"
        title="Execution"
        description="每次尝试固定输入、Kernel、权限与隔离 Workspace。"
        badge={`${executions.length} runs`}
      />
      <section className="panel panel-flush">
        {executions.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Execution</th>
                  <th>Kernel</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Candidate</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.id}>
                    <td>
                      <button
                        className="table-record-link"
                        type="button"
                        aria-label={`查看 Execution ${execution.id}`}
                        onClick={() =>
                          onInspect({
                            category: "Execution",
                            title: execution.id,
                            record: execution,
                          })
                        }
                      >
                        {short(execution.id)}
                      </button>
                      <small>
                        {execution.created_at
                          ? formatDate(execution.created_at)
                          : "Traceable attempt"}
                      </small>
                    </td>
                    <td>
                      <span className="mono-label">{execution.kernel}</span>
                    </td>
                    <td>{execution.branch_kind}</td>
                    <td>
                      <Status value={execution.status} />
                    </td>
                    <td>{execution.selected ? "Selected" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon=">_"
            title="还没有 Execution"
            description="为 Work Item 指定 Agent Membership 后，从确定的 Context Package 启动第一次尝试。"
          />
        )}
      </section>
    </div>
  );
}

function ArtifactView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const artifacts =
    (data.artifacts as ({
      id: string;
      title: string;
      status: string;
      kind?: string;
      version_number?: number;
      content_hash?: string;
    } & Record<string, unknown>)[]) ?? [];
  const decisions =
    (data.decisions as ({
      id: string;
      question: string;
      status: string;
      result?: string;
    } & Record<string, unknown>)[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Structured handoff"
        title="Artifact / Decision"
        description="通过版本化工程制品协作，而不是依赖 Agent 群聊。"
      />
      <section className="panel">
        <PanelHeading
          title="Published artifacts"
          description="Consumer 必须显式采用具体版本"
        />
        {artifacts.length ? (
          <div className="artifact-grid">
            {artifacts.map((artifact) => (
              <button
                className="artifact-card inspectable-record"
                type="button"
                key={artifact.id}
                aria-label={`查看 Artifact ${artifact.title}`}
                onClick={() =>
                  onInspect({
                    category: "Artifact",
                    title: artifact.title,
                    record: artifact,
                  })
                }
              >
                <span className="record-icon">A</span>
                <div className="artifact-main">
                  <div>
                    <span className="mini-label">{artifact.kind ?? "artifact"}</span>
                    <Status value={artifact.status} />
                  </div>
                  <h3>{artifact.title}</h3>
                  <p>
                    Version {artifact.version_number ?? 1} ·{" "}
                    {artifact.content_hash
                      ? short(artifact.content_hash)
                      : short(artifact.id)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="A"
            title="还没有 Artifact"
            description="Producer 完成验证后，可以发布 Contract、Schema 或其他版本化工程制品。"
          />
        )}
      </section>
      <section className="panel">
        <PanelHeading
          title="Recorded decisions"
          description="保留问题、选项、结果、理由和登记者"
        />
        {decisions.length ? (
          <div className="decision-list">
            {decisions.map((decision) => (
              <button
                className="decision-row inspectable-record"
                type="button"
                key={decision.id}
                aria-label={`查看 Decision ${decision.question}`}
                onClick={() =>
                  onInspect({
                    category: "Decision",
                    title: decision.question,
                    record: decision,
                  })
                }
              >
                <span className="record-icon">D</span>
                <span className="decision-copy">
                  <strong>{decision.question}</strong>
                  <small>{decision.result ?? "Awaiting a recorded result"}</small>
                </span>
                <Status value={decision.status} />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="D"
            title="还没有 Decision"
            description="影响共享工程状态的决定会在这里保留完整理由与登记信息。"
          />
        )}
      </section>
    </div>
  );
}

function InboxView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const items =
    (data.items as ({
      id: string;
      title: string;
      reason: string;
      kind?: string;
    } & Record<string, unknown>)[]) ?? [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Human attention"
        title="Inbox"
        description="这里只出现需要 Human 判断或行动的事项。"
        badge={`${items.length} open`}
      />
      <section className="panel">
        {items.length ? (
          <div className="inbox-list">
            {items.map((item) => (
              <button
                className="inbox-row inspectable-record"
                type="button"
                key={item.id}
                aria-label={`查看 Inbox ${item.title}`}
                onClick={() =>
                  onInspect({
                    category: "Inbox Item",
                    title: item.title,
                    record: item,
                  })
                }
              >
                <span className="attention-mark">!</span>
                <div>
                  <span className="mini-label">{item.kind ?? "action required"}</span>
                  <h3>{item.title}</h3>
                  <p>{item.reason}</p>
                </div>
                <span className="row-arrow">→</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="✓"
            title="没有待处理事项"
            description="Capability Gap、Permission、Conflict 和 validation failure 会出现在这里。"
            tone="good"
          />
        )}
      </section>
    </div>
  );
}

function MergeView({
  data,
  onInspect,
}: {
  data: Record<string, unknown>;
  onInspect: Inspect;
}) {
  const candidates =
    (data.candidates as ({
      id: string;
      status: string;
      queue_order?: number;
      baseline_commit?: string;
    } & Record<string, unknown>)[]) ?? [];
  const conflicts =
    (data.conflicts as ({ id: string; kind: string } & Record<string, unknown>)[]) ??
    [];
  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Verified integration"
        title="Merge Queue"
        description="候选按最新 integration baseline 顺序 rebase 和验证。"
      />
      <div className="summary-strip">
        <SummaryItem
          label="Queued"
          value={candidates.filter((candidate) => candidate.status === "queued").length}
        />
        <SummaryItem
          label="Mergeable"
          value={
            candidates.filter((candidate) => candidate.status === "mergeable").length
          }
        />
        <SummaryItem
          label="Merged"
          value={candidates.filter((candidate) => candidate.status === "merged").length}
        />
        <SummaryItem label="Conflicts" value={conflicts.length} />
      </div>
      <div className="content-grid wide-main">
        <section className="panel panel-flush">
          <PanelHeading
            title="Candidate queue"
            description="只有通过 Verification 的候选才能进入共享分支"
            padded
          />
          {candidates.length ? (
            <div className="queue-list">
              {candidates.map((candidate, index) => (
                <button
                  className="queue-row inspectable-record"
                  type="button"
                  key={candidate.id}
                  aria-label={`查看 Merge Candidate ${candidate.id}`}
                  onClick={() =>
                    onInspect({
                      category: "Merge Candidate",
                      title: candidate.id,
                      record: candidate,
                    })
                  }
                >
                  <span className="queue-order">
                    {candidate.queue_order ?? index + 1}
                  </span>
                  <div>
                    <strong>{short(candidate.id)}</strong>
                    <small>
                      {candidate.baseline_commit
                        ? `Baseline ${short(candidate.baseline_commit)}`
                        : "Waiting for integration baseline"}
                    </small>
                  </div>
                  <Status value={candidate.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="M"
              title="Merge queue 为空"
              description="选定并验证 Execution candidate 后，可以创建 Merge Candidate。"
            />
          )}
        </section>
        <section className="panel">
          <PanelHeading
            title="Conflict signals"
            description="Text · Symbol · Contract · Semantic"
          />
          {conflicts.length ? (
            <div className="conflict-list">
              {conflicts.map((conflict) => (
                <button
                  className="conflict-row inspectable-record"
                  type="button"
                  key={conflict.id}
                  aria-label={`查看 Conflict ${conflict.kind}`}
                  onClick={() =>
                    onInspect({
                      category: "Conflict",
                      title: `${conflict.kind} conflict`,
                      record: conflict,
                    })
                  }
                >
                  <span className="conflict-icon">!</span>
                  <div>
                    <strong>{conflict.kind}</strong>
                    <small>{short(conflict.id)}</small>
                  </div>
                  <Status value="needs-human" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="✓"
              title="没有冲突"
              description="Change Intent 与 Verification 当前未发现冲突。"
              tone="good"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ViewHeader({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="view-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {badge ? (
        <span className="header-badge">
          <span className="live-dot" />
          {badge}
        </span>
      ) : null}
    </header>
  );
}
function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn";
}) {
  return (
    <article className={`metric-card${tone ? ` metric-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function PanelHeading({
  title,
  description,
  padded = false,
}: {
  title: string;
  description: string;
  padded?: boolean;
}) {
  return (
    <header className={`panel-heading${padded ? " padded" : ""}`}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

function CoverageTable({ coverage }: { coverage: { id: string; status: string }[] }) {
  return (
    <section className="panel panel-flush">
      <PanelHeading
        title="Coverage Matrix"
        description="Acceptance criteria traceability"
        padded
      />
      {coverage.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <caption className="sr-only">Acceptance criterion coverage</caption>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.id}</strong>
                  </td>
                  <td>
                    <Status value={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="C"
          title="Coverage Matrix 为空"
          description="Effective Specification 的 Acceptance Criteria 会显示在这里。"
        />
      )}
    </section>
  );
}
function HealthLine({
  label,
  item,
}: {
  label: string;
  item?: { status?: string; detail?: string };
}) {
  const available = item?.status === "available";
  return (
    <div className="health-line">
      <span className={available ? "health-signal available" : "health-signal"} />
      <div>
        <strong>{label}</strong>
        <small>{item?.detail ?? "尚未报告状态"}</small>
      </div>
      <Status value={available ? "available" : "unknown"} />
    </div>
  );
}
function PersonCard({
  name,
  meta,
  status,
  agent = false,
  onClick,
}: {
  name: string;
  meta: string;
  status: string;
  agent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="person-card inspectable-record"
      type="button"
      aria-label={`查看成员 ${name}`}
      onClick={onClick}
    >
      <span className={agent ? "avatar agent-avatar" : "avatar"}>{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        <small>{meta}</small>
      </div>
      <Status value={status} />
    </button>
  );
}
function EmptyState({
  icon,
  title,
  description,
  tone = "neutral",
}: {
  icon: string;
  title: string;
  description: string;
  tone?: "neutral" | "good" | "danger";
}) {
  return (
    <div className={`empty-state empty-${tone}`}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className="status-pill" data-tone={toneFor(value)}>
      <span />
      {value}
    </span>
  );
}

function toneFor(value: string): string {
  const normalized = value.toLowerCase();
  if (
    [
      "available",
      "completed",
      "effective",
      "published",
      "qualified",
      "verified",
      "merged",
      "mergeable",
      "recorded",
      "owner",
    ].includes(normalized)
  )
    return "good";
  if (
    [
      "failed",
      "conflicted",
      "validation_failed",
      "unavailable",
      "withdrawn",
      "needs-human",
    ].includes(normalized)
  )
    return "danger";
  if (
    [
      "trial",
      "paused",
      "waiting_for_human",
      "unknown",
      "stale",
      "stale_spec",
      "waived",
    ].includes(normalized)
  )
    return "warn";
  if (
    [
      "running",
      "in_progress",
      "queued",
      "starting",
      "ready",
      "planned",
      "implemented",
    ].includes(normalized)
  )
    return "active";
  return "neutral";
}

function short(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}
function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "—";
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
