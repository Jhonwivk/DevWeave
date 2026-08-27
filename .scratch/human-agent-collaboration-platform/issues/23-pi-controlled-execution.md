# 23: 通过 Pi 执行真实受控代码任务

**What to build:** 让 Human 使用默认 Pi Kernel 在隔离 Workspace 中完成一个真实代码任务，同时保持上层平台不依赖 Pi 的内部推理或 Session 格式。

**Blocked by:** 15: Agent 权限与临时 Permission Request; 16: Executor Contract 与确定性 Mock Executor; 18: 隔离 Execution Workspace

**Status:** ready-for-agent

- [ ] Pi Adapter 声明真实 capabilities，并通过适用的共享 Executor contract tests。
- [ ] Human 可以在项目 allowlist 中选择 Pi 并启动 Execution；未指定时 Pi 是默认真实 Kernel。
- [ ] Pi 只能在受控 worktree 和获批权限内完成 fixture 代码任务，平台独立读取最终 diff。
- [ ] Kernel 原始日志可选查看，但领域状态和测试不解析其内部推理、Session Tree 或工具循环。

