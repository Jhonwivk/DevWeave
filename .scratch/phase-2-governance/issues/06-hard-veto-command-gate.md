# 06: Hard Veto Command Gate

**What to build:** 对配置为 hard veto 的 action class 在 Command 边界阻断执行，直到指定 authority 登记 resolution。

**Blocked by:** 04: Governance Profile 配置

**Status:** ready-for-agent

- [ ] 触发 hard veto 条件的 Command（如 merge 到受保护分支、高风险 permission grant）返回 `governance_blocked` 错误。
- [ ] 被阻断的 aggregate 进入可查询的 `blocked_by_governance` 投影状态。
- [ ] Hard veto 创建 Inbox item，标明阻断原因和所需 authority。
- [ ] 未解决 hard veto 时，同类 Command 重复提交保持幂等阻断。
