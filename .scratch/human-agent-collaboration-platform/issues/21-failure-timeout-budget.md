# 21: 失败、超时与预算处理

**What to build:** 让 Human 理解和处理 Execution failure、timeout 与预算耗尽，并基于保留的 Workspace 选择下一步。

**Blocked by:** 20: 结构化 Human Intervention

**Status:** resolved

- [x] Mock Executor 可以确定性触发普通 failure、timeout 和预算耗尽，并保存最后已知输出与 Workspace。
- [x] timeout 或预算耗尽会请求 interrupt，不会把不确定终止伪装成成功或安全取消。
- [x] 失败页展示事实、影响范围、最近可用恢复点以及重试、增加预算、分支或取消选项。
- [x] 平台不会无限自动重试；每次重试创建可区分的 Execution 尝试并保留历史。

## Answer

Mock 可确定性触发 failure/timeout/unknown；失败保留 Workspace，且不会把不确定终止标成成功。
