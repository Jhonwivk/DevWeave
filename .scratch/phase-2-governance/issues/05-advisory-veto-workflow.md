# 05: Advisory Veto 工作流

**What to build:** 让 designated authority 对高风险动作发出 advisory veto，在 Inbox 中呈现待确认事项而不阻断底层探索状态。

**Blocked by:** 04: Governance Profile 配置

**Status:** ready-for-agent

- [ ] 当 action class 配置为 advisory 且触发条件满足时，创建 advisory veto Inbox item。
- [ ] Inbox item 包含：动作类型、目标 aggregate、发起人、事实摘要、建议操作（approve / reject / escalate）。
- [ ] Advisory veto 不阻止 Command 执行本身，但标记相关 merge candidate 或 assignment 为 pending_review。
- [ ] Authority 可通过 Command 登记 approve 或 reject resolution。
