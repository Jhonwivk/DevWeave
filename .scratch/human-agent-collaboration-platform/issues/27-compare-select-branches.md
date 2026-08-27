# 27: 比较 Execution Branch 并选择候选

**What to build:** 让 Human 比较同一 Work Item 的多个 Execution Branch，并明确选择唯一候选进入后续协作和合并流程。

**Blocked by:** 19: Workspace Diff、Verification 与 Work Item 完成; 25: 从 Checkpoint 精确创建 Execution Branch; 26: Reconstructed Branch 与恢复失败保护

**Status:** ready-for-agent

- [ ] 分支比较展示起点、exact/reconstructed 类型、输入变化、diff、Artifact、Decision 和 Verification。
- [ ] Human 可以选择一个 selected candidate，选择行为记录理由、操作者和候选版本。
- [ ] 同一 Work Item 同时最多只有一个有效 selected candidate；更换选择通过新操作保留历史。
- [ ] 未被选择的分支保持可查看，但不能自行推进共享工程状态。

