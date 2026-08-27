# 38: 有限修复、Human 升级与受保护合并

**What to build:** 让低风险失败在隔离环境中有限修复，并将高风险或超预算问题升级给 Human，最终只合并被证明 mergeable 的候选。

**Blocked by:** 21: 失败、超时与预算处理; 33: 只呈现待行动事项的 Inbox; 35: Contract Ownership 与冲突分类; 37: 版本化 Verification 与 Semantic Conflict

**Status:** ready-for-agent

- [ ] Project Policy 可以配置低风险自动修复次数、预算和允许范围，每次修复形成新的可追溯尝试。
- [ ] 高风险 Contract、权限问题、重复失败或预算耗尽会停止自动化并创建 Human Inbox 项。
- [ ] 只有最新 baseline 上 Verification 全部通过的候选进入 mergeable 并可合入受保护共享分支。
- [ ] merge、拒绝、取消和失败均记录操作者、候选、Verification Evidence 和最终共享 commit。

