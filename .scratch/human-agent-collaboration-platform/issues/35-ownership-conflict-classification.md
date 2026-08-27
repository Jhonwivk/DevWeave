# 35: Contract Ownership 与冲突分类

**What to build:** 让高风险共享 Contract 获得更严格的 Ownership，并将并行工程冲突分类为可采取不同处理方式的事件。

**Blocked by:** 18: 隔离 Execution Workspace; 28: 发布与采用版本化 Artifact; 31: Contract 依赖与 stale 传播; 34: Change Intent 与软 Reservation

**Status:** resolved

- [x] API Contract、Schema、Shared Type、Config 和 Dependency Version 可以设置明确 Owner 与变更规则。
- [x] 未满足 Ownership 规则的高风险变更被阻止或要求显式 Human override，普通文件重叠仍使用软协调。
- [x] 平台分别记录 Text、Symbol 和 Contract Conflict，并关联双方 Work Item、Change Intent、diff 与受影响 Consumer。
- [x] Contract Conflict 会触发依赖失效和 Inbox 行动项，不由 LLM 无验证地自动解决。

## Answer

高风险 Ownership 路径需要 Human override；冲突按 text/symbol/contract 分类，不由 LLM 自动消解。
