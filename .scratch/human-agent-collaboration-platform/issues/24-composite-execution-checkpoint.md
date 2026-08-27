# 24: 创建 Composite Execution Checkpoint

**What to build:** 让 Human 在稳定 Execution 边界创建同时对齐 Workspace 与 Kernel 的原子 Execution Checkpoint。

**Blocked by:** 20: 结构化 Human Intervention; 23: 通过 Pi 执行真实受控代码任务

**Status:** resolved

- [x] Human 可以 interrupt 到稳定边界后请求 Checkpoint，并看到捕获过程与结果。
- [x] 成功的 Execution Checkpoint 原子关联 Workspace Checkpoint、opaque Kernel Checkpoint Reference、Project State/input 版本和运行版本元数据。
- [x] Workspace 或 Kernel 任一侧捕获失败时不发布可恢复 Checkpoint，并保留失败证据。
- [x] 集成测试证明两侧引用来自同一稳定边界，而不是按近似时间戳拼接。

## Answer

Checkpoint 绑定 Workspace commit 与 opaque Kernel ref；任一侧失败则不发布可恢复 Checkpoint。
