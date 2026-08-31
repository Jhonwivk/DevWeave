# Human-Agent Collaborative Software Engineering Platform — Phase 2: Governance

**Status:** ready-for-agent

## Problem Statement

Phase 1 proved that two Humans and three Agent types can complete structured OAuth work with **manual** assignment, offline Recorded Consensus, and fixed Agent Membership permissions. Every Work Item assignee is chosen by a Human; every consensus is registered after the fact; Digital Employee upgrades require ad-hoc re-import.

As teams scale assignment volume and risk surface, manual-only flows do not answer:

- Which Agent **should** receive a Work Item under project policy, before a Human confirms?
- How can a project express **governance constraints** (veto, escalation) without platform voting fiction?
- How does a project safely adopt a **newer Digital Employee Release** without breaking in-flight Executions?

Phase 2 introduces configurable **Assignment Policy**, **Governance Profile** (advisory and hard veto), and **Upgrade Proposal** lifecycle — while preserving Human authority, traceability, and Phase 1 fallback paths.

## Solution

Extend the modular monolith with versioned project policies stored in PostgreSQL, evaluated at Command boundaries, and surfaced through Team / Work / Inbox views. Policies never auto-execute irreversible external side effects; they suggest, warn, or block platform-mediated actions.

Assignment Policy evaluates required capabilities, risk, scope, and membership trust to produce a ranked suggestion. Humans retain override with mandatory rationale for high-risk deviations.

Governance Profile attaches veto rules to action classes (assignment, merge, permission grant, upgrade adoption). Advisory veto creates Inbox items; hard veto blocks the Command until a designated authority resolves it.

Upgrade Proposal links an existing Agent Membership to a newer Digital Employee Release after compatibility review; active Executions pin their configuration snapshot until complete.

## User Stories

1. 作为 Project Owner，我希望为项目配置 Assignment Policy，从而用可版本化的规则表达分派偏好而不是每次手动猜测。
2. 作为 Project Owner，我希望 Assignment Policy 声明适用的 Work Item 类型、风险级别和 required capabilities 匹配规则，从而只在相关任务上生效。
3. 作为 Human，我希望在 Assign Work Item 时看到 Policy 建议的 Agent Membership 及匹配理由，从而更快做 informed 决定。
4. 作为 Human，我希望拒绝 Policy 建议并手动指定其他 Assignee，从而保留最终人事决定权。
5. 作为 Human，我希望高风险 Assignment override 必须填写理由并记入 Timeline，从而事后可追溯责任。
6. 作为平台开发者，我希望 Policy 评估是纯函数且可单元测试，从而不依赖 Agent 内部状态。
7. 作为 Project Owner，我希望配置 Governance Profile，从而声明哪些动作需要 advisory 或 hard veto。
8. 作为 Project Owner，我希望为 merge、permission grant、upgrade adoption 分别配置 veto 模式（none / advisory / hard），从而按风险分层治理。
9. 作为 Security Reviewer（Human），我希望对高风险 merge candidate 发出 advisory veto，从而要求额外 Human 确认而不阻断探索。
10. 作为 Security Reviewer，我希望对违反 Contract Ownership 的 merge 发出 hard veto，从而阻止未解决冲突进入受保护分支。
11. 作为 Human，我希望 advisory veto 在 Inbox 中呈现事实、影响范围和可选操作（approve / reject / escalate），从而快速处置。
12. 作为 Human，我希望 hard veto 阻止相关 Command 直到指定 authority 登记 resolution，从而避免静默绕过。
13. 作为 Human，我希望 veto resolution 创建 superseding Decision 而不是改写历史，从而保持审计链完整。
14. 作为 Publisher，我希望为 Digital Employee 发布新 Release 后，项目能收到 Upgrade Proposal 而不是自动升级 Membership。
15. 作为 Project Owner，我希望 Upgrade Proposal 展示 Release diff 摘要、权限变化和兼容性风险，从而评估是否采纳。
16. 作为 Project Owner，我希望批准 Upgrade Proposal 只影响未来 Assignment 和新 Execution，而不改变进行中 Execution 的配置快照。
17. 作为 Human，我希望拒绝 Upgrade Proposal 并记录理由，从而明确继续使用旧 Release 的决定。
18. 作为 Human，我希望 Team View 展示当前 Governance Profile 和 Pending Upgrade Proposals，从而理解团队治理状态。
19. 作为 Human，我希望 Inbox 聚合 Policy 冲突、advisory veto、hard veto 和 Upgrade Proposal，从而保持行动导向通知。
20. 作为验收人员，我希望 OAuth fixture 增加治理场景：Policy 建议分派、advisory veto 后恢复、Upgrade Proposal 采纳，从而证明 Phase 2 与 Phase 1 闭环兼容。

## Implementation Decisions

- Assignment Policy、Governance Profile 和 Upgrade Proposal 均为版本化项目配置对象，状态变更通过 Command + Domain Event 持久化。
- Policy 评估在 `AssignWorkItem` Command 前产生 suggestion，不自动写入 assignment；只有 Human（或显式 auto-accept 配置，本阶段不实现）可确认。
- Governance veto 不声称观察线下讨论；resolution 使用 Recorded Consensus 语义登记结果和 authority。
- Hard veto 通过 Command gate 实现：被 veto 的 aggregate 进入 `blocked_by_governance` 投影状态，直到 resolution Command 清除。
- Upgrade Proposal 状态：`proposed → under_review → approved | rejected | superseded`；批准创建新 Membership 版本或显式 `AdoptUpgrade` 操作，不原地修改旧 Membership 行。
- Phase 1 手动 assignment、无 policy 默认、无 veto 默认保持向后兼容。
- 新领域术语在实现前同步更新 `CONTEXT.md`；权限模型变更需新 ADR。

## Testing Decisions

- Policy evaluator 使用纯单元测试覆盖 capability match、risk gate、tie-break 和 empty-suggestion 路径。
- Integration 测试通过 HTTP Command 验证 suggestion、override rationale、advisory veto Inbox、hard veto block 和 upgrade adoption 隔离。
- OAuth 治理场景作为第四个 E2E variant，与 normal / failure / contract 并列回归。
- 测试不断言 Policy 内部权重算法细节，只断言外部可观察 suggestion、block 和 audit 结果。

## Out of Scope

- 自动无 Human 确认的 assignment（fully autonomous staffing）
- 在线投票、quorum、多层级组织 RBAC
- Agent marketplace、跨组织 Release 分发
- Dynamic team topology 和 cross-project learning
- 远程执行主机、多 Kernel 深度支持
- 生产部署与企业 SSO

## Further Notes

- 依赖 Phase 1 已 resolved 的 #14（Assignment）、#15（Permission）、#29（Decision）、#11（Digital Employee Release）、#33（Inbox）、#38（protected merge）。
- 本 spec 是 Phase 2 issue tracker 上游；tickets 切成 tracer-bullet vertical slices，见 [map.md](map.md)。
