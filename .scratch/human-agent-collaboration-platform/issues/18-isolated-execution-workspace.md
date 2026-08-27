# 18: 隔离 Execution Workspace

**What to build:** 让每次 Execution 在平台管理的独立 Git worktree 和分支中工作，使并发 Agent 不会覆盖彼此或直接修改共享分支。

**Blocked by:** 03: 导入 Git 仓库与设置工程基线; 17: 启动并观察 Mock Execution

**Status:** resolved

- [x] 每次 Execution 固定唯一 worktree、平台命名分支和 base commit，并在 Execution View 中可追溯。
- [x] 两个并发 Mock Execution 修改相同 fixture repository 时彼此隔离，原 working tree 保持不变。
- [x] Kernel 只能访问获批 Workspace，不能自行改选仓库、主分支或宿主敏感路径。
- [x] Workspace 创建失败或残留时给出安全恢复选择，不误删其他 Execution 的工作目录。

## Answer

每次 Execution 使用独立 Git worktree 与 ha/execution/* 分支；并发 Mock 执行互不污染原 working tree。
