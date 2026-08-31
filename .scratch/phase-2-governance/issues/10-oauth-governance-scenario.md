# 10: OAuth 治理场景端到端验收

**What to build:** 在 OAuth fixture 中增加第四个治理场景，覆盖 Policy suggestion、advisory veto 恢复和 Upgrade Proposal 采纳，证明 Phase 2 与 Phase 1 闭环兼容。

**Blocked by:** 03: Assignment Suggestion 与 Human Override 审计; 09: Governance-aware Inbox 扩展; 08: Digital Employee Upgrade Proposal 生命周期

**Status:** ready-for-agent

- [ ] OAuth governance variant 可从 Web UI 或 API 完整运行并自动验证。
- [ ] 场景包含：Policy 建议 backend assignee → Human override 带理由 → advisory veto on merge → resolve → Upgrade Proposal 采纳。
- [ ] 所有 governance 动作可从 Timeline 回溯；Coverage Matrix 保持 verified。
- [ ] governance variant 与 normal / failure / contract 三个 Phase 1 场景可独立重复运行。
