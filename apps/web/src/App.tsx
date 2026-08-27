import { useEffect, useMemo, useState } from "react";
import { envelope, liveClient, type PlatformClient } from "./api.ts";
import { HealthPage } from "./health/HealthPage.tsx";

type Tab =
  | "dashboard"
  | "spec"
  | "work"
  | "team"
  | "execution"
  | "artifacts"
  | "inbox"
  | "merge"
  | "health";

export function App({ client = liveClient }: { client?: PlatformClient }) {
  const [projects, setProjects] = useState<{ id: string; name: string; version: number }[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [name, setName] = useState("OAuth");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    client
      .listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "无法加载项目");
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function createProject(): Promise<void> {
    const result = await client.command(envelope("CreateProject", { name }));
    if (!result.ok || !result.aggregateId) {
      setError(result.error?.message ?? "创建失败");
      return;
    }
    setProjectId(result.aggregateId);
    setTab("dashboard");
    setProjects(await client.listProjects());
  }

  return (
    <main>
      <h1>Human-Agent 协作平台</h1>
      <p>以 Project 为中心管理 Specification、Work Item、Execution 与 merge queue。不使用 Agent 群聊。</p>
      {error ? <p role="alert">{error}</p> : null}
      <section>
        <h2>创建 Project</h2>
        <label>
          名称
          <input aria-label="项目名称" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" onClick={() => void createProject()}>
          创建 Project
        </button>
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <button type="button" onClick={() => setProjectId(project.id)}>
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {projectId ? (
        <ProjectShell client={client} projectId={projectId} tab={tab} onTab={setTab} />
      ) : null}
    </main>
  );
}

function ProjectShell({
  client,
  projectId,
  tab,
  onTab,
}: {
  client: PlatformClient;
  projectId: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const tabs: Tab[] = [
    "dashboard",
    "spec",
    "work",
    "team",
    "execution",
    "artifacts",
    "inbox",
    "merge",
    "health",
  ];
  return (
    <section>
      <nav aria-label="项目视图">
        {tabs.map((item) => (
          <button key={item} type="button" aria-current={item === tab} onClick={() => onTab(item)}>
            {label(item)}
          </button>
        ))}
      </nav>
      {tab === "health" ? <HealthPage /> : <ProjectPanel client={client} projectId={projectId} tab={tab} />}
    </section>
  );
}

function ProjectPanel({
  client,
  projectId,
  tab,
}: {
  client: PlatformClient;
  projectId: string;
  tab: Tab;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const loaded =
        tab === "dashboard"
          ? await client.getProject(projectId)
          : tab === "spec" || tab === "work"
            ? await client.getWork(projectId)
            : tab === "team"
              ? await client.getTeam(projectId)
              : tab === "execution"
                ? await client.getExecutions(projectId)
                : tab === "artifacts"
                  ? await client.getArtifacts(projectId)
                  : tab === "inbox"
                    ? await client.getInbox(projectId)
                    : tab === "merge"
                      ? await client.getMerge(projectId)
                      : await client.getTimeline(projectId);
      if (!cancelled) setData(loaded as Record<string, unknown>);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [client, projectId, tab]);

  const content = useMemo(() => {
    if (!data) return <p>正在加载…</p>;
    if (tab === "dashboard") {
      const project = data.project as { name?: string; version?: number };
      const health = data.health as { server?: { status: string } };
      const recent = (data.recent as { type: string }[]) ?? [];
      return (
        <div>
          <h2>Project Dashboard</h2>
          <p>
            {project?.name} · 版本 {String(project?.version ?? "")} · Server{" "}
            {health?.server?.status === "available" ? "可用" : "未知"}
          </p>
          <ol>
            {recent.map((event, index) => (
              <li key={`${event.type}-${String(index)}`}>{event.type}</li>
            ))}
          </ol>
        </div>
      );
    }
    if (tab === "spec" || tab === "work") {
      const specs = (data.specifications as { id: string; status: string }[]) ?? [];
      const items = (data.workItems as { id: string; goal: string; status: string }[]) ?? [];
      const coverage = (data.coverage as { id: string; status: string }[]) ?? [];
      return (
        <div>
          <h2>{tab === "spec" ? "Specification" : "Work Graph"}</h2>
          <ul>
            {specs.map((spec) => (
              <li key={spec.id}>
                {spec.id} · {spec.status}
              </li>
            ))}
          </ul>
          <table>
            <caption>Coverage Matrix</caption>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.id}</th>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.goal} · {item.status}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (tab === "team") {
      const humans = (data.humans as { human_id: string; role: string; display_name: string }[]) ?? [];
      const agents = (data.agents as { id: string; source_type: string; display_name: string; trust_status: string }[]) ?? [];
      return (
        <div>
          <h2>Team</h2>
          <ul>
            {humans.map((human) => (
              <li key={human.human_id}>
                {human.display_name} · {human.role}
              </li>
            ))}
          </ul>
          <ul>
            {agents.map((agent) => (
              <li key={agent.id}>
                {agent.display_name} · {agent.source_type} · {agent.trust_status}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (tab === "execution") {
      const executions = (data.executions as { id: string; status: string; branch_kind: string; kernel: string }[]) ?? [];
      return (
        <div>
          <h2>Execution</h2>
          <ul>
            {executions.map((execution) => (
              <li key={execution.id}>
                {execution.kernel} · {execution.status} · {execution.branch_kind}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (tab === "artifacts") {
      const artifacts = (data.artifacts as { id: string; title: string; status: string }[]) ?? [];
      return (
        <div>
          <h2>Artifact / Decision</h2>
          <ul>
            {artifacts.map((artifact) => (
              <li key={artifact.id}>
                {artifact.title} · {artifact.status}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (tab === "inbox") {
      const items = (data.items as { id: string; title: string; reason: string }[]) ?? [];
      return (
        <div>
          <h2>Inbox</h2>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.title} · {item.reason}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    const candidates = (data.candidates as { id: string; status: string }[]) ?? [];
    const conflicts = (data.conflicts as { id: string; kind: string }[]) ?? [];
    return (
      <div>
        <h2>Merge Queue</h2>
        <ul>
          {candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.status}</li>
          ))}
        </ul>
        <ul>
          {conflicts.map((conflict) => (
            <li key={conflict.id}>{conflict.kind}</li>
          ))}
        </ul>
      </div>
    );
  }, [data, tab]);

  return content;
}

function label(tab: Tab): string {
  const labels: Record<Tab, string> = {
    dashboard: "Dashboard",
    spec: "Spec",
    work: "Work",
    team: "Team",
    execution: "Execution",
    artifacts: "Artifacts",
    inbox: "Inbox",
    merge: "Merge",
    health: "Health",
  };
  return labels[tab];
}
