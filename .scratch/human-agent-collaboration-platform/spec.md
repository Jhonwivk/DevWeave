# Human-Agent Collaborative Software Engineering Platform — Phase 1

**Status:** resolved

## Problem Statement

现有 Coding Agent 产品主要围绕单个 Human 与单个或多个 Agent 的委派关系设计。它们可以生成代码和完成局部任务，但缺少真实软件团队所需的共享 Project State、Specification、责任边界、多人共识登记、Artifact Handoff、并行变更协调、Human Intervention、可验证合并和可回溯 Execution。

当多个 Human、Digital Employee、Private Agent 和 System-Generated Agent 同时参与同一个代码库时，仅依靠 Chat、Git merge 和 Agent 自述无法回答以下问题：团队当前依据哪个 Specification 工作、哪个 Agent 被授权执行哪个 Work Item、一个 Consumer 采用了哪个 Contract 版本、为什么某个 Decision 生效、Agent 与 Workspace 是否能回到同一个历史节点、并行修改是否产生工程冲突，以及进入共享分支的结果是否经过可重复 Verification。

用户需要一个 Project-Centric 的协作平台，将异构 Coding Agent 作为黑盒 Execution Kernel，在其上提供 Specification-Driven、结构化、可验证、可回溯、可分叉的 Human-Agent 软件工程工作流。

## Solution

构建一个本地原生运行的 Human-Agent Collaborative Software Engineering Platform。平台以 Project 为长期协作中心，以 Effective Specification 为工作来源，将正式工程工作表示为 Work Item，并将每次 Human 或 Agent 尝试表示为独立 Execution。

平台统一支持三类 Agent Actor：正式发布且能力固化的 Digital Employee、Human 培养并手动引入的 Private Agent，以及系统根据 Capability Gap 生成并由 Human 确认的 System-Generated Agent。三类 Agent 通过统一 Agent Membership、Work Item、Artifact、Decision、Context Package 和 Event 协议参与项目，但保留不同的来源、信任和准入边界。

Pi 是第一阶段默认真实 Execution Kernel，Mock Executor 提供确定性的成功、失败、暂停、超时和 unknown 场景。平台不读取或统一 Kernel 内部推理，而是管理公开生命周期、隔离 Workspace、Workspace diff、Verification Evidence 和可选原始日志。

Human 可以中断 Execution，并在同一稳定边界创建由 Workspace Checkpoint 和不透明 Kernel Checkpoint Reference 组成的 Execution Checkpoint。精确回溯从该 Checkpoint 创建新的 Execution Branch，使 Kernel 和 Workspace 回到同一逻辑节点；原执行路径保持不可变和可追溯。

并行修改通过 Change Intent、软 Reservation、高风险 Contract Ownership、依赖失效、独立 worktree、merge queue 和 Verification Profile 协调。平台不声称能够保证代码绝对正确，但确保只有在配置的验证范围内满足 mergeable 条件的候选才能进入共享状态。

第一阶段以 OAuth Web 项目作为端到端验收载体，使用两个真实 Human 与三类 Agent 各一个，重复运行正常、Agent 失败和 Contract/merge 冲突三种场景。

## User Stories

1. 作为 Project Owner，我希望导入一个现有 Git 仓库，从而让平台围绕真实代码库建立 Project State。
2. 作为 Project Owner，我希望选择 base branch 和受保护共享分支，从而明确所有 Execution 和 merge candidate 的工程基线。
3. 作为 Project Owner，我希望配置项目的 Verification Profile，从而让所有候选使用一致的构建、静态检查和测试门禁。
4. 作为 Project Owner，我希望邀请另一名 Human 成为项目 Member，从而验证真实的多人协作而非单人角色模拟。
5. 作为 Human，我希望查看 Project Dashboard，从而快速理解当前 Specification、Work Graph、团队、阻塞、风险和运行状态。
6. 作为 Human，我希望将 Specification 正文以 Markdown 形式保存在 Git 中，从而让需求能够被 diff、review 和版本控制。
7. 作为 Human，我希望每条 Requirement 和 Acceptance Criterion 拥有稳定 ID，从而让 Work Item、Artifact 和 Verification 可以精确追溯到规范条款。
8. 作为 Human，我希望将 Specification 从 draft 推进到 in_review 和 effective，从而让项目只依据经过确认的版本开展正式工作。
9. 作为 Human，我希望修改 Effective Specification 时产生新版本而不是覆盖旧版本，从而保留历史和影响分析依据。
10. 作为 Human，我希望撤回或 supersede Specification，从而让过期规范不再约束新工作。
11. 作为 Human，我希望查看 Spec Coverage Matrix，从而识别未覆盖、已规划、已实现、已验证和已 waiver 的 Acceptance Criteria。
12. 作为 Human，我希望创建 Exploration Work Item，从而在无法立即形成确定 Specification 时记录有边界的调查工作。
13. 作为 Human，我希望探索结果不能直接绕过 Specification 和 Verification 进入共享产品代码，从而避免临时实验变成未定义的正式行为。
14. 作为 Human，我希望 Planning Agent 基于 Effective Specification 和仓库提出 Work Graph，从而减少人工拆解任务的成本。
15. 作为 Human，我希望 Planning Agent 只能提出计划而不能批准计划，从而保留 Human 对范围、依赖和责任分配的控制。
16. 作为 Human，我希望将线下达成的共识结果登记到平台，从而保留最终计划、选择和 Decision 的可追溯记录。
17. 作为 Human，我希望平台区分 Recorded Consensus 与平台投票，从而不虚构平台没有观察到的讨论过程。
18. 作为 Human，我希望创建具备目标、验收标准、依赖、风险、scope 和 required capabilities 的 Work Item，从而让任务不是临时 Prompt。
19. 作为 Human，我希望 Work Item 可以形成 DAG，从而表达并行工作、前置依赖和集成顺序。
20. 作为 Human，我希望 Work Item 与 Execution 生命周期分离，从而在一次执行失败后继续重试、分支或重新分配工作。
21. 作为 Human，我希望查看 Capability Gap，从而知道当前团队无法覆盖哪些 Work Item 要求。
22. 作为 Human，我希望 Capability Gap 只提示缺口而不自动推荐具体 Digital Employee 或 Private Agent，从而避免不透明的人选排名。
23. 作为 Human，我希望手动指定一个 Digital Employee，从而复用正式发布、能力固化且有来源证明的 Agent Release。
24. 作为 Human，我希望手动引入自己的 Private Agent，从而让团队成员能够带入长期培养的个人 Agent。
25. 作为 Project Owner，我希望 Private Agent 提供可审查 Manifest、配置摘要、权限需求和内容哈希，从而评估其项目风险而不读取私人历史记忆。
26. 作为 Project Owner，我希望平台为 Private Agent 创建项目内配置副本，从而让其他项目的运行和后续私人调整不影响当前 Execution。
27. 作为 Human，我希望批准系统根据 Capability Gap 生成 System-Generated Agent Candidate，从而在缺少现有 Agent 时补齐项目能力。
28. 作为 Project Owner，我希望 System-Generated Agent 在 qualification 或受限试用后才能正式加入项目，从而不把生成声明误当成已验证能力。
29. 作为 Human，我希望将表现合适的 System-Generated Agent 接管为 Private Agent，从而继续培养和复用其能力。
30. 作为 Publisher，我希望只有经过独立固化、验证和发布的 Agent 才成为 Digital Employee，从而保持正式发布语义。
31. 作为 Project Owner，我希望三类 Agent 都通过统一 Agent Membership 进入项目，从而复用同一任务、执行和审计协议。
32. 作为 Project Sponsor，我希望 Agent Membership 固定来源、角色、权限、信任状态和配置快照，从而让每次执行的责任边界明确。
33. 作为 Project Owner，我希望 Agent 的实际权限是 Manifest 需求、Project Policy 上限和 Membership 批准值的交集，从而实施最小权限。
34. 作为 Agent Actor，我希望在缺少权限时提出 Permission Request，从而让 Human 能按动作、范围和期限授予临时权限。
35. 作为 Project Owner，我希望宿主敏感路径、密钥保护、受控 Workspace、历史不可篡改和受保护分支规则不可普通 override，从而保留平台安全底线。
36. 作为 Human，我希望手动选择 Work Item 的 Agent Assignee，从而让团队线下共识决定具体人选。
37. 作为 Human，我希望平台检查手动 Assignment 的硬约束，从而阻止明显不兼容或越权的执行。
38. 作为 Human，我希望高风险 Assignment override 保留操作者、理由和风险范围，从而能够事后追溯责任。
39. 作为 Agent Actor，我希望提出 Assignment Concern，从而指出能力不足、上下文缺失、scope 冲突或风险，而不擅自改派任务。
40. 作为 Human，我希望 Reassignment 创建新版本而不是覆盖历史，从而理解 Work Item 的责任变化过程。
41. 作为 Human，我希望默认使用 Pi 启动真实 Execution，同时允许在项目 allowlist 中选择其他受支持 Kernel，从而兼顾默认一致性和可插拔性。
42. 作为平台开发者，我希望 Execution Kernel 通过统一 Executor Adapter 接入，从而避免上层依赖 Pi Session、Codex Thread 或其他内部格式。
43. 作为平台开发者，我希望 Executor 声明 start、interrupt、state、events、send、resume、checkpoint 和 fork 能力，从而对不支持的功能进行诚实降级。
44. 作为 Human，我希望每次 Execution 固定 Agent 配置、Kernel、Model、权限和 Context Package 快照，从而保证一次尝试可解释和可比较。
45. 作为 Human，我希望每次 Execution 使用独立 Git worktree 和平台管理分支，从而避免多个 Agent 争用同一工作目录。
46. 作为 Project Owner，我希望 Kernel 不能自行选择共享仓库、主分支或宿主敏感路径，从而确保所有代码操作发生在平台边界内。
47. 作为 Human，我希望从 UI 查看 queued、starting、running、waiting_for_human、paused、completed、failed、cancelled 和 unknown 状态，从而理解 Execution 生命周期。
48. 作为 Human，我希望 Kernel 状态无法确认时显示 unknown 而不是猜测，从而避免基于错误状态自动重跑或删除 Workspace。
49. 作为 Human，我希望平台重启后尝试重新连接 Execution，并在失败时保留 Workspace 和选择权，从而安全处理 Worker 或 Kernel 崩溃。
50. 作为 Human，我希望预算或 timeout 触发 interrupt 并保存当前结果，从而可以增加预算、恢复或从 Checkpoint 新建 Execution。
51. 作为 Human，我希望向运行中的 Agent 发送结构化 Intervention，从而明确区分 send_input、pause、resume、interrupt、checkpoint、branch 和 cancel。
52. 作为 Human，我希望在稳定边界创建 Execution Checkpoint，从而让 Kernel 与 Workspace 的历史节点能够对齐。
53. 作为 Human，我希望 Checkpoint 同时包含 Workspace Checkpoint、Kernel Checkpoint Reference 和项目输入版本，从而避免只恢复代码或只恢复 Agent。
54. 作为平台开发者，我希望 Kernel Checkpoint Reference 对平台保持不透明，从而不侵入 Agent 内部工作方式。
55. 作为 Human，我希望选择历史 Checkpoint、修改平台输入并创建新的 Execution Branch，从而尝试另一条工作路径。
56. 作为 Human，我希望精确回溯创建新分支而不修改旧 Execution，从而保留原始路径和完整历史。
57. 作为 Human，我希望不支持内部 fork 的 Kernel 创建明确标注的 Reconstructed Branch，从而不把重新启动伪装成精确恢复。
58. 作为 Human，我希望 Checkpoint 任一组成部分恢复失败时停止新分支，从而避免 Agent 和 Workspace 处于不同历史状态。
59. 作为 Human，我希望比较多个 Execution Branch 的 diff、Artifact、Decision 和 Verification，从而选择正式候选。
60. 作为 Human，我希望只有一个 selected candidate 能推进 Work Item，从而避免多个探索分支同时进入共享状态。
61. 作为 Human，我希望发布版本化 Artifact，从而通过正式工程制品而不是 Agent 群聊进行协作。
62. 作为 Consumer Agent，我希望显式采用某个 Artifact 或 Contract 版本，从而明确我的工作依据。
63. 作为 Human，我希望查看 Artifact 的 producer、Work Item、consumer 和版本关系，从而追踪 Handoff。
64. 作为 Agent Actor，我希望提出 Decision Proposal，从而将需要 Human 判断的问题从 Chat 中抽离。
65. 作为 Human，我希望登记线下共识形成的 Decision，从而保存结果、理由、影响范围和记录者。
66. 作为 Human，我希望后续改变 Decision 时创建 superseding Decision，从而不改写历史。
67. 作为 Agent Actor，我希望获得基于 Work Item、Effective Specification、已采用 Artifact、Decision、权限和基线构造的 Context Package，从而使用明确的项目事实。
68. 作为 Human，我希望 Specification 或 Contract 更新能标记受影响工作为 stale，从而在继续执行前选择暂停、Replan 或重新验证。
69. 作为 Human，我希望 Agent 不能把任意历史或私人记忆默认为项目权威，从而保持 Context 边界。
70. 作为 Human，我希望 Agent 开工前登记 Change Intent，从而提前表达可能修改的文件、symbol 和 Contract。
71. 作为 Human，我希望 scope 重叠默认产生软 Reservation 和 warning，从而保留并发能力而不使用永久文件锁。
72. 作为 Project Owner，我希望 API Contract、Schema、Shared Type 和依赖版本可以使用更严格 Ownership，从而保护高爆炸半径变更。
73. 作为 Human，我希望冲突区分 Text、Symbol、Contract 和 Semantic 类型，从而选择合适的处理策略。
74. 作为 Consumer Agent，我希望 Contract 更新时收到失效通知和新 Context，从而在 merge 前适配变化。
75. 作为 Human，我希望每个 merge candidate 先基于最新 integration baseline rebase，从而减少多个旧基线分支最终集中爆炸。
76. 作为 Human，我希望 merge queue 按确定顺序处理候选，从而让每个候选在前序结果之上重新验证。
77. 作为 Human，我希望 Verification Profile 执行构建、静态检查、单测、集成测、Contract 校验和可选 E2E，从而形成一致门禁。
78. 作为 Human，我希望平台独立读取 workspace diff、Git 状态和 Verification Evidence，从而不把 Agent 自述当成工程事实。
79. 作为 Human，我希望 clean Git merge 但集成测试失败时记录 Semantic Conflict，从而识别 Git 无法发现的工程冲突。
80. 作为 Human，我希望普通失败可以在隔离 Workspace 内有限修复，而高风险或超预算失败升级给 Human，从而平衡自动化与责任。
81. 作为 Human，我希望只有 mergeable candidate 能进入受保护共享分支，从而阻止未经验证的结果。
82. 作为 Human，我希望所有状态变更、权限操作、override、Execution、Artifact、Decision 和 merge 都成为 Traceable Operation，从而能够还原项目历史。
83. 作为 Human，我希望普通页面浏览不产生永久高噪声审计记录，从而让关键历史保持可用。
84. 作为研究者，我希望 Domain Event、Execution Telemetry 和 Audit Event 分层保存，从而区分业务事实、运行观测和安全审计。
85. 作为研究者，我希望 Event 包含项目顺序、aggregate version、causation 和 correlation，从而构建可靠 Timeline 和 Causality Graph。
86. 作为平台开发者，我希望领域状态、Domain Event 和 Outbox 在同一数据库事务中写入，从而避免状态与历史漂移。
87. 作为平台客户端，我希望写 Command 支持 idempotency key 和 expected version，从而避免重复执行和静默并发覆盖。
88. 作为 Human，我希望历史更正通过追加 Event 完成，从而禁止管理员静默改写旧记录。
89. 作为 Human，我希望可回溯与可撤销明确区分，从而理解外部 push、部署和第三方写入可能需要补偿操作。
90. 作为 Project Owner，我希望密钥通过运行时注入并从 Event、Context、Git、Checkpoint 和普通日志中排除，从而降低泄露风险。
91. 作为 Human，我希望 Project Dashboard 以共享状态为中心而不是以 Chat 为中心，从而从项目视角管理协作。
92. 作为 Human，我希望 Execution View 展示 Work Item、Agent Membership、状态、输入输出、diff、Checkpoint、Branch、Artifact 和 Verification，从而理解一次工作尝试。
93. 作为 Human，我希望 Kernel 原始日志可选展开但不成为领域逻辑依赖，从而在需要时诊断又不耦合内部格式。
94. 作为 Human，我希望 Team View 展示 Human、三类 Agent Membership、Sponsor、权限和信任状态，从而理解团队组成。
95. 作为 Human，我希望站内 Inbox 只通知需要行动的 Decision、Concern、Gap、Conflict、Permission、Budget、unknown、validation failure 和 merge ready，从而避免事件噪声。
96. 作为 Human，我希望失败页面展示事实、影响范围、最近 Checkpoint 和可选操作，从而快速决定恢复、分支、重试或取消。
97. 作为平台开发者，我希望 Server、Worker 和 Web 能在没有 Docker 的本地环境启动，从而降低第一阶段部署复杂度。
98. 作为平台开发者，我希望 Worker 使用 PostgreSQL 持久队列、lease 和 heartbeat，从而在不引入额外消息基础设施时可靠处理长 Execution。
99. 作为 Web 用户，我希望通过 SSE 接收 Project 和 Execution 更新，从而无需高频轮询或通用 WebSocket。
100. 作为研究者，我希望每次验收 Run 固定 Project、Specification、团队、Kernel、Model、Context、Policy 和 Verification 元数据，从而比较不同协作过程。
101. 作为研究者，我希望保存 Human intervention、Artifact handoff、Decision、失败、修复、冲突和 merge 指标，从而研究 Human-Agent Team 模式。
102. 作为验收人员，我希望运行正常 OAuth 场景，从而证明三类 Agent 可以完成结构化协作和合并。
103. 作为验收人员，我希望主动制造 Agent 失败并恢复，从而证明 Execution 生命周期、Checkpoint 和 Human Intervention 有效。
104. 作为验收人员，我希望主动制造 Contract 或 merge conflict 并解决，从而证明失效传播、Change Coordination 和 Verification 有效。
105. 作为验收人员，我希望同一 OAuth 场景至少完整运行三次，从而证明平台结果不是一次不可重复演示。
106. 作为验收人员，我希望在干净本地环境按文档启动平台，从而证明交付物可复现。

## Implementation Decisions

- 系统采用 Project-Centric 而不是 Chat-Centric 模型；Project 是长期存在的共享协作边界。
- Specification 是版本化的一等对象，正文使用 Git-backed Markdown，平台保存 ID、状态、版本、review result、依赖和索引。
- Requirement 和 Acceptance Criterion 使用稳定 ID；Work Item、Artifact、Decision 和 Verification Evidence 必须引用稳定 ID，而不是 Markdown 行号。
- Specification 状态为 `draft → in_review → effective → superseded | withdrawn`；Effective 内容不可原地修改。
- Work Item 由 Effective Specification 派生，包含 goal、acceptance criteria、dependencies、risk、affected scope 和 required capabilities。
- Exploration Work Item 允许轻量调查，但结果不能未经正式 Specification 和 Verification 直接进入共享产品代码。
- Work Item 与 Execution 生命周期独立；Work Item 不使用 failed 状态表达一次 Execution 失败。
- Agent Actor 分为 Digital Employee、Private Agent 和 System-Generated Agent，三者通过统一 Agent Membership 进入 Project。
- Digital Employee 以不可变 Release 手动导入；Private Agent 以 Manifest 和配置摘要手动导入并创建项目内副本；System-Generated Agent 由 Capability Gap 驱动、Human 确认。
- 平台不对 Digital Employee 或 Private Agent 做自动候选排名，只执行硬约束验证和 Capability Gap 检测。
- Human 共识在线下达成，平台只保存 Recorded Consensus；登记人不是平台证明的唯一 Decision Maker。
- Project 采用 Owner/Member 两级本地身份；复杂 RBAC、企业 SSO 和在线投票不进入第一阶段。
- Agent 权限取 Agent 声明、Project Policy 和 Agent Membership 批准值的交集；临时扩权通过有期限的 Permission Request。
- Pi 是默认真实 Execution Kernel，Mock Executor 是确定性测试 Kernel；其他 Kernel 通过未来 Adapter 接入。
- Execution Kernel 是黑盒，平台不解析内部推理、Session Tree 或工具循环；Kernel-specific 日志仅作为可选原始数据。
- Executor 必需能力是 capabilities、start、interrupt、getState 和 subscribe；send、resume、checkpoint 和 forkFrom 为 capability-negotiated 可选能力。
- Execution 状态统一为 queued、starting、running、waiting_for_human、paused、completed、failed、cancelled 和 unknown。
- Workspace Manager 为每次 Execution 分配独立 Git worktree、平台命名分支和 base commit。
- Execution Checkpoint 原子绑定 Workspace Checkpoint、opaque Kernel Checkpoint Reference、Project State version、input version 和运行版本元数据。
- 精确回溯必须让 Kernel 与 Workspace 回到同一稳定节点，并创建新的 Execution Branch；旧路径保持不可变。
- Kernel 不支持 checkpoint/fork 时可以创建 Reconstructed Branch，但必须明确标记为非精确回溯。
- Artifact 状态为 `draft → published → superseded | deprecated`；Consumer 只能正式采用 published 的具体版本。
- Decision 状态为 `proposed → decided → superseded | withdrawn`；线下共识变化通过 superseding Decision 表达。
- Context Package 根据 Work Item、Effective Specification、已采用 Artifact、Decision、权限和代码基线构造。
- Change Intent 独立于 Work Item 和 Execution，状态为 `proposed → reserved → active → released | superseded | conflicted`。
- Reservation 默认是软协调信号；API Contract、Schema、Shared Type、Config 和 Dependency Version 可应用更强 Ownership。
- conflict 类型至少区分 Text、Symbol、Contract 和 Semantic。
- Merge Candidate 通过 queued、rebasing、validating、mergeable 和 merged 主链，并支持 conflicted、validation_failed、cancelled 和 stale 结果。
- merge queue 在临时 integration worktree 上逐个 rebase 和验证，未通过 Verification 的候选不得进入受保护共享分支。
- Verification Profile 是版本化项目配置，记录实际命令、环境、工具版本、结果和耗时。
- 平台采用 TypeScript monorepo、React Web、Node.js Server、独立 Worker、PostgreSQL、HTTP Command/Query API、SSE 和 Git worktree。
- 系统采用 modular monolith，不拆微服务，不引入 Redis 或 Kafka，不使用 Docker。
- 权威领域状态保存在 PostgreSQL；领域状态、不可变 Domain Event 和 Outbox 在同一事务写入，遵守 ADR-0001。
- 每个外部写 Command 使用 versioned envelope、idempotency key 和 expected aggregate version。
- Event 至少包含 event ID、project sequence、aggregate ID/version、actor、causation、correlation、timestamp 和 payload version。
- Domain Event、Execution Telemetry 和 Audit Event 分层保存；普通非敏感读操作不逐条永久审计。
- Git-backed Spec 和代码 Artifact 由 commit/hash 标识；结构化元数据保存在 PostgreSQL；大日志、Checkpoint 和二进制存入受管内容寻址目录。
- 密钥通过受控运行时注入，禁止进入 Event、Context、Git、Checkpoint 和普通日志。
- 平台操作可回溯不代表外部副作用可逆；网络写入、push、部署和外部数据库修改需策略许可和补偿语义。
- Web UI 只建设 Project/Spec/Work Graph、Team/Agent Membership、Execution/Checkpoint/Branch、Artifact/Decision/Event/Merge Queue 四组核心视图。
- 正式协作通过 Work Item、Artifact、Decision、Context Package 和 Comment；第一阶段不建设 Agent 群聊。
- OAuth 验收团队由两个真实 Human、一个 Digital Employee、一个 Private Agent 和一个 System-Generated Agent 组成。
- OAuth 核心验收使用本地可控 Provider，真实 Provider 仅作为可选兼容测试。

## Testing Decisions

- 测试只断言外部可观察行为和持久事实，不断言 Agent 内部推理、私有 Session 格式或具体实现调用顺序。
- 主要测试 seam 是平台公开边界：通过 HTTP/UI Command 进入，经过真实 PostgreSQL、Worker、Mock Executor 和 Git fixture，验证 Project State、Event、Workspace 和用户可见结果。
- 必要的第二测试 seam 是 Executor Contract：Pi Adapter 与 Mock Adapter 运行同一套状态、interrupt、checkpoint、fork 和失败语义测试。
- Domain 状态机使用纯单元测试验证合法转换、非法转换、Work Item/Execution 分离和 immutable version 语义。
- Persistence 集成测试使用真实 PostgreSQL，验证 state + Domain Event + Outbox 原子性、project sequence、optimistic concurrency 和 idempotency。
- Worker 测试覆盖 job lease、heartbeat、进程中断、重启、重复投递和 unknown 状态，不依赖长时间 sleep。
- Git 集成测试使用临时 fixture repository，验证 worktree 隔离、Checkpoint、branch、rebase、conflict 和 integration queue。
- Composite Checkpoint 测试必须证明 Kernel reference 与 Workspace state 属于同一稳定边界；任一恢复失败时不得启动不匹配分支。
- Artifact/Contract 测试覆盖 publish、adopt、supersede、dependency invalidation 和 stale propagation。
- Change Coordination 测试分别覆盖 Text、Symbol、Contract 和 Semantic Conflict；Semantic Conflict 通过 clean merge 后 Verification 失败来证明。
- API 测试覆盖权限、expected version、idempotency、错误 envelope 和 correlation。
- SSE 测试覆盖 cursor、断线重连、事件顺序和重复事件处理。
- UI 使用浏览器级测试覆盖 Project 创建、Spec 生效、Work Item、Execution、Checkpoint 分支、Artifact Handoff、Inbox 和 merge queue。
- OAuth fixture 提供三个高层 E2E：正常完成、Agent 失败恢复、Contract/merge 冲突恢复。
- Pi 相关验收使用受控测试仓库和测试凭证，不连接生产环境。
- 新仓库当前没有既有代码测试可复用；最早的 prior art 将由 Mock Executor vertical slice、Executor Contract suite 和 OAuth fixture 建立。
- 每个里程碑只有在 demo flow、自动测试、migration、结构化 Event、失败路径和运行文档同时完成后才算通过。

## Out of Scope

- 自研基础 LLM 或完整 Coding Agent。
- Agent 市场、跨组织 Registry 和公开发布平台。
- 自动推荐具体 Digital Employee 或 Private Agent。
- 自动组建大型 Agent 团队、自动招聘或无限复制 Agent。
- 企业 SSO、完整 RBAC、云端多租户和企业合规平台。
- 多 Kernel 深度支持；第一阶段只要求 Pi 和 Mock Executor。
- 跨执行主机的 portable Checkpoint。
- 生产环境部署、生产密钥、生产数据访问和生产变更。
- Agent 群聊、自由 Agent 私信和 Multiplayer IDE。
- 复杂在线投票、quorum、veto、组织层级和动态团队治理。
- 自动解决高风险冲突或让 LLM 无验证地盲合代码。
- 替代 Git、GitHub、现有 CI 或 IDE。
- 大规模 Human-Agent 统计实验、最优团队比例结论和自动组织设计。
- 完整 Digital Employee Marketplace、跨项目自动学习和私人记忆共享。

## Further Notes

- 领域词汇以项目根级 CONTEXT 文档为准。Digital Employee、Private Agent 和 System-Generated Agent 是不同概念，不能互作同义词。
- ADR-0001 要求权威状态与 Domain Event/Outbox 同事务写入；不得退化为 best-effort 审计日志或在第一阶段切换为完整 Event Sourcing。
- ADR-0002 要求 Kernel 保持黑盒，并使用不透明引用实现 Composite Checkpoint；不得通过读取或修改 Kernel 私有 Session 格式耦合平台。
- 第一阶段按 M0–M7 垂直切片推进：Contracts、Spec/Work、Mock vertical slice、Pi exact rewind、Membership、Structured Collaboration、Change Coordination、OAuth E2E。
- 第一阶段完成条件是 OAuth 场景可以通过 UI 重复运行，关键状态可恢复、关键操作可回溯、失败路径有自动测试，并可在干净环境中原生启动。
- 本 spec 是本地 issue tracker 中后续 `/to-tickets` 的上游来源；tickets 应切成单一上下文窗口可完成的 tracer-bullet vertical slices，并声明 blocking edges。
