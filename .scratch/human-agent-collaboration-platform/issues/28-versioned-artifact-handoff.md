# 28: 发布与采用版本化 Artifact

**What to build:** 让 Producer 以版本化 Artifact 交付工程结果，并要求 Consumer 显式采用一个 published 版本作为工作依据。

**Blocked by:** 19: Workspace Diff、Verification 与 Work Item 完成

**Status:** resolved

- [x] Producer 可以从 Work Item/Execution 创建 draft Artifact，并发布带内容哈希和来源关系的不可变版本。
- [x] Consumer 只能采用 published 的具体版本，采用记录关联 Consumer Work Item 和操作者。
- [x] 新版本可以 supersede 或 deprecate 旧版本，但不会静默改变既有采用关系。
- [x] Artifact View 展示 producer、来源 Execution、版本、consumer、状态和 Verification Evidence。

## Answer

Artifact 以内容哈希发布，Consumer 只能 adopt published 版本；supersede 不改写既有采用记录本身。
