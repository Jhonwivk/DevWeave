# 36: Merge Candidate 与 rebase queue

**What to build:** 让 selected candidate 进入确定顺序的 merge queue，并在最新 integration baseline 上 rebase 后再接受验证。

**Blocked by:** 19: Workspace Diff、Verification 与 Work Item 完成; 27: 比较 Execution Branch 并选择候选; 34: Change Intent 与软 Reservation

**Status:** resolved

- [x] Human 可以从 selected candidate 创建 Merge Candidate，并查看 created、queued、rebasing 等状态。
- [x] 队列在隔离的 integration workspace 中逐个处理候选，每个候选使用前序结果形成的最新 baseline。
- [x] rebase 冲突被记录为 conflicted，基线或依赖变化使尚未验证的候选进入 stale。
- [x] Git 集成测试证明队列顺序确定、共享分支在验证前不被修改、失败候选不会阻塞状态恢复。

## Answer

Merge Candidate 按 queue_order 在隔离 worktree rebase；验证前不改共享分支，失败记为 conflicted/stale。
