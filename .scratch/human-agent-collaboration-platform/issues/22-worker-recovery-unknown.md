# 22: Worker 重启、lease 与 unknown 状态

**What to build:** 让持久 Execution job 在 Worker 崩溃或重启后安全恢复，并在无法确认 Kernel 状态时诚实进入 unknown。

**Blocked by:** 04: 实时 Project Dashboard; 17: 启动并观察 Mock Execution

**Status:** resolved

- [x] Worker 使用持久 lease 和 heartbeat 领取任务，重复投递不会并行执行同一个 Execution。
- [x] Worker 重启后尝试重新连接仍在运行的 Kernel，并继续发布状态更新。
- [x] 无法确认状态时标记 unknown，保留 Workspace，且不自动重跑、删除或假定 Execution 已结束。
- [x] 自动测试通过可控时钟覆盖 lease 过期、进程中断、重启和重复投递，不依赖长时间 sleep。

## Answer

Worker 使用 PostgreSQL lease/heartbeat；过期 lease 可收回，重复 job 会取消，无法确认时标记 unknown 且不删 Workspace。
