# 42: Phase 1 可重复验收与原生交付

**What to build:** 让 Phase 1 平台在干净本地环境中可重复启动并运行三条 OAuth 验收路径，形成可复现而非一次性演示。

**Blocked by:** 09: 探索工作与 Specification 失效传播; 22: Worker 重启、lease 与 unknown 状态; 40: OAuth Agent 失败恢复场景; 41: OAuth Contract 与 Semantic Conflict 场景

**Status:** resolved

- [x] 正常、Agent failure 和 Contract/semantic conflict 三条场景均可从 Web UI 完整运行并自动验证。
- [x] Effective Specification Coverage 全部为 verified，或存在带理由和记录者的 Human waiver。
- [x] 关键操作、Execution、Checkpoint、Artifact、Decision、conflict 和 merge 均可从 Timeline 回溯。
- [x] 干净环境按文档无需 Docker 即可启动；重复运行不会依赖残留 Workspace、数据库状态或未记录手工步骤。

## Answer

正常、失败恢复、Contract/conflict 三条场景可重复运行；pnpm check 在无 Docker 的本地 PostgreSQL 上通过，不依赖残留手工步骤。
