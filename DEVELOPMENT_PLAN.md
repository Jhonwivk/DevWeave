# TeamAgent 第一阶段开发计划

## 1. 目标

第一阶段交付一个本地原生运行的 Human-Agent Collaborative Software Engineering Platform，证明两个真实 Human 与三类 Agent 能围绕同一 OAuth 项目完成 Specification-Driven、可验证、可回溯、可分叉的软件工程协作。

第一阶段完成不等于“Agent 能生成代码”，而是以下闭环可以重复运行：

```text
Effective Specification
→ Work Graph
→ Human-selected / System-generated Agent Memberships
→ Isolated Executions
→ Artifact and Contract Handoff
→ Human Intervention and Exact Rewind
→ Change Coordination
→ Merge Queue and Verification
→ Verified Specification Coverage
```

## 2. 已固定的实现边界

- TypeScript monorepo。
- React Web UI、Node.js Server 和独立 Worker。
- Modular monolith，不拆微服务。
- PostgreSQL 保存领域状态、Domain Event、Outbox、持久任务队列和投影。
- HTTP Command/Query API + SSE 实时更新。
- Git worktree 隔离每次 Execution；integration worktree 驱动 merge queue。
- Pi 是默认真实 Kernel，Mock Executor 用于确定性测试。
- 本地原生运行，不使用 Docker。
- 不读取或统一 Agent 内部推理；Kernel-specific 日志只作为可选原始数据。
- 精确回溯要求 Kernel Checkpoint 与 Workspace Checkpoint 在同一稳定边界原子对齐。

## 3. 建议代码结构

```text
apps/
  web/                    React project UI
  server/                 HTTP API and SSE
  worker/                 persistent execution worker

packages/
  domain/                 entities, value objects, state machines
  application/            commands, queries, policies, orchestration
  persistence/            PostgreSQL repositories, migrations, outbox
  shared-contracts/       API, event and serialized schema contracts
  executor-sdk/           AgentExecutor interface and contract tests
  pi-adapter/              Pi black-box adapter
  mock-adapter/            deterministic executor
  workspace-git/          repositories, worktrees, checkpoints, merge queue
  verification/           project Verification Profile runner
  test-fixtures/          OAuth fixture and executor fixtures

docs/
  adr/                     hard-to-reverse architecture decisions
```

领域层不得依赖 Web、PostgreSQL、Git 或具体 Executor。Adapter 和基础设施只能通过 application ports 接入。

## 4. 核心写入模型

每个外部写入首先成为版本化 Command：

```text
HTTP Command
→ authenticate / authorize
→ validate expected aggregate version
→ execute domain transition
→ write domain state + Domain Event + Outbox in one transaction
→ async projection / SSE update
```

Command 必须支持 idempotency key。Event 至少包含：

```text
event_id
project_id
project_sequence
aggregate_id
aggregate_version
actor
causation_id
correlation_id
occurred_at
payload_version
```

Event 只追加。历史更正通过新 Event 表达，不能原地修改。

## 5. 核心状态机

```text
Specification:
draft → in_review → effective → superseded | withdrawn

WorkItem:
draft → ready → assigned → in_progress
      → waiting_for_human | blocked | ready_for_review
      → completed | cancelled

Execution:
queued → starting → running → waiting_for_human | paused
       → completed | failed | cancelled | unknown

Artifact:
draft → published → superseded | deprecated

Decision:
proposed → decided → superseded | withdrawn

ChangeIntent:
proposed → reserved → active → released | superseded | conflicted

MergeCandidate:
created → queued → rebasing → validating → mergeable → merged
        → conflicted | validation_failed | cancelled | stale
```

WorkItem 与 Execution 生命周期必须保持独立；回溯产生新 Execution，不让旧 Execution 状态倒退。

## 6. 里程碑

### M0 — Contracts & Skeleton

目标：建立可编译、可测试、可迁移、可本地启动的工程骨架，并固定第一版公共契约。

交付：

- Monorepo、严格 TypeScript 配置和统一脚本。
- Web、Server、Worker 空壳和健康检查。
- Domain module 与核心 ID/value object。
- Executor、Command、Event、Artifact、Verification 公共契约。
- PostgreSQL migration、transaction 和 outbox 骨架。
- 本地依赖检查与启动文档。
- Mock Executor contract test harness。
- 第一批关键 ADR。

退出条件：

- 新环境按文档安装 Node、包管理器、Git、PostgreSQL 后可原生启动。
- Web、Server、Worker 都有健康状态。
- migration 可从空数据库执行并回退测试数据库。
- Mock Executor 通过统一 contract tests。
- `typecheck / lint / unit test` 全部通过。

### M1 — Project / Specification / WorkItem

目标：从导入 Git 仓库到批准 Work Graph，建立 SDD 主链。

交付：

- Project 创建、仓库导入、base branch 和 Verification Profile。
- Owner/Member 本地账户和项目邀请。
- Git-backed Markdown Specification + YAML front matter。
- 稳定 Requirement / Acceptance Criteria ID。
- Spec lifecycle、版本、review result 和 supersede。
- WorkItem DAG、Exploration WorkItem 和 Coverage Matrix。
- Planning Agent proposal 数据结构；Human 登记线下共识结果。

退出条件：

- Effective Spec 的每条 Acceptance Criteria 都能映射到 WorkItem 或显示 uncovered。
- Spec 新版本能将相关 WorkItem 标记为 `stale_spec`。
- 并发修改通过 expected version 拒绝静默覆盖。

### M2 — Mock Executor Vertical Slice

目标：不依赖 Pi，跑通第一个完整 Execution。

交付：

- PostgreSQL-backed Execution queue 和 Worker heartbeat。
- Workspace Manager 与 fixture Git repository。
- Mock Executor 的 success/failure/pause/timeout/unknown 场景。
- Execution state projection、SSE 和基础 Execution UI。
- Workspace diff、Verification Evidence 和 WorkItem completion。

退出条件：

- UI 可以完成 `Project → Spec → WorkItem → Mock Execution → Verification → Complete`。
- Worker 重启后能恢复任务或可信地标记 `unknown`。
- 重复 Command 不会重复启动 Execution。

### M3 — Pi / Workspace / Exact Rewind

目标：接入第一个真实 Kernel，并实现平台与 Kernel 对齐的精确回溯。

交付：

- Pi Adapter 与 capability negotiation。
- 每 Execution 独立 worktree 和平台命名分支。
- interrupt、optional send/resume、原始日志关联。
- Workspace Checkpoint。
- opaque Kernel Checkpoint Reference。
- Composite Execution Checkpoint 原子发布。
- exact Execution Branch 与 reconstructed fallback。
- Checkpoint restore failure 和 retention 行为。

退出条件：

- Pi 能在受控 worktree 中完成一个真实代码任务。
- Human 能中断、选取 Checkpoint、修改输入并创建新分支。
- Kernel 和 Workspace 都回到同一节点；旧路径保持可查看。
- 不支持 exact rewind 的 Adapter 不会把 reconstructed branch 标记成精确恢复。

### M4 — Human + Agent Membership

目标：支持 Human 与三类 Agent 形成项目团队。

交付：

- AgentActor 与统一 Agent Membership。
- Digital Employee 固定 Release 手动导入。
- Private Agent Manifest、配置摘要和项目内副本。
- Capability Catalog、Capability Evidence 和 Capability Gap。
- System-Generated Agent Candidate + qualification。
- Human 手动 Assignment、Assignment Concern 和 Reassignment history。
- Agent permission intersection、临时 Permission Request 和不可 override 底线。

退出条件：

- 三类 Agent 均可通过同一 WorkItem/Execution 协议工作。
- Digital Employee/Private Agent 不做自动排名。
- 不满足高风险硬约束的 Assignment 会被阻止或留下显式 override 记录。

### M5 — Structured Collaboration

目标：从任务并行升级为 Artifact、Decision 和 Context 驱动的协作。

交付：

- Versioned Artifact 与 adopted version。
- API Contract 等高风险 Artifact。
- Human 线下共识的 Decision 登记。
- Context Package builder。
- Contract/Spec dependency invalidation。
- Domain Event、Execution Telemetry、Audit Event 和 Causality projections。
- 站内 Inbox，只通知需要 Human 行动的事件。

退出条件：

- Producer 发布 Contract 后，Consumer 必须显式采用版本。
- Contract 更新能将依赖 WorkItem/Execution 标记为 stale。
- 平台能区分观察事实与 Agent 自述。

### M6 — Change Coordination / Merge Queue

目标：在 Git merge 前管理并行变更意图、依赖和验证。

交付：

- Change Intent Registry。
- affected files/symbols/contracts 预测和软 Reservation。
- API Contract、Schema、Shared Type 等高风险 Ownership。
- Text/Symbol/Contract/Semantic conflict 分类。
- integration worktree、rebase queue 和 stale detection。
- Versioned Verification Profile。
- Merge Candidate、validation evidence 和 Human selection。
- 有限自动修复；超预算或高风险升级 Human。

退出条件：

- clean Git merge 但集成测试失败时能记录 Semantic Conflict。
- Contract 变化能在 merge 前触发 dependent revalidation。
- 未通过 Verification 的候选无法进入受保护共享分支。

### M7 — OAuth End-to-End

目标：完成第一阶段验收，不继续扩充平台范围。

团队：

```text
Human A                 Project / Backend Owner
Human B                 Frontend / Integration Reviewer
Digital Employee        Backend OAuth
Private Agent           Frontend Login
System-Generated Agent  Integration / QA
```

必须运行三次：

1. 正常 Artifact handoff、验证和 merge。
2. 主动制造 Agent 失败，通过 Checkpoint 或新 Execution 恢复。
3. 主动制造 Contract 变化或 merge/semantic conflict，完成失效传播、修复和重新验证。

最终出口条件：

- 全流程可通过 Web UI 完成。
- Effective Spec 的 Coverage Matrix 全部 verified 或具有 Human waiver。
- 关键平台操作、Execution、Checkpoint、Artifact、Decision 和 merge 均可回溯。
- 在干净本地环境中按文档原生启动。
- 自动测试覆盖正常路径和上述两个失败路径。

## 7. M0 实施清单

### M0-A — Repository & Tooling

- [ ] `M0-A01` 初始化 TypeScript workspace 与统一 package scripts。
- [ ] `M0-A02` 创建 `apps/web`、`apps/server`、`apps/worker`。
- [ ] `M0-A03` 创建 `packages/domain`、`application`、`persistence`、`shared-contracts`、`executor-sdk`、`mock-adapter`。
- [ ] `M0-A04` 开启 strict typecheck，配置 lint、format 和 unit test。
- [ ] `M0-A05` 增加本地环境诊断：Node、包管理器、Git、PostgreSQL、Pi。
- [ ] `M0-A06` 编写不依赖 Docker 的安装、数据库初始化和启动说明。

### M0-B — Domain Contracts

- [ ] `M0-B01` 定义 branded IDs：Project、Actor、Membership、Spec、WorkItem、Execution、Checkpoint、Artifact、Decision、Event。
- [ ] `M0-B02` 将已确认状态机编码为纯 Domain transitions。
- [ ] `M0-B03` 定义 versioned Command Envelope 和 idempotency contract。
- [ ] `M0-B04` 定义 versioned Domain Event Envelope 和 causation/correlation fields。
- [ ] `M0-B05` 定义 Artifact、Verification Evidence 和 Context Package serialization contracts。
- [ ] `M0-B06` 为公共契约增加 schema compatibility tests。

### M0-C — Executor Contract

- [ ] `M0-C01` 定义 `ExecutorCapabilities`。
- [ ] `M0-C02` 定义必需接口：`start / interrupt / getState / subscribe`。
- [ ] `M0-C03` 定义可选接口：`send / resume / checkpoint / forkFrom`。
- [ ] `M0-C04` 定义 opaque `KernelCheckpointRef` 和 Adapter/version metadata。
- [ ] `M0-C05` 定义标准 Execution states 与 Kernel mapping contract。
- [ ] `M0-C06` 建立 Executor contract test suite。
- [ ] `M0-C07` 实现最小 Mock Executor 并通过 contract tests。

### M0-D — Persistence & Runtime Skeleton

- [ ] `M0-D01` 建立 PostgreSQL migration runner。
- [ ] `M0-D02` 建立 transaction boundary 和 repository ports。
- [ ] `M0-D03` 建立 Domain Event + Outbox 原子写入测试。
- [ ] `M0-D04` 建立 project sequence、aggregate version 和 optimistic concurrency primitive。
- [ ] `M0-D05` 建立 idempotency record primitive。
- [ ] `M0-D06` 建立持久 job schema、lease 和 heartbeat primitive。
- [ ] `M0-D07` 建立 Server/Worker health endpoint 与优雅关闭。

### M0-E — Web/API Skeleton

- [ ] `M0-E01` 定义 API error envelope、request correlation 和 actor context。
- [ ] `M0-E02` 建立 Command API 与 Query API 基础路由。
- [ ] `M0-E03` 建立 SSE connection、project cursor 和 reconnect contract。
- [ ] `M0-E04` 建立最小 Web shell、Project route 和系统健康页面。

### M0-F — Verification

- [ ] `M0-F01` 所有 package 可独立 typecheck。
- [ ] `M0-F02` Domain、Executor 和 persistence contract tests 全绿。
- [ ] `M0-F03` migration 可在临时测试数据库从零执行。
- [ ] `M0-F04` Server、Worker、Web 可通过一组原生命令同时启动。
- [ ] `M0-F05` 中断 Worker 后 job lease 可以被检测，不会静默重复执行。
- [ ] `M0-F06` 在文档中记录 M0 已知限制和 M1 入口条件。

## 8. 风险与控制

### 精确回溯受 Kernel 能力限制

控制：Executor capability 明确区分 exact 和 reconstructed；M3 用 Pi 做真实 contract test，不用接口存在代替能力验证。

### 平台范围滑向 Agent 产品或企业平台

控制：坚持黑盒 Kernel、简单本地身份、单执行主机和明确 out-of-scope；M7 后才重新评估范围。

### Event 记录很多但无法重建事实

控制：状态、Domain Event 和 Outbox 同事务；project sequence、aggregate version、causation/correlation 为必需字段；投影必须有 rebuild test。

### Change Intent 预测不准确

控制：默认软 Reservation；只有 Contract/Schema 等高风险范围可硬约束；最终裁判始终是 Verification。

### Human 共识不可被平台验证

控制：明确使用 Recorded Consensus 语义，只记录结果和登记者，不声称平台完成投票或一致性证明。

## 9. M0 之后的变更纪律

- 新增领域术语时同步更新 `CONTEXT.md`。
- 破坏公共契约时必须升级 schema/version 并提供迁移。
- 只有同时满足“难逆转、原因不显然、存在真实取舍”的决策才新增 ADR。
- 每个里程碑结束后先验证退出条件，再开始下一个里程碑。
- M7 验收前不引入 Agent 市场、云多租户、生产权限或大型团队实验。
