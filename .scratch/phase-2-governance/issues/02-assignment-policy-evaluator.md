# 02: Assignment Policy 评估引擎

**What to build:** 实现纯函数 Policy evaluator，根据 Work Item 的 required capabilities、risk、scope 和当前 Agent Memberships 产生排序后的 assignment suggestion。

**Blocked by:** 01: Assignment Policy 配置与版本化

**Status:** ready-for-agent

- [ ] Evaluator 对给定 Work Item 和 Membership 列表返回零个或多个 suggestion，每个包含 membershipId、匹配分数和可读理由。
- [ ] 硬约束（权限不足、未 qualification、capability 缺失）的 Membership 不出现在 suggestion 中。
- [ ] Evaluator 有纯单元测试覆盖：无匹配、单匹配、多匹配 tie-break、空 Membership 列表。
- [ ] Evaluator 不发起副作用；只读查询 Membership 和 Policy 配置。
