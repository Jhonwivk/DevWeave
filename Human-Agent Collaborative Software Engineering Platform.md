# Human-Agent Collaborative Software Engineering Platform
## 项目背景与总体架构设计

> 暂定项目名：**TeamAgent / Agentic TeamOS**  
> 项目定位：面向真实软件团队的 **Human-Agent Collaborative Software Engineering Platform**  
> 核心目标：构建一个支持**多个真人开发者与多个异构 AI Coding Agent 围绕同一软件项目持续协作**的工程平台，并为后续 Human-Agent Team 组织模式研究提供实验基础设施。

---

# 0. 已确认架构基线（2026-08-28）

本文后续设计遵循以下已经确认的边界：

1. 第一阶段只证明一个核心命题：**多个 Human 与多个异构 Agent 能围绕同一真实 Project 完成结构化、可验证、可回溯的软件工程协作。**
2. 平台采用 Specification-Driven Development。Effective Specification 是 Work Graph、验收标准、Verification Evidence 和 Change Impact 的上游事实。
3. AgentActor 分为三种来源：正式发布的 Digital Employee、Human 手动引入的 Private Agent、系统按能力缺口生成的 System-Generated Agent。三者通过统一 Agent Membership 和协作协议进入项目。
4. Digital Employee 与 Private Agent 均由 Human 手动指定。系统只检查硬约束、识别 Capability Gap，不对具体人选做自动排名。System-Generated Agent Candidate 由系统生成、Human 确认。
5. Human 共识发生在线下。平台不实现投票或强制多人确认，只记录共识结果、登记者、版本和历史变化。
6. Pi、Codex、Claude Code 等是黑盒 Execution Kernel。平台不解析 Agent 内部推理，只管理输入、生命周期、Workspace、Artifact、Verification 和可选原始日志。
7. 精确回溯由组合 Execution Checkpoint 实现：同一稳定边界上的 Workspace Checkpoint 与不透明 Kernel Checkpoint Reference 原子绑定。回溯创建新 Execution Branch，旧路径不被篡改。
8. 多 Agent 变更使用分层冲突控制：Change Intent、软 Reservation、高风险 Contract Ownership、依赖失效、隔离 worktree、merge queue 和 Verification。Git clean merge 不等于工程无冲突。
9. 所有影响项目状态、权限、Execution 或共享工程结果的平台操作均可回溯；可回溯不等于所有外部副作用可逆。
10. 第一版是 TypeScript modular monolith：React Web、Node.js Server/Worker、PostgreSQL、SSE、Git worktree；本地原生运行，不使用 Docker，不拆微服务。

第一阶段明确不包含 Agent 市场、具体 Agent 自动推荐、企业 SSO/完整 RBAC、云多租户、生产环境操作、跨执行主机 Checkpoint、Agent 群聊和大规模组织实验。

---

# 1. 项目背景

## 1.1 从 AI Coding Assistant 到 Coding Agent

过去的软件开发 AI 主要采用 Copilot 模式：

```text
Human Developer
      │
      ▼
AI Coding Assistant
      │
      ▼
Code
```

AI 的角色主要是：

- 代码补全
- 代码解释
- 问答
- 局部代码生成
- Debug 辅助

本质上仍然是：

> **Human executes, AI assists.**

随着 Coding Agent 的发展，Agent 已经开始能够自主：

```text
Understand Task
      ↓
Explore Repository
      ↓
Plan
      ↓
Modify Code
      ↓
Run Commands
      ↓
Run Tests
      ↓
Observe Failure
      ↓
Repair
      ↓
Deliver Result
```

软件工程开始进入：

> **Human delegates, Agent executes.**

---

# 2. Coding Agent 之后的问题发生了变化

当 Agent 只能补全代码时，核心问题是：

> AI 能不能生成正确代码？

但当 Agent 能够持续工作几十分钟甚至更长时间，并独立操作代码库、Git、测试和工具链以后，新的问题变成：

> **这些 Agent 如何真正进入一个由多人组成的软件团队？**

真实软件开发不是：

```text
Human
  ↓
Agent
  ↓
Code
```

而是：

```text
Product
Architect
Backend
Frontend
QA
Security
DevOps
Reviewer
        │
        ▼
Shared Software Project
```

其中存在大量：

- 任务依赖
- Ownership
- Architecture Decision
- Code Review
- Knowledge Sharing
- API Contract
- Handoff
- Permission
- Conflict
- Approval
- CI/CD
- Responsibility

因此：

> **Agent 能写代码 ≠ Agent 能成为软件团队成员。**

---

# 3. 当前 AI Coding 的基本单位仍然是“个人”

当前大量 Coding Agent 产品的基本交互模型仍然可以抽象为：

```text
Developer
    │
    ▼
Coding Agent
    │
    ▼
Repository
```

即使支持多个 Agent，也通常是：

```text
               Human
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      Agent A  Agent B  Agent C
```

它解决的是：

> **一个人如何并行使用多个 Agent。**

但真实团队面对的是：

```text
Human A ── Agent A
Human B ── Agent B
Human C ── Agent C
             │
             ▼
        Shared Project
```

这里增加了一个全新的维度：

> **Human-Human-Agent-Agent Coordination**

---

# 4. 项目核心问题

因此，本项目第一阶段不尝试直接回答：

> 什么样的 Human-Agent Team 最优？

这是后续研究问题。

第一阶段首先解决一个工程问题：

> **如何让多个真人开发者与多个 AI Agent 围绕同一个真实软件项目进行持续、结构化、可观察、可追踪、可交接的协作？**

目标不是构建：

> Multi-Agent Chat

也不是：

> Multiplayer Cursor

而是构建：

> **Human-Agent Collaborative Software Engineering Runtime**

---

# 5. 项目的长期研究问题

当第一阶段 Human-Agent Collaboration 基础设施完成以后，本项目进一步成为实验平台，用于研究：

> **AI Agent 真正进入软件团队以后，软件团队应该长什么样？**

例如研究：

### Human-Agent Ratio

```text
1 Human : 1 Agent
1 Human : 3 Agents
1 Human : 5 Agents
3 Humans : 10 Agents
```

### Team Topology

```text
Human-led
Agent-led
Co-led
```

### Agent Specialization

```text
Generalist Agent
```

vs.

```text
Architect Agent
Backend Agent
Frontend Agent
QA Agent
Security Agent
```

### Organization

```text
Static Team
```

vs.

```text
Dynamic / Ephemeral Agent Team
```

### Authority

```text
Agent Advisory
Agent Approval Required
Agent Veto
Human Override
```

### Collaboration

```text
Synchronous
Asynchronous
Handoff-based
Shared-state-based
```

最终研究目标是：

> **Human-Agent Team Patterns for Software Engineering**

---

# 6. 项目总体分层

整个项目分成三层：

```text
┌─────────────────────────────────────────────────────┐
│ L3 — Team Research & Experiment Layer               │
│                                                     │
│ Team Topology                                       │
│ Human-Agent Ratio                                   │
│ Governance Experiments                              │
│ Coordination Experiments                            │
│ Metrics / Benchmark                                 │
│ Organization Patterns                               │
└────────────────────────▲────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────┐
│ L2 — Human-Agent Collaboration Layer                │
│                                                     │
│ Multi-Human                                         │
│ Multi-Agent                                         │
│ Assignment                                          │
│ Handoff                                             │
│ Shared State                                        │
│ Ownership                                           │
│ Decision                                            │
│ Approval                                            │
│ Governance                                          │
│ Coordination Protocol                               │
└────────────────────────▲────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────┐
│ L1 — Agentic Development Runtime                    │
│                                                     │
│ Project                                             │
│ Actor                                               │
│ Work Item                                           │
│ Execution                                           │
│ Artifact                                            │
│ Event                                               │
│ Workspace                                           │
│ Context                                             │
│ Executor Control Plane                              │
└────────────────────────▲────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
           Pi          Codex      Claude Code
                         ...
                 Execution Kernels
```

---

# 7. 核心架构原则

## 7.1 Project-Centric，而不是 Chat-Centric

系统最重要的对象不是：

```text
Chat
```

也不是：

```text
Agent
```

而是：

```text
Project
```

原因是 Agent、人、模型和 Session 都可能变化。

但长期存在的是：

> **Software Project。**

因此：

```text
Project
│
├── Actors
├── Work Items
├── Executions
├── Artifacts
├── Decisions
├── Workspaces
└── Events
```

---

# 8. Agent 与 Execution Kernel 解耦

本项目不自行重新实现 Coding Agent。

Pi、Codex、Claude Code 等均视为：

> **Execution Kernel**

系统通过统一 Executor Interface 调用不同 Agent Runtime。

```text
                 Execution Control Plane

                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
       Pi Executor   Codex Executor  Claude Executor
             │            │            │
             ▼            ▼            ▼
            Pi          Codex      Claude Code
```

第一阶段优先使用 **Pi Agent** 作为第一个 Execution Kernel。

但系统架构不依赖 Pi。

---

# 9. Executor Interface

定义统一接口：

```typescript
interface AgentExecutor {
  capabilities(): ExecutorCapabilities;

  start(
    input: ExecutionInput
  ): Promise<ExecutionHandle>;

  interrupt(
    executionId: string
  ): Promise<void>;

  getState(
    executionId: string
  ): Promise<ExecutionState>;

  subscribe(
    executionId: string,
    handler: (event: ExecutorEvent) => void
  ): Unsubscribe;

  checkpoint?(
    executionId: string,
  ): Promise<KernelCheckpointRef>;

  forkFrom?(
    checkpoint: KernelCheckpointRef,
    input: ExecutionInput
  ): Promise<ExecutionHandle>;

  resume?(executionId: string): Promise<void>;

  send?(
    executionId: string,
    input: AgentInput
  ): Promise<void>;
}
```

`start / interrupt / getState / subscribe` 是最低必需能力；`send / resume / checkpoint / forkFrom` 通过 capability negotiation 声明。平台不读取 `KernelCheckpointRef` 的内部内容，只将它交还给同类 Adapter。

不支持内部 checkpoint/fork 的 Kernel 仍可从 Workspace Checkpoint 启动新 Execution，但必须标记为 `reconstructed branch`，不能冒充精确回溯。

不同 Runtime 分别实现：

```text
PiExecutor
CodexExecutor
ClaudeCodeExecutor
GeminiExecutor
```

上层只认识：

```text
Execution
```

而不知道：

```text
PiSession
CodexThread
ClaudeSession
```

---

# 10. Agent ≠ Model ≠ Execution Kernel

系统明确区分 AgentActor、Execution Kernel 和 Model，并区分三类 Agent 来源。

## AgentActor

项目中的非 Human 执行主体：

```text
AgentActor
├── Digital Employee
├── Private Agent
└── System-Generated Agent
```

三类 Agent 进入项目后都创建统一的 Agent Membership：

```text
Source Type
Role
Permissions
Sponsor
Configuration Snapshot / Release
Trust Status
Capability Evidence
```

- Digital Employee：正式发布、能力固化、具备可验证来源的 Agent Release，由 Human 手动引入。
- Private Agent：Human 长期培养和控制的私人 Agent，由 Human 手动引入；私人记忆不会自动进入项目。
- System-Generated Agent：系统根据 Capability Gap 生成的项目内 Candidate，经 Human 确认和资格验证后加入项目。

## Execution Kernel

执行能力：

```text
Pi
Codex
Claude Code
```

## Model

认知模型：

```text
GPT
Claude
Gemini
DeepSeek
...
```

因此：

```text
Agent
  │
  ▼
Execution
  │
  ├── Kernel
  │
  └── Model
```

同一个 Agent 可以产生多次 Execution：

```text
Backend Agent
    │
    ├── Execution #1 → Pi
    │
    ├── Execution #2 → Codex
    │
    └── Execution #3 → Claude Code
```

Agent Membership 不随一次 Execution 结束而消失，但每次 Execution 必须固定 Agent 配置、Kernel、Model、权限和 Context Package 的快照。

---

# 11. Actor：统一 Human 和 Agent

系统将所有参与项目的主体统一抽象为：

```text
Actor
│
├── HumanActor
└── AgentActor
    └── AgentMembership
        └── source_type:
            digital_employee | private | system_generated
```

Actor 可以承担：

```text
Requester
Owner
Assignee
Executor
Reviewer
Approver
Proposer
Observer
```

例如：

```text
WorkItem.owner → ActorRef

Decision.proposed_by → ActorRef

Decision.decided_by → ActorRef

Artifact.created_by → ActorRef
```

这为后续 Human-Agent Governance 提供统一基础。

Human 在线下达成共识，由任一 Human 将结果登记到平台。平台记录 `recorded_by`、目标对象、前置版本、结果版本和可选说明，但不声称观察或验证了线下讨论过程。

---

# 12. Work Item：工程协作的核心单位

Agent 不直接接受一个临时 Prompt。

所有正式工程工作首先成为：

```text
WorkItem
```

WorkItem 必须引用 Effective Specification 中的稳定条款 ID 和验收标准。尚不能形成确定规范的问题可以创建轻量的 Exploration WorkItem，但其临时代码不能绕过后续 Spec 和 Verification 直接进入共享分支。

例如：

```yaml
id: WI-102

title: Implement OAuth callback

goal:
  Add Google OAuth callback support

status:
  in_progress

requested_by:
  human-eric

assigned_to:
  backend-agent

dependencies:
  - WI-101

affected_scope:
  - src/auth
  - tests/auth

spec_refs:
  - AUTH-REQ-003
  - AUTH-AC-007

required_capabilities:
  - nodejs
  - oauth
  - integration-testing

artifacts:
  - SPEC-12
```

Work Item 可以形成 DAG：

```text
             WI-100
         OAuth Feature
              │
        ┌─────┴─────┐
        ▼           ▼
     WI-101       WI-102
     Backend      Frontend
        │           │
        └─────┬─────┘
              ▼
           WI-103
             QA
              │
              ▼
           WI-104
           Review
```

这为后续：

- 多 Agent 调度
- Dependency
- Assignment
- Handoff
- Dynamic Team

提供基础。

---

# 13. Execution：一次真实 Agent 工作

Work Item 是“要完成什么”。

Execution 是：

> **某个 Actor 使用某个 Execution Kernel 对 Work Item 进行的一次实际执行。**

例如：

```yaml
execution:
  id: EXE-1032

  work_item:
    WI-102

  actor:
    backend-agent

  executor:
    pi

  model:
    xxx

  workspace:
    WS-17

  status:
    running
```

关系：

```text
WorkItem
    │
    ├── Execution #1
    │      Pi
    │      FAILED
    │
    └── Execution #2
           Codex
           COMPLETED
```

因此：

> Work Item 生命周期独立于 Agent Session。

Execution Kernel 被视为黑盒。平台只记录平台输入、生命周期、Workspace 变化、Artifact、Decision、Verification Evidence 和可选原始日志，不依赖 Kernel 内部推理格式。

需要中途修改时，平台先在稳定边界创建：

```text
Execution Checkpoint
├── workspace_checkpoint_ref
├── kernel_checkpoint_ref
├── project_state_version
├── input_version
├── kernel / model / adapter version
└── created_at
```

Human 从 Checkpoint 创建新的 Execution Branch；Adapter 让 Kernel 回到对应不透明节点，Workspace Manager 从同一节点创建新 worktree。旧 Execution 和旧分支完整保留。

---

# 14. Workspace

每次 Coding Execution 运行在独立 Workspace：

```text
Execution
    │
    ▼
Workspace
├── Repository
├── Git Worktree
├── Branch
├── Environment
├── Logs
└── Runtime State
```

例如：

```text
/workspaces/

EXE-1001/
EXE-1002/
EXE-1003/
```

这样多个 Agent 可以并行：

```text
Backend Agent  → Worktree A
Frontend Agent → Worktree B
QA Agent       → Worktree C
```

而不是直接争用同一个 Working Directory。

---

# 15. Agent Execution Control Plane

Execution Kernel 是黑盒，但不能绕过平台直接选择共享仓库、主分支或宿主敏感路径。Control Plane 在 Kernel 边界管理进程、Workspace 和平台可观察结果，而不统一 Kernel 内部工具循环。

```text
Agent Membership + WorkItem
   │
   ▼
Execution Service
   │
   ▼
Execution Control Plane
   │
   ├── Bind approved Agent / Kernel / Model snapshot
   ├── Allocate isolated Workspace
   ├── Start / interrupt / resume / cancel process
   ├── Enforce timeout / budget / host boundaries
   ├── Align Kernel and Workspace checkpoints
   └── Record lifecycle / diff / verification / raw logs
   │
   ▼
Executor Adapter → Black-box Kernel
```

负责：

- Executor capability negotiation
- Process and permission boundary
- Timeout
- Budget
- Workspace
- Observable logging
- Cancellation
- Composite Checkpoint

第一阶段不要求拦截和标准化每一次 shell、文件或网络工具调用。后续可以通过更强的 Adapter 或 sandbox 扩展细粒度策略：

```text
Action
  ↓
Policy Engine
  ↓
ALLOW
DENY
REQUIRE_APPROVAL
  ↓
Execution
```

为第二阶段的：

- Agent Authority
- Role Permission
- Human Approval
- Security Veto

提供基础。

---

# 16. Artifact：Agent 通过工程制品协作

Agent-to-Agent Collaboration 不应该主要依赖自然语言聊天。

正式协作通过：

```text
Artifact
```

完成。

Artifact 类型：

```text
Specification
Architecture
API Contract
Code Change
Test Result
Review
Handoff
Analysis
Report
```

例如：

```text
Backend Agent
      │
      ▼
API Contract Artifact
      │
      ├───────────┐
      ▼           ▼
Frontend Agent   QA Agent
```

Artifact 示例：

```yaml
artifact:
  id: ART-204

  type:
    api_contract

  created_by:
    backend-agent

  produced_by:
    WI-102

  consumers:
    - WI-103
    - WI-104
```

因此系统从：

```text
Agent A
   ↓
Chat
   ↓
Agent B
```

升级为：

```text
Agent A
   ↓
Engineering Artifact
   ↓
Agent B
```

---

# 17. Decision：把工程决策从 Chat 中抽离

Decision 同样是一等对象。

```yaml
decision:
  id: DEC-12

  question:
    Which token storage strategy should be used?

  proposed_by:
    backend-agent

  options:
    - cookie
    - local_storage

  recommendation:
    cookie

  evidence:
    - ART-104

  status:
    decided

  recorded_by:
    human-eric

  rationale:
    ...
```

第一阶段只记录线下 Human 共识的结果：

```text
Agent Proposal
      ↓
Human offline discussion
      ↓
Recorded Decision
```

未来可以扩展：

```text
Proposal
Discussion
Voting
Authority
Veto
Escalation
Override
```

从而形成：

> **Human-Agent Governance**

---

# 18. Event：系统事实记录

平台中的重要事实分为三层记录：

```text
Domain Event
Execution Telemetry
Audit Event
```

- Domain Event：Project、Spec、WorkItem、Assignment、Artifact、Decision、Change Intent、Execution、Merge Candidate 等业务事实变化。
- Execution Telemetry：Kernel 生命周期、平台输入/输出、Workspace diff、Verification 和可选 Kernel 原始日志。
- Audit Event：登录、权限、敏感访问、override、配置、归档和保留策略操作。

平台不要求统一各 Kernel 的内部推理或工具循环。只有 Adapter 能明确映射的生命周期和工程结果才进入标准 Event；Kernel-specific 内容作为可选原始日志关联 Execution。

典型 Domain Event：

```text
PROJECT_CREATED
SPECIFICATION_EFFECTIVE
WORK_ITEM_CREATED
ASSIGNMENT_RECORDED
EXECUTION_STARTED
EXECUTION_CHECKPOINT_CREATED
EXECUTION_BRANCH_CREATED
ARTIFACT_PUBLISHED
DECISION_PROPOSED
DECISION_RECORDED
CAPABILITY_GAP_DETECTED
CHANGE_INTENT_CONFLICTED
VERIFICATION_FAILED
MERGE_CANDIDATE_MERGED
```

每条记录至少包含：

```yaml
event:
  id: EVT-8271

  project_sequence: 182
  aggregate_version: 7

  type:
    VERIFICATION_FAILED

  actor:
    backend-agent

  project:
    P-001

  work_item:
    WI-102

  execution:
    EXE-1032

  causation_id:
    EVT-8267

  correlation_id:
    CORR-192

  payload_version:
    1

  occurred_at:
    ...
```

业务状态、Domain Event 和 Outbox 在同一个 PostgreSQL 事务中写入。历史只追加；更正通过新 Event 完成。平台内可回溯不代表所有外部副作用都可自动撤销。

---

# 19. Event Graph，而不只是 Timeline

Timeline：

```text
10:01 Agent started
10:02 Agent edited file
10:03 Test failed
10:05 Agent edited file
10:06 Test passed
```

只能告诉用户：

> 发生了什么。

系统进一步记录高层工程因果关系：

```text
Specification Clause
    │
    ▼
WorkItem
    │
    ▼
Execution
    │
    ▼
Artifact / Contract
    │
    ▼
Dependent WorkItem Revalidation
    │
    ▼
Merge Candidate
    │
    ▼
Verification Evidence
```

也就是：

> **Causality Graph**

它是未来 Collaboration Research 最重要的数据基础之一。

---

# 20. Context Engine

不同 Agent 不应该简单读取整个 Repository。

Context Engine 根据：

```text
Work Item
Effective Specification
Project State
Agent Membership
Artifacts
Code
Git
Events
Decisions
Dependencies
```

动态生成：

```text
Context Package
```

例如：

```yaml
context:
  work_item:
    WI-102

  goal:
    Implement OAuth callback

  spec_refs:
    - AUTH-REQ-003
    - AUTH-AC-007

  relevant_code:
    - OAuthCallback
    - TokenService

  artifacts:
    - SPEC-12
    - ADR-4

  decisions:
    - DEC-12

  recent_events:
    - API_CHANGED

  constraints:
    - do_not_modify_database_schema
```

后续可以研究：

```text
Global Context
Project Context
Team Context
Actor Context
Work Context
Private Context
```

这将成为 Human-Agent Collaboration 的重要研究变量。

---

# 21. Shared Project State

所有参与者共享：

```text
Project State
│
├── Current Goal
├── Requirements
├── Specs
├── Work Graph
├── Actors
├── Ownership
├── Decisions
├── Artifacts
├── Executions
├── Risks
└── Status
```

Human 与 Agent 不需要依赖“读完聊天历史”来理解项目。

而是：

```text
Human ─────┐
           │
Agent A ───┼──→ Shared Project State
           │
Agent B ───┘
```

系统由：

> **Message-Centric**

逐渐转向：

> **State-Centric Collaboration**

---

# 22. 第一阶段完整系统架构

```text
┌─────────────────────────────────────────────────────────────┐
│ React Web UI                                                │
│ Project / Spec / Work Graph / Team / Execution / Branch    │
│ Artifact / Decision / Event / Merge Queue / Inbox           │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP Commands + Queries / SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ TypeScript Modular Monolith                                 │
│                                                             │
│ Project & Membership     Specification & Planning           │
│ WorkItem & Assignment    Artifact & Decision                │
│ Context Engine           Change Coordination                │
│ Execution Service        Verification & Merge Queue         │
│ Event / Audit / Projection                                  │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
                ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│ PostgreSQL               │  │ Managed Engineering Storage  │
│ Domain State             │  │ Git Repositories / Worktrees │
│ Domain Events / Outbox   │  │ Internal Checkpoint Refs     │
│ Queue / Heartbeat        │  │ Logs / Binary Artifacts      │
│ Projections / Audit      │  │ Verification Evidence        │
└──────────────────────────┘  └──────────────┬───────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Execution Control Plane / Worker                            │
│                                                             │
│ Executor Registry & Capability Negotiation                  │
│ Workspace Manager / Policy / Timeout / Budget               │
│ Composite Checkpoint / Lifecycle / Observable Results       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                 ┌────────────┼─────────────┐
                 ▼            ▼             ▼
          ┌──────────┐ ┌──────────┐ ┌────────────┐
          │ Pi       │ │ Mock     │ │ Future     │
          │ Adapter  │ │ Adapter  │ │ Adapters   │
          └────┬─────┘ └────┬─────┘ └─────┬──────┘
               ▼            ▼             ▼
              Pi       Deterministic     Codex / Claude
                       Test Kernel        Code / ...
```

实现采用一个 Server 和一个持久 Worker 进程。业务状态、Domain Event 与 Outbox 同事务写入；Worker 使用 PostgreSQL 队列领取 Execution。普通操作使用 HTTP API，实时状态通过 SSE 推送。第一阶段不引入 Redis、Kafka、Docker 或微服务。

---

# 23. 第一阶段 MVP

第一阶段不追求复杂 Multi-Agent autonomy。

只证明：

> **多个真人与三类 Agent 可以围绕一个真实 Project，从 Effective Spec 出发完成可验证、可回溯、可分叉的软件工程协作。**

固定验收配置：

```text
2 Humans
+
1 Digital Employee
+
1 Private Agent
+
1 System-Generated Agent
+
1 Repository
+
OAuth End-to-End Scenario
```

角色建议：

```text
Human A                 Project / Backend Owner
Human B                 Frontend / Integration Reviewer
Digital Employee        Backend OAuth
Private Agent           Frontend Login
System-Generated Agent  Integration / QA
```

Digital Employee 与 Private Agent 由 Human 手动指定。系统不推荐具体人选，只校验 Manifest、Release、权限、能力证据和项目硬约束。Planning Agent 识别 Capability Gap 后，可以提出 System-Generated Agent Candidate，由 Human 确认。

---

# 24. MVP 场景

验收项目是一个受平台管理的小型真实 Web 项目，主要使用本地可控 OAuth Provider，并保留可选的真实 Provider 兼容测试。它是平台测试资产，不发展为独立产品。

需求：

> 为现有 Web 项目增加 OAuth 登录。

完整流程：

```text
Effective OAuth Specification
  ↓
Planning Agent proposes Work Graph
  ↓
Human records agreed Work Graph and assignments
  ↓
Backend / Frontend isolated Executions
  ↓
API Contract Artifact published and adopted
  ↓
Contract change marks dependent work stale
  ↓
Human interrupts an Execution
  ↓
Composite Checkpoint + exact Execution Branch
  ↓
Change Intent overlap / conflict handling
  ↓
Integration / QA System-Generated Agent
  ↓
Merge Queue: rebase → verify → merge
  ↓
Spec Coverage Matrix fully verified
```

同一场景至少完整运行三次：一次正常完成、一次主动制造 Agent 失败、一次制造 Contract 或 merge 冲突。每次 Run 都保存项目版本、团队配置、Execution、Checkpoint、Artifact、Decision、Verification 和 Event 链。

---

# 25. MVP 展示界面

核心不是 Chat UI。

核心是：

## Project Execution View

```text
┌──────────────────────────────────────────────────────────────┐
│ Project: OAuth Demo                         Running ●         │
├──────────────────────────────────────────────────────────────┤
│ Work Graph                                                   │
│                                                              │
│ WI-100 OAuth                                                 │
│    ├── WI-101 ● Backend      Backend Agent                  │
│    ├── WI-102 ● Frontend     Frontend Agent                 │
│    └── WI-103 ○ Integration Test                            │
├───────────────────────────────┬──────────────────────────────┤
│ Agent Execution               │ Project Timeline             │
│                               │                              │
│ Backend Digital Employee      │ 10:21 Execution Started      │
│ EXE-241                       │ 10:22 Work Assigned           │
│                               │ 10:23 Artifact Published     │
│ Kernel: Pi                    │ 10:25 Decision Recorded      │
│ Workspace: WS-17              │ 10:27 Checkpoint Created     │
│                               │ 10:29 Execution Branched     │
│ State: Running                │ 10:31 Verification Passed    │
├───────────────────────────────┼──────────────────────────────┤
│ Artifacts                     │ Decisions                    │
│                               │                              │
│ SPEC-12                       │ DEC-4 OAuth Storage          │
│ API-3                         │ Waiting for Human            │
│ TEST-32 ✓                     │                              │
└───────────────────────────────┴──────────────────────────────┘
```

这样别人第一眼看到的不是：

> “又一个 ChatGPT。”

而是：

> **一个 Human-Agent Software Engineering Runtime。**

---

# 26. 第二个核心展示：Execution / Causality Graph

```text
             Specification Clause
                      │
                      ▼
                   WI-101
                      │
                      ▼
                  EXE-241
                Digital Employee
                      │
                      ▼
             API Contract v1
                      ▼
             Execution Checkpoint
                      │
             ┌────────┴────────┐
             ▼                 ▼
      Original Branch     Revised Branch
             │                 │
             └────────┬────────┘
                      │
                      ▼
               Human Selection
                      │
                      ▼
               Merge Candidate
                      │
               Verification
                      │
                     PASS
```

跨 Actor 因果链：

```text
Human A
   │
Digital Employee
   │
API Contract Artifact
   │
Private Agent
   │
Human B
   │
System-Generated QA Agent
```

---

# 27. 为第二阶段预留的 Extension Points

第一阶段已经包含 Multi-Human、Multi-Agent、Artifact Handoff、Human Intervention、Change Coordination 和基础权限控制。第二阶段只扩展更高阶机制：

```text
Personal / Organization Digital Employee Registry
Agent Publishing, Signing and Upgrade Distribution
Automatic Candidate Recommendation
Configurable Governance / Voting / Veto
Organization Hierarchy and Dynamic Team Topology
Remote / Distributed Execution Hosts
Cross-host Portable Checkpoints
Advanced Context and Information Boundaries
Enterprise Identity, RBAC and Compliance
Large-scale Experiment Orchestration
```

第一阶段接口必须允许这些能力以版本化扩展加入，但不为其提前实现服务、市场或分布式基础设施。

---

# 28. 第二阶段：Collaboration & Governance

第一阶段稳定以后，研究和实现可配置的协作机制：

```text
Assignment Policy
Dynamic Staffing
Authority / Veto / Override
Advanced Ownership
Conflict Resolution Strategy
Agent Publishing and Trust
Cross-project Learning Policy
Team Topology Configuration
```

这里开始比较：

> **不同 Human-Agent 协作与治理机制，哪一种在什么条件下更有效。**

---

# 29. 第三阶段：Human-Agent Team Research

最终系统成为：

> **Human-Agent Software Team Experimental Platform**

可以配置：

```yaml
team:
  humans: 3

agents:
  count: 10

topology:
  mode: human_led

specialization:
  enabled: true

governance:
  security_veto: true
  merge_authority: human

coordination:
  mode: asynchronous

handoff:
  enabled: true
```

然后运行相同工程任务。

---

# 30. 可研究的实验

### Experiment 1

Human-Agent Ratio：

```text
1:1
1:3
1:5
1:10
```

### Experiment 2

Team Leadership：

```text
Human-led
Agent-led
Co-led
```

### Experiment 3

Agent Organization：

```text
Generalist
Specialist
Dynamic Team
```

### Experiment 4

Governance：

```text
No veto
Advisory veto
Hard veto
```

### Experiment 5

Collaboration：

```text
Synchronous
Asynchronous
Handoff-based
```

---

# 31. 实验指标

系统从第一阶段开始就记录数据，以支持未来研究：

```text
Task Completion Time

Agent Execution Time

Human Active Time

Human Intervention Count

Human Approval Count

Agent-to-Agent Coordination Events

Context Switching

Rework Count

Test Failure Count

Repair Iterations

Merge Conflict Count

Artifact Handoff Count

Decision Count

Escalation Count

Token Usage

Model Cost

Defect Rate
```

后续甚至可以加入：

```text
Human Cognitive Load
Trust
Perceived Control
Coordination Overhead
```

---

# 32. 项目的核心技术创新点

本项目不把创新点放在：

> “我实现了一个 Coding Agent。”

底层 Coding Agent 可以使用 Pi / Codex / Claude Code。

真正属于项目自己的部分是：

### 1. Project-Centric Collaboration Model

从 Agent Session 转向长期 Project State。

### 2. Unified Actor Model

Human 和三类 AgentActor 成为统一的工程协作主体，同时保留来源、信任和准入差异。

### 3. WorkItem / Execution Separation

把“工程任务”与“一次 Agent Session”彻底解耦。

### 4. Kernel-Agnostic Execution Control Plane

不同 Coding Agent 可以作为黑盒可插拔 Execution Kernel；平台依赖能力接口，不依赖内部推理格式。

### 5. Artifact-Centric Agent Collaboration

Agent 通过正式工程制品而不是单纯 Chat 协作。

### 6. Decision as First-Class Object

把“为什么这样做”纳入工程系统。

### 7. Causal Event Graph

不仅记录 Timeline，还记录工作产生的因果关系。

### 8. Human Intervention Primitive

Human Decision / Approval 从第一阶段就是正式系统能力。

### 9. Specification-Driven Collaboration

Effective Specification、稳定条款 ID、Work Graph 和 Verification Evidence 构成可追溯的交付链。

### 10. Collaborative Change Coordination Engine

在 Git merge 前管理 Change Intent、Reservation、Contract Dependency、失效传播和 merge queue。

### 11. Composite Execution Checkpoint

通过不透明 Kernel Checkpoint Reference 与 Workspace Checkpoint 对齐，实现不侵入 Agent 内部的精确回溯和执行分叉。

### 12. Research-Ready Architecture

从第一阶段开始保留完整结构化数据，为 Human-Agent Team 实验提供基础。

---

# 33. 项目不做什么

为了防止项目失控，第一阶段明确不做：

- 自研基础 LLM
- 自研完整 Coding Agent
- Agent 市场与跨组织 Registry
- 自动推荐具体 Digital Employee / Private Agent
- Agent 自动组建大型团队
- 复杂 Agent Voting
- 完整组织层级
- 自动 Agent 招聘
- 复杂 Governance
- 大规模企业权限系统
- 企业 SSO 与云端多租户
- 跨执行主机 Checkpoint
- 生产环境操作
- Agent 群聊
- 多 Kernel 深度支持
- 自动解决高风险冲突
- 大规模研究实验
- 自研 Git
- 自研 CI
- 替代 GitHub
- 替代 IDE

这些能力可以使用现有系统。

本项目聚焦：

> **Human-Agent Collaboration Infrastructure。**

---

# 34. 第一阶段开发路线

开发采用垂直切片。接口和领域语言先设计，但不在没有运行反馈前把全部实现或数据库结构“定死”。每个里程碑必须具备可演示流程、自动测试、数据库迁移、结构化 Event、失败路径和运行文档。

## M0 — Contracts & Skeleton

实现：

```text
TypeScript monorepo
Domain vocabulary and state machines
Versioned Executor / Event / Artifact contracts
PostgreSQL migration framework
Server / Worker / Web skeleton
Native environment checks
```

出口条件：模块边界和契约测试可运行，开发环境不依赖 Docker。

---

## M1 — Project / Spec / WorkItem

实现：

```text
Project import
Human membership
Git-backed versioned Specification
Spec lifecycle and stable clause IDs
WorkItem DAG and Coverage Matrix
Recorded offline consensus result
```

---

## M2 — Mock Executor Vertical Slice

实现：

```text
WorkItem
   ↓
Execution
   ↓
Mock Executor
   ↓
Fixture Workspace Change
   ↓
Verification + Event + Completion
```

使用确定性 Mock 覆盖成功、失败、暂停、超时和 unknown 状态。

---

## M3 — Pi / Workspace / Exact Rewind

增加：

```text
Pi Adapter
Executor capability negotiation
Isolated Git worktree
Timeout
Cancellation
Composite Execution Checkpoint
Exact Execution Branch
Reconstructed Branch fallback
```

---

## M4 — Human + Agent Membership

增加：

```text
Project Owner / Member
Digital Employee Release import
Private Agent Manifest import
System-Generated Agent Candidate
Capability Gap
Permission Request
Human Intervention
```

---

## M5 — Structured Collaboration

增加：

```text
Versioned Artifact / Contract
Recorded Decision
Context Package
Dependency invalidation
Event / Audit / Causality projections
Inbox notifications
```

---

## M6 — Change Coordination / Merge Queue

增加：

```text
Change Intent Registry
Soft Reservation / high-risk ownership
Conflict classification
Integration worktree
Rebase queue
Verification Profile
Merge Candidate lifecycle
```

---

## M7 — OAuth End-to-End

使用 2 Human + 3 Agent 来源完成三次验收运行：正常完成、Agent 失败恢复、Contract/merge 冲突。必须覆盖 Artifact handoff、Human Intervention、精确回溯分支、merge queue、Spec Coverage 和完整 Event 链。

到这里完成第一阶段：

> **Human-Agent Collaborative Software Engineering Platform**

---

# 35. 最终项目故事

这个项目的故事不是：

> 我使用 Pi 做了一个 Multi-Agent Coding 工具。

而应该是：

> **随着 Coding Agent 从代码辅助工具发展为能够自主执行完整软件工程任务的执行主体，现有以单个开发者为中心的 AI Coding 工作流开始无法覆盖真实团队中的任务依赖、知识共享、工程决策、责任边界与多人协作问题。**

因此，本项目：

> **构建一个 Execution-Kernel-Agnostic 的 Human-Agent Collaborative Software Engineering Platform，将 Pi、Codex、Claude Code 等 Coding Agent 视为黑盒可插拔执行内核，在其上建立 Specification、Project、Agent Membership、WorkItem、Execution、Composite Checkpoint、Artifact、Decision、Change Coordination 与 Causal Event Graph 等协作原语，使多个真人与多类 Agent 能围绕同一软件项目进行可验证、可回溯、可分叉、可交接的软件工程协作。**

第一阶段解决：

> **Human 和 Agent 怎么真正一起开发软件。**

第二阶段进一步研究：

> **Human 和 Agent 应该采用什么机制合作。**

最终研究：

> **当 AI Agent 成为真实软件团队成员以后，软件团队应该长什么样？**

整个技术路线因此形成：

```text
Coding Agent
     ↓
Agent Execution Kernel
     ↓
Human-Agent Collaboration Runtime
     ↓
Human-Agent Software Team
     ↓
Collaboration & Governance
     ↓
Team Experiments
     ↓
Human-Agent Team Patterns
     ↓
Agentic Software Organization
```

这就是整个项目建议保持不变的主线。
