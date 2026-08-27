# 30: 构建权威 Context Package

**What to build:** 让每次 Execution 获得一个固定、可解释的 Context Package，只包含当前项目明确授权的事实与输入。

**Blocked by:** 03: 导入 Git 仓库与设置工程基线; 06: Specification 审核、发布与版本演进; 14: Assignment、Concern 与 Reassignment; 15: Agent 权限与临时 Permission Request; 28: 发布与采用版本化 Artifact; 29: Decision Proposal 与 Recorded Consensus 生命周期

**Status:** ready-for-agent

- [ ] Context Package 固定 Work Item、Effective Specification、已采用 Artifact、有效 Decision、权限和代码基线版本。
- [ ] Execution 启动前可预览 Context 摘要，启动后该 Execution 使用的版本不可被后续项目变化静默替换。
- [ ] 未被项目采用的私人记忆、任意历史或 draft Artifact 不会成为权威 Context。
- [ ] 密钥和受保护数据通过受控运行时注入，不出现在 Context、Event、Git、Checkpoint 或普通日志中。

