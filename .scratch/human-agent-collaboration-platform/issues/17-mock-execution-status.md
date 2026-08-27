# 17: 启动并观察 Mock Execution

**What to build:** 让 Human 从已分配 Work Item 启动固定输入的 Mock Execution，并实时观察与 Work Item 分离的完整执行状态。

**Blocked by:** 04: 实时 Project Dashboard; 07: 从 Effective Specification 建立 Work Item 与 Coverage; 14: Assignment、Concern 与 Reassignment; 15: Agent 权限与临时 Permission Request; 16: Executor Contract 与确定性 Mock Executor

**Status:** ready-for-agent

- [ ] Human 可以为已分配 Work Item 启动 Execution，记录 Agent 配置、Kernel、权限、Context 输入和基线快照。
- [ ] 持久任务由 Worker 领取，Execution 状态通过 SSE 从 queued、starting、running 推进到终态。
- [ ] Execution View 展示 Work Item、Assignee、输入快照、状态和可用动作。
- [ ] 重复启动 Command 不会创建重复 Execution，一次 Execution 失败也不会把 Work Item 直接标记为 failed。

