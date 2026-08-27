# 07: 从 Effective Specification 建立 Work Item 与 Coverage

**What to build:** 让 Human 从 Effective Specification 创建结构化 Work Item，并查看每条 Acceptance Criterion 的实施和验证覆盖状态。

**Blocked by:** 06: Specification 审核、发布与版本演进

**Status:** ready-for-agent

- [ ] Work Item 包含 goal、acceptance criteria、risk、affected scope 和 required capabilities，并引用有效的稳定规范 ID。
- [ ] Coverage Matrix 区分 uncovered、planned、implemented、verified 和 waived，并可追溯到相关 Work Item。
- [ ] Work Item 与 Execution 生命周期保持分离，一次尝试失败不会把 Work Item 直接变成 failed。
- [ ] UI 和自动测试覆盖创建、无效规范引用以及 Coverage 状态更新。

