# 20: 结构化 Human Intervention

**What to build:** 让 Human 对运行中的 Execution 发出明确的 send、pause、resume、interrupt 和 cancel 操作，而不是依赖无法分类的聊天消息。

**Blocked by:** 17: 启动并观察 Mock Execution

**Status:** resolved

- [x] Execution View 只显示当前 Executor capabilities 和状态允许的 Intervention。
- [x] 每种 Intervention 记录请求者、目标 Execution、输入、结果、causation 和时间。
- [x] pause/resume、interrupt 和 cancel 遵守 Execution 状态机，非法或竞态操作返回明确结果。
- [x] Mock Executor 测试证明 Intervention 会产生外部可观察状态变化，且重试不会重复执行副作用。

## Answer

Intervene 支持 send/pause/resume/interrupt/cancel，并写入可追溯 Event。
