# 06: Specification 审核、发布与版本演进

**What to build:** 让 Human 审核并发布 Effective Specification，同时通过新版本、supersede 或 withdraw 演进规范而不改写历史。

**Blocked by:** 05: 创建 Git-backed Specification

**Status:** resolved

- [x] Specification 可以合法经过 draft、in_review 和 effective 状态，非法转换会被拒绝。
- [x] Effective Specification 不可原地修改；内容变化必须创建可追溯的新版本。
- [x] Human 可以 supersede 或 withdraw 旧版本，历史正文、review result 和操作者保持可查看。
- [x] 并发审核使用 expected version，过期操作不会静默覆盖较新的结果。

## Answer

Specification 走 draft → in_review → effective，非法转换与过期 expected version 被拒绝；supersede/withdraw 保留历史版本。
