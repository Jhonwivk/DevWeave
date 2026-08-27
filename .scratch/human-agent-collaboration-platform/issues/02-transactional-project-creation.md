# 02: 事务化创建 Project

**What to build:** 让 Human 从 UI 创建 Project，并保证权威状态、不可变 Domain Event 和 Outbox 在同一事务中提交。

**Blocked by:** 01: 原生运行健康路径

**Status:** ready-for-agent

- [ ] Human 可以创建 Project，创建结果包含 Owner、名称、当前版本并可立即查询。
- [ ] 创建操作原子写入 Project State、Domain Event 和 Outbox；任一写入失败时三者均不提交。
- [ ] 重复使用同一 idempotency key 不会创建重复 Project 或重复 Event。
- [ ] 不匹配的 expected version 会返回明确的并发冲突，并保留 actor、causation 和 correlation 信息。

