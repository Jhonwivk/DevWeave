# 09: Governance-aware Inbox 扩展

**What to build:** 扩展 Action Inbox 聚合 Policy 冲突提示、advisory veto、hard veto 和 Upgrade Proposal，保持行动导向、低噪声呈现。

**Blocked by:** 03: Assignment Suggestion 与 Human Override 审计; 05: Advisory Veto 工作流; 07: Veto Resolution 与 Superseding Decision; 08: Digital Employee Upgrade Proposal 生命周期

**Status:** ready-for-agent

- [ ] Inbox 新增 item 类型：policy_override_required、advisory_veto、hard_veto、upgrade_proposal。
- [ ] 每类 item 展示事实、影响范围和 deep link 到相关 Work Item / Merge / Membership。
- [ ] 已 resolve 的 veto 和已处理的 proposal 从 open Inbox 移除，保留 Timeline 历史。
- [ ] 普通页面浏览不产生额外 Inbox 噪声。
