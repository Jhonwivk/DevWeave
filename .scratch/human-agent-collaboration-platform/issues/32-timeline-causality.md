# 32: 分层 Timeline 与 Causality Graph

**What to build:** 让 Human 和研究者沿因果关系回溯重要项目操作，同时区分业务事实、运行观测和安全审计。

**Blocked by:** 04: 实时 Project Dashboard; 22: Worker 重启、lease 与 unknown 状态; 28: 发布与采用版本化 Artifact; 29: Decision Proposal 与 Recorded Consensus 生命周期

**Status:** resolved

- [x] Timeline 按 project sequence 展示 Domain Event，并可沿 causation/correlation 关联 Command、Execution、Artifact 和 Decision。
- [x] Execution Telemetry 与 Audit Event 有独立类别、保留策略和过滤方式，不被当作权威领域状态。
- [x] 关键状态、权限、override 和失败操作可追溯，普通非敏感页面浏览不会产生永久高噪声审计记录。
- [x] 投影可从已提交事实重建，并通过顺序、重复事件和重建一致性测试。

## Answer

Timeline 按 project sequence 分层展示 domain/telemetry/audit；写路径带 causation 与 correlation。
