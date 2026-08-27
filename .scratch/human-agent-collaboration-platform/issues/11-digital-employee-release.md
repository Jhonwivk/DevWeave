# 11: 引入 Digital Employee Release

**What to build:** 让 Human 手动选择有可验证来源的不可变 Digital Employee Release，并将其固定为 Project 的 Agent Membership。

**Blocked by:** 10: Human Project Membership 与 Team View

**Status:** resolved

- [x] Human 可以导入包含 provenance、版本、能力声明和内容哈希的 Digital Employee Release。
- [x] Project Sponsor 审核后创建固定该 Release 的 Agent Membership，来源类型在 Team View 中清晰可见。
- [x] Publisher 后续发布新版本不会改变已有 Membership，升级必须通过显式的新操作完成。
- [x] 被篡改或无法验证内容哈希的 Release 不能启动新的项目工作。

## Answer

Digital Employee 以不可变 Release（provenance、哈希、能力）导入，Membership 钉死该 Release，内容哈希不匹配则拒绝。
