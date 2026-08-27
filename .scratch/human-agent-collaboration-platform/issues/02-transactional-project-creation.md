# 02: 事务化创建 Project

**What to build:** 让 Human 从 UI 创建 Project，并保证权威状态、不可变 Domain Event 和 Outbox 在同一事务中提交。

**Blocked by:** 01: 原生运行健康路径

**Status:** resolved

- [x] Human 可以创建 Project，创建结果包含 Owner、名称、当前版本并可立即查询。
- [x] 创建操作原子写入 Project State、Domain Event 和 Outbox；任一写入失败时三者均不提交。
- [x] 重复使用同一 idempotency key 不会创建重复 Project 或重复 Event。
- [x] 不匹配的 expected version 会返回明确的并发冲突，并保留 actor、causation 和 correlation 信息。

## Answer

CreateProject 在同一事务写入 Project 状态、Domain Event 与 Outbox；idempotency key 去重，错误 expected version 返回带 actor/causation/correlation 的 conflict。写入失败会整单回滚。
