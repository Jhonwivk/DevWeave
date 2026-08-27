# 26: Reconstructed Branch 与恢复失败保护

**What to build:** 当 Kernel 无法精确恢复时，让 Human 获得明确标注的 Reconstructed Branch，并阻止任何 Workspace/Kernel 错位恢复。

**Blocked by:** 24: 创建 Composite Execution Checkpoint

**Status:** ready-for-agent

- [ ] 不支持 checkpoint/fork 的 Executor 只提供 Reconstructed Branch 选项，并解释其与 exact rewind 的差异。
- [ ] Reconstructed Branch 从 Workspace Checkpoint 和新的 Kernel 会话开始，UI 与 Event 永久保留非精确标记。
- [ ] Workspace restore 或 Kernel restore 任一失败时，新分支不进入 running，原 Execution 不受影响。
- [ ] 自动测试覆盖 capability 缺失、引用失效、Workspace 恢复失败和 Kernel 恢复失败。

