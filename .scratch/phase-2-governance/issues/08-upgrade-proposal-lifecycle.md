# 08: Digital Employee Upgrade Proposal 生命周期

**What to build:** 当存在更新的 Digital Employee Release 时，为项目创建 Upgrade Proposal，支持审查、批准或拒绝，且不影响进行中 Execution 的配置快照。

**Blocked by:** None (Phase 1 #11 resolved).

**Status:** ready-for-agent

- [ ] 新 Release 导入后，持有旧 Release Membership 的项目可收到 Upgrade Proposal（手动触发或 Publisher 通知 Command）。
- [ ] Proposal 展示 Release 版本 diff 摘要、权限变化、capability 变化和兼容性风险提示。
- [ ] 状态机：`proposed → under_review → approved | rejected | superseded`。
- [ ] 批准后只影响未来 Assignment 和新 Execution；进行中 Execution 保持原配置快照不变。
