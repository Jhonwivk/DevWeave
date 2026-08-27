# 41: OAuth Contract 与 Semantic Conflict 场景

**What to build:** 在 OAuth 协作中主动修改共享 Contract，证明依赖失效、冲突协调、修复、重新验证和安全合并闭环。

**Blocked by:** 31: Contract 依赖与 stale 传播; 35: Contract Ownership 与冲突分类; 38: 有限修复、Human 升级与受保护合并; 39: 正常 OAuth 协作场景

**Status:** ready-for-agent

- [ ] 场景可以确定性制造 Contract 版本变化，并将 Frontend/QA Consumer 标记 stale。
- [ ] Consumer 收到新 Contract Context，完成显式采用和适配后才能重新进入 merge queue。
- [ ] 场景至少证明一种 Contract Conflict，并通过 clean merge 后测试失败证明一种 Semantic Conflict。
- [ ] 修复后的候选重新通过 Verification 才能合并，冲突、决策和 Human Intervention 全部可追溯。

