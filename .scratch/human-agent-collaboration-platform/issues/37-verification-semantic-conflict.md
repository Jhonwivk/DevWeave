# 37: 版本化 Verification 与 Semantic Conflict

**What to build:** 让 merge queue 使用固定版本的 Verification Profile 判断集成结果，并识别 Git 无法发现的 Semantic Conflict。

**Blocked by:** 03: 导入 Git 仓库与设置工程基线; 36: Merge Candidate 与 rebase queue

**Status:** ready-for-agent

- [ ] Merge Candidate 固定 Verification Profile 版本，并保存实际命令、环境、工具版本、输出、结果和耗时。
- [ ] 验证链可以执行配置的 build、静态检查、unit、integration、Contract 和可选 E2E 门禁。
- [ ] clean Git merge 后集成验证失败会产生 Semantic Conflict，而不是错误标记为普通 text merge conflict。
- [ ] 失败证据关联候选、baseline 和 Acceptance Criterion，并能通过 fixture 稳定复现。

