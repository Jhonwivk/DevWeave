# 25: 从 Checkpoint 精确创建 Execution Branch

**What to build:** 让 Human 选择历史 Execution Checkpoint、修改平台输入，并使 Kernel 与 Workspace 从同一节点创建新的精确 Execution Branch。

**Blocked by:** 24: 创建 Composite Execution Checkpoint

**Status:** resolved

- [x] Human 可以选择可恢复 Checkpoint、查看固定输入并提交有版本的新输入。
- [x] fork 成功后产生新的 Execution 和 Workspace，Kernel 使用原 opaque reference 恢复到对应内部节点。
- [x] 原 Execution、Checkpoint、Workspace 证据和后续路径保持不可变且可查看。
- [x] 集成测试验证分支起点的 Workspace 内容、Kernel reference 和项目输入版本完全匹配。

## Answer

精确回溯从已发布 Checkpoint fork 出新 Execution/worktree，原路径保持不可变。
