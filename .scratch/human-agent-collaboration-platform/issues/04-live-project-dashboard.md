# 04: 实时 Project Dashboard

**What to build:** 让 Human 从 Project Dashboard 查看共享状态和有序 Timeline，并在连接中断后继续接收更新而无需刷新页面。

**Blocked by:** 02: 事务化创建 Project

**Status:** resolved

- [x] Dashboard 展示 Project 摘要、当前版本、最近关键操作和系统健康状态。
- [x] Project 状态变化通过 SSE 按 project sequence 推送到页面。
- [x] 客户端使用 cursor 重连后只补齐遗漏更新，并能安全忽略重复事件。
- [x] 自动测试覆盖正常推送、断线重连、事件顺序和重复投递。

## Answer

Dashboard 查询 Project 摘要、最近 Event 与健康状态；SSE `/projects/:id/events?cursor=` 按 project sequence 补齐并忽略重复事件。
