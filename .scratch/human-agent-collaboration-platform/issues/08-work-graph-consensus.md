# 08: 建立 Work Graph 与登记 Recorded Consensus

**What to build:** 让 Planning Agent 提出 Work Graph，由 Human 调整依赖并登记线下共识结果后批准，平台不虚构在线投票。

**Blocked by:** 07: 从 Effective Specification 建立 Work Item 与 Coverage

**Status:** ready-for-agent

- [ ] Planning Agent 可以提交包含 Work Item 和 blocking edges 的 proposal，但不能自行批准。
- [ ] Human 可以调整 proposal，循环依赖或不存在的 Work Item 引用会被拒绝。
- [ ] 批准时记录 Recorded Consensus 的结果、登记人、时间和理由，不声明平台验证了全员一致。
- [ ] Work Graph 页面能够区分可立即开始、被阻塞和已完成的 Work Item。

