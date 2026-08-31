import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  envelope,
  liveClient,
  type OAuthDemoResult,
  type PlatformClient,
} from "./api.ts";
import { HealthPage } from "./health/HealthPage.tsx";
import { ProjectPanel } from "./ProjectPanel.tsx";

export type ProjectTab =
  | "dashboard"
  | "timeline"
  | "spec"
  | "work"
  | "team"
  | "execution"
  | "artifacts"
  | "inbox"
  | "merge"
  | "health";

type ProjectSummary = { id: string; name: string; version: number };

const NAVIGATION: {
  label: string;
  items: { id: ProjectTab; label: string; icon: IconName }[];
}[] = [
  {
    label: "Project",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "timeline", label: "Timeline", icon: "pulse" },
    ],
  },
  {
    label: "Plan",
    items: [
      { id: "spec", label: "Spec", icon: "document" },
      { id: "work", label: "Work", icon: "branch" },
    ],
  },
  {
    label: "Collaborate",
    items: [
      { id: "team", label: "Team", icon: "users" },
      { id: "execution", label: "Execution", icon: "terminal" },
      { id: "artifacts", label: "Artifacts", icon: "package" },
      { id: "inbox", label: "Inbox", icon: "inbox" },
    ],
  },
  {
    label: "Integrate",
    items: [
      { id: "merge", label: "Merge", icon: "merge" },
      { id: "health", label: "Health", icon: "pulse" },
    ],
  },
];

export function App({ client = liveClient }: { client?: PlatformClient }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string>();
  const [tab, setTab] = useState<ProjectTab>("dashboard");
  const [name, setName] = useState("OAuth");
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [runningDemo, setRunningDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<OAuthDemoResult>();

  useEffect(() => {
    let cancelled = false;
    client
      .listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(messageFor(reason, "无法加载项目"));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function createProject(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入 Project 名称。");
      return;
    }
    setCreating(true);
    try {
      const result = await client.command(
        envelope("CreateProject", { name: trimmedName }),
      );
      if (!result.ok || !result.aggregateId) {
        setError(result.error?.message ?? "创建失败");
        return;
      }
      const refreshed = await client.listProjects();
      setProjects(refreshed);
      setError(undefined);
      setDemoResult(undefined);
      setProjectId(result.aggregateId);
      setTab("dashboard");
    } catch (reason: unknown) {
      setError(messageFor(reason, "创建失败"));
    } finally {
      setCreating(false);
    }
  }

  async function runDemo(): Promise<void> {
    setRunningDemo(true);
    setError(undefined);
    try {
      const result = await client.runOAuthDemo();
      const refreshed = await client.listProjects();
      setProjects(refreshed);
      setDemoResult(result);
      setProjectId(result.projectId);
      setTab("dashboard");
    } catch (reason: unknown) {
      setError(messageFor(reason, "OAuth Demo 运行失败"));
    } finally {
      setRunningDemo(false);
    }
  }

  const selectedProject = projects.find((project) => project.id === projectId);

  if (!projectId) {
    return (
      <ProjectLauncher
        projects={projects}
        name={name}
        creating={creating}
        runningDemo={runningDemo}
        error={error}
        onName={setName}
        onCreate={createProject}
        onRunDemo={runDemo}
        onSelect={(id) => {
          setProjectId(id);
          setTab("dashboard");
          setError(undefined);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand compact />
        <button
          className="project-switcher"
          type="button"
          onClick={() => setProjectId(undefined)}
        >
          <span className="project-mark">
            {initials(selectedProject?.name ?? "Project")}
          </span>
          <span className="project-switcher-copy">
            <span>{selectedProject?.name ?? "Project"}</span>
            <small>Project workspace</small>
          </span>
          <Icon name="chevron" />
        </button>

        <nav className="side-navigation" aria-label="项目视图">
          {NAVIGATION.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  className="nav-item"
                  key={item.id}
                  type="button"
                  aria-current={item.id === tab ? "page" : undefined}
                  onClick={() => setTab(item.id)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.id === "inbox" ? (
                    <span className="nav-dot" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="avatar">HO</span>
          <span>
            <strong>Human Owner</strong>
            <small>Project owner</small>
          </span>
          <Icon name="dots" />
        </div>
      </aside>

      <div className="workspace-shell">
        <header className="workspace-header">
          <div className="breadcrumbs" aria-label="当前位置">
            <span>Projects</span>
            <Icon name="chevron" />
            <strong>{selectedProject?.name ?? "Project"}</strong>
          </div>
          <div className="workspace-status">
            <span className="live-dot" />
            Live project state
            <span className="header-divider" />
            <span className="version-label">v{selectedProject?.version ?? "—"}</span>
          </div>
        </header>

        <main className="workspace-content">
          {error ? (
            <div className="alert" role="alert">
              <Icon name="warning" />
              <span>{error}</span>
            </div>
          ) : null}
          {demoResult ? (
            <div className="demo-success" role="status">
              <Icon name="pulse" />
              <span>
                <strong>OAuth Demo 已完整跑通</strong>
                <small>
                  {demoResult.summary.completedWorkItems} 个 Work Item ·{" "}
                  {demoResult.summary.mergedCandidates} 个验证合并 ·{" "}
                  {demoResult.summary.conflicts} 个已处理冲突
                </small>
              </span>
            </div>
          ) : null}
          {tab === "health" ? (
            <HealthPage />
          ) : (
            <ProjectPanel client={client} projectId={projectId} tab={tab} />
          )}
        </main>
      </div>
    </div>
  );
}

function ProjectLauncher({
  projects,
  name,
  creating,
  runningDemo,
  error,
  onName,
  onCreate,
  onRunDemo,
  onSelect,
}: {
  projects: ProjectSummary[];
  name: string;
  creating: boolean;
  runningDemo: boolean;
  error?: string;
  onName: (name: string) => void;
  onCreate: (event: FormEvent) => Promise<void>;
  onRunDemo: () => Promise<void>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="launcher">
      <header className="launcher-header">
        <Brand />
        <span className="launcher-status">
          <span className="live-dot" /> Local workspace
        </span>
      </header>

      <main className="launcher-main">
        <section className="launcher-intro" aria-labelledby="launcher-title">
          <span className="eyebrow">Human × Agent engineering</span>
          <h1 id="launcher-title">让团队围绕同一份工程事实协作。</h1>
          <p className="launcher-lead">
            从 Effective Specification 到可验证合并，在一个 Project 中协调
            Human、Digital Employee、Private Agent 与 System-Generated Agent。
          </p>
          <div className="launcher-principles">
            <Principle
              icon="document"
              title="Specification-driven"
              copy="稳定需求 ID 与覆盖矩阵"
            />
            <Principle
              icon="branch"
              title="Traceable execution"
              copy="隔离 Workspace 与精确分支"
            />
            <Principle
              icon="merge"
              title="Verified integration"
              copy="冲突协调与验证门禁"
            />
          </div>
        </section>

        <section className="launch-card" aria-labelledby="create-project-title">
          <div className="launch-card-heading">
            <span className="card-icon">
              <Icon name="plus" />
            </span>
            <div>
              <h2 id="create-project-title">创建 Project</h2>
              <p>建立一个新的长期协作边界。</p>
            </div>
          </div>
          {error ? (
            <div className="alert" role="alert">
              <Icon name="warning" />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="demo-launch">
            <div className="demo-launch-copy">
              <span className="demo-icon">
                <Icon name="pulse" />
              </span>
              <span>
                <strong>OAuth 协作 Demo</strong>
                <small>从 Project、Spec 和组队，一直运行到验证合并。</small>
              </span>
            </div>
            <button
              className="demo-button"
              type="button"
              disabled={runningDemo || creating}
              onClick={() => void onRunDemo()}
            >
              {runningDemo ? "正在运行完整流程…" : "一键从 0 到 1 跑通"}
              <Icon name="arrow" />
            </button>
          </div>
          <div className="launch-divider">
            <span>或创建空白 Project</span>
          </div>
          <form onSubmit={(event) => void onCreate(event)}>
            <label className="field-label" htmlFor="project-name">
              Project 名称
            </label>
            <div className="field-control">
              <Icon name="folder" />
              <input
                id="project-name"
                aria-label="项目名称"
                value={name}
                onChange={(event) => onName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={creating || runningDemo}
            >
              {creating ? "正在创建…" : "创建 Project"}
              <Icon name="arrow" />
            </button>
          </form>

          <div className="recent-projects">
            <div className="section-label-row">
              <span>最近的 Projects</span>
              <small>{projects.length}</small>
            </div>
            {projects.length ? (
              <div className="project-list">
                {projects.map((project) => (
                  <button
                    className="project-row"
                    type="button"
                    key={project.id}
                    onClick={() => onSelect(project.id)}
                  >
                    <span className="project-mark small">{initials(project.name)}</span>
                    <span>
                      <strong>{project.name}</strong>
                      <small>Version {project.version}</small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="inline-empty">还没有 Project。创建后会出现在这里。</p>
            )}
          </div>
        </section>
      </main>
      <footer className="launcher-footer">
        Local-first · Git-backed · Human accountable
      </footer>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-copy">
        <strong>TeamAgent</strong>
        {!compact ? <small>Collaborative engineering</small> : null}
      </span>
    </div>
  );
}

function Principle({
  icon,
  title,
  copy,
}: {
  icon: IconName;
  title: string;
  copy: string;
}) {
  return (
    <div className="principle">
      <span>
        <Icon name={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{copy}</small>
      </div>
    </div>
  );
}

type IconName =
  | "arrow"
  | "branch"
  | "chevron"
  | "document"
  | "dots"
  | "folder"
  | "grid"
  | "inbox"
  | "merge"
  | "package"
  | "plus"
  | "pulse"
  | "terminal"
  | "users"
  | "warning";

function Icon({ name }: { name: IconName }): ReactNode {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    branch: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="19" r="2" />
        <path d="M6 7v10M8 7c5 0 3-1 8-1" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    document: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    folder: <path d="M3 6h7l2 2h9v11H3z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="m4 14 4-4h8l4 4M9 15h6" />
      </>
    ),
    merge: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="12" cy="19" r="2" />
        <path d="M6 7v2c0 4 6 3 6 8M18 7v2c0 4-6 3-6 8" />
      </>
    ),
    package: (
      <>
        <path d="m4 7 8-4 8 4v10l-8 4-8-4z" />
        <path d="m4 7 8 4 8-4M12 11v10" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    terminal: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m7 9 3 3-3 3M13 15h4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-4 3-7 6-7s6 3 6 7M15 14c3 0 5 2 5 5" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.5 20h19z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "PR";
}

function messageFor(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}
