# 14: Assignment、Concern 与 Reassignment

**What to build:** 让 Human 手动把 Work Item 分配给 Agent Membership，并在约束、风险或上下文发生变化时留下完整责任演进历史。

**Blocked by:** 07: 从 Effective Specification 建立 Work Item 与 Coverage; 13: Capability Gap 与 System-Generated Agent qualification

**Status:** ready-for-agent

- [ ] Human 可以手动选择 Agent Assignee，平台不会基于不透明评分自动分配。
- [ ] 不满足能力、信任或权限硬约束的 Assignment 被阻止；允许的高风险 override 必须记录理由和范围。
- [ ] Agent Actor 可以提出 Assignment Concern，但不能自行改派 Work Item。
- [ ] Reassignment 创建新版本并保留此前 Assignee、Concern、override 和操作者历史。

