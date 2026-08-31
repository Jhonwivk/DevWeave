# 03: Assignment Suggestion 与 Human Override 审计

**What to build:** 在 Assign Work Item 流程中展示 Policy suggestion，允许 Human 采纳或 override，并对高风险 override 强制记录理由。

**Blocked by:** 02: Assignment Policy 评估引擎

**Status:** ready-for-agent

- [ ] Assign Work Item UI/API 在存在 Policy 时展示 top suggestion 和理由。
- [ ] Human 可采纳 suggestion 一键 assignment，或手动选择其他 Membership。
- [ ] 偏离 suggestion 且 Work Item risk 为 high 时，override 必须附带 rationale 并写入 Domain Event。
- [ ] Override 记录包含：操作者、原 suggestion、实际 assignee、理由、时间戳；可在 Timeline 查看。
