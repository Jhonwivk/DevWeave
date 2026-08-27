# 10: Human Project Membership 与 Team View

**What to build:** 让 Project Owner 邀请另一名 Human 成为 Member，并从 Team View 理解项目中的人员、角色和责任边界。

**Blocked by:** 02: 事务化创建 Project

**Status:** ready-for-agent

- [ ] Owner 可以邀请本地 Human 账户加入 Project，重复邀请不会创建重复 Membership。
- [ ] 第一阶段只提供 Owner 和 Member 两级项目角色，并对越权操作返回明确错误。
- [ ] Team View 展示 Human Membership、加入时间、当前角色和关键责任。
- [ ] 邀请、角色变化和移除均记录不可变 Domain Event 与操作者。

