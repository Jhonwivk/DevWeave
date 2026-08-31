# 07: Veto Resolution 与 Superseding Decision

**What to build:** 让 authority 解决 advisory 或 hard veto，通过 superseding Decision 登记结果而不改写历史。

**Blocked by:** 05: Advisory Veto 工作流; 06: Hard Veto Command Gate

**Status:** ready-for-agent

- [ ] ResolveVeto Command 接受 vetoId、resolution（approved / rejected / escalated）、rationale 和 authority actor。
- [ ] Resolution 创建 superseding Decision，关联原 veto 和目标 aggregate。
- [ ] Hard veto resolution 为 approved 时清除 `blocked_by_governance` 状态，允许原动作重试。
- [ ] Rejected resolution 保持阻断并记录理由；escalated 转交更高 authority（本阶段可用固定 escalation target）。
