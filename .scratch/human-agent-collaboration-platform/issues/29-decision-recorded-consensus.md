# 29: Decision Proposal 与 Recorded Consensus 生命周期

**What to build:** 让 Agent 提出结构化 Decision Proposal，并让 Human 登记线下共识形成的决定及其后续变化，而不声称平台观察了讨论过程。

**Blocked by:** 08: 建立 Work Graph 与登记 Recorded Consensus

**Status:** resolved

- [x] Agent Actor 可以提交包含问题、选项、证据和影响范围的 Decision Proposal，但不能自行标记为 decided。
- [x] Human 可以登记 Recorded Consensus，保存决定、理由、记录者、受影响对象和时间。
- [x] 已决定内容只能通过 superseding Decision 或 withdraw 演进，旧记录不可编辑或删除。
- [x] Decision View 明确区分 proposer、recorder 与平台未验证的线下参与者共识。

## Answer

Decision 只能由 Human 登记为 decided；Recorded Consensus 明确 recorder 不是平台验证的唯一决策者。
