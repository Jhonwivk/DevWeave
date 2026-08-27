# 05: 创建 Git-backed Specification

**What to build:** 让 Human 在 Project 中创建或导入 Markdown Specification，并使用稳定 ID 标识 Requirement 和 Acceptance Criterion。

**Blocked by:** 03: 导入 Git 仓库与设置工程基线

**Status:** ready-for-agent

- [ ] Human 可以创建或导入 draft Specification，正文以可追溯 commit/hash 关联到 Project。
- [ ] 平台解析并展示 Requirement ID 和 Acceptance Criterion ID，ID 重复或缺失时给出定位明确的错误。
- [ ] Specification 元数据引用稳定 ID 而不是 Markdown 行号，正文重新排版不会改变已有条目的身份。
- [ ] Git fixture 测试覆盖创建、重新读取和无效规范拒绝路径。

