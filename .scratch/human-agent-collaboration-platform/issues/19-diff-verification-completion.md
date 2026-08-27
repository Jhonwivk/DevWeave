# 19: Workspace Diff、Verification 与 Work Item 完成

**What to build:** 让平台基于实际 Workspace 状态和 Verification Evidence 判断一次 Mock Execution 的结果能否完成 Work Item。

**Blocked by:** 18: 隔离 Execution Workspace

**Status:** ready-for-agent

- [ ] Execution View 展示平台读取的 Git 状态和 diff，并与 Agent 自述明确区分。
- [ ] 平台运行 Project 的 Verification Profile，保存实际命令、环境、工具版本、结果和耗时。
- [ ] 只有通过 Verification 且满足引用 Acceptance Criteria 的候选才能推进 Work Item 和 Coverage。
- [ ] Git fixture 集成测试覆盖成功、无变更、脏 Workspace 和 Verification 失败路径。

